---
name: revisar-seguranca-documentos
description: Revisa os fluxos de upload, listagem e download do DMS em busca de riscos de segurança.
argument-hint: fluxo ou arquivos a revisar (upload, listagem, download)
agent: agent
tools: ['search', 'codebase', 'usages', 'problems']
---

# Revisar segurança dos documentos

Faça uma revisão somente de leitura do fluxo `${input:escopo:fluxo ou arquivos do DMS}`. Se nenhum escopo for informado, examine as alterações atuais relacionadas a documentos.

Leia `.github/copilot-instructions.md`, `docs/specs/dms-spec.md` e os testes relevantes antes de concluir. Siga cada operação desde a rota até controller, service e repository, incluindo o acesso ao filesystem.

## Verificações

- **Upload:** validar o campo multipart `file`, ausência de arquivo, arquivo vazio e limite `MAX_FILE_SIZE_BYTES`; conferir que o nome físico é gerado pelo servidor e que `originalName` nunca é usado como caminho.
- **Filesystem:** confirmar que a gravação fica em `backend/storage`, que o cliente não escolhe diretórios e que falhas após a gravação tentam remover o arquivo órfão.
- **Listagem:** confirmar que a resposta contém somente metadados públicos, sem caminho local ou conteúdo do arquivo.
- **Download:** confirmar que a busca é feita pelo `id` registrado, que um caminho não pode ser fornecido pelo cliente e que arquivo ou registro ausente não expõem detalhes internos.
- **Erros:** verificar códigos HTTP e formato JSON coerentes, sem stack traces, caminhos ou mensagens internas.
- **Proprietário:** confirmar que `owner` é atribuído pelo servidor como `local-user`; não trate esse valor como autenticação ou autorização.

Não reporte como defeito a ausência de autenticação, persistência de metadados, allowlist de MIME/extensão ou armazenamento externo: essas capacidades estão fora do escopo atual. Registre-as como limitações somente se forem relevantes ao risco observado.

## Saída

Liste primeiro apenas problemas acionáveis, em ordem de severidade (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). Para cada problema, informe:

1. Arquivo e linha ou símbolo afetado.
2. Evidência observável no código e cenário que permite o problema.
3. Impacto concreto.
4. Correção recomendada e teste que pode verificar a correção.

Não altere arquivos. Se não encontrar problemas, declare isso claramente e descreva brevemente os riscos residuais ou verificações não cobertas.

## Origem da adaptação

Este prompt adapta a organização por ameaças e verificações específicas de linguagem dos materiais de segurança do repositório comunitário [github/awesome-copilot](https://github.com/github/awesome-copilot), especialmente `agents/se-security-reviewer.agent.md` e `skills/security-review/references/language-patterns.md`. O escopo foi reduzido aos contratos locais do DMS e à sua fronteira entre upload e filesystem.