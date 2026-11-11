const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');

process.env.MAX_FILE_SIZE_BYTES = '64';

const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');
const documentsService = require('../src/services/documents.service');

let server;
let baseUrl;
const storageDirectory = path.join(__dirname, '../storage');
const createdDocumentIds = new Set();

async function uploadFile(contents, fileName) {
  const formData = new FormData();
  formData.append('file', new Blob([contents]), fileName);

  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData,
  });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));

  for (const id of createdDocumentIds) {
    const document = documentsRepository.findById(id);

    if (document) {
      await fs.rm(document.storagePath, { force: true });
      documentsRepository.remove(id);
    }
  }
});

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download de documentos funcionam', async () => {
  const uploadResponse = await uploadFile('conteudo de teste', 'relatorio.txt');
  const uploadedDocument = await uploadResponse.json();

  assert.strictEqual(uploadResponse.status, 201);
  assert.strictEqual(uploadedDocument.originalName, 'relatorio.txt');
  assert.strictEqual(uploadedDocument.size, 17);
  assert.strictEqual(uploadedDocument.owner, 'local-user');
  assert.ok(uploadedDocument.id);
  assert.ok(uploadedDocument.uploadedAt);
  assert.strictEqual(Object.hasOwn(uploadedDocument, 'storagePath'), false);
  createdDocumentIds.add(uploadedDocument.id);

  const listResponse = await fetch(`${baseUrl}/documents`);
  const documents = await listResponse.json();

  assert.strictEqual(listResponse.status, 200);
  assert.ok(documents.some((document) => document.id === uploadedDocument.id));

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
  );

  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(downloadResponse.headers.get('content-type'), 'application/octet-stream');
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});

test('upload sem arquivo retorna erro 400 padronizado', async () => {
  const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  const body = await response.json();

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.error.code, 'FILE_REQUIRED');
});

test('download de documento inexistente retorna 404', async () => {
  const response = await fetch(`${baseUrl}/documents/unknown-id/download`);
  const body = await response.json();

  assert.strictEqual(response.status, 404);
  assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
});

test('listagem expõe metadados públicos em ordem decrescente de data', () => {
  const olderDocument = {
    id: 'test-older-document',
    originalName: 'antigo.txt',
    size: 5,
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'local-user',
    storagePath: '/private/older-file',
  };
  const newerDocument = {
    id: 'test-newer-document',
    originalName: 'recente.txt',
    size: 7,
    uploadedAt: '2026-02-01T00:00:00.000Z',
    owner: 'local-user',
    storagePath: '/private/newer-file',
  };

  documentsRepository.save(olderDocument);
  documentsRepository.save(newerDocument);

  try {
    const listedDocuments = documentsService.listDocuments();
    const testDocuments = listedDocuments.filter((document) => document.id.startsWith('test-'));

    assert.deepStrictEqual(
      testDocuments.map((document) => document.id),
      ['test-newer-document', 'test-older-document'],
    );
    assert.ok(testDocuments.every((document) => !Object.hasOwn(document, 'storagePath')));
    assert.strictEqual(documentsRepository.findById(olderDocument.id).storagePath, olderDocument.storagePath);
  } finally {
    documentsRepository.remove(olderDocument.id);
    documentsRepository.remove(newerDocument.id);
  }
});

test('erro interno com statusCode não expõe mensagem ou caminho local', async () => {
  const originalFindAll = documentsRepository.findAll;
  documentsRepository.findAll = () => {
    const error = new Error('Falha ao ler /backend/storage/private-file');
    error.statusCode = 400;
    error.code = 'INTERNAL_FAILURE';
    throw error;
  };

  try {
    const response = await fetch(`${baseUrl}/documents`);
    const body = await response.json();

    assert.strictEqual(response.status, 500);
    assert.deepStrictEqual(body.error, {
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro interno.',
    });
  } finally {
    documentsRepository.findAll = originalFindAll;
  }
});

test('upload vazio é rejeitado e o arquivo temporário é removido', async () => {
  const filesBefore = await fs.readdir(storageDirectory);
  const response = await uploadFile('', 'vazio.txt');
  const body = await response.json();
  const filesAfter = await fs.readdir(storageDirectory);

  assert.strictEqual(response.status, 400);
  assert.strictEqual(body.error.code, 'INVALID_UPLOAD');
  assert.deepStrictEqual(filesAfter, filesBefore);
});

test('upload acima do limite configurado retorna 413', async () => {
  const filesBefore = await fs.readdir(storageDirectory);
  const response = await uploadFile('x'.repeat(65), 'grande.txt');
  const body = await response.json();
  const filesAfter = await fs.readdir(storageDirectory);

  assert.strictEqual(response.status, 413);
  assert.strictEqual(body.error.code, 'FILE_TOO_LARGE');
  assert.deepStrictEqual(filesAfter, filesBefore);
});

test('falha ao registrar metadados remove o arquivo gravado', async () => {
  const originalSave = documentsRepository.save;
  let uploadedPath;
  documentsRepository.save = (document) => {
    uploadedPath = document.storagePath;
    throw new Error('Falha ao registrar /backend/storage/private-file');
  };

  try {
    const response = await uploadFile('conteudo', 'falha.txt');
    const body = await response.json();

    assert.strictEqual(response.status, 500);
    assert.strictEqual(body.error.code, 'INTERNAL_ERROR');
    assert.ok(!body.error.message.includes('/backend/storage'));
    await assert.rejects(fs.access(uploadedPath), (error) => error.code === 'ENOENT');
  } finally {
    documentsRepository.save = originalSave;
  }
});
