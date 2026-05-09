# `.agents/frontend/rules/02-routes-architecture.md`

# Arquitetura de Rotas — Frontend

Use esta regra quando a tarefa envolver páginas, rotas, layouts ou componentes específicos de página.

## Estrutura Obrigatória

Toda página deve ficar dentro da pasta:

```txt
routes/
```

Cada rota deve ter sua própria pasta.

O arquivo principal da rota deve se chamar obrigatoriamente:

```txt
index.tsx
```

Componentes exclusivos de uma rota devem ficar dentro da pasta:

```txt
-components/
```

da própria rota.

## Exemplo de Estrutura

```txt
routes/
  login/
    -components/
      form-login.tsx
    route.tsx

  register/
    -components/
      register-form.tsx
    route.tsx

  dashboard/
    -components/
      sidebar.tsx
    route.tsx

    categories/
      -components/
        new-category-sheet.tsx
      route.tsx
```

## Regras Obrigatórias

- Toda página deve ficar dentro de `routes`.
- Cada rota deve ter sua própria pasta.
- O arquivo principal da rota deve ser `route.tsx`.
- Componentes exclusivos da rota devem ficar em `-components`.
- Componentes exclusivos de subrotas devem ficar dentro da própria subrota.
- Não misture componentes de páginas diferentes dentro da mesma pasta `-components`.
- Não crie componentes específicos de página em pastas globais como `components`, `shared` ou `ui`.
- Componentes do `shadcn/ui` devem permanecer na estrutura padrão do projeto, normalmente em `components/ui`.
- Componentes compostos específicos de página devem ficar em `-components`.
- Componentes realmente reutilizáveis em várias rotas podem ir para uma pasta global adequada.
- Antes de criar nova rota, verifique a estrutura existente.
- Ao criar subrotas, reflita a hierarquia da URL na estrutura de pastas.

## Exemplo de Subrota

```txt
routes/dashboard/categories/route.tsx
```

Representa uma página filha dentro de `dashboard`.