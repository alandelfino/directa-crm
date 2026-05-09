# `.agents/frontend/workflows/create-component.md`

# Workflow — Criar Componente Frontend

Use quando a tarefa for criar ou alterar componente de interface.

## Carregar antes

```txt
.agents/frontend/rules/03-shadcn-context7.md
.agents/frontend/rules/04-typescript-eslint.md
.agents/frontend/rules/05-file-organization.md
.agents/frontend/skills/shadcn-composition.md
.agents/frontend/skills/component-splitting.md
.agents/frontend/skills/frontend-typing.md
.agents/frontend/skills/react-eslint.md
```

## Fluxo

1. Identifique se o componente é específico de uma rota ou reutilizável.
2. Se for específico de rota, coloque em `routes/[rota]/-components`.
3. Se for reutilizável em várias rotas, use uma pasta global adequada.
4. Antes de criar do zero, pesquise no MCP Context7 se há componente equivalente no `shadcn/ui`.
5. Se houver, instale e use como base.
6. Se não houver, crie componente personalizado compondo com `shadcn/ui` quando possível.
7. Defina tipos claros para props.
8. Evite `any`.
9. Divida componentes grandes em subcomponentes.
10. Garanta acessibilidade, responsividade e consistência visual.
11. Respeite ESLint.

## Proibido

- Criar componente visual manual sem verificar `shadcn/ui`.
- Usar `any`.
- Misturar responsabilidades demais no mesmo arquivo.
- Criar componente específico de página em pasta global.