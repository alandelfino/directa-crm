import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Plus, Loader2, ArrowRightLeft, Building2, Archive, Package } from 'lucide-react'
import { SelectProductSearch } from '@/components/select-product-search'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Types
type DistributionCenter = {
  id: number
  name: string
}

type Unit = {
  id: number
  name: string
  type: 'integer' | 'decimal'
}

type Product = {
  id: number
  name: string
  sku?: string
  type: 'simple' | 'with_derivations'
  unit?: Unit
}

type ChildProduct = {
  id: number
  sku?: string
  name?: string
}

export function NewStockMovementSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  // Form State
  const [type, setType] = useState<'inflow' | 'outflow'>('inflow')
  const [productId, setProductId] = useState<number | null>(null)
  const [distributionCenterId, setDistributionCenterId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [derivationsAmounts, setDerivationsAmounts] = useState<Record<number, string>>({})

  // Reset form when sheet opens/closes or product changes
  useEffect(() => {
    if (!open) {
      setType('inflow')
      setProductId(null)
      setDistributionCenterId('')
      setAmount('')
      setDerivationsAmounts({})
    }
  }, [open])

  useEffect(() => {
    setAmount('')
    setDerivationsAmounts({})
  }, [productId])

  // Queries
  const { data: distributionCenters } = useQuery({
    queryKey: ['distribution-centers', 'select'],
    queryFn: async () => {
      const response = await privateInstance.get('/api:k-mANdpH/distribution_centers?page=1&per_page=100')
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
      const response = await privateInstance.get(`/api:c3X9fE5j/products/${productId}`)
      return response.data as Product
    },
    enabled: !!productId && open
  })

  const { data: derivations, isLoading: isLoadingDerivations } = useQuery({
    queryKey: ['product-derivations', productId],
    queryFn: async () => {
      if (!productId) return []
      const response = await privateInstance.get(`/api:d9ly3uzj/derivated_products?product_id=${productId}`)
      const data = response.data
      if (Array.isArray(data)) return data as ChildProduct[]
      if (typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items as ChildProduct[]
      return []
    },
    enabled: !!productId && product?.type === 'with_derivations' && open
  })

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Selecione um produto')
      if (!distributionCenterId) throw new Error('Selecione um centro de distribuição')
      
      const payload: any = {
        product_id: productId,
        distribution_center_id: Number(distributionCenterId),
        type: type
      }

      if (product?.type === 'simple') {
        if (!amount || Number(amount) <= 0) throw new Error('Informe uma quantidade válida')
        payload.amount = Number(amount)
      } else if (product?.type === 'with_derivations') {
        const items = Object.entries(derivationsAmounts)
          .map(([id, amt]) => ({ id: Number(id), amount: Number(amt) }))
          .filter(item => item.amount > 0)
        
        if (items.length === 0) throw new Error('Informe a quantidade para pelo menos uma derivação')
        payload.derivated_products = items
      }

      const response = await privateInstance.post('https://server.directacrm.com.br/api:u5l6DcFV/stock-moviments', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Movimento de estoque cadastrado com sucesso!')
      setOpen(false)
      onCreated?.()
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    },
    onError: (error: any) => {
      const data = error?.response?.data
      const message = data?.message ?? 'Erro ao cadastrar movimento'
      const title = data?.payload?.title

      if (title) {
        toast.error(title, { description: message })
      } else {
        toast.error(message)
      }
    }
  })

  const handleSubmit = async () => {
    try {
      await mutateAsync()
    } catch (error: any) {
      // Error is handled in mutation onError or caught here if thrown before mutation
      if (error.message && !error?.response) {
        toast.error(error.message)
      }
    }
  }

  const isFormValid = useMemo(() => {
    if (!productId || !distributionCenterId) return false
    if (product?.type === 'simple') {
      return !!amount && Number(amount) > 0
    }
    if (product?.type === 'with_derivations') {
      return Object.values(derivationsAmounts).some(v => Number(v) > 0)
    }
    return false
  }, [productId, distributionCenterId, product, amount, derivationsAmounts])

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
                <Select value={type} onValueChange={(v: 'inflow' | 'outflow') => setType(v)}>
                  <SelectTrigger className={`!w-full ${type === 'inflow' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inflow" className="text-green-700 focus:text-green-800 focus:bg-green-50">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="outflow" className="text-red-700 focus:text-red-800 focus:bg-red-50">
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

            {product && (
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
                      <span className="font-medium text-sm">{product.name}</span>
                    </div>
                    {product.sku && <Badge variant="outline" className="font-mono text-[10px]">{product.sku}</Badge>}
                  </div>
                  
                  <div className="p-4">
                    {isLoadingProduct ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : product.type === 'simple' ? (
                      <div className="grid gap-2">
                        <Label>Quantidade</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min={product.unit?.type === 'decimal' ? "0.001" : "1"}
                            step={product.unit?.type === 'decimal' ? "0.001" : "1"}
                            placeholder="0"
                            value={amount}
                            onChange={(e) => {
                              let val = e.target.value
                              if (product.unit?.type !== 'decimal' && (val.includes('.') || val.includes(','))) {
                                val = val.split(/[.,]/)[0]
                              }
                              setAmount(val)
                            }}
                            onKeyDown={(e) => {
                              if (product.unit?.type !== 'decimal' && (e.key === '.' || e.key === ',')) {
                                e.preventDefault()
                              }
                            }}
                            className="text-lg font-medium"
                          />
                          <span className="text-sm text-muted-foreground font-medium">un.</span>
                        </div>
                      </div>
                    ) : product.type === 'with_derivations' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Derivações</Label>
                          <span className="text-xs text-muted-foreground">
                            Preencha a quantidade para cada variação
                          </span>
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
                                  <TableHead className="w-[100px]">SKU</TableHead>
                                  <TableHead>Variação</TableHead>
                                  <TableHead className="w-[120px] text-right">Qtd.</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {derivations?.map((deriv) => (
                                  <TableRow key={deriv.id} className="hover:bg-muted/30">
                                    <TableCell className="font-mono text-xs text-muted-foreground py-2">{deriv.sku || '—'}</TableCell>
                                    <TableCell className="py-2 font-medium">{deriv.name || '—'}</TableCell>
                                    <TableCell className="py-2 text-right">
                                      <Input 
                                        type="number" 
                                        min="0"
                                        step={product.unit?.type === 'decimal' ? "0.001" : "1"}
                                        placeholder="0"
                                        className="h-8 w-24 ml-auto text-right"
                                        value={derivationsAmounts[deriv.id] || ''}
                                        onChange={(e) => {
                                          let val = e.target.value
                                          if (product.unit?.type !== 'decimal' && (val.includes('.') || val.includes(','))) {
                                            val = val.split(/[.,]/)[0]
                                          }
                                          setDerivationsAmounts(prev => ({
                                            ...prev,
                                            [deriv.id]: val
                                          }))
                                        }}
                                        onKeyDown={(e) => {
                                          if (product.unit?.type !== 'decimal' && (e.key === '.' || e.key === ',')) {
                                            e.preventDefault()
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {(!derivations || derivations.length === 0) && (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                      Nenhuma derivação encontrada.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ) : null}
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
          <Button onClick={handleSubmit} disabled={isPending || !isFormValid} className={`w-full ${type === 'inflow' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              type === 'inflow' ? <Plus className="mr-2 h-4 w-4" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />
            )}
            {type === 'inflow' ? 'Confirmar Entrada' : 'Confirmar Saída'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
