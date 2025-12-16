import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { List } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { DerivationItemCreateDialog } from './derivation-item-create-dialog'
import { DerivationItemEditDialog } from './derivation-item-edit-dialog'
import { DerivationItemDeleteDialog } from './derivation-item-delete-dialog'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

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
  // Guarda a ordenação anterior para reverter em caso de erro ao salvar
  const prevOrderRef = useRef<DerivationItem[]>([])

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['derivation-items', derivationId],
    queryFn: async () => {
      // Endpoint de listagem conforme Derivations spec
      const response = await privateInstance.get(`/api:JOs6IYNo/derivation_items?derivation_id=${derivationId}`)
      if (response.status !== 200) throw new Error('Erro ao carregar itens da derivação')
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: open,
  })

  const items: DerivationItem[] = useMemo(() => {
    if (!data) return []
    const raw = Array.isArray((data as any).items) ? (data as any).items : Array.isArray(data) ? data : []
    const normalized: DerivationItem[] = raw.map((i: any) => ({
      id: Number(i.id),
      order: Number(i.order ?? i.ordem ?? i.position ?? 0),
      value: String(i.value ?? i.valor ?? i.color ?? i.image_url ?? ''),
      name: typeof i.name === 'string' ? i.name : (typeof i.nome === 'string' ? i.nome : ''),
    }))
    normalized.sort((a, b) => a.order - b.order)
    return normalized
  }, [data])

  useEffect(() => {
    setItemsLocal(items)
  }, [items])

  const selectedItem = useMemo(() => itemsLocal.find((i) => i.id === selectedId) ?? null, [itemsLocal, selectedId])

  const columns: ColumnDef<DerivationItem>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>
      ),
      cell: (i) => (
        <div className='flex items-center justify-center'>
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
            <span className='truncate text-sm text-muted-foreground' title={i.value}>{i.value}</span>
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

  // Persistir ordenação
  const { isPending: savingOrder, mutate: reorderMutation } = useMutation({
    mutationFn: async (reordered: DerivationItem[]) => {
      const payload = {
        derivation_id: derivationId,
        items: reordered.map((it) => ({ id: String(it.id) }))
      }
      const response = await privateInstance.put(
        '/api:JOs6IYNo/derivation_items_reorder',
        payload
      )
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao salvar ordenação')
      return true
    },
    onSuccess: () => {
      toast.success('Ordenação salva!')
    },
    onError: () => {
      // Reverte para a ordenação anterior caso ocorra erro
      setItemsLocal(prevOrderRef.current)
      toast.error('Não foi possível salvar a ordenação. Voltamos para a ordenação anterior.')
      refetch()
    }
  })

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
            {selectedItem ? (
              <>
                <DerivationItemEditDialog derivationId={derivationId} derivationType={derivationType} item={selectedItem} onUpdated={() => { refetch(); }} />
                <DerivationItemDeleteDialog itemId={selectedItem.id} onDeleted={() => { refetch(); }} />
              </>
            ) : (
              <>
                <Button size={'sm'} variant={'outline'} disabled>Editar</Button>
                <Button size={'sm'} variant={'outline'} disabled>Excluir</Button>
              </>
            )}
            <DerivationItemCreateDialog derivationId={derivationId} derivationType={derivationType} itemsCount={itemsLocal.length} onCreated={() => refetch()} />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<DerivationItem>
              columns={columns}
              data={itemsLocal}
              loading={isLoading || isRefetching}
              hideFooter={true}
              enableReorder={true}
              reorderDisabled={savingOrder}
              onRowClick={(item) => setSelectedId(item.id)}
              rowIsSelected={(item) => item.id === selectedId}
              onReorder={(reordered) => {
                const next = reordered.map((it, idx) => ({ ...it, order: idx + 1 }))
                prevOrderRef.current = itemsLocal
                setItemsLocal(next)
                reorderMutation(next)
              }}
            />
          </div>
        </div>

        <SheetFooter className='border-t'>
          <div className='flex w-full items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              {itemsLocal.length} {itemsLocal.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
            </span>
            <SheetClose asChild>
              <Button variant='outline' className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
