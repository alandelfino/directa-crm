import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { privateInstance } from "@/lib/auth"
import { useQuery } from "@tanstack/react-query"
import { Search, Funnel, RefreshCw } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type ColumnDef } from "@/components/data-table"
import { Checkbox } from "@/components/ui/checkbox"

type Customer = {
    id: number
    nameOrTradeName: string
    companyName?: string
    personType: 'natural' | 'entity'
    cpfOrCnpj: string
    email: string
    phone: string
    store?: {
        id: number
        name: string
        color?: string
    }
}

interface CustomerListResponse {
    items: Customer[]
    totalPages: number
    totalItems: number
    page: number
}

interface CustomerSelectInputProps {
    value?: number
    onChange?: (customerId: number) => void
    disabled?: boolean
    placeholder?: string
}

export function CustomerSelectInput({ value, onChange, disabled, placeholder = "Selecione um cliente..." }: CustomerSelectInputProps) {
    const [open, setOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    
    // Fetch initial customer if value is provided
    const { data: initialCustomer } = useQuery({
        queryKey: ['customer', value],
        queryFn: async () => {
            if (!value) return null
            const response = await privateInstance.get(`/tenant/customers/${value}`)
            return response.data as Customer
        },
        enabled: !!value
    })

    useEffect(() => {
        if (initialCustomer) {
            setSelectedCustomer(initialCustomer)
        }
    }, [initialCustomer])

    const handleSelect = (customer: Customer) => {
        setSelectedCustomer(customer)
        onChange?.(customer.id)
        setOpen(false)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <div className="relative cursor-pointer group">
                    <Input 
                        readOnly 
                        value={selectedCustomer ? (selectedCustomer.personType === 'entity' ? selectedCustomer.nameOrTradeName : selectedCustomer.nameOrTradeName) : ''} 
                        placeholder={placeholder}
                        disabled={disabled}
                        className="pr-10 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => !disabled && setOpen(true)}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
            </SheetTrigger>
            <SheetContent className="sm:max-w-5xl w-full p-0 flex flex-col gap-0">
                <div className="border-b">
                    <SheetHeader>
                        <SheetTitle>Selecionar Cliente</SheetTitle>
                    </SheetHeader>
                </div>
                
                <div className="flex-1 overflow-hidden p-2">
                    <CustomerList onSelect={handleSelect} onClose={() => setOpen(false)} selectedId={value} />
                </div>
            </SheetContent>
        </Sheet>
    )
}

function CustomerList({ onSelect, onClose, selectedId }: { onSelect: (c: Customer) => void, onClose: () => void, selectedId?: number }) {
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(20)
    const [filterName, setFilterName] = useState('')
    const [filterNameOperator, setFilterNameOperator] = useState('cont')
    const [filterCompanyName, setFilterCompanyName] = useState('')
    const [filterCompanyNameOperator, setFilterCompanyNameOperator] = useState('cont')
    const [filterCpf, setFilterCpf] = useState('')
    const [filterCpfOperator, setFilterCpfOperator] = useState('cont')
    const [filterEmail, setFilterEmail] = useState('')
    const [filterEmailOperator, setFilterEmailOperator] = useState('cont')
    
    // Local filter states for the popover
    const [localFilterName, setLocalFilterName] = useState('')
    const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
    const [localFilterCompanyName, setLocalFilterCompanyName] = useState('')
    const [localFilterCompanyNameOperator, setLocalFilterCompanyNameOperator] = useState('cont')
    const [localFilterCpf, setLocalFilterCpf] = useState('')
    const [localFilterCpfOperator, setLocalFilterCpfOperator] = useState('cont')
    const [localFilterEmail, setLocalFilterEmail] = useState('')
    const [localFilterEmailOperator, setLocalFilterEmailOperator] = useState('cont')
    
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [tempSelectedCustomer, setTempSelectedCustomer] = useState<Customer | null>(null)

    const activeFilterCount = (filterName ? 1 : 0) + (filterCompanyName ? 1 : 0) + (filterCpf ? 1 : 0) + (filterEmail ? 1 : 0)
    
    // Derived selected ID for visual feedback
    const currentSelectedId = tempSelectedCustomer?.id ?? selectedId

    const { data, isLoading, isRefetching, refetch } = useQuery<CustomerListResponse>({
        queryKey: ['customers-select-list', page, perPage, filterName, filterNameOperator, filterCompanyName, filterCompanyNameOperator, filterCpf, filterCpfOperator, filterEmail, filterEmailOperator],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', perPage.toString())
            params.append('orderBy', 'desc')
            params.append('sortBy', 'createdAt')
            
            if (filterName) {
                params.append('nameOrTradeName', JSON.stringify({ operator: filterNameOperator, value: filterName }))
            }
            if (filterCompanyName) {
                params.append('companyName', JSON.stringify({ operator: filterCompanyNameOperator, value: filterCompanyName }))
            }
            if (filterCpf) {
                params.append('cpfOrCnpj', JSON.stringify({ operator: filterCpfOperator, value: filterCpf }))
            }
            if (filterEmail) {
                params.append('email', JSON.stringify({ operator: filterEmailOperator, value: filterEmail }))
            }

            const response = await privateInstance.get(`/tenant/customers?${params.toString()}`)
            const raw = response.data as any
            const items = Array.isArray(raw?.items) ? (raw.items as Customer[]) : []
            const totalItems =
                typeof raw?.totalItems === 'number'
                    ? raw.totalItems
                    : typeof raw?.total === 'number'
                        ? raw.total
                        : 0
            const totalPages =
                typeof raw?.totalPages === 'number'
                    ? raw.totalPages
                    : 1
            const currentPage =
                typeof raw?.page === 'number'
                    ? raw.page
                    : page

            return {
                items,
                totalItems,
                totalPages,
                page: currentPage
            }
        }
    })

    // Update tempSelectedCustomer if selectedId changes and we don't have a temp selection
    useEffect(() => {
        if (selectedId && !tempSelectedCustomer && data?.items) {
             const found = data.items.find(c => c.id === selectedId)
             if (found) {
                 setTempSelectedCustomer(found)
             }
        }
    }, [selectedId, data, tempSelectedCustomer])

    const columns = useMemo<ColumnDef<Customer>[]>(() => [
        {
            id: 'select',
            header: () => (<div className="flex items-center justify-center text-xs text-muted-foreground">Sel.</div>),
            width: '60px',
            cell: (customer) => (
                <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        checked={currentSelectedId === customer.id}
                        onCheckedChange={() => setTempSelectedCustomer(customer)}
                    />
                </div>
            ),
            headerClassName: 'w-[60px] min-w-[60px] border-r px-4 py-2.5',
            className: 'w-[60px] min-w-[60px] border-r !px-4 py-3'
        },
        {
            id: 'store',
            header: 'Loja',
            cell: (customer) => (
                <div className="flex items-center gap-2 min-w-0">
                    {customer.store?.color && (
                        <div
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: customer.store.color }}
                            title={`Cor: ${customer.store.color}`}
                        />
                    )}
                    <span className="truncate text-sm text-muted-foreground">
                        {customer.store?.name ?? '—'}
                    </span>
                </div>
            ),
            width: '220px',
            headerClassName: 'w-[220px] min-w-[220px] border-r px-4 py-2.5',
            className: 'w-[220px] min-w-[220px] border-r !px-4 py-3'
        },
        {
            id: 'name',
            header: 'Cliente',
            cell: (customer) => (
                <div className="flex flex-col">
                    <span className="font-medium">{customer.nameOrTradeName}</span>
                    {customer.personType === 'entity' && customer.companyName && (
                        <span className="text-xs text-muted-foreground">{customer.companyName}</span>
                    )}
                </div>
            ),
            headerClassName: 'min-w-[22rem] border-r px-4 py-2.5',
            className: 'min-w-[22rem] border-r !px-4 py-3'
        },
        {
            id: 'document',
            header: 'Documento',
            cell: (customer) => (
                <span className="text-muted-foreground text-sm">
                    {customer.cpfOrCnpj}
                </span>
            ),
            width: '200px',
            headerClassName: 'w-[200px] min-w-[200px] border-r px-4 py-2.5',
            className: 'w-[200px] min-w-[200px] border-r !px-4 py-3'
        },
        {
            id: 'email',
            header: 'Email',
            cell: (customer) => (
                <span className="text-muted-foreground text-sm">
                    {customer.email}
                </span>
            ),
            headerClassName: 'min-w-[18rem] border-r px-4 py-2.5',
            className: 'min-w-[18rem] border-r !px-4 py-3'
        }
    ], [currentSelectedId])

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-end p-2 gap-4">
                <div className="flex items-center gap-2">
                    <Popover open={isFilterOpen} onOpenChange={(open) => {
                        setIsFilterOpen(open)
                        if (open) {
                            setLocalFilterName(filterName)
                            setLocalFilterNameOperator(filterNameOperator)
                            setLocalFilterCompanyName(filterCompanyName)
                            setLocalFilterCompanyNameOperator(filterCompanyNameOperator)
                            setLocalFilterCpf(filterCpf)
                            setLocalFilterCpfOperator(filterCpfOperator)
                            setLocalFilterEmail(filterEmail)
                            setLocalFilterEmailOperator(filterEmailOperator)
                        }
                    }}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="relative"
                                disabled={isLoading || isRefetching}
                                aria-label="Filtros"
                                title="Filtros"
                            >
                                <Funnel className={`size-4 ${activeFilterCount > 0 ? 'text-primary' : ''}`} /> Filtros
                                {activeFilterCount > 0 && (
                                    <span className="absolute top-2 right-2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-5" align="end">
                            <div className="grid gap-4">
                                <h4 className="font-semibold leading-none">Filtros</h4>
                                <div className="grid gap-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome / Fantasia</Label>
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

                                <div className="grid gap-1.5">
                                    <Label htmlFor="companyName" className="text-xs font-medium text-muted-foreground">Razão Social</Label>
                                    <div className="flex gap-2">
                                        <Select value={localFilterCompanyNameOperator} onValueChange={setLocalFilterCompanyNameOperator}>
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
                                            id="companyName"
                                            value={localFilterCompanyName}
                                            onChange={(e) => setLocalFilterCompanyName(e.target.value)}
                                            className="h-9 flex-1"
                                            placeholder="Filtrar por razão social..."
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="cpf" className="text-xs font-medium text-muted-foreground">CPF / CNPJ</Label>
                                    <div className="flex gap-2">
                                        <Select value={localFilterCpfOperator} onValueChange={setLocalFilterCpfOperator}>
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
                                            id="cpf"
                                            value={localFilterCpf}
                                            onChange={(e) => setLocalFilterCpf(e.target.value)}
                                            className="h-9 flex-1"
                                            placeholder="Filtrar por documento..."
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                                    <div className="flex gap-2">
                                        <Select value={localFilterEmailOperator} onValueChange={setLocalFilterEmailOperator}>
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
                                            id="email"
                                            value={localFilterEmail}
                                            onChange={(e) => setLocalFilterEmail(e.target.value)}
                                            className="h-9 flex-1"
                                            placeholder="Filtrar por email..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="default" className="flex-1" onClick={() => {
                                    setLocalFilterName('')
                                    setLocalFilterNameOperator('cont')
                                    setLocalFilterCompanyName('')
                                    setLocalFilterCompanyNameOperator('cont')
                                    setLocalFilterCpf('')
                                    setLocalFilterCpfOperator('cont')
                                    setLocalFilterEmail('')
                                    setLocalFilterEmailOperator('cont')
                                    
                                    setFilterName('')
                                    setFilterNameOperator('cont')
                                    setFilterCompanyName('')
                                    setFilterCompanyNameOperator('cont')
                                    setFilterCpf('')
                                    setFilterCpfOperator('cont')
                                    setFilterEmail('')
                                    setFilterEmailOperator('cont')
                                    setPage(1)
                                    setIsFilterOpen(false)
                                }}>
                                    Limpar
                                </Button>
                                <Button size="default" className="flex-1" onClick={() => {
                                    setFilterName(localFilterName)
                                    setFilterNameOperator(localFilterNameOperator)
                                    setFilterCompanyName(localFilterCompanyName)
                                    setFilterCompanyNameOperator(localFilterCompanyNameOperator)
                                    setFilterCpf(localFilterCpf)
                                    setFilterCpfOperator(localFilterCpfOperator)
                                    setFilterEmail(localFilterEmail)
                                    setFilterEmailOperator(localFilterEmailOperator)
                                    setPage(1)
                                    setIsFilterOpen(false)
                                }}>
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                    </Popover>

                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading || isRefetching}
                        onClick={() => { refetch() }}
                        aria-label="Atualizar"
                        title="Atualizar"
                    >
                        {(isLoading || isRefetching) ? <RefreshCw className="animate-spin size-[0.85rem]" /> : <RefreshCw className="size-[0.85rem]" />}
                        Atualizar
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data?.items || []}
                    loading={isLoading || isRefetching}
                    page={page}
                    perPage={perPage}
                    totalItems={data?.totalItems || 0}
                    onChange={(vals) => {
                        if (typeof vals.page === 'number') setPage(vals.page)
                        if (typeof vals.perPage === 'number') {
                            setPerPage(vals.perPage)
                            setPage(1)
                        }
                    }}
                    onRowClick={(item) => {
                        setTempSelectedCustomer(item)
                    }}
                    emptyMessage="Nenhum cliente encontrado."
                    skeletonCount={10}
                    rowClassName="cursor-pointer"
                />
            </div>

            <div className="p-2 border-t bg-background flex items-center justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button onClick={() => tempSelectedCustomer && onSelect(tempSelectedCustomer)} disabled={!tempSelectedCustomer}>
                    Selecionar
                </Button>
            </div>
        </div>
    )
}
