# `.agents/frontend/skills/component-splitting.md`

# Skill — Divisão e Organização de Componentes

Use quando um arquivo ou componente estiver grande, complexo ou com responsabilidades misturadas.

## Avalie Antes de Editar

Antes de alterar qualquer arquivo, verifique:

- Tamanho.
- Complexidade.
- Responsabilidade.
- Quantidade de lógica.
- Se a nova alteração vai deixar o arquivo difícil de manter.

## Quando Separar

Separe em arquivos próprios quando houver:

- Componentes internos extensos.
- Estados complexos.
- Validações.
- Chamadas de API.
- Funções utilitárias.
- Layouts grandes.
- Regras de negócio.
- Lógica repetida.

## Opções de Separação

Use:

- Subcomponentes.
- Hooks.
- Utils.
- Services.
- Arquivos auxiliares.

## Regra

Cada arquivo deve ter responsabilidade clara e bem definida.