# `.agents/frontend/skills/frontend-typing.md`

# Skill — Tipagem Frontend

Use quando a tarefa envolver TypeScript, props, eventos, formulários, respostas de API ou estado.

## Regras

- Nunca use `any`.
- Use `unknown` quando o tipo for desconhecido.
- Faça validação ou narrowing antes de usar `unknown`.
- Defina tipos claros para props.
- Crie tipos específicos para respostas de API.
- Crie tipos específicos para entradas de API.
- Use generics quando necessário.
- Use tipos utilitários do TypeScript quando ajudarem.
- Evite tipos genéricos demais quando for possível representar melhor o domínio.

## Eventos React

Use tipos corretos:

```typescript
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>
React.MouseEvent<HTMLButtonElement>
```

## Exemplo Incorreto

```typescript
function handleSubmit(data: any) {
  console.log(data.name)
}
```

## Exemplo Correto

```typescript
type SubmitData = {
  name: string
  email: string
}

function handleSubmit(data: SubmitData) {
  console.log(data.name)
}
```