import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { MapPin, RefreshCw, Edit, Trash } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { CustomerAddressCreateDialog } from './customer-address-create-dialog'
import { CustomerAddressEditDialog } from './customer-address-edit-dialog'
import { CustomerAddressDeleteDialog } from './customer-address-delete-dialog'

type AddressItem = {
  id: number
  name: string
  streetName: string
  number: number
  neighborhood: string
  city: string
  state: 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO'
  zipCode: string
  country: string
  complement?: string
  createdAt: string
  updatedAt: string
}

export function CustomerAddressSheet({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/customers/${customerId}/address`)
      if (response.status !== 200) throw new Error('Erro ao carregar endereços')
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: open,
  })

  const items: AddressItem[] = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data.items)) return data.items
    if (Array.isArray(data)) return data
    return []
  }, [data])

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

  const columns: ColumnDef<AddressItem>[] = [
    {
      id: 'select',
      width: '30px',
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
      headerClassName: 'w-[30px] max-w-[30px] border-r',
      className: 'font-medium border-r',
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (i) => (
        <span className='font-medium'>{i.name}</span>
      ),
      width: '150px',
      headerClassName: 'min-w-[150px] border-r',
      className: 'min-w-[150px] !px-4',
    },
    {
      id: 'street',
      header: 'Endereço',
      cell: (i) => (
        <div className="flex flex-col">
            <span className='font-medium'>{i.streetName}, {i.number}</span>
            <span className='text-xs text-muted-foreground'>{i.neighborhood} {i.complement ? `- ${i.complement}` : ''}</span>
        </div>
      ),
      width: '240px',
      headerClassName: 'min-w-[240px] border-r',
      className: 'min-w-[240px] !px-4',
    },
    {
      id: 'city',
      header: 'Cidade/UF',
      cell: (i) => (
        <span>{i.city}/{i.state}</span>
      ),
      width: '200px',
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px] !px-4',
    },
    {
      id: 'zip',
      header: 'CEP',
      cell: (i) => (
        <span>{i.zipCode}</span>
      ),
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px] !px-4',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) refetch() }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <MapPin className="size-[0.85rem]" /> Endereços
        </Button>
      </SheetTrigger>
      <SheetContent className='w-full sm:max-w-[1000px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Endereços do Cliente</SheetTitle>
          <SheetDescription>Gerencie os endereços cadastrados.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center gap-2 px-4 justify-end'>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => { setSelectedId(null); refetch() }}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw className={`size-[0.85rem] ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            
            {selectedItem ? (
              <>
                <CustomerAddressEditDialog 
                    customerId={customerId} 
                    address={selectedItem} 
                    onUpdated={() => { refetch(); }} 
                />
                <CustomerAddressDeleteDialog 
                    customerId={customerId} 
                    addressId={selectedItem.id} 
                    onDeleted={() => { refetch(); setSelectedId(null); }} 
                />
              </>
            ) : (
              <>
                <Button size={'sm'} variant={'outline'} disabled> <Edit className="size-[0.85rem]" /> Editar</Button>
                <Button size={'sm'} variant={'outline'} disabled> <Trash className="size-[0.85rem]" /> Excluir</Button>
              </>
            )}
            
            <CustomerAddressCreateDialog customerId={customerId} onCreated={() => refetch()} />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<AddressItem>
              columns={columns}
              data={items}
              loading={isLoading || isRefetching}
              hideFooter={true}
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
