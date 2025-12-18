import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Edit, Funnel, GitFork, Trash, Type as TypeIcon, Palette, Image as ImageIcon, List, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewDerivationSheet } from './-components/new-derivation'
import { EditDerivationSheet } from './-components/edit-derivation'
import { DeleteDerivation } from './-components/delete-derivation'
import { DerivationItemsSheet } from './-components/derivation-items'

export const Route = createFileRoute('/dashboard/derivations/')({
  component: RouteComponent,
})

type Derivation = {
  id: number
  nome?: string
  name?: string
  nomeCatalogo?: string
  catalog_name?: string
  store_name?: string
  tipo?: 'Cor' | 'Texto' | 'Imagem' | 'color' | 'text' | 'image'
  type?: 'text' | 'color' | 'image'
  itens?: number
  items?: number
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedDerivations, setSelectedDerivations] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['derivations', currentPage, perPage],
    queryFn: async () => {
      // Ajuste os parâmetros conforme o Swagger do endpoint Derivations
      const response = await privateInstance.get(`api:JOs6IYNo/derivations?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar derivações')
      }
      return await response.data as any
    }
  })

  const [derivations, setDerivations] = useState<Derivation[]>([])
  const selectedDerivation = useMemo(() => derivations.find(d => d.id === selectedDerivations[0]), [derivations, selectedDerivations])
  const selectedDerivationType: 'text' | 'color' | 'image' | undefined = useMemo(() => {
    const d = selectedDerivation
    if (!d) return undefined
    const t = d.type ?? (
      d.tipo === 'color' ? 'color' :
        d.tipo === 'text' ? 'text' :
          d.tipo === 'image' ? 'image' : undefined
    )
    return t as any
  }, [selectedDerivation])

  const columns: ColumnDef<Derivation>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>
      ),
      cell: (derivation) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={selectedDerivations.includes(derivation.id)}
            onCheckedChange={() => toggleSelect(derivation.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (d) => d.nome ?? d.name ?? '',
      className: 'border-r'
    },
    {
      id: 'catalog',
      header: 'Nome no catálogo',
      cell: (d) => d.store_name ?? d.nomeCatalogo ?? d.catalog_name ?? '-',
      className: 'border-r'
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (d) => {
        const t = d.type ?? (
          d.tipo === 'color' ? 'color' :
            d.tipo === 'text' ? 'text' :
              d.tipo === 'image' ? 'image' : undefined
        )
        const label = t === 'color' ? 'Cor' : t === 'text' ? 'Texto' : t === 'image' ? 'Imagem' : '-'
        const Icon = t === 'color' ? Palette : t === 'text' ? TypeIcon : t === 'image' ? ImageIcon : null
        return (
          <Badge variant='outline' className='flex items-center gap-1'>
            {Icon ? <Icon className='h-3.5 w-3.5' /> : null}
            <span>{label}</span>
          </Badge>
        )
      },
      headerClassName: 'w-[120px] border-r',
      className: 'w-[120px]'
    },
    {
      id: 'items',
      header: 'Itens',
      cell: (d) => <span className='block'>{(d as any).items ?? d.itens ?? 0}</span>,
      headerClassName: 'w-[100px] border-r',
      className: 'w-[100px]'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray((data as any).items) ? (data as any).items : Array.isArray(data) ? data : []
    setDerivations(items)

    const itemsTotal = typeof (data as any).itemsTotal === 'number' ? (data as any).itemsTotal : items.length
    setTotalItems(itemsTotal)

    // pageTotal não é exigido aqui, DataTable calcula por totalItems/perPage
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      // Opcional: exibir toast
      console.error('Erro ao carregar derivações')
    }
  }, [isError])

  // Resetar seleção quando mudar de página ou itens por página
  useEffect(() => {
    setSelectedDerivations([])
  }, [currentPage, perPage])

  // Limpar seleção ao atualizar/refetch da listagem
  useEffect(() => {
    if (isRefetching) {
      setSelectedDerivations([])
    }
  }, [isRefetching])

  const toggleSelect = (id: number) => {
    // Seleção única: se já estiver selecionado, desmarca; caso contrário, seleciona somente ele
    if (selectedDerivations.includes(id)) {
      setSelectedDerivations([])
    } else {
      setSelectedDerivations([id])
    }
  }

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Derivações" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Derivações', href: '/dashboard/derivations', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          {/* Filters */}
          <div className='flex items-center gap-2 flex-1'>
            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedDerivations([]); refetch() }}>
              {
                (isLoading || isRefetching)
                  ? <RefreshCw className='animate-spin size-[0.85rem]' />
                  : <RefreshCw className="size-[0.85rem]" />
              }
            </Button>

            {selectedDerivations.length === 1 ? (
              <DeleteDerivation derivationId={selectedDerivations[0]} onDeleted={() => { setSelectedDerivations([]); refetch() }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selectedDerivations.length === 1 && selectedDerivationType ? (
              <DerivationItemsSheet derivationId={selectedDerivations[0]} derivationType={selectedDerivationType} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <List className="size-[0.85rem]" /> Items
              </Button>
            )}

            {selectedDerivations.length === 1 ? (
              <EditDerivationSheet derivationId={selectedDerivations[0]} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewDerivationSheet onCreated={() => { setSelectedDerivations([]); refetch() }} />
          </div>

        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={derivations}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma derivação encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitFork className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma derivação ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma derivação. Comece criando sua primeira derivação.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewDerivationSheet onCreated={() => { setSelectedDerivations([]); refetch() }} />
                  <Button variant={'outline'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedDerivations([]); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCw className='animate-spin size-[0.85rem]' /></> : <><RefreshCw className="size-[0.85rem]" /></>}
                  </Button>
                </div>
              </EmptyContent>
              <Button
                variant='link'
                asChild
                className='text-muted-foreground'
              >
                <a href='#'>
                  Saiba mais <ArrowUpRight className='inline-block ml-1 h-4 w-4' />
                </a>
              </Button>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            refetch()
          }} />

      </div>
    </div>
  )
}