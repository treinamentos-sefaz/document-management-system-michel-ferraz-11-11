const documents = new Map();

function save(document) {
  documents.set(document.id, document);
}

function findAll() {
  return [...documents.values()]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
}

function findById(id) {
  return documents.get(id) || null;
}

function remove(id) {
  return documents.delete(id);
}

module.exports = { save, findAll, findById, remove };