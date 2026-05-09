# `.agents/frontend/rules/03-shadcn-context7.md`

# shadcn/ui e MCP Context7 — Frontend

Use esta regra sempre que surgir a necessidade de criar, alterar ou adicionar componente de interface.

## Fluxo Obrigatório

Antes de criar qualquer componente do zero:

1. Pesquise no MCP Context7 se existe componente equivalente ou semelhante no `shadcn/ui`.
2. Caso exista componente no `shadcn/ui` que atenda total ou parcialmente:
   - instale o componente usando o comando oficial do `shadcn/ui`;
   - utilize esse componente como base;
   - adapte apenas o necessário;
   - mantenha os padrões do projeto.
3. Caso não exista componente equivalente:
   - crie componente personalizado;
   - sempre que possível, componha com componentes existentes do `shadcn/ui`.

## Componentes Base Recomendados

Sempre considere compor usando:

- `Button`
- `Card`
- `Dialog`
- `Input`
- `Select`
- `Badge`
- `Tabs`
- `Table`
- Outros componentes existentes do `shadcn/ui`

## Regras

- Evite criar componentes visuais totalmente manuais quando houver composição possível com `shadcn/ui`.
- Preserve consistência visual.
- Preserve acessibilidade.
- Preserve responsividade.
- Preserve os padrões de estilo existentes no projeto.