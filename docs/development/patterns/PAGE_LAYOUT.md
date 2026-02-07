# Análise de Layout e Estrutura de Página

Este documento detalha a estrutura visual e de layout baseada na página de referência (`warranties/index.tsx`).

## Estrutura Geral e Layout
A página utiliza um layout flexível de altura total (`h-full`) para garantir que a tabela ocupe o espaço disponível com rolagem interna, mantendo o cabeçalho e a barra de ferramentas fixos.

-   **Container Principal**: `flex flex-col w-full h-full`
-   **Topbar**: Componente `<Topbar />` fixo no topo.
-   **Área de Conteúdo**: `flex flex-col w-full h-full flex-1 overflow-hidden` (permite que a tabela role independentemente).

## Barra de Ferramentas (Toolbar)
Localizada logo abaixo do Topbar, contendo filtros à esquerda e ações à direita.

-   **Container**: `border-b flex w-full items-center p-2 gap-4`
-   **Esquerda (Filtros)**: `flex items-center gap-2 flex-1`
    -   Usa um componente `Popover` para filtros avançados e ordenação.
    -   Botão de gatilho: `variant="outline" size="sm"`.
    -   Ícone `Funnel` (`size-[0.85rem]`).
    -   Badge de contagem de filtros ativos (condicional).
-   **Direita (Ações)**: `flex items-center gap-2`
    -   **Refresh**: Botão `ghost` `sm` com ícone `RefreshCw`.
    -   **Excluir/Editar**:
        -   Renderização condicional baseada na seleção (`selected.length === 1`).
        -   Se selecionado: Renderiza o componente de ação (ex: `DeleteWarranty`, `EditWarrantySheet`).
        -   Se não selecionado: Renderiza botões desabilitados (`variant="outline"`, `disabled`) para manter o layout estável.
        -   Ordem: `Excluir` -> `Editar`.
    -   **Novo Item**: Botão principal (ex: `NewWarrantySheet`) sempre à direita.

## Tabela de Dados (DataTable)
-   Componente: `<DataTable />`
-   **Props Obrigatórias**:
    -   `columns`: Definição das colunas (incluindo checkbox de seleção).
    -   `data`: Array de dados.
    -   `loading`: Estado de carregamento (`isLoading || isRefetching`).
    -   `page`, `perPage`, `totalItems`: Para paginação.
    -   `emptySlot`: Componente `<Empty>` personalizado para estado vazio.
    -   `onChange`: Handler para mudança de página/limite.

## Estilização e Tokens
-   **Espaçamentos**: `p-2`, `p-4`, `gap-2`, `gap-4`.
-   **Tamanhos de Ícones**: `size-[0.85rem]` (aprox. 13.6px) para botões de ação.
-   **Botões**: Sempre `size="sm"`.
-   **Bordas**: `border-neutral-200`.
