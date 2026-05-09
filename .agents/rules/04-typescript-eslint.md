# `.agents/frontend/rules/04-typescript-eslint.md`

# TypeScript e ESLint — Frontend

## TypeScript

Nunca utilize `any`.

É proibido usar `any` em:

- Variáveis.
- Propriedades.
- Funções.
- Retornos.
- Eventos.
- Respostas de API.
- Props de componentes.
- Qualquer outro trecho de código.

Use sempre tipos explícitos:

- `type`
- `interface`
- generics
- tipos utilitários do TypeScript
- tipos inferidos de schemas, quando aplicável

Quando o tipo não for conhecido, use `unknown` e faça validação ou narrowing antes de usar.

## Respostas de API

Para respostas de API, crie tipos específicos de entrada e saída.

## Props

Para props de componentes, sempre defina tipos claros e reutilizáveis.

## Eventos React

Use os tipos corretos, como:

```typescript
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>
React.MouseEvent<HTMLButtonElement>
```

## ESLint

Todo código criado ou alterado deve seguir o ESLint configurado no projeto.

É proibido:

- Ignorar erros ou avisos do ESLint sem necessidade real.
- Usar `eslint-disable`, `eslint-disable-next-line` ou similares sem justificativa técnica clara e inevitável.
- Manter imports não utilizados.
- Manter variáveis não utilizadas.
- Manter funções ou componentes não utilizados.
- Manter código morto, duplicado ou inacessível.

## React Hooks

Respeite obrigatoriamente as regras de hooks:

- Não chamar hooks dentro de condicionais.
- Não chamar hooks dentro de loops.
- Não chamar hooks dentro de funções comuns.
- Manter corretamente dependências de `useEffect`, `useMemo` e `useCallback`.

Caso alguma alteração gere erro de lint, ajuste o código antes de considerar a tarefa concluída.

## Verificação Obrigatória de Imports e Variáveis

Antes de finalizar qualquer alteração, revise todos os arquivos modificados e confirme:

- nenhum import ficou sem uso;
- nenhum ícone importado ficou sem uso;
- nenhum componente importado ficou sem uso;
- nenhum hook importado ficou sem uso;
- nenhum tipo importado ficou sem uso;
- nenhuma variável, função, constante ou handler ficou sem uso;
- nenhum estado React foi criado sem ser usado;
- nenhuma prop foi declarada sem ser usada.

Se uma alteração remover o uso de um elemento visual, botão, ícone, função ou componente, remova também o import correspondente.

Exemplo proibido:

```tsx
import { X } from "lucide-react"
```

Quando `X` não é usado no arquivo.

Exemplo correto:

```tsx
// Remova o import não utilizado
```

O código só pode ser considerado finalizado se estiver limpo para ESLint.