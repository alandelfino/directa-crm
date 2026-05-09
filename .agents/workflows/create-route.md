# `.agents/frontend/workflows/create-route.md`

# Workflow — Criar Rota Frontend

Use quando a tarefa for criar uma nova rota, página ou subpágina.

## Carregar antes

```txt
.agents/frontend/rules/01-project-identity.md
.agents/frontend/rules/02-routes-architecture.md
.agents/frontend/rules/03-shadcn-context7.md
.agents/frontend/rules/04-typescript-eslint.md
.agents/frontend/rules/05-file-organization.md
.agents/frontend/skills/route-components.md
.agents/frontend/skills/shadcn-composition.md
.agents/frontend/skills/component-splitting.md
```

## Fluxo

1. Identifique a rota a ser criada.
2. Verifique a estrutura existente em `routes`.
3. Crie uma pasta própria para a rota.
4. Crie o arquivo obrigatório `route.tsx`.
5. Crie a pasta `-components` apenas se houver componentes exclusivos da rota.
6. Antes de criar componentes visuais, consulte o MCP Context7 e verifique o `shadcn/ui`.
7. Use componentes do `shadcn/ui` quando existirem.
8. Componha componentes personalizados com base no `shadcn/ui` sempre que possível.
9. Separe componentes grandes em arquivos menores.
10. Garanta tipagem sem `any`.
11. Respeite ESLint.
12. Revise responsividade, acessibilidade e consistência visual.

## Proibido

- Criar rota sem `route.tsx`.
- Criar componente específico de página fora da pasta `-components`.
- Colocar componente específico em pasta global sem necessidade real.
- Usar `any`.
- Ignorar ESLint.