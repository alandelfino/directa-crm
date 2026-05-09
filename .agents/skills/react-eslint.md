# `.agents/frontend/skills/react-eslint.md`

# Skill — React e ESLint

Use quando a tarefa envolver componentes React, hooks, lint ou organização de código.

## ESLint

Todo código deve respeitar o ESLint configurado no projeto.

Corrija:

- Imports não usados.
- Variáveis não usadas.
- Funções não usadas.
- Componentes não usados.
- Código morto.
- Código duplicado.
- Código inacessível.
- Formatação inconsistente.
- Dependências incorretas de hooks.

## Proibido

- Ignorar ESLint sem justificativa técnica real.
- Usar `eslint-disable` sem necessidade inevitável.
- Usar `eslint-disable-next-line` como solução rápida.

## Hooks

Respeite as regras:

- Não chamar hooks dentro de condicionais.
- Não chamar hooks dentro de loops.
- Não chamar hooks dentro de funções comuns.
- Manter corretamente dependências de `useEffect`.
- Manter corretamente dependências de `useMemo`.
- Manter corretamente dependências de `useCallback`.

## Regra de Imports Não Utilizados

Sempre que editar um componente React, revise os imports no topo do arquivo.

Remova imediatamente qualquer import que não esteja sendo usado no arquivo.

Atenção especial para imports comuns que ficam esquecidos após alterações:

- ícones de `lucide-react`, como `X`, `Plus`, `Trash`, `Upload`, `Image`;
- componentes do `shadcn/ui`;
- hooks como `useState`, `useEffect`, `useMemo`, `useCallback`;
- tipos TypeScript;
- schemas;
- funções utilitárias;
- services;
- componentes locais.

Exemplo de erro que deve ser evitado:

```txt
'X' is defined but never used  @typescript-eslint/no-unused-vars
```

Se o agente remover um botão, fechar modal, header, ação, estado ou handler, deve verificar se algum import ficou órfão.

## Checklist Rápido por Arquivo

Para cada arquivo alterado, pergunte:

1. Todos os imports são usados?
2. Todos os estados são usados?
3. Todos os handlers são usados?
4. Todos os tipos são usados?
5. Todos os componentes importados aparecem no JSX?
6. Todos os ícones importados aparecem no JSX?

Se a resposta for “não”, remova ou corrija antes de finalizar.

## Finalização

Antes de concluir, o código deve estar limpo, tipado, organizado e sem violações de ESLint.