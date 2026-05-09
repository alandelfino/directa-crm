# `.agents/frontend/workflows/update-page.md`

# Workflow — Alterar Página Frontend

Use quando a tarefa envolver alteração em uma página ou rota existente.

## Carregar antes

```txt
.agents/frontend/rules/02-routes-architecture.md
.agents/frontend/rules/03-shadcn-context7.md
.agents/frontend/rules/04-typescript-eslint.md
.agents/frontend/rules/05-file-organization.md
.agents/frontend/skills/route-components.md
.agents/frontend/skills/component-splitting.md
.agents/frontend/skills/react-eslint.md
```

## Fluxo

1. Localize a rota em `routes`.
2. Entenda o papel do `route.tsx`.
3. Verifique se já existe pasta `-components`.
4. Avalie se a alteração deve ficar no `route.tsx` ou em componente separado.
5. Se o arquivo estiver grande, extraia para componente, hook, utilitário ou service.
6. Componentes específicos devem ficar na pasta `-components` da própria rota.
7. Componentes reutilizáveis podem ir para pasta global adequada.
8. Antes de criar novo componente visual, consulte MCP Context7 e `shadcn/ui`.
9. Garanta tipagem forte.
10. Respeite regras de hooks e ESLint.
11. Revise responsividade e acessibilidade.

## Proibido

- Aumentar arquivo já extenso sem necessidade.
- Misturar lógica, layout, chamadas de API e estados complexos no mesmo arquivo.
- Usar `any`.
- Ignorar ESLint.