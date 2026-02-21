import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { List, RefreshCw } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { DerivationItemCreateDialog } from './derivation-item-create-dialog'
import { DerivationItemEditDialog } from './derivation-item-edit-dialog'
import { DerivationItemDeleteDialog } from './derivation-item-delete-dialog'
import { privateInstance } from '@/lib/auth'
import { IconEdit, IconTrash } from '@tabler/icons-react'

type DerivationItem = {
  id: number
  order: number
  value: string
  name?: string
}

export function DerivationItemsSheet({ derivationId, derivationType }: { derivationId: number, derivationType: 'text' | 'color' | 'image' }) {
  const [open, setOpen] = useState(false)
  const [itemsLocal, setItemsLocal] = useState<DerivationItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['derivation-items', derivationId],
    queryFn: async () => {
      // Endpoint de listagem conforme Derivations spec
      const response = await privateInstance.get(`/tenant/derivation-items`, {
        params: {
          derivationId: derivationId,
          limit: 100, // Fetch many items as it's a list within a sheet
          sortBy: 'order',
          orderBy: 'asc'
        }
      })
      if (response.status !== 200) throw new Error('Erro ao carregar itens da derivação')
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: open,
  })

  const items: DerivationItem[] = useMemo(() => {
    if (!data) return []
    const raw = data.items || []
    const normalized: DerivationItem[] = raw.map((i: any) => ({
      id: Number(i.id),
      order: Number(i.order ?? 0),
      value: String(i.value ?? ''),
      name: i.name ?? '',
    }))
    // Already sorted by backend but ensure frontend sort too
    normalized.sort((a, b) => a.order - b.order)
    return normalized
  }, [data])

  useEffect(() => {
    setItemsLocal(items)
  }, [items])

  const { mutateAsync: saveOrder } = useMutation({
    mutationFn: async (payload: { derivationItemId: number; order: number }) => {
      const response = await privateInstance.put(`/tenant/derivation-items/reorder`, payload)
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('Erro ao reordenar itens')
      }
    },
    onSuccess: () => {
      toast.success('Ordem dos itens atualizada com sucesso!')
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao reordenar itens', {
        description: errorData?.detail || 'Não foi possível atualizar a ordem dos itens.'
      })
    },
    onMutate: () => {
      setIsReordering(true)
    },
    onSettled: () => {
      setIsReordering(false)
    }
  })

  const selectedItem = useMemo(() => itemsLocal.find((i) => i.id === selectedId) ?? null, [itemsLocal, selectedId])

  const columns: ColumnDef<DerivationItem>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>
      ),
      cell: (i) => (
        <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedId === i.id}
            onCheckedChange={() => setSelectedId(selectedId === i.id ? null : i.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r',
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (i) => (
        <span className='block truncate min-w-0' title={i.name ?? ''}>{i.name ?? ''}</span>
      ),
      width: '240px',
      headerClassName: 'w-[240px] min-w-[240px] border-r',
      className: 'w-[240px] min-w-[240px] !px-4',
    },
    {
      id: 'value',
      header: 'Valor',
      cell: (i) => (
        derivationType === 'color' ? (
          <div className='flex items-center gap-2'>
            <div className='rounded-sm border h-[20px] w-[20px]' style={{ backgroundColor: /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(i.value ?? '') ? i.value : '#000000' }} />
            <span className='truncate text-sm text-muted-foreground' title={i.value}>{i.value}</span>
          </div>
        ) : derivationType === 'image' ? (
          <div className='flex items-center gap-2'>
            <div className='rounded-sm border overflow-hidden h-[24px] w-[24px]'>
              <img src={i.value} alt='Imagem do item' className='h-full w-full object-cover' />
            </div>
          </div>
        ) : (
          <span className='truncate text-sm text-muted-foreground' title={i.value}>{i.value}</span>
        )
      ),
      headerClassName: 'border-r',
      className: '!px-4',
    },
  ]

  // Create item dialog
  // Create dialog agora é um componente isolado que gerencia seu próprio estado e mutation

  // Edit item dialog
  // Edit dialog agora é um componente isolado que gerencia seu próprio estado e mutation

  // Delete item
  // Delete dialog agora é um componente isolado que gerencia seu próprio estado e mutation

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) refetch() }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <List className="size-[0.85rem]" /> Items
        </Button>
      </SheetTrigger>
      {/* Sheet com largura ajustada e layout em coluna ocupando toda a altura */}
      <SheetContent className='w-lg sm:max-w-[1000px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Itens da derivação</SheetTitle>
          <SheetDescription>Gerencie os itens da derivação selecionada.</SheetDescription>
        </SheetHeader>

        {/* Conteúdo principal ocupando todo o espaço disponível */}
        <div className='flex flex-col flex-1 overflow-hidden'>
          {/* Actions */}
          <div className='flex items-center gap-2 px-4 justify-end'>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => { setSelectedId(null); refetch() }}
              disabled={isLoading || isRefetching}
            >
              {isLoading || isRefetching ? (
                <RefreshCw className="size-[0.85rem] animate-spin" />
              ) : (
                <RefreshCw className="size-[0.85rem]" />
              )}
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            {selectedItem ? (
              <>
                <DerivationItemEditDialog derivationType={derivationType} item={selectedItem} onUpdated={() => { refetch(); }} />
                <DerivationItemDeleteDialog itemId={selectedItem.id} onDeleted={() => { refetch(); }} />
              </>
            ) : (
              <>
                <Button size={'sm'} variant={'outline'} disabled> <IconEdit className="size-[0.85rem]" /> Editar</Button>
                <Button size={'sm'} variant={'outline'} disabled> <IconTrash className="size-[0.85rem]" /> Excluir</Button>
              </>
            )}
            <DerivationItemCreateDialog derivationId={derivationId} derivationType={derivationType} onCreated={() => refetch()} />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<DerivationItem>
              columns={columns}
              data={itemsLocal}
              loading={isLoading || isRefetching || isReordering}
              hideFooter={true}
              enableReorder={true}
              reorderDisabled={isReordering}
              onReorder={(ordered) => {
                setItemsLocal(ordered)
              }}
              onReorderItem={async ({ item, index }) => {
                try {
                  await saveOrder({ derivationItemId: item.id, order: index + 1 })
                } catch {
                  refetch()
                }
              }}
              onRowClick={(item) => setSelectedId(item.id)}
              rowIsSelected={(item) => item.id === selectedId}
            />
          </div>
        </div>

        <SheetFooter className='border-t'>
          <div className='flex w-full items-center justify-end'>
            <SheetClose asChild>
              <Button variant='outline' size="sm" className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
