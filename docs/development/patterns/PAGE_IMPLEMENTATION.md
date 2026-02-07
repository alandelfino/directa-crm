# Implementação de Novas Páginas (CRUD)

Para criar uma nova página que siga o padrão existente, siga estes passos:

## Passo 1: Definição da Rota e Tipos
Crie o arquivo `index.tsx` na rota desejada. Defina os tipos de dados e a resposta da API.

```typescript
type Resource = { id: number; name: string; ... }
type ResourceResponse = { items: Resource[]; page: number; total: number; ... }
```

## Passo 2: Estado da Página
Inicialize os estados padrão no componente da rota:

```typescript
const [currentPage, setCurrentPage] = useState(1)
const [perPage, setPerPage] = useState(20)
const [selected, setSelected] = useState<number[]>([]) // ou string[]
const [totalItems, setTotalItems] = useState(0)

// Filtros
const [sortBy, setSortBy] = useState('createdAt')
const [orderBy, setOrderBy] = useState('desc')
const [filterName, setFilterName] = useState('')
// ... outros estados de filtro local para o Popover
```

## Passo 3: Query de Dados
Configure o `useQuery` com `keepPreviousData` (ou controle via `useEffect`) e tratamento de erro.

```typescript
const { data, isLoading, isRefetching, refetch } = useQuery({
  queryKey: ['resource', currentPage, perPage, ...filters],
  queryFn: async () => { ... }
})
```

## Passo 4: Estrutura do JSX (Template)
Copie e adapte a estrutura abaixo:

```tsx
<div className='flex flex-col w-full h-full'>
  {/* 1. Topbar */}
  <Topbar title="Recursos" breadcrumbs={...} />

  {/* 2. Área de Conteúdo */}
  <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
    
    {/* 3. Toolbar */}
    <div className='border-b flex w-full items-center p-2 gap-4'>
      {/* 3.1 Filtros (Esquerda) */}
      <div className='flex items-center gap-2 flex-1'>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            {/* Implementar filtros aqui */}
          </PopoverContent>
        </Popover>
      </div>

      {/* 3.2 Ações (Direita) */}
      <div className='flex items-center gap-2'>
        {/* Refresh */}
        <Button variant={'ghost'} size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={isLoading ? 'animate-spin size-[0.85rem]' : 'size-[0.85rem]'} />
        </Button>

        {/* Excluir */}
        {selected.length === 1 ? (
          <DeleteResource resourceId={selected[0]} onDeleted={() => { setSelected([]); refetch() }} />
        ) : (
          <Button variant={'outline'} size="sm" disabled>
            <Trash className="size-[0.85rem]" /> Excluir
          </Button>
        )}

        {/* Editar */}
        {selected.length === 1 ? (
          <EditResourceSheet resourceId={selected[0]} onSaved={() => refetch()} />
        ) : (
          <Button variant={'outline'} size="sm" disabled>
            <Edit className="size-[0.85rem]" /> Editar
          </Button>
        )}

        {/* Novo */}
        <NewResourceSheet onCreated={() => refetch()} />
      </div>
    </div>

    {/* 4. Tabela */}
    <DataTable
      columns={columns}
      data={items}
      loading={isLoading || isRefetching}
      page={currentPage}
      perPage={perPage}
      totalItems={totalItems}
      onChange={...}
      emptySlot={(
        <Empty>
          {/* Configurar estado vazio */}
        </Empty>
      )}
    />
  </div>
</div>
```
