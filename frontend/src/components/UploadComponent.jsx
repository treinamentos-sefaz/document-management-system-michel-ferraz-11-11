import { useRef, useState } from 'react';

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  function selectFile(selectedFile) {
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await onUpload(file);
      setFile(null);
      fileInput.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="upload-panel-heading">
        <p className="eyebrow">NOVO ARQUIVO</p>
        <h2 id="upload-title">Adicionar documento</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <label
          className={`upload-dropzone${isDragging ? ' upload-dropzone--active' : ''}${file ? ' upload-dropzone--selected' : ''}`}
          htmlFor="document-file"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <span className="upload-symbol" aria-hidden="true">+</span>
          <span className="dropzone-label">{file ? 'Arquivo selecionado' : 'Selecionar arquivo'}</span>
          {file && <span className="selected-file-name">{file.name}</span>}
        </label>
        <input
          ref={fileInput}
          id="document-file"
          className="visually-hidden"
          type="file"
          onChange={(event) => selectFile(event.target.files[0])}
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button upload-submit" type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
    </section>
  );
}