const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const documentsRepository = require('../repositories/documents.repository');

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getOriginalName(name) {
  const baseName = path.basename(name.replace(/\\/g, '/'));
  const safeName = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return safeName || 'document';
}

async function removeUploadedFile(filePath) {
  if (filePath) {
    await fs.unlink(filePath).catch(() => {});
  }
}

async function createDocument(file) {
  if (!file) {
    throw createHttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  if (file.size === 0) {
    await removeUploadedFile(file.path);
    throw createHttpError(400, 'INVALID_UPLOAD', 'O arquivo não pode estar vazio.');
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: getOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: 'local-user',
    storagePath: file.path,
  };

  try {
    documentsRepository.save(document);
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }

  const { storagePath, ...publicDocument } = document;
  return publicDocument;
}

function listDocuments() {
  return documentsRepository.findAll();
}

function getDocumentById(id) {
  return documentsRepository.findById(id);
}

module.exports = { createDocument, listDocuments, getDocumentById };