import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { privateInstance } from "@/lib/auth"

interface Product {
  id: number
  name: string
  sku: string | null
}

interface SelectProductSearchProps {
  value?: number | null
  onSelect?: (value: number | null) => void
  className?: string
  placeholder?: string
}

export function SelectProductSearch({ 
  value, 
  onSelect, 
  className,
  placeholder = "Selecione um produto..."
}: SelectProductSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [searchType, setSearchType] = React.useState<'name' | 'sku'>('name')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  // Debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset search when opening
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'select-search', searchType, debouncedQuery],
    queryFn: async () => {
      let url = '/api:c3X9fE5j/products?page=1&per_page=50'
      if (searchType === 'name') {
        url += `&name=${encodeURIComponent(debouncedQuery)}`
      } else {
        url += `&sku=${encodeURIComponent(debouncedQuery)}`
      }

      const response = await privateInstance.get(url)
      const data = response.data
      
      let items: Product[] = []
      if (Array.isArray(data)) {
        items = data
      } else if (data && typeof data === 'object') {
        if (Array.isArray((data as any).items)) {
          items = (data as any).items
        } else {
          items = []
        }
      }
      
      return items.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku
      }))
    },
    enabled: open && debouncedQuery.length > 0,
    staleTime: 1000 * 60 // 1 minute cache
  })

  // Fetch selected product details if we have a value but it's not in the list
  const { data: selectedProductData } = useQuery({
    queryKey: ['product', value],
    queryFn: async () => {
      if (!value) return null
      const response = await privateInstance.get(`/api:c3X9fE5j/products/${value}`)
      return response.data as Product
    },
    enabled: !!value && open === false
  })

  const selectedProduct = React.useMemo(() => {
    if (products) {
      const found = products.find(p => p.id === value)
      if (found) return found
    }
    return selectedProductData
  }, [products, value, selectedProductData])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? (
            selectedProduct ? (
              <span className="truncate flex items-center gap-2">
                {selectedProduct.sku ? <span className="text-muted-foreground text-xs font-mono bg-muted px-1 rounded">{selectedProduct.sku}</span> : null}
                <span className="truncate">{selectedProduct.name}</span>
              </span>
            ) : (
              isLoading ? "Carregando..." : "Produto não encontrado"
            )
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b p-2 gap-2">
            <Select 
              value={searchType} 
              onValueChange={(v: 'name' | 'sku') => setSearchType(v)}
            >
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder={searchType === 'sku' ? "Buscar SKU..." : "Buscar produto..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm border-none shadow-none focus-visible:ring-0"
                autoFocus
              />
            </div>
          </div>
          <CommandList>
            {isLoading && (
               <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 Buscando...
               </div>
            )}
            {!isLoading && debouncedQuery.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Digite para buscar produtos
              </div>
            )}
            {!isLoading && debouncedQuery.length > 0 && products?.length === 0 && (
              <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={String(product.id)}
                  onSelect={() => {
                    onSelect?.(product.id === value ? null : product.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{product.name}</span>
                    {product.sku && (
                      <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
