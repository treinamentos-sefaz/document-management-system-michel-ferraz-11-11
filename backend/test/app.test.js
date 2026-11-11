const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');

let server;
let baseUrl;
const createdDocumentIds = new Set();

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
  const formData = new FormData();
  formData.append('file', new Blob(['conteudo de teste']), 'relatorio.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData,
  });
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
