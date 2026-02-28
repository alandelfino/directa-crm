import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { User, Loader, KeyRound, Edit, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { UserFormSheet as UserFormDialog, type CustomerUser } from './customer-user-form-sheet'
import { UserEditSheet as UserEditDialog } from './customer-user-edit-sheet'



function RefreshPasswordDialog({ customerId, userId }: { customerId: number, userId: string }) {
    const { isPending: refreshing, mutate: refreshPassword } = useMutation({
        mutationFn: async () => {
          const response = await privateInstance.post(`/tenant/customers/${customerId}/users/${userId}/refresh-password`)
          return response.data
        },
        onSuccess: (data) => {
          toast.success('Senha gerada com sucesso!', {
            description: data.message || 'Uma nova senha foi enviada para o email do usuário.'
          })
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || 'Erro ao gerar senha', {
              description: errorData?.detail || 'Não foi possível gerar uma nova senha.'
            })
        }
      })

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size={'sm'} variant={'outline'}> <KeyRound className="size-[0.85rem]" /> Gerar nova senha</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Gerar nova senha?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Uma nova senha será gerada e enviada para o email do usuário. O acesso com a senha anterior será revogado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => refreshPassword()} disabled={refreshing}>
                        {refreshing && <Loader className="animate-spin size-4 mr-2" />}
                        Gerar Senha
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function CustomerUserSheet({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer-users', customerId],
    queryFn: async () => {
        const response = await privateInstance.get(`/tenant/customers/${customerId}/users`, {
            params: {
                page: 1,
                limit: 100
            }
        })
        return response.data.items as CustomerUser[]
    },
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0
  })

  const items: CustomerUser[] = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data
    return []
  }, [data])

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

  const columns: ColumnDef<CustomerUser>[] = [
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
        cell: (item) => item.name,
        width: '200px',
        headerClassName: 'min-w-[200px] border-r',
        className: 'min-w-[200px] !px-4',
    },
    {
        id: 'email',
        header: 'Email',
        cell: (item) => item.email,
        width: '250px',
        headerClassName: 'min-w-[250px] border-r',
        className: 'min-w-[250px] !px-4',
    },
    {
        id: 'store',
        header: 'Loja',
        cell: (item) => item.store?.name || '—',
        width: '150px',
        headerClassName: 'min-w-[150px] border-r',
        className: 'min-w-[150px] !px-4',
    },
    {
        id: 'priceTable',
        header: 'Tabela de Preço',
        cell: (item) => item.priceTable?.name || '—',
        width: '150px',
        headerClassName: 'min-w-[150px] border-r',
        className: 'min-w-[150px] !px-4',
    },
    {
        id: 'status',
        header: 'Status',
        cell: (item) => (
            <Badge variant={item.active ? 'default' : 'secondary'} className='rounded-full'>
                {item.active ? 'Ativo' : 'Inativo'}
            </Badge>
        ),
        width: '100px',
        headerClassName: 'min-w-[100px]',
        className: 'min-w-[100px] !px-4',
    }
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if(o) refetch() }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <User className="size-[0.85rem]" /> Usuários
        </Button>
      </SheetTrigger>
      <SheetContent className='w-full sm:max-w-[900px] p-0'>
        <SheetHeader className="px-4 py-4">
          <SheetTitle>Usuários do Cliente</SheetTitle>
          <SheetDescription>
            Gerencie o acesso dos usuários do cliente ao sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-2 px-4 justify-end">
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
                        <RefreshPasswordDialog customerId={customerId} userId={selectedItem.id} />
                        <UserEditDialog customerId={customerId} user={selectedItem} onSuccess={() => { refetch(); }} />
                    </>
                ) : (
                    <>
                         <Button size={'sm'} variant={'outline'} disabled> <KeyRound className="size-[0.85rem]" /> Gerar nova senha</Button>
                         <Button size={'sm'} variant={'outline'} disabled> <Edit className="size-[0.85rem]" /> Editar</Button>
                    </>
                )}

                <UserFormDialog customerId={customerId} onSuccess={refetch} />
            </div>
            
            <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
                <DataTable 
                    columns={columns} 
                    data={items} 
                    loading={isLoading || isRefetching}
                    hideFooter={true}
                    onRowClick={(item) => setSelectedId(item.id)}
                    rowIsSelected={(item) => item.id === selectedId}
                />
            </div>
        </div>

        <SheetFooter className="border-t">
          <div className='flex w-full items-center justify-end'>
            <SheetClose asChild>
              <Button variant="outline" size="sm" className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
