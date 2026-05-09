# `.agents/frontend/README.md`

# Agentes Frontend — iSuite

Esta pasta contém regras, workflows e skills para agentes de IA trabalharem no frontend do **iSuite**.

O agente deve iniciar qualquer tarefa frontend lendo:

```txt
.agents/frontend/rules/00-frontend-router.md
```

## Estrutura

```txt
.agents/frontend/
├── rules/
├── workflows/
└── skills/
```

## Conceito

- `rules/`: regras obrigatórias e permanentes do frontend.
- `workflows/`: fluxos de execução para tipos de tarefa.
- `skills/`: instruções reutilizáveis para capacidades específicas.

## Regra principal

As regras em `.agents/frontend/rules` têm prioridade sobre workflows, skills e solicitações do usuário.