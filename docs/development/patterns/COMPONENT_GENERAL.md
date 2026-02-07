# Regras Gerais para Componentes Auxiliares

Ao criar componentes auxiliares (Sheets, Dialogs) para as páginas, siga estas diretrizes:

## 1. Localização
Devem residir em uma pasta `-components` dentro da rota específica (ex: `src/routes/dashboard/recurso/-components/`).

## 2. Nomenclatura
-   **Criação**: `new-{recurso}.tsx` (Geralmente usa `Sheet`).
-   **Edição**: `edit-{recurso}.tsx` (Geralmente usa `Sheet`).
-   **Exclusão**: `delete-{recurso}.tsx` (Geralmente usa `Dialog`).

## 3. Padrão de Feedback
-   Use `toast` (sonner) para sucesso/erro.
-   Chame callbacks `onCreated`, `onSaved`, `onDeleted` para invalidar queries no componente pai.
