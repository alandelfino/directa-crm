import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Edit, Trash, MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { NewCarrierIntegrationServiceSheet } from './new-carrier-integration-service'
import { EditCarrierIntegrationServiceSheet } from './edit-carrier-integration-service'
import { DeleteCarrierIntegrationServiceDialog } from './delete-carrier-integration-service'
import { CarrierIntegrationPostalCodeRangesSheet } from './carrier-integration-postal-code-ranges'

type CarrierIntegrationService = {
  id: number
  name: string
  carrierIntegrationId: number
  carrierServiceId: number
  carrierServiceName?: string
  storeId: number
  storeName?: string
  active?: boolean
  createdAt: string
  updatedAt: string
}

interface CarrierIntegrationServicesSheetProps {
    carrierIntegrationId: number
    onOpenChange: (open: boolean) => void
}

export function CarrierIntegrationServicesSheet({ carrierIntegrationId, onOpenChange }: CarrierIntegrationServicesSheetProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Modals de edição e exclusão
  const [editServiceId, setEditServiceId] = useState<number | null>(null)
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null)
  const [postalRangesServiceId, setPostalRangesServiceId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['carrier-integration-services', carrierIntegrationId, currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services`, {
        params: {
          page: currentPage,
          limit: perPage,
          sortBy: 'id',
          orderBy: 'desc'
        }
      })
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })

  useEffect(() => {
    if (data) {
        setTotalItems(data.total || 0)
    }
  }, [data])

  const items: CarrierIntegrationService[] = useMemo(() => {
    if (!data) return []
    const raw = data.items || []
    return raw
  }, [data])

  const columns: ColumnDef<CarrierIntegrationService>[] = [
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
        <span className='block truncate min-w-0' title={i.name}>{i.name}</span>
      ),
      headerClassName: 'min-w-[150px] border-r',
      className: 'min-w-[150px] !px-4',
    },
    {
        id: 'store',
        header: 'Loja',
        cell: (i) => (
          <span className='block truncate min-w-0 text-muted-foreground'>{i.storeName || `#${i.storeId}`}</span>
        ),
        headerClassName: 'min-w-[120px] border-r',
        className: 'min-w-[120px] !px-4',
    },
    {
        id: 'service',
        header: 'Serviço Original',
        cell: (i) => (
          <span className='block truncate min-w-0 text-muted-foreground'>{i.carrierServiceName || `#${i.carrierServiceId}`}</span>
        ),
        headerClassName: 'min-w-[150px] border-r',
        className: 'min-w-[150px] !px-4',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (i) => (
          <Badge variant={i.active ? 'default' : 'secondary'} className={i.active ? 'bg-emerald-500 hover:bg-emerald-600 border-transparent' : ''}>
            {i.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
        headerClassName: 'w-[90px] whitespace-nowrap border-r',
        className: 'w-[90px] whitespace-nowrap !px-4',
    },
  ]

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-[1000px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Serviços da Integração</SheetTitle>
          <SheetDescription>Gerencie os serviços vinculados a esta integração.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center gap-2 px-2 justify-end'>
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
            
            <Button 
                size={'sm'} 
                variant={'outline'} 
                disabled={!selectedId}
                onClick={() => selectedId && setDeleteServiceId(selectedId)}
            > 
                <Trash className="size-[0.85rem] mr-2" /> Excluir
            </Button>
            
            <Button 
                size={'sm'} 
                variant={'outline'} 
                disabled={!selectedId}
                onClick={() => selectedId && setPostalRangesServiceId(selectedId)}
            > 
                <MapPin className="size-[0.85rem] mr-2" /> Faixas de CEP
            </Button>

            <Button 
                size={'sm'} 
                variant={'outline'} 
                disabled={!selectedId}
                onClick={() => selectedId && setEditServiceId(selectedId)}
            > 
                <Edit className="size-[0.85rem] mr-2" /> Editar
            </Button>
            
            <NewCarrierIntegrationServiceSheet carrierIntegrationId={carrierIntegrationId} onCreated={() => refetch()} />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden'>
            <DataTable<CarrierIntegrationService>
              columns={columns}
              data={items}
              loading={isLoading || isRefetching}
              page={currentPage}
              totalItems={totalItems}
              perPage={perPage}
              onChange={(vals) => {
                if (vals.page) setCurrentPage(vals.page)
                if (vals.perPage) setPerPage(vals.perPage)
              }}
              onRowClick={(item) => setSelectedId(item.id)}
              rowIsSelected={(item) => item.id === selectedId}
            />
          </div>
        </div>

        {editServiceId && (
            <EditCarrierIntegrationServiceSheet 
                carrierIntegrationId={carrierIntegrationId} 
                serviceId={editServiceId} 
                onUpdated={() => refetch()}
                onOpenChange={(open) => !open && setEditServiceId(null)}
            />
        )}

        {deleteServiceId && (
            <DeleteCarrierIntegrationServiceDialog 
                carrierIntegrationId={carrierIntegrationId} 
                serviceId={deleteServiceId} 
                onDeleted={() => { setSelectedId(null); refetch() }}
                onOpenChange={(open) => !open && setDeleteServiceId(null)}
            />
        )}

        {postalRangesServiceId && (
            <CarrierIntegrationPostalCodeRangesSheet 
                carrierIntegrationId={carrierIntegrationId}
                serviceId={postalRangesServiceId}
                onOpenChange={(open) => !open && setPostalRangesServiceId(null)}
            />
        )}
      </SheetContent>
    </Sheet>
  )
}
