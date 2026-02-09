import { useMemo, useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Edit2 } from 'lucide-react'
import { privateInstance } from '@/lib/auth'
import { formatMoneyFromCents, cn, maskMoneyInput } from '@/lib/utils'
import { toast } from 'sonner'

export type ProductPriceItem = {
  id: number
  price: number
  sale_price?: number
  [key: string]: any
}

export function EditablePriceCell({ 
  row, 
  field,
  onSaved,
  className
}: { 
  row: ProductPriceItem, 
  field: 'price' | 'sale_price',
  onSaved: (value: number) => void,
  className?: string
}) {
  const initialPrice = row[field]
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (newValue: string) => {
      const priceCents = parseInt(newValue.replace(/\D/g, ''))
      
      const payload = {
        price: field === 'price' ? priceCents : row.price,
        sale_price: field === 'sale_price' ? priceCents : (row.sale_price ?? null)
      }

      await privateInstance.put(`/api:c3X9fE5j/derivated_product_price/${row.id}`, payload)
      return priceCents
    },
    onSuccess: (newPrice) => {
      toast.success('Preço atualizado!')
      setIsEditing(false)
      onSaved(newPrice)
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar preço', {
        description: errorData?.detail || 'Não foi possível atualizar o preço da derivação.'
      })
    }
  })

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await mutateAsync(value)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValue(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      mutateAsync(value)
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const discountPercentage = useMemo(() => {
    if (field === 'sale_price' && row.price && row.sale_price && row.price > 0) {
      const discount = ((row.price - row.sale_price) / row.price) * 100
      if (discount > 0) {
        return Math.round(discount)
      }
    }
    return null
  }, [field, row.price, row.sale_price])

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(maskMoneyInput(e.target.value))}
          className="h-7 w-24 px-2 py-1 text-xs"
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Using timeout to allow button click to happen if that's what caused blur
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleCancel()
              }
            }, 100)
          }}
        />
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isPending}
        >
          <Check className="size-[0.85rem]" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-2 group"
    >
      <div 
        className={cn('truncate text-sm', className)}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
          setValue(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
        }}
      >
        {initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00'}
      </div>
      
      {discountPercentage !== null && (
        <span className="text-xs text-red-500 font-medium">(-{discountPercentage}%)</span>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
          setValue(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
        }}
      >
        <Edit2 className="size-3" />
      </Button>
    </div>
  )
}
