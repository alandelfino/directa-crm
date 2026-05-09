# `.agents/frontend/skills/route-components.md`

# Skill — Componentes de Rota

Use quando a tarefa envolver componentes específicos de página, rota ou subrota.

## Regras

- Componentes exclusivos de uma rota devem ficar em `-components` dentro da própria rota.
- Componentes exclusivos de `login` devem ficar em `routes/login/-components`.
- Componentes exclusivos de `register` devem ficar em `routes/register/-components`.
- Componentes exclusivos de `dashboard` devem ficar em `routes/dashboard/-components`.
- Componentes exclusivos de subrotas devem ficar dentro da própria subrota.

## Exemplo

```txt
routes/dashboard/categories/-components/new-category-sheet.tsx
```

## Proibido

- Misturar componentes de páginas diferentes na mesma pasta `-components`.
- Criar componente específico de página em `components`, `shared` ou `ui`.
- Mover componente para pasta global sem reutilização real.

## Permitido

Componentes compartilhados entre várias rotas podem ser movidos para uma pasta global adequada, desde que isso seja realmente necessário.