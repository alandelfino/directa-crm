# Guia de Criação de Páginas e Componentes - Padrão Directa CRM

Este documento serve como índice para os padrões de design, layout e estrutura de código do projeto. Siga os links abaixo para detalhes específicos de cada elemento.

## Índice de Padrões

### 1. Estrutura e Layout
*   [Análise de Layout e Estrutura de Página](patterns/PAGE_LAYOUT.md)
    *   Detalha a estrutura visual, layout flexível, topbar, toolbar e tabela de dados.

### 2. Implementação de Páginas
*   [Implementação de Novas Páginas (CRUD)](patterns/PAGE_IMPLEMENTATION.md)
    *   Passo a passo para criar a rota `index.tsx`, estados, queries e template JSX completo.

### 3. Componentes Auxiliares
*   [Regras Gerais para Componentes](patterns/COMPONENT_GENERAL.md)
    *   Nomenclatura, localização e padrões de feedback.
*   [Componente de Criação (New)](patterns/COMPONENT_NEW.md)
    *   Template para `New{Resource}Sheet`.
*   [Componente de Edição (Edit)](patterns/COMPONENT_EDIT.md)
    *   Template para `Edit{Resource}Sheet`.
*   [Componente de Exclusão (Delete)](patterns/COMPONENT_DELETE.md)
    *   Template para `Delete{Resource}` (Dialog).

---

## Checklist de Verificação Rápida

Ao finalizar uma nova funcionalidade, verifique:

- [ ] O layout ocupa 100% da altura (`h-full`)?
- [ ] A tabela rola independentemente do cabeçalho (`overflow-hidden` no container pai)?
- [ ] Os botões de ação têm `size="sm"` e ícones `size-[0.85rem]`?
- [ ] A ordem dos botões é: Refresh -> Excluir -> Editar -> Novo?
- [ ] O comportamento de seleção (habilitar/desabilitar botões) está correto?
- [ ] O estado vazio (`Empty`) está configurado com ícone, título e descrição?
- [ ] Os formulários (Sheets) têm footer fixo na base e área de scroll para campos?
- [ ] As mensagens de erro e sucesso utilizam o padrão `toast`?
