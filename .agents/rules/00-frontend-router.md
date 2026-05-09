# `.agents/frontend/rules/00-frontend-router.md`

# Frontend Router — Directa CRM

Você é um agente de desenvolvimento para o frontend do **Directa CRM**.

Sempre inicie qualquer tarefa frontend lendo este arquivo.

Sua função é:

1. Entender a tarefa.
2. Identificar quais rules, workflows e skills devem ser carregados.
3. Executar a tarefa respeitando todos os arquivos carregados.
4. Validar o resultado antes de finalizar.

---

## Sempre carregar em tarefas frontend

```txt
.agents/frontend/rules/01-project-identity.md
.agents/frontend/rules/03-shadcn-context7.md
.agents/frontend/rules/04-typescript-eslint.md
.agents/frontend/rules/05-file-organization.md
.agents/frontend/rules/06-response-style.md
```

---

## Se envolver rotas, páginas, layouts ou estrutura de navegação

Carregue:

```txt
.agents/frontend/rules/02-routes-architecture.md
.agents/frontend/workflows/create-route.md
.agents/frontend/skills/route-components.md
```

---

## Se envolver criação ou alteração de componente visual

Carregue:

```txt
.agents/frontend/workflows/create-component.md
.agents/frontend/skills/shadcn-composition.md
.agents/frontend/skills/component-splitting.md
```

---

## Se envolver alteração em página existente

Carregue:

```txt
.agents/frontend/workflows/update-page.md
.agents/frontend/skills/route-components.md
.agents/frontend/skills/component-splitting.md
```

---

## Se envolver TypeScript, props, eventos, respostas de API ou tipagem

Carregue:

```txt
.agents/frontend/skills/frontend-typing.md
```

---

## Se envolver React Hooks, lint, organização de imports ou qualidade de código

Carregue:

```txt
.agents/frontend/skills/react-eslint.md
```

---

## Antes de finalizar qualquer tarefa relevante

Carregue:

```txt
.agents/frontend/workflows/review-task.md
```

---

## Prioridade Frontend

Em caso de conflito:

1. Arquitetura de rotas.
2. TypeScript e ESLint.
3. shadcn/ui e MCP Context7.
4. Organização e separação de arquivos.
5. Workflows.
6. Skills.
7. Estilo de resposta.

---

## Regras absolutas

- Nunca use `any`.
- Nunca ignore ESLint.
- Nunca crie componente do zero antes de verificar o MCP Context7 e o `shadcn/ui`.
- Nunca coloque componente específico de página em pasta global.
- Nunca misture componentes de páginas diferentes na mesma pasta `-components`.
- Nunca adicione código em arquivo que já esteja grande ou com muitas responsabilidades.
- Sempre preserve a arquitetura baseada em `routes`.

## Regra Obrigatória de Validação Final

Antes de finalizar qualquer tarefa frontend, sempre carregue e execute mentalmente:

```txt
.agents/frontend/workflows/review-task.md
.agents/frontend/skills/react-eslint.md
```

Nenhuma tarefa frontend deve ser considerada concluída enquanto houver possibilidade de:

- import não usado;
- variável não usada;
- função não usada;
- componente não usado;
- hook importado e não utilizado;
- ícone importado e não utilizado;
- tipo importado e não utilizado;
- código morto;
- violação das regras de hooks;
- uso de `any`.

Se o agente criar, alterar ou remover JSX, componentes, ícones, estados, hooks ou handlers, deve revisar todos os imports do arquivo alterado antes de finalizar.

É obrigatório remover imports não utilizados imediatamente.