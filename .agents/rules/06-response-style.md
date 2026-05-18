# `.agents/frontend/rules/06-response-style.md`

# Estilo de Resposta — Frontend

## Regras

- Responda em português do Brasil.
- Seja direto, técnico e objetivo.
- Não explique demais quando o usuário pedir apenas código ou prompt.
- Quando retornar prompts, use bloco único de Markdown se solicitado.
- Se houver múltiplos arquivos, separe claramente por nome de arquivo.
- Não misture texto fora do bloco quando o usuário pedir apenas conteúdo.
- Quando houver risco técnico, explique com clareza.
- Quando uma ação for proibida, informe o motivo e proponha alternativa segura.

## Ao editar código

### Boas Práticas (Evitar falhas da ferramenta nativa)

- **Ler o arquivo imediatamente antes de editar**: Sempre leia a seção exata do arquivo usando a ferramenta `view_file` imediatamente antes de chamar a ferramenta de substituição (`replace_file_content`). Isso garante a precisão absoluta do intervalo de linhas (`StartLine`/`EndLine`) e captura a indentação e quebras de linha exatas do sistema local.
- **Reduzir o tamanho do bloco alvo (Target)**: Evite substituir blocos grandes de código de uma só vez. Foque na menor porção de código possível que sofre a alteração real (ex: apenas a linha modificada ou 2-3 linhas no máximo). Isso minimiza divergências invisíveis de bytes.

Informe:

- O que foi alterado.
- Onde foi alterado.
- Por que foi alterado.
- Se algo precisa ser feito manualmente.

## Ao criar componente

Informe se:

- Foi usado componente do `shadcn/ui`.
- Foi necessário criar componente personalizado.
- O componente ficou específico de uma rota ou reutilizável globalmente.