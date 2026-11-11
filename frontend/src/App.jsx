import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { getDocuments, uploadDocument } from './services/documentsApi.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState(null);

  async function refreshDocuments() {
    setIsLoading(true);
    setListError('');

    try {
      setDocuments(await getDocuments());
    } catch (error) {
      setListError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshDocuments();
  }, []);

  async function handleUpload(file) {
    await uploadDocument(file);
    setNotice({ type: 'success', message: 'Documento enviado.' });
    await refreshDocuments();
  }

  function handleDownloadError(error) {
    setNotice({ type: 'error', message: error.message });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, página inicial">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DMS<span> / arquivo</span></span>
        </a>
        <span className="topbar-note">DOCUMENTOS</span>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1 id="page-title">Documentos</h1>
          </div>
          <div className="document-counter" aria-live="polite">
            <span className="counter-value">{documents.length}</span>
            <span className="counter-label">{documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
          </div>
        </section>

        {notice && (
          <div className={`notice notice--${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.message}</span>
            <button type="button" className="notice-dismiss" onClick={() => setNotice(null)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}

        <div className="workspace-grid">
          <UploadComponent onUpload={handleUpload} />
          <section className="documents-panel" aria-labelledby="documents-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">BIBLIOTECA</p>
                <h2 id="documents-title">Todos os documentos</h2>
              </div>
              <button
                className="text-button refresh-button"
                type="button"
                onClick={refreshDocuments}
                disabled={isLoading}
              >
                {isLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={listError}
              onRetry={refreshDocuments}
              onDownloadError={handleDownloadError}
            />
          </section>
        </div>

        <footer className="workspace-footer">
          <span className="footer-indicator" aria-hidden="true" />
          Armazenamento local
        </footer>
      </main>
    </div>
  );
}
