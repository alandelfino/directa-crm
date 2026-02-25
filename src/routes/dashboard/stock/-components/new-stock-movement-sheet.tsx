import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowRightLeft, Building2, Archive, Package, Search } from 'lucide-react'
import { SelectProductSearch } from '@/components/select-product-search'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// Types
type DistributionCenter = {
  id: number
  name: string
}

type UnitOfMeasurement = {
  id: number
  name: string
  numberType: 'integer' | 'decimal'
}

type Product = {
  id: number
  name: string
  sku?: string
  unitOfMeasurement?: UnitOfMeasurement
}

type DerivatedProduct = {
  id: number
  sku?: string
  name?: string
}

function normalizeDecimalInput(raw: string): string {
  const val = raw.replace(/[^0-9,]/g, '')
  if (!val) return ''
  const parts = val.split(',')
  const integerPart = parts[0] ?? ''
  const decimalsRaw = parts.slice(1).join('')
  if (parts.length === 1) {
    return integerPart
  }
  const safeInteger = integerPart || '0'
  const decimalPart = decimalsRaw.slice(0, 2)
  if (decimalsRaw === '') {
    return `${safeInteger},`
  }
  return `${safeInteger},${decimalPart}`
}

function parseQuantityToCents(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/\s/g, '')
  if (!cleaned) return 0
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

function getErrorTitleDetail(error: any): { title: string; detail: string } {
  const data = error?.response?.data
  const title = data?.title ?? 'Erro'
  const detail =
    data?.detail ??
    data?.message ??
    error?.message ??
    'Erro ao cadastrar movimento'
  return { title, detail }
}

export function NewStockMovementSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  // Form State
  const [type, setType] = useState<'in' | 'out'>('in')
  const [productId, setProductId] = useState<number | null>(null)
  const [distributionCenterId, setDistributionCenterId] = useState<string>('')
  const [derivationsAmounts, setDerivationsAmounts] = useState<Record<number, string>>({})
  const [stockType, setStockType] = useState<'physical' | 'reserved'>('physical')
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchOperator, setSearchOperator] = useState<'contains' | 'equals'>('contains')

  // Reset form when sheet opens/closes or product changes
  useEffect(() => {
    if (!open) {
      setType('in')
      setProductId(null)
      setDistributionCenterId('')
      setDerivationsAmounts({})
      setSearchTerm('')
    }
  }, [open])

  useEffect(() => {
    setDerivationsAmounts({})
    setSearchTerm('')
  }, [productId])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  // Queries
  const { data: distributionCenters, isLoading: isLoadingDistributionCenters } = useQuery({
    queryKey: ['distribution-centers', 'select'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/warehouses', {
        params: {
          page: 1,
          limit: 100
        }
      })
      const data = response.data
      if (Array.isArray(data)) return data as DistributionCenter[]
      if (typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items as DistributionCenter[]
      return []
    },
    enabled: open,
    staleTime: 1000 * 60 * 5
  })

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null
      const response = await privateInstance.get(`/tenant/products/${productId}`)
      return response.data as Product
    },
    enabled: !!productId && open
  })

  const { data: derivations, isLoading: isLoadingDerivations } = useQuery({
    queryKey: ['derivated-products', productId],
    queryFn: async () => {
      if (!productId) return []
      const response = await privateInstance.get(`/tenant/derivated-product`, {
        params: {
          productId,
          limit: 100
        }
      })
      const data = response.data
      if (Array.isArray(data)) return data as DerivatedProduct[]
      if (data && Array.isArray(data.items)) return data.items as DerivatedProduct[]
      return []
    },
    enabled: !!productId && open
  })

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Selecione um produto')
      if (!distributionCenterId) throw new Error('Selecione um centro de distribuição')
      
      const payload: any = {
        productId,
        warehouseId: Number(distributionCenterId),
        type,
        stockType,
      }

      const items = Object.entries(derivationsAmounts)
        .map(([id, amt]) => {
          const amountCents = parseQuantityToCents(amt)
          return { derivatedProductId: Number(id), amount: amountCents }
        })
        .filter(item => item.amount > 0)
      
      if (items.length === 0) throw new Error('Informe a quantidade para pelo menos uma derivação')
      
      const totalAmount = items.reduce((acc, curr) => acc + curr.amount, 0)
      
      payload.amount = totalAmount
      payload.derivatedProducts = items

      const response = await privateInstance.post('/tenant/stock-moviments', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Movimento de estoque cadastrado com sucesso!')
      setOpen(false)
      onCreated?.()
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
    onError: (error: any) => {
      const { title, detail } = getErrorTitleDetail(error)
      toast.error(title, { description: detail })
    }
  })

  const handleSubmit = async () => {
    try {
      await mutateAsync()
    } catch (error: any) {
      if (!error?.response) {
        const title = 'Erro'
        const detail = error?.message ?? 'Ocorreu um erro inesperado'
        toast.error(title, { description: detail })
      }
    }
  }

  const isFormValid = useMemo(() => {
    if (!productId || !distributionCenterId) return false
    return Object.values(derivationsAmounts).some(v => parseQuantityToCents(v) > 0)
  }, [productId, distributionCenterId, derivationsAmounts])

  const filteredDerivations = useMemo(() => {
    if (!derivations) return []
    return derivations.filter(d => {
      if (!debouncedSearchTerm) return true
      const name = d.name?.toLowerCase() || ''
      const term = debouncedSearchTerm.toLowerCase()
      
      if (searchOperator === 'equals') {
        return name === term
      }
      return name.includes(term)
    })
  }, [derivations, debouncedSearchTerm, searchOperator])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Movimento
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[600px] flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="text-xl flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            Novo Movimento de Estoque
          </SheetTitle>
          <SheetDescription>
            Preencha os dados abaixo para registrar uma entrada ou saída.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-6 overflow-y-auto">
          <div className="grid gap-6 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  Tipo
                </Label>
                <Select value={type} onValueChange={(v: 'in' | 'out') => setType(v)}>
                  <SelectTrigger className={`!w-full ${type === 'in' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in" className="text-green-700 focus:text-green-800 focus:bg-green-50">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="out" className="text-red-700 focus:text-red-800 focus:bg-red-50">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Saída
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Centro de Distribuição
                </Label>
                {isLoadingDistributionCenters ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={distributionCenterId} onValueChange={setDistributionCenterId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {distributionCenters?.map((dc) => (
                        <SelectItem key={dc.id} value={String(dc.id)}>
                          {dc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  Tipo de Estoque
                </Label>
                <Select value={stockType} onValueChange={(v: 'physical' | 'reserved') => setStockType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Físico</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                Produto
              </Label>
              <SelectProductSearch 
                value={productId} 
                onSelect={setProductId} 
                placeholder="Busque por nome ou SKU..."
              />
            </div>

            {productId && open && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <Separator className="flex-1" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalhes</span>
                  <Separator className="flex-1" />
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                  <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      {product ? (
                        <span className="font-medium text-sm">{product.name}</span>
                      ) : (
                        <span className="h-4 w-32 rounded bg-muted animate-pulse" />
                      )}
                    </div>
                    {product ? (
                      product.sku && <Badge variant="outline" className="font-mono text-[10px]">{product.sku}</Badge>
                    ) : (
                      <span className="h-4 w-16 rounded bg-muted animate-pulse" />
                    )}
                  </div>
                  
                  <div className="p-4">
                    {isLoadingProduct || !product ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Carregando detalhes do produto...
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Derivações</Label>
                          <span className="text-xs text-muted-foreground">
                            Preencha a quantidade para cada variação
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Select value={searchOperator} onValueChange={(v: 'contains' | 'equals') => setSearchOperator(v)}>
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contains">Contém</SelectItem>
                              <SelectItem value="equals">Igual a</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="Buscar derivação..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 pl-8 text-xs"
                            />
                          </div>
                        </div>
                        
                        {isLoadingDerivations ? (
                           <div className="flex justify-center py-8">
                             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                           </div>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>Variação</TableHead>
                                  <TableHead className="w-[120px] text-right">Qtd.</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredDerivations.map((deriv) => (
                                  <TableRow key={deriv.id} className="hover:bg-muted/30">
                                    <TableCell className="py-2 font-medium">{deriv.name || '—'}</TableCell>
                                    <TableCell className="py-2 text-right">
                                      <Input 
                                        type="text"
                                        inputMode={product.unitOfMeasurement?.numberType === 'decimal' ? "decimal" : "numeric"}
                                        placeholder="0"
                                        className="h-8 w-24 ml-auto text-right"
                                        value={derivationsAmounts[deriv.id] || ''}
                                        onChange={(e) => {
                                          let val = e.target.value
                                          if (product.unitOfMeasurement?.numberType === 'decimal') {
                                            val = normalizeDecimalInput(val)
                                          } else {
                                            val = val.replace(/[^0-9]/g, '')
                                          }
                                          setDerivationsAmounts(prev => ({
                                            ...prev,
                                            [deriv.id]: val
                                          }))
                                        }}
                                        onKeyDown={(e) => {
                                          if (product.unitOfMeasurement?.numberType !== 'decimal' && (e.key === '.' || e.key === ',')) {
                                            e.preventDefault()
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {filteredDerivations.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                      {derivations?.length === 0 ? 'Nenhuma derivação encontrada.' : 'Nenhum resultado para a busca.'}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="p-6 border-t mt-auto bg-muted/10 grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="w-full">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isFormValid} className={`w-full ${type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              type === 'in' ? <Plus className="mr-2 h-4 w-4" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />
            )}
            {type === 'in' ? 'Confirmar Entrada' : 'Confirmar Saída'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
