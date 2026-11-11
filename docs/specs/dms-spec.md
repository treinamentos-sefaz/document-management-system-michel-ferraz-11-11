# Especificação - Document Management System

> Especificação do MVP para orientar o desenvolvimento guiado por especificação. Os requisitos abaixo descrevem o comportamento desejado; não indicam que as operações de documentos já estejam implementadas.

## 1. Objetivo

Entregar uma aplicação web local que permita enviar, listar e baixar documentos, com metadados mantidos em memória e arquivos armazenados no filesystem local.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo por requisição.
- Listar os metadados dos documentos enviados durante a execução atual do backend.
- Baixar um documento pelo identificador.
- Associar os documentos a um usuário local único, sem autenticação.
- Apresentar no frontend os fluxos de envio, listagem e download usando a API do backend.

### Fora do escopo

- Armazenamento em nuvem ou em serviços externos.
- Banco de dados ou persistência dos metadados após reiniciar o backend.
- Autenticação, autorização ou gerenciamento de múltiplas contas.
- Versionamento, edição, exclusão, busca, filtros e paginação de documentos.
- Allowlist de extensões ou tipos MIME.

## 3. Requisitos funcionais

| ID | Requisito | Critérios de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | A API recebe um arquivo no campo multipart `file`, grava-o no storage local, registra seus metadados em memória e responde com os metadados criados. |
| RF-02 | O usuário pode listar os documentos enviados. | A API responde com os metadados dos documentos conhecidos na execução atual, ordenados do mais recente para o mais antigo. A listagem não inclui conteúdo binário nem caminhos locais. |
| RF-03 | O usuário pode baixar um documento pelo identificador. | A API localiza o registro pelo `id` e entrega o conteúdo como anexo, usando o nome original no nome de download. |
| RF-04 | Cada documento pertence ao usuário local único do MVP. | O servidor atribui `owner` como `local-user`; o cliente não define nem altera esse campo. Isso é identificação funcional, não controle de acesso. |
| RF-05 | A aplicação informa falhas de forma consistente. | Erros da API retornam JSON no formato definido na seção 6, sem expor stack traces, caminhos ou detalhes internos. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend deve usar Node.js e Express, em JavaScript CommonJS, mantendo a separação `routes -> controllers -> services -> repositories`. |
| RNF-02 | Uploads devem ser processados com Multer `diskStorage` e gravados em `backend/storage`; o conteúdo do arquivo não deve ser carregado integralmente em memória pela aplicação. |
| RNF-03 | Metadados devem ser mantidos em memória. Ao reiniciar o processo, os metadados deixam de estar disponíveis, ainda que os arquivos permaneçam no disco. |
| RNF-04 | O limite por arquivo deve ser configurável pela variável `MAX_FILE_SIZE_BYTES`, com padrão de 10 MiB (10.485.760 bytes). |
| RNF-05 | O frontend deve usar React e Vite; chamadas HTTP devem usar `fetch` com prefixo `/api`, encaminhado pelo proxy do Vite ao backend. |
| RNF-06 | Configurações de execução devem vir do ambiente, sem credenciais ou configurações específicas de ambiente embutidas no código. A porta do backend usa `PORT`, conforme o seed. |
| RNF-07 | O MVP é de usuário local único e não oferece autenticação ou garantia de isolamento entre usuários. |
| RNF-08 | Nomes de arquivo fornecidos pelo cliente são apenas metadados de apresentação. O servidor deve gerar um nome de armazenamento próprio e nunca usar entrada do cliente como caminho de filesystem. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado pelo servidor, preferencialmente UUID. |
| `originalName` | string | Nome original informado no upload; usado na listagem e no download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601, em UTC. |
| `owner` | string | Identificador atribuído pelo servidor; no MVP é sempre `local-user`. |

O repositório em memória deve associar o `id` aos metadados e ao nome de armazenamento gerado no servidor. Esse nome interno não faz parte da resposta pública da API. O nome interno deve ser único e não derivado como caminho diretamente do nome original.

## 6. Contratos de API

Os caminhos abaixo são relativos à API do backend. No frontend, as chamadas usam o prefixo `/api` (por exemplo, `/api/upload`); o proxy do Vite remove esse prefixo antes de encaminhar a requisição.

### Formato comum de erro

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para uso pelo cliente. `message` é uma mensagem legível em português. Respostas de erro não devem conter stack trace, caminhos locais ou detalhes internos.

### POST /upload

- **Entrada:** `multipart/form-data` com exatamente um arquivo no campo `file`.
- **Validação:** rejeitar arquivo ausente ou vazio com `400`; rejeitar arquivo acima de `MAX_FILE_SIZE_BYTES` com `413`. O MVP não restringe extensões ou tipos MIME.
- **Sucesso:** `201 Created`, corpo JSON com os metadados públicos do documento criado.
- **Erros:** `400 Bad Request` para campo ausente ou inválido (`FILE_REQUIRED` ou `INVALID_UPLOAD`); `413 Payload Too Large` para limite excedido (`FILE_TOO_LARGE`); `500 Internal Server Error` para falha inesperada de gravação ou registro (`INTERNAL_ERROR`).
- **Consistência:** se o arquivo for gravado, mas o registro dos metadados falhar, o backend deve remover o arquivo recém-gravado antes de responder com erro, quando possível.

Exemplo de sucesso:

```json
{
  "id": "2f5c3793-83a0-4b9b-a5ac-0d8174e56a9e",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-11T12:00:00.000Z",
  "owner": "local-user"
}
```

### GET /documents

- **Entrada:** sem corpo ou parâmetros obrigatórios.
- **Sucesso:** `200 OK`, corpo JSON como array de metadados públicos, ordenado por `uploadedAt` decrescente. Se não houver documentos, retornar `[]`.
- **Erros:** `500 Internal Server Error` (`INTERNAL_ERROR`) se não for possível consultar o repositório em memória.

### GET /documents/:id/download

- **Entrada:** `id` do documento na URL.
- **Sucesso:** `200 OK`, conteúdo binário como anexo; usar `application/octet-stream` e o nome original no cabeçalho `Content-Disposition`.
- **Erros:** `404 Not Found` (`DOCUMENT_NOT_FOUND`) se o id não estiver registrado ou se o arquivo correspondente não existir; `500 Internal Server Error` (`INTERNAL_ERROR`) para outras falhas de leitura.
- O cliente não pode fornecer ou escolher o caminho do arquivo no filesystem.

## 7. Decisões arquiteturais

- **Backend:** rotas definem endpoints e delegam aos controllers; controllers tratam HTTP e validação de entrada; services concentram regras de negócio; repositories cuidam do registro em memória e do acesso ao storage local. Dependências seguem `routes -> controllers -> services -> repositories`.
- **Upload local:** Multer com `diskStorage` grava em `backend/storage`. O nome físico é gerado pelo servidor para evitar colisões e impedir que nomes recebidos do cliente determinem caminhos.
- **Metadados:** ficam em memória nesta fase. Não há recuperação dos registros após reinício; os arquivos que permanecerem no disco não serão listáveis ou baixáveis pela API sem seus metadados.
- **Identidade:** `local-user` identifica o único usuário funcional do MVP. Não deve ser apresentado como autenticação ou autorização; uma futura evolução com múltiplos usuários exige identidade confiável e isolamento por proprietário.
- **Frontend:** aplicação React organizada em componentes, páginas e serviços. O acesso ao backend usa `fetch` com `/api`, conforme o proxy do Vite.
- **Erros e configuração:** erros HTTP usam o formato comum desta especificação. Porta e limite de upload vêm do ambiente, com padrões documentados.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Esta especificação não implementa nem altera arquivos de backend ou frontend.

1. **Especificação:** revisar e aprovar os requisitos, modelo de dados, contratos e decisões deste documento.
2. **Backend:** implementar upload local com Multer, repositório de metadados em memória, serviços, controllers e rotas para upload, listagem e download, respeitando os contratos desta especificação.
3. **Testes do backend:** cobrir sucesso e erros dos três endpoints, limite de upload, metadados, ordenação e comportamento quando o arquivo não existe.
4. **Frontend:** implementar os fluxos de envio, exibição da lista, estados vazios/erro e download, consumindo a API pelo prefixo `/api`.
5. **Validação integrada:** instalar dependências, executar testes e build disponíveis, iniciar os serviços e validar os fluxos completos no ambiente local.
