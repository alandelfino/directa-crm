import { useEffect, useMemo, useState } from 'react'
import { Tags, TagsTrigger, TagsValue, TagsContent } from '@/components/ui/shadcn-io/tags'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryTreeSelectProps = {
  className?: string
  value: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
  items: Record<string, { name: string; children?: string[] }>
  rootChildren: string[]
  placeholder?: string
}

export function CategoryTreeSelect({ value, onChange, disabled, items, rootChildren, placeholder = 'Selecione as categorias...', className }: CategoryTreeSelectProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const id of rootChildren) init[id] = true
    return init
  })

  const parentMap = useMemo(() => {
    const map: Record<string, string | undefined> = {}
    for (const [pid, node] of Object.entries(items)) {
      const children = node?.children ?? []
      for (const cid of children) map[cid] = pid
    }
    return map
  }, [items])

  const collectAllIds = () => {
    const seen = new Set<string>()
    const q: string[] = [...rootChildren]
    while (q.length) {
      const id = q.shift()!
      if (seen.has(id)) continue
      seen.add(id)
      const children = items[id]?.children ?? []
      for (const c of children) q.push(c)
    }
    return Array.from(seen)
  }

  const getAncestors = (id: string) => {
    const out: string[] = []
    let cur: string | undefined = id
    while (true) {
      const parent: string | undefined = cur ? parentMap[cur] : undefined
      if (!parent) break
      out.push(parent)
      cur = parent
    }
    return out
  }

  const getDescendants = (id: string) => {
    const out: string[] = []
    const q: string[] = [...(items[id]?.children ?? [])]
    while (q.length) {
      const cur = q.shift()!
      out.push(cur)
      const children = items[cur]?.children ?? []
      for (const c of children) q.push(c)
    }
    return out
  }

  useEffect(() => {
    if (open) {
      const all = collectAllIds()
      const next: Record<string, boolean> = {}
      for (const id of all) next[id] = true
      setExpanded(next)
    }
  }, [open])

  const toggleExpand = (id: string) => { setExpanded({ ...expanded, [id]: !expanded[id] }) }
  const isChecked = (id: string) => (value || []).includes(Number(id))
  const toggleCheck = (id: string) => {
    const set = new Set(value || [])
    const n = Number(id)
    if (set.has(n)) {
      set.delete(n)
      const descendants = getDescendants(id).map((d) => Number(d))
      for (const d of descendants) set.delete(d)
    } else {
      set.add(n)
      const ancestors = getAncestors(id).map((a) => Number(a))
      for (const a of ancestors) set.add(a)
    }
    onChange(Array.from(set))
  }

  const labelOf = (id: string) => items[id]?.name ?? id

  const renderNodes = (ids: string[], level = 0): any => {
    return ids.map((id) => {
      const children = items[id]?.children ?? []
      const hasChildren = Array.isArray(children) && children.length > 0
      const openNode = !!expanded[id]
      return (
        <div key={id} className=''>
          <div className='grid grid-cols-[28px_1fr] items-center gap-2 py-1'>
            <Checkbox checked={isChecked(id)} onCheckedChange={() => toggleCheck(id)} disabled={disabled} />
            <div className='flex items-center gap-2' style={{ paddingLeft: level * 16 }}>
              {hasChildren ? (
                <button type='button' className='rounded p-1 hover:bg-muted' onClick={() => toggleExpand(id)} disabled={disabled}>
                  {openNode ? <ChevronDown className='h-4 w-4 text-muted-foreground' /> : <ChevronRight className='h-4 w-4 text-muted-foreground' />}
                </button>
              ) : (
                <span className='w-5' />
              )}
              <span className={hasChildren ? 'text-sm leading-6 font-semibold' : 'text-sm leading-6'}>{labelOf(id)}</span>
            </div>
          </div>
          {hasChildren && openNode ? (
            <div className='mt-0.5'>{renderNodes(children, level + 1)}</div>
          ) : null}
        </div>
      )
    })
  }

  const removeId = (id: number) => {
    const set = new Set(value || [])
    set.delete(id)
    const descendants = getDescendants(String(id)).map((d) => Number(d))
    for (const d of descendants) set.delete(d)
    onChange(Array.from(set))
  }

  return (
    <Tags open={open} onOpenChange={setOpen}>
      <TagsTrigger disabled={disabled} className={cn('rounded-sm h-9 shadow-xs', className)} placeholder={placeholder}>
        {(value || []).map((n) => {
          const id = String(n)
          return (
            <TagsValue key={id} onRemove={() => removeId(n)} className='rounded-none h-6 bg-neutral-100 text-neutral-800'>
              {labelOf(id)}
            </TagsValue>
          )
        })}
      </TagsTrigger>
      <TagsContent align='start' sideOffset={8}>
        <div
          className='max-h-60 overflow-auto pr-1 p-4 overscroll-y-contain'
          onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
          onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
        >
          {renderNodes(rootChildren, 0)}
        </div>
      </TagsContent>
    </Tags>
  )
}

export default CategoryTreeSelect