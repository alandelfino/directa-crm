import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { NewCategorySheet } from './-components/new-category'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Edit, Trash, List, RefreshCw } from 'lucide-react'
import { EditCategorySheet } from './-components/edit-category'
import { useEffect, useMemo, useState } from 'react'
import { DeleteCategory } from './-components/delete-category'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'

export const Route = createFileRoute('/dashboard/categories/')({
  component: RouteComponent,
})

type ApiCategory = {
  id: number | string
  name?: string
  nome?: string
  parentId?: number | string | null
  children?: ApiCategory[]
}

type FlatCategory = {
  id: number | string
  category: ApiCategory
  depth: number
}

type CategoriesResponse = {
  items: ApiCategory[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const parseCategories = (data: unknown): ApiCategory[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as ApiCategory[]
  if (isRecord(data) && Array.isArray((data as CategoriesResponse).items)) return (data as CategoriesResponse).items
  return []
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedCategories, setSelectedCategories] = useState<Array<number | string>>([])

  const { data, isLoading, isRefetching, refetch } = useQuery<unknown>({
    queryKey: ['categories', currentPage, perPage],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/categories', {
        params: { 
          page: currentPage, 
          limit: Math.min(50, perPage),
          sortBy: 'createdAt',
          orderBy: 'desc'
        }
      })
      if (res.status !== 200) throw new Error('Erro ao carregar categorias')
      return res.data
    },
  })

  const categories: ApiCategory[] = useMemo(() => {
    return parseCategories(data)
  }, [data])

  // totalItems removido: usamos diretamente flattenedCategories.length no DataTable

  // Resetar seleção quando mudar de página ou atualizar
  useEffect(() => {
    setSelectedCategories([])
  }, [currentPage, perPage, isRefetching])

  const childrenCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const cat of categories) {
      const parentRaw = cat.parentId as unknown as string | number | null | undefined
      const parentId = parentRaw == null || parentRaw === 0 || parentRaw === '0' ? null : String(parentRaw)
      if (parentId) {
        map.set(parentId, (map.get(parentId) ?? 0) + 1)
      }
    }
    return map
  }, [categories])

  // Seleção geral removida: a listagem usa seleção única por linha

  const toggleSelectCategory = (id: number | string) => {
    // Seleção única: se já estiver selecionado, desmarca; caso contrário, seleciona apenas este
    setSelectedCategories((prev) => (prev.includes(id) ? [] : [id]))
  }

  const indent = 22

  const flattenedCategories: FlatCategory[] = useMemo(() => {
    // Se houver nested children, usar DFS direta
    const hasNested = categories.some((c) => Array.isArray(c.children) && c.children!.length > 0)
    if (hasNested) {
      const res: FlatCategory[] = []
      const visit = (cat: ApiCategory, depth: number) => {
        res.push({ id: cat.id, category: cat, depth })
        if (Array.isArray(cat.children)) {
          for (const child of cat.children) {
            visit(child, depth + 1)
          }
        }
      }
      for (const cat of categories) visit(cat, 0)
      return res
    }

    // Caso flat com parent_id, construir mapa e percorrer em pré-ordem
    const byId = new Map<string, ApiCategory>()
    const childrenMap = new Map<string, string[]>()
    const roots: string[] = []

    const getId = (c: ApiCategory) => String(c.id)
    const getParent = (c: ApiCategory) => {
      const raw = c.parentId as unknown as string | number | null | undefined
      const pid = raw == null || raw === 0 || raw === '0' ? null : String(raw)
      return pid
    }

    for (const c of categories) {
      const id = getId(c)
      byId.set(id, c)
      childrenMap.set(id, [])
    }

    for (const c of categories) {
      const id = getId(c)
      const parentId = getParent(c)
      if (parentId && childrenMap.has(parentId)) {
        childrenMap.get(parentId)!.push(id)
      } else {
        roots.push(id)
      }
    }

    const res: FlatCategory[] = []
    const visit = (id: string, depth: number) => {
      const cat = byId.get(id)
      if (!cat) return
      res.push({ id: cat.id, category: cat, depth })
      for (const childId of childrenMap.get(id) ?? []) {
        visit(childId, depth + 1)
      }
    }

    for (const root of roots) visit(root, 0)
    return res
  }, [categories])

  const columns: ColumnDef<FlatCategory>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (row) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={selectedCategories.includes(row.category.id)}
            onCheckedChange={() => toggleSelectCategory(row.category.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'id',
      header: 'ID',
      cell: (row) => <span className="font-mono text-xs">{row.category.id}</span>,
      width: '40px',
      headerClassName: 'w-[40px] min-w-[40px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[40px] min-w-[40px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => (
        (() => {
          const id = String(row.category.id)
          const hasChildren = (Array.isArray(row.category.children) && row.category.children.length > 0) || ((childrenCountMap.get(id) ?? 0) > 0)
          const guides = Array.from({ length: row.depth }, (_, i) => {
            const left = (i + 1) * indent - 1
            return (
              <span
                key={i}
                className="absolute inset-y-0 -z-10"
                style={{ left: `${left}px`, width: '1px', background: 'hsl(var(--border))' }}
              />
            )
          })
          return (
            <div className="relative overflow-hidden w-full">
              {guides}
              <div style={{ paddingLeft: `${row.depth * indent}px` }} className={hasChildren ? 'font-semibold flex items-center gap-2' : 'flex items-center gap-2'}>
                {hasChildren ? (
                  <span>{row.category.name ?? row.category.nome ?? 'Categoria'}</span>
                ) : (
                  <span className='text-neutral-700'>{row.category.name ?? row.category.nome ?? 'Categoria'}</span>
                )}
              </div>
            </div>
          )
        })()
      ),
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5',
      className: 'border-r border-neutral-200 !px-4 py-3'
    },
  ]

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Categorias" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Categorias', href: '/dashboard/categories', isLast: true }]} />
      <div className='flex flex-col w-full h-full p-6 space-y-6 flex-1 overflow-hidden'>
        <div className='flex items-center justify-between'>
          <div className='flex flex-col space-y-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>Categorias</h2>
            <p className='text-sm text-muted-foreground'>Gerencie a árvore de categorias de produtos do sistema.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedCategories([]); refetch() }}>
              {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
            </Button>

            {selectedCategories.length === 1 ? (
              <DeleteCategory categoryId={selectedCategories[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Trash className='size-[0.85rem]' /> Excluir
              </Button>
            )}

            {selectedCategories.length === 1 ? (
              <EditCategorySheet categoryId={selectedCategories[0]} categories={categories} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Edit className='size-[0.85rem]' /> Editar
              </Button>
            )}

            <NewCategorySheet />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={flattenedCategories}
          loading={isLoading || isRefetching}
          rowClassName='!h-10'
          page={currentPage}
          perPage={perPage}
          totalItems={flattenedCategories.length}
          emptyMessage='Nenhuma categoria encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <List className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma categoria ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma categoria. Comece criando sua primeira categoria.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewCategorySheet />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedCategories([]); refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            refetch()
          }}
        />
      </div>
    </div>
  )
}
