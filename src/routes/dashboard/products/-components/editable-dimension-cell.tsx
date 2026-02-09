import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { privateInstance } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function EditableDimensionCell({ 
  row, 
  field,
  onSaved,
  className,
  unit,
  placeholder
}: { 
  row: any, 
  field: string,
  onSaved?: (value: number) => void,
  className?: string,
  unit?: string,
  label?: string,
  placeholder?: string
}) {
  const initialValue = row[field]
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with prop updates
  useEffect(() => {
    setValue(initialValue ? String(initialValue) : '')
  }, [initialValue])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (newValue: string) => {
      // If empty, maybe ignore or set to null? For now let's require value or ignore if same
      if (!newValue) return

      // Allow float numbers, replace comma with dot
      const numValue = parseFloat(newValue.replace(',', '.'))
      
      if (isNaN(numValue)) {
        // Revert to initial
        setValue(initialValue ? String(initialValue) : '')
        return
      }

      // Check if changed
      if (numValue === initialValue) return

      const payload = {
        [field]: numValue
      }

      await privateInstance.put(`/tenant/products/${row.id}`, payload)
      return numValue
    },
    onSuccess: (savedValue) => {
      if (savedValue !== undefined) {
        toast.success('Atualizado!', { duration: 1500, position: 'bottom-right' })
        onSaved?.(savedValue)
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error('Erro ao salvar', {
        description: errorData?.detail || 'Tente novamente.'
      })
      // Revert on error
      setValue(initialValue ? String(initialValue) : '')
    }
  })

  const handleBlur = () => {
    mutateAsync(value)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
  }

  return (
    <div className={cn("relative flex items-center group", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder={placeholder || "-"}
          className={cn(
            "h-8 w-16 px-2 text-center text-sm transition-all",
            "border-transparent bg-transparent shadow-none hover:bg-muted/50 focus:bg-background focus:border-input focus:shadow-sm",
            !value && "text-muted-foreground",
            isPending && "opacity-50"
          )}
        />
        {isPending && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {unit && <span className="text-xs text-muted-foreground ml-1.5 select-none">{unit}</span>}
    </div>
  )
}
