# `.agents/frontend/workflows/review-task.md`

# Workflow — Revisão de Tarefa Frontend

Use antes de finalizar qualquer tarefa frontend relevante.

## Checklist Geral

Confirme:

- [ ] A arquitetura existente foi preservada.
- [ ] A tarefa não alterou backend.
- [ ] Nenhum `any` foi usado.
- [ ] ESLint foi respeitado.
- [ ] Hooks seguem as regras do React.
- [ ] Imports, variáveis e componentes não usados foram removidos.
- [ ] Código morto, duplicado ou inacessível foi evitado.
- [ ] Componentes visuais foram verificados no MCP Context7 e `shadcn/ui`.
- [ ] Componentes específicos de rota estão na pasta `-components` correta.
- [ ] Componentes globais são realmente reutilizáveis.
- [ ] Arquivos grandes foram divididos quando necessário.
- [ ] Props e eventos React foram tipados corretamente.
- [ ] Acessibilidade e responsividade foram consideradas.
- [ ] A consistência visual do projeto foi preservada.

## Checklist de Rotas

Quando criar ou alterar rota, confirme:

- [ ] A rota está dentro de `routes`.
- [ ] A rota possui pasta própria.
- [ ] O arquivo principal se chama `route.tsx`.
- [ ] Componentes exclusivos estão em `-components`.
- [ ] Subrotas refletem a hierarquia da URL.

## Checklist ESLint Obrigatório

Antes de finalizar, revise arquivo por arquivo alterado:

- [ ] Não há imports não utilizados.
- [ ] Não há ícones não utilizados.
- [ ] Não há componentes não utilizados.
- [ ] Não há hooks não utilizados.
- [ ] Não há tipos não utilizados.
- [ ] Não há variáveis não utilizadas.
- [ ] Não há funções ou handlers não utilizados.
- [ ] Não há estados React criados e não usados.
- [ ] Não há props declaradas e não usadas.
- [ ] Não há código morto.
- [ ] Não há `any`.
- [ ] As regras de hooks foram respeitadas.

Se algum item acima falhar, corrija antes de concluir a tarefa.

## Regra de Finalização

Ao terminar uma tarefa frontend, a última revisão deve ser:

1. Verificar imports.
2. Verificar variáveis.
3. Verificar hooks.
4. Verificar tipos.
5. Verificar JSX removido ou alterado.
6. Remover tudo que ficou sem uso.