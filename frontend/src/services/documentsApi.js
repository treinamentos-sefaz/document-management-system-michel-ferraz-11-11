async function readResponse(response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error?.message || 'Não foi possível concluir a solicitação.');
  }

  return body;
}

export async function getDocuments(signal) {
  const response = await fetch('/api/documents', { signal });
  const documents = await readResponse(response);

  if (!Array.isArray(documents)) {
    throw new Error('A resposta do servidor está em um formato inválido.');
  }

  return documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  return readResponse(response);
}

function getDownloadName(contentDisposition, fallbackName) {
  const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (encodedName) {
    return decodeURIComponent(encodedName.replace(/^"|"$/g, ''));
  }

  const quotedName = contentDisposition.match(/filename="([^"]+)"/i)?.[1];
  const plainName = contentDisposition.match(/filename=([^;]+)/i)?.[1];
  return quotedName || plainName?.trim() || fallbackName;
}

export async function downloadDocument(id, fallbackName) {
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}/download`);

  if (!response.ok) {
    await readResponse(response);
    return;
  }

  const file = await response.blob();
  const fileUrl = window.URL.createObjectURL(file);
  const link = window.document.createElement('a');
  const contentDisposition = response.headers.get('content-disposition') || '';

  link.href = fileUrl;
  link.download = getDownloadName(contentDisposition, fallbackName);
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 1000);
}