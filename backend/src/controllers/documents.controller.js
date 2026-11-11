const documentsService = require('../services/documents.service');

async function upload(req, res) {
  const document = await documentsService.createDocument(req.file);
  return res.status(201).json(document);
}

function list(req, res) {
  return res.status(200).json(documentsService.listDocuments());
}

function download(req, res, next) {
  const document = documentsService.getDocumentById(req.params.id);

  if (!document) {
    return res.status(404).json({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Documento não encontrado.',
      },
    });
  }

  res.type('application/octet-stream');
  return res.download(document.storagePath, document.originalName, (error) => {
    if (!error) {
      return;
    }

    if (error.code === 'ENOENT' && !res.headersSent) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
    }

    return next(error);
  });
}

module.exports = { upload, list, download };