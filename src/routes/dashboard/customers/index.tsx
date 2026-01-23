import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCw, Trash, BookUser, SortAsc, SortDesc } from 'lucide-react'
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/dashboard/customers/')({
    component: RouteComponent,
})

type Customer = {
    id: number
    created_at?: number
    updated_at?: number
    name_or_company_name?: string
    last_name_or_trade_name?: string
    person_type?: 'individuals' | 'legal_entities'
    cpf_or_cnpj?: string
    rg_or_ie?: string
    address_street?: string
    address_number?: number
    address_city?: string
    address_state?: string
    postal_code?: string
    neighborhood?: string
    address_supplement?: string
    website?: string
    email?: string
}

type CustomersResponse = {
    itemsReceived?: number
    curPage?: number
    nextPage?: number | null
    prevPage?: number | null
    offset?: number
    perPage?: number
    itemsTotal?: number
    pageTotal?: number
    items?: Customer[]
} | Customer[]

function normalizeResponse(data: CustomersResponse) {
    if (Array.isArray(data)) {
        return {
            items: data,
            itemsTotal: data.length,
            pageTotal: 1,
        }
    }
    const items = Array.isArray(data.items) ? data.items : []
    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : 1
    return { items, itemsTotal, pageTotal }
}

function RouteComponent() {
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage, setPerPage] = useState(20)
    const [selected, setSelected] = useState<number[]>([])
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'name_or_company_name' | 'person_type' | 'cpf_or_cnpj' | 'rg_or_ie' | 'email'>('created_at')
    const [orderBy, setOrderBy] = useState<'asc' | 'desc'>('desc')

    // Helpers para exibir CPF/CNPJ formatados na tabela
    const onlyDigits = (v?: string) => (v ?? '').replace(/\D/g, '')
    const formatCpf = (digits: string) => {
        const d = onlyDigits(digits).slice(0, 11)
        const p1 = d.slice(0, 3)
        const p2 = d.slice(3, 6)
        const p3 = d.slice(6, 9)
        const p4 = d.slice(9, 11)
        return [p1, p2, p3].filter(Boolean).join('.') + (p4 ? `-${p4}` : '')
    }
    const formatCnpj = (digits: string) => {
        const d = onlyDigits(digits).slice(0, 14)
        const p1 = d.slice(0, 2)
        const p2 = d.slice(2, 5)
        const p3 = d.slice(5, 8)
        const p4 = d.slice(8, 12)
        const p5 = d.slice(12, 14)
        let out = ''
        if (p1) out += p1
        if (p2) out += `.${p2}`
        if (p3) out += `.${p3}`
        if (p4) out += `/${p4}`
        if (p5) out += `-${p5}`
        return out
    }

    const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        queryKey: ['customers', currentPage, perPage, sortBy, orderBy],
        queryFn: async () => {
            const url = `/api:Th9UjqzY/customers?page=${currentPage}&per_page=${Math.min(50, perPage)}&sort_by=${sortBy ?? 'created_at'}&order_by=${orderBy}`
            const response = await privateInstance.get(url)
            if (response.status !== 200) {
                throw new Error('Erro ao carregar clientes')
            }
            return await response.data as CustomersResponse
        }
    })

    const [items, setItems] = useState<Customer[]>([])

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
        { id: 'name_or_company_name', header: 'Nome', width: '280px', cell: (c) => c.name_or_company_name ?? '—', headerClassName: 'w-[280px] min-w-[280px] border-r', className: 'w-[280px] min-w-[280px] p-2!' },
        { id: 'email', header: 'Email', width: '260px', cell: (c) => c.email ?? '—', headerClassName: 'w-[260px] min-w-[260px] border-r', className: 'w-[260px] min-w-[260px] p-2!' },
        { id: 'cpf_or_cnpj', header: 'CPF/CNPJ', width: '220px', cell: (c) => (c.person_type === 'legal_entities' ? formatCnpj(c.cpf_or_cnpj ?? '') : formatCpf(c.cpf_or_cnpj ?? '')) || '—', headerClassName: 'w-[220px] min-w-[220px] border-r', className: 'w-[220px] min-w-[220px] p-2!' },
        { id: 'address_city', header: 'Cidade', width: '200px', cell: (c) => c.address_city ?? '—', headerClassName: 'w-[200px] min-w-[200px] border-r', className: 'w-[200px] min-w-[200px] p-2!' },
        { id: 'address_state', header: 'UF', width: '90px', cell: (c) => c.address_state ?? '—', headerClassName: 'w-[90px] min-w-[90px] border-r', className: 'w-[90px] min-w-[90px] p-2!' },
        { id: 'person_type', header: 'Tipo', width: '180px', cell: (c) => ({ individuals: 'Pessoa Física', legal_entities: 'Pessoa Jurídica' }[c.person_type ?? 'individuals']), headerClassName: 'w-[180px] min-w-[180px] border-r', className: 'w-[180px] min-w-[180px] p-2!' },
    ]

    useEffect(() => {
        if (!data) return
        const normalized = normalizeResponse(data)
        const itemsArr = Array.isArray(normalized.items) ? normalized.items : []
        setItems(itemsArr)
        const itemsTotal = typeof normalized.itemsTotal === 'number' ? normalized.itemsTotal : itemsArr.length
        setTotalItems(itemsTotal)
        const pageTotal = typeof normalized.pageTotal === 'number' ? normalized.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
        setTotalPages(pageTotal)
    }, [data, perPage])

    useEffect(() => {
        if (isError) {
            const errorData = (error as any)?.response?.data
            toast.error(errorData?.title || 'Erro ao carregar clientes', {
                description: errorData?.detail || 'Não foi possível carregar a lista de clientes.'
            })
        }
    }, [isError, error])
    useEffect(() => { setSelected([]) }, [currentPage, perPage])
    useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
    useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

    const toggleSelectAll = () => { if (selected.length === items.length) setSelected([]); else setSelected(items.map(i => i.id)) }
    const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected(selected.filter(s => s !== id)); else setSelected([...selected, id]) }

    return (
        <div className='flex flex-col w-full h-full overflow-x-hidden'>
            <Topbar title="Clientes" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Clientes', href: '/dashboard/customers', isLast: true }]} />
            <div className='flex flex-col w-full h-full flex-1 overflow-hidden min-w-0'>
                <div className='border-b flex w-full items-center p-2 gap-4 max-w-full overflow-x-hidden'>
                    <div className='flex items-center gap-4 flex-1'>
                        {/* Ordenação - alinhada à esquerda */}
                        <div className='flex items-center gap-2'>
                            <span className='text-sm text-neutral-600 dark:text-neutral-300'>Ordenar por</span>
                            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); refetch() }}>
                                <SelectTrigger className='w-[220px]'>
                                    <SelectValue placeholder='Selecione' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value='created_at'>Data de criação</SelectItem>
                                        <SelectItem value='updated_at'>Data de atualização</SelectItem>
                                        <SelectItem value='name_or_company_name'>Nome/Razão Social</SelectItem>
                                        <SelectItem value='person_type'>Tipo de pessoa</SelectItem>
                                        <SelectItem value='cpf_or_cnpj'>CPF/CNPJ</SelectItem>
                                        <SelectItem value='rg_or_ie'>RG/IE</SelectItem>
                                        <SelectItem value='email'>E-mail</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button
                                variant={'ghost'}
                                size="sm"
                                title={orderBy === 'asc' ? 'Ascendente' : 'Descendente'}
                                aria-label={orderBy === 'asc' ? 'Ordenação ascendente' : 'Ordenação descendente'}
                                onClick={() => { setOrderBy(orderBy === 'asc' ? 'desc' : 'asc'); refetch() }}
                            >
                                {orderBy === 'asc' ? <SortAsc className="size-[0.85rem]" /> : <SortDesc className="size-[0.85rem]" />}
                            </Button>
                        </div>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                            {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
                        </Button>

                        {selected.length === 1 ? (
                            <DeleteCustomerDialog customerId={selected[0]} />
                        ) : (
                            <Button variant={'outline'} size="sm" disabled>
                                <Trash className="size-[0.85rem]" /> Excluir
                            </Button>
                        )}

                        {selected.length === 1 ? (
                            <EditCustomerSheet customerId={selected[0]} />
                        ) : (
                            <Button variant={'outline'} size="sm" disabled>
                                <Edit className="size-[0.85rem]" /> Editar
                            </Button>
                        )}
                        <NewCustomerSheet />
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
                                    <NewCustomerSheet />
                                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
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