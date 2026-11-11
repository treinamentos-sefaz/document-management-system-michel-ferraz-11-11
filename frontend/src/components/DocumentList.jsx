import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function formatUploadDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({ documents, isLoading, error, onRetry, onDownloadError }) {
  if (isLoading && documents.length === 0) {
    return <div className="list-state" role="status">Carregando documentos...</div>;
  }

  if (error && documents.length === 0) {
    return (
      <div className="list-state list-state--error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return <div className="list-state">Nenhum documento encontrado.</div>;
  }

  return (
    <div className="table-wrap" aria-busy={isLoading}>
      {error && <p className="list-inline-error" role="alert">{error}</p>}
      <table className="documents-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Enviado em</th>
            <th scope="col">Tamanho</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="document-name-cell" title={document.originalName}>{document.originalName}</td>
              <td className="document-date-cell">{formatUploadDate(document.uploadedAt)}</td>
              <td className="document-size-cell">{formatFileSize(document.size)}</td>
              <td className="document-action-cell">
                <DownloadButton
                  documentId={document.id}
                  fileName={document.originalName}
                  onError={onDownloadError}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}