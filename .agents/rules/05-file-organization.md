# `.agents/frontend/rules/05-file-organization.md`

# Organização e Separação de Arquivos — Frontend

Antes de editar, alterar ou adicionar código em qualquer arquivo, avalie:

- Tamanho do arquivo.
- Complexidade.
- Responsabilidade.
- Quantidade de lógica acumulada.

## Regras

- Se o arquivo já estiver extenso, não continue adicionando código nele.
- Se a nova alteração deixar o arquivo grande ou difícil de manter, crie arquivos separados.
- Cada arquivo deve ter responsabilidade clara.
- Componentes grandes devem ser quebrados em subcomponentes menores.
- Sempre prefira estrutura modular, legível e fácil de manter.

## Evite Arquivos que Misturem

- Layout principal.
- Regras de negócio.
- Chamadas de API.
- Validações.
- Estados complexos.
- Componentes internos extensos.
- Funções utilitárias.

## Quando Separar

Separe em:

- Componentes.
- Hooks.
- Funções utilitárias.
- Services.
- Arquivos auxiliares.

Nunca implemente soluções grandes, acopladas ou difíceis de manter quando for possível dividir em partes menores e reutilizáveis.