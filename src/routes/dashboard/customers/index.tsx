import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCw, Trash, BookUser, Funnel, ArrowUpDown, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { NewCustomerSheet } from './-components/new-customer'
import { EditCustomerSheet } from './-components/edit-customer'
import { DeleteCustomerDialog } from './-components/delete-customer'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/dashboard/customers/')({
    component: RouteComponent,
})

type Customer = {
    id: number
    nameOrCompanyName: string
    lastNameOrTradeName: string
    personType: 'natural' | 'entity'
    cpfOrCnpj: string
    rgOrIe: string
    phone: string
    email: string
    createdAt: string
    updatedAt: string
}

type CustomersResponse = {
    page: number
    limit: number
    totalPages: number
    total: number
    items: Customer[]
}

function RouteComponent() {
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage, setPerPage] = useState(20)
    const [selected, setSelected] = useState<number[]>([])
    
    // Filter and Sorting State
    const [sortBy, setSortBy] = useState('createdAt')
    const [orderBy, setOrderBy] = useState('desc')
    const [filterName, setFilterName] = useState('')
    const [filterNameOperator, setFilterNameOperator] = useState('cont')

    // Local Filter State (for Popover)
    const [localSortBy, setLocalSortBy] = useState('createdAt')
    const [localOrderBy, setLocalOrderBy] = useState('desc')
    const [localFilterName, setLocalFilterName] = useState('')
    const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    const activeFilterCount = (filterName ? 1 : 0)

    const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        queryKey: ['customers', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
        queryFn: async () => {
            const searchParams = new URLSearchParams()
            searchParams.append('page', currentPage.toString())
            searchParams.append('limit', Math.min(100, perPage).toString())
            searchParams.append('sortBy', sortBy)
            searchParams.append('orderBy', orderBy)

            if (filterName) {
                searchParams.append('nameOrCompanyName', JSON.stringify({
                    operator: filterNameOperator,
                    value: filterName
                }))
            }

            const response = await privateInstance.get(`/tenant/customers?${searchParams.toString()}`)
            if (response.status !== 200) {
                throw new Error('Erro ao carregar clientes')
            }
            return response.data as CustomersResponse
        }
    })

    const [items, setItems] = useState<Customer[]>([])
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    // Helpers para exibir CPF/CNPJ formatados na tabela
    const onlyDigits = (v?: string) => (v ?? '').replace(/\D/g, '')
    const formatCpf = (digits: string) => {
        const d = onlyDigits(digits).slice(0, 11)
        return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    const formatCnpj = (digits: string) => {
        const d = onlyDigits(digits).slice(0, 14)
        return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }

    useEffect(() => {
        if (!data) return
        setItems(data.items || [])
        setTotalItems(data.total || 0)
        setTotalPages(data.totalPages || 1)
    }, [data])

    useEffect(() => {
        if (isError) {
            const errorData = (error as any)?.response?.data
            toast.error(errorData?.title || 'Erro ao carregar clientes', {
                description: errorData?.detail || 'Não foi possível carregar a lista de clientes.'
            })
        }
    }, [isError, error])

    useEffect(() => { setSelected([]) }, [currentPage, perPage, sortBy, orderBy, filterName])
    useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
    useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

    const toggleSelectAll = () => { if (selected.length === items.length) setSelected([]); else setSelected(items.map(i => i.id)) }
    const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected(selected.filter(s => s !== id)); else setSelected([...selected, id]) }

    const columns: ColumnDef<Customer>[] = [
        {
            id: 'select',
            width: '60px',
            header: () => (
                <div className='flex justify-center items-center'>
                    <Checkbox
                        checked={items.length > 0 && selected.length === items.length}
                        onCheckedChange={toggleSelectAll}
                    />
                </div>
            ),
            cell: (row) => (
                <div className='flex justify-center items-center'>
                    <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                    />
                </div>
            ),
            headerClassName: 'w-[60px] min-w-[60px] border-r',
            className: 'w-[60px] min-w-[60px] font-medium border-r p-2!'
        },
        { id: 'nameOrCompanyName', header: 'Nome/Razão Social', width: '280px', cell: (c) => c.nameOrCompanyName ?? '—', headerClassName: 'w-[280px] min-w-[280px] border-r', className: 'w-[280px] min-w-[280px] p-2!' },
        { id: 'email', header: 'Email', width: '260px', cell: (c) => c.email ?? '—', headerClassName: 'w-[260px] min-w-[260px] border-r', className: 'w-[260px] min-w-[260px] p-2!' },
        { id: 'cpfOrCnpj', header: 'CPF/CNPJ', width: '180px', cell: (c) => (c.personType === 'entity' ? formatCnpj(c.cpfOrCnpj ?? '') : formatCpf(c.cpfOrCnpj ?? '')) || '—', headerClassName: 'w-[180px] min-w-[180px] border-r', className: 'w-[180px] min-w-[180px] p-2!' },
        { id: 'phone', header: 'Telefone', width: '150px', cell: (c) => c.phone ?? '—', headerClassName: 'w-[150px] min-w-[150px] border-r', className: 'w-[150px] min-w-[150px] p-2!' },
        { id: 'personType', header: 'Tipo', width: '120px', cell: (c) => ({ natural: 'Física', entity: 'Jurídica' }[c.personType] || c.personType), headerClassName: 'w-[120px] min-w-[120px] border-r', className: 'w-[120px] min-w-[120px] p-2!' },
    ]

    return (
        <div className='flex flex-col w-full h-full overflow-x-hidden'>
            <Topbar title="Clientes" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Clientes', href: '/dashboard/customers', isLast: true }]} />
            <div className='flex flex-col w-full h-full flex-1 overflow-hidden min-w-0'>
                <div className='border-b flex w-full items-center p-2 gap-4 max-w-full overflow-x-hidden'>
                    <div className='flex items-center gap-4 flex-1'>
                        <Popover open={isFilterOpen} onOpenChange={(open) => {
                            if (open) {
                                setLocalSortBy(sortBy)
                                setLocalOrderBy(orderBy)
                                setLocalFilterName(filterName)
                                setLocalFilterNameOperator(filterNameOperator)
                            }
                            setIsFilterOpen(open)
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant={'outline'} size="sm">
                                    <Funnel className="size-[0.85rem]" /> Filtros
                                    {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] p-5" align="start">
                                <div className="flex flex-col gap-5">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <ArrowUpDown className="h-4 w-4 text-primary" />
                                            </div>
                                            <h4 className="font-semibold leading-none">Ordenação</h4>
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <div className="flex-1">
                                                <Select value={localSortBy} onValueChange={setLocalSortBy}>
                                                    <SelectTrigger className="h-9 w-full">
                                                        <SelectValue placeholder="Campo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="id">ID</SelectItem>
                                                        <SelectItem value="createdAt">Criado em</SelectItem>
                                                        <SelectItem value="nameOrCompanyName">Nome/Razão Social</SelectItem>
                                                        <SelectItem value="email">Email</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                onClick={() => setLocalOrderBy(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                title={localOrderBy === 'asc' ? 'Crescente' : 'Decrescente'}
                                            >
                                                {localOrderBy === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpZA className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <Funnel className="h-4 w-4 text-primary" />
                                            </div>
                                            <h4 className="font-semibold leading-none">Filtros</h4>
                                        </div>
                                        <div className="grid gap-3">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome/Razão Social</Label>
                                                <div className="flex gap-2">
                                                    <Select value={localFilterNameOperator} onValueChange={setLocalFilterNameOperator}>
                                                        <SelectTrigger className="w-[130px] h-9">
                                                            <SelectValue placeholder="Op." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="cont">Contém</SelectItem>
                                                            <SelectItem value="eq">Igual</SelectItem>
                                                            <SelectItem value="ne">Diferente</SelectItem>
                                                            <SelectItem value="sw">Começa com</SelectItem>
                                                            <SelectItem value="ew">Termina com</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        id="name"
                                                        value={localFilterName}
                                                        onChange={(e) => setLocalFilterName(e.target.value)}
                                                        className="h-9 flex-1"
                                                        placeholder="Filtrar por nome..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" size="default" className="flex-1" onClick={() => {
                                            setLocalSortBy('createdAt')
                                            setLocalOrderBy('desc')
                                            setLocalFilterName('')
                                            setLocalFilterNameOperator('cont')
                                            
                                            setSortBy('createdAt')
                                            setOrderBy('desc')
                                            setFilterName('')
                                            setFilterNameOperator('cont')
                                            setCurrentPage(1)
                                            setIsFilterOpen(false)
                                        }}>
                                            Limpar tudo
                                        </Button>
                                        <Button size="sm" className="flex-1" onClick={() => {
                                            setSortBy(localSortBy)
                                            setOrderBy(localOrderBy)
                                            setFilterName(localFilterName)
                                            setFilterNameOperator(localFilterNameOperator)
                                            setCurrentPage(1)
                                            setIsFilterOpen(false)
                                        }}>
                                            Aplicar
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                            {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
                        </Button>

                        {selected.length === 1 ? (
                            <DeleteCustomerDialog customerId={selected[0]} onDeleted={() => { setSelected([]); refetch() }} />
                        ) : (
                            <Button variant={'outline'} size="sm" disabled>
                                <Trash className="size-[0.85rem]" /> Excluir
                            </Button>
                        )}

                        {selected.length === 1 ? (
                            <EditCustomerSheet customerId={selected[0]} onSaved={() => { refetch() }} />
                        ) : (
                            <Button variant={'outline'} size="sm" disabled>
                                <Edit className="size-[0.85rem]" /> Editar
                            </Button>
                        )}
                        <NewCustomerSheet onCreated={() => { refetch() }} />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={items}
                    loading={isLoading || isRefetching}
                    page={currentPage}
                    perPage={perPage}
                    totalItems={totalItems}
                    emptyMessage='Nenhum cliente encontrado'
                    emptySlot={(
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <BookUser className='h-6 w-6' />
                                </EmptyMedia>
                                <EmptyTitle>Nenhum cliente ainda</EmptyTitle>
                                <EmptyDescription>
                                    Você ainda não cadastrou clientes. Comece criando seu primeiro cliente.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className='flex gap-2'>
                                    <NewCustomerSheet onCreated={() => { refetch() }} />
                                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
                                        {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    )}
                    onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
                />
            </div>
        </div>
    )
}