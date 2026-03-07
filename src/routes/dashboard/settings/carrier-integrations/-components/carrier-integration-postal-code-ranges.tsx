import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { RefreshCw, Edit, Trash, MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { NewCarrierIntegrationPostalCodeRangeSheet } from './new-carrier-integration-postal-code-range'
import { EditCarrierIntegrationPostalCodeRangeSheet } from './edit-carrier-integration-postal-code-range'
import { DeleteCarrierIntegrationPostalCodeRangeDialog } from './delete-carrier-integration-postal-code-range'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'

type CarrierIntegrationPostalCodeRange = {
  id: number
  carrierIntegrationXServiceId: number
  name: string
  minPostalCode: string
  maxPostalCode: string
  minWeight: number
  maxWeight: number
  price: number
  deadline: number
  createdAt: string
  updatedAt: string
}

interface CarrierIntegrationPostalCodeRangesSheetProps {
    carrierIntegrationId: number
    serviceId: number
    onOpenChange: (open: boolean) => void
}

export function CarrierIntegrationPostalCodeRangesSheet({ carrierIntegrationId, serviceId, onOpenChange }: CarrierIntegrationPostalCodeRangesSheetProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Modals de edição e exclusão
  const [editRangeId, setEditRangeId] = useState<number | null>(null)
  const [deleteRangeId, setDeleteRangeId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['carrier-integration-postal-code-ranges', serviceId, currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}/postal-code-ranges`, {
        params: {
          page: currentPage,
          limit: perPage
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

  const items: CarrierIntegrationPostalCodeRange[] = useMemo(() => {
    if (!data) return []
    const raw = data.items || []
    return raw
  }, [data])

  const columns: ColumnDef<CarrierIntegrationPostalCodeRange>[] = [
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
        <span className='block truncate min-w-0 font-medium' title={i.name}>{i.name}</span>
      ),
      headerClassName: 'min-w-[150px] border-r',
      className: 'min-w-[150px] !px-4',
    },
    {
        id: 'postalCode',
        header: 'Faixa de CEP',
        cell: (i) => (
          <span className='block truncate min-w-0 text-muted-foreground'>
            {i.minPostalCode} - {i.maxPostalCode}
          </span>
        ),
        headerClassName: 'min-w-[150px] border-r',
        className: 'min-w-[150px] !px-4',
    },
    {
        id: 'weight',
        header: 'Peso (kg)',
        cell: (i) => (
          <span className='block truncate min-w-0 text-muted-foreground'>
            {(i.minWeight / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}kg - {(i.maxWeight / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}kg
          </span>
        ),
        headerClassName: 'min-w-[120px] border-r',
        className: 'min-w-[120px] !px-4',
    },
    {
        id: 'deadline',
        header: 'Prazo',
        cell: (i) => (
          <span className='block truncate min-w-0 text-muted-foreground text-center'>
            {i.deadline} {i.deadline === 1 ? 'dia' : 'dias'}
          </span>
        ),
        headerClassName: 'min-w-[80px] border-r text-center',
        className: 'min-w-[80px] !px-4 text-center',
    },
    {
        id: 'price',
        header: 'Preço',
        cell: (i) => (
          <span className='block truncate min-w-0 font-medium text-right'>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.price / 100)}
          </span>
        ),
        headerClassName: 'min-w-[100px] border-r text-right',
        className: 'min-w-[100px] !px-4 text-right',
    },
  ]

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-[920px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Faixas de CEP</SheetTitle>
          <SheetDescription>Gerencie as faixas de CEP e preços para este serviço.</SheetDescription>
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
                onClick={() => selectedId && setDeleteRangeId(selectedId)}
            > 
                <Trash className="size-[0.85rem] mr-2" /> Excluir
            </Button>
            
            <Button 
                size={'sm'} 
                variant={'outline'} 
                disabled={!selectedId}
                onClick={() => selectedId && setEditRangeId(selectedId)}
            > 
                <Edit className="size-[0.85rem] mr-2" /> Editar
            </Button>
            
            <NewCarrierIntegrationPostalCodeRangeSheet 
                carrierIntegrationId={carrierIntegrationId} 
                serviceId={serviceId}
                onCreated={() => refetch()} 
            />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden'>
            <DataTable<CarrierIntegrationPostalCodeRange>
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
              emptySlot={
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><MapPin className="size-10" /></EmptyMedia>
                    <EmptyTitle>Nenhuma faixa de CEP encontrada</EmptyTitle>
                    <EmptyDescription>Crie uma nova faixa de CEP para começar.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <NewCarrierIntegrationPostalCodeRangeSheet 
                        carrierIntegrationId={carrierIntegrationId} 
                        serviceId={serviceId}
                        onCreated={() => refetch()} 
                    />
                  </EmptyContent>
                </Empty>
              }
            />
          </div>
        </div>

        {editRangeId && (
            <EditCarrierIntegrationPostalCodeRangeSheet 
                carrierIntegrationId={carrierIntegrationId} 
                serviceId={serviceId}
                rangeId={editRangeId} 
                onUpdated={() => refetch()}
                onOpenChange={(open) => !open && setEditRangeId(null)}
            />
        )}

        {deleteRangeId && (
            <DeleteCarrierIntegrationPostalCodeRangeDialog 
                carrierIntegrationId={carrierIntegrationId} 
                serviceId={serviceId}
                rangeId={deleteRangeId} 
                onDeleted={() => { setSelectedId(null); refetch() }}
                onOpenChange={(open) => !open && setDeleteRangeId(null)}
            />
        )}
      </SheetContent>
    </Sheet>
  )
}
