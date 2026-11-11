const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const storageDirectory = path.resolve(__dirname, '../../storage');
const defaultMaxFileSize = 10 * 1024 * 1024;
const configuredMaxFileSize = process.env.MAX_FILE_SIZE_BYTES;
const maxFileSize = configuredMaxFileSize === undefined
  ? defaultMaxFileSize
  : Number(configuredMaxFileSize);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const diskStorage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true })
      .then(() => callback(null, storageDirectory), callback);
  },
  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
});

router.post('/upload', upload.single('file'), documentsController.upload);
router.get('/documents', documentsController.list);
router.get('/documents/:id/download', documentsController.download);

module.exports = router;