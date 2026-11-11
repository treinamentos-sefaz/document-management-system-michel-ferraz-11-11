import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi.js';

export default function DownloadButton({ documentId, fileName, onError }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      await downloadDocument(documentId, fileName);
    } catch (error) {
      onError(error);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className="download-button"
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      aria-label={`Baixar ${fileName}`}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}