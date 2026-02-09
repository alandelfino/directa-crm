import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Tags, TagsTrigger, TagsValue, TagsContent, TagsInput, TagsList, TagsEmpty, TagsGroup, TagsItem } from '@/components/ui/shadcn-io/tags'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type TagsSelectProps<T = any> = {
  className?: string
  value: (number | string)[]
  onChange: (next: (number | string)[]) => void
  disabled?: boolean
  enabled?: boolean
  items?: T[]
  queryKey?: any
  fetcher?: () => Promise<any>
  getId?: (item: T) => number | string
  getLabel?: (item: T) => string
  placeholder?: string
  searchPlaceholder?: string
}

export function TagsSelect<T = any>({
  value,
  onChange,
  disabled,
  enabled = true,
  items,
  queryKey,
  fetcher,
  getId = (item: any) => item?.id,
  getLabel = (item: any) => item?.name ?? item?.title ?? `#${getId(item)}`,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Digite para pesquisar',
  className,
}: TagsSelectProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const useRemote = !Array.isArray(items) && typeof fetcher === 'function'
  const { data, isLoading } = useQuery({
    queryKey: queryKey ?? ['tags-select'],
    enabled: useRemote && enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const result = await fetcher!()
      return result
    }
  })

  const list: any[] = useMemo(() => {
    const raw = useRemote ? data : items
    return Array.isArray((raw as any)?.items) ? (raw as any).items : Array.isArray(raw) ? (raw as any) : []
  }, [data, items, useRemote])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((it: any) => String(getLabel(it)).toLowerCase().includes(q))
  }, [list, query, getLabel])

  useEffect(() => { if (open) setQuery('') }, [open])

  const removeId = (id: number | string) => {
    const current = new Set(value || [])
    current.delete(id)
    onChange(Array.from(current))
  }

  const toggleId = (id: number | string) => {
    const current = new Set(value || [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    onChange(Array.from(current))
  }

  return (
    <Tags open={open} onOpenChange={setOpen}>
      <TagsTrigger disabled={disabled} className={cn('rounded-sm h-9 shadow-xs', className)} placeholder={placeholder}>
        {(value || []).map((id) => {
          const d = list.find((x: any) => String(getId(x)) === String(id))
          const name = d ? getLabel(d) : `#${id}`
          return (
            <TagsValue key={String(id)} onRemove={() => removeId(id)} className="rounded-none h-6 bg-neutral-100 text-neutral-800">
              {name}
            </TagsValue>
          )
        })}
      </TagsTrigger>
      <TagsContent align='start' sideOffset={8}>
        <TagsInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
        {useRemote && isLoading ? (
          <div className='px-2 py-1.5 text-sm text-muted-foreground'>Carregando...</div>
        ) : (
          <TagsList>
            {filtered.length === 0 ? (
              <TagsEmpty>Nenhuma opção encontrada</TagsEmpty>
            ) : (
              <TagsGroup>
                {filtered.map((it: any) => {
                  const id = getId(it)
                  const name = getLabel(it)
                  const checked = (value || []).map(String).includes(String(id))
                  return (
                    <TagsItem  key={String(id)} onSelect={() => { if (!disabled) { toggleId(id); setQuery(''); setOpen(true) } }}>
                      <span>{name}</span>
                      {checked ? <Check /> : null}
                    </TagsItem>
                  )
                })}
              </TagsGroup>
            )}
          </TagsList>
        )}
      </TagsContent>
    </Tags>
  )
}

// No default export; use named export TagsSelect in consumers
