import React from 'react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { IconGripVertical } from '@tabler/icons-react'

export type ColumnDef<T> = {
  id: string
  header: React.ReactNode | ((data: T[]) => React.ReactNode)
  cell: (item: T) => React.ReactNode
  width?: string
  className?: string
  headerClassName?: string
}

type DataTableProps<T> = {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptySlot?: React.ReactNode
  page?: number
  perPage?: number
  totalItems?: number
  onChange?: (next: { page?: number; perPage?: number }) => void
  onReorder?: (items: T[]) => void
  onReorderItem?: (args: { item: T; index: number }) => void
  onRowClick?: (item: T) => void
  rowIsSelected?: (item: T) => boolean
  skeletonCount?: number
  rowClassName?: string
  hideFooter?: boolean
  enableReorder?: boolean
  reorderDisabled?: boolean
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  emptySlot,
  page,
  perPage,
  totalItems,
  onChange,
  onReorder,
  onReorderItem,
  onRowClick,
  skeletonCount,
  rowClassName,
  hideFooter = false,
  enableReorder = false,
  reorderDisabled = false,
}: DataTableProps<T>) {
  const mainScrollerRef = React.useRef<HTMLDivElement | null>(null)
  const [ordered, setOrdered] = React.useState<T[]>(() => data)
  const [isDraggingTable, setIsDraggingTable] = React.useState(false)
  React.useEffect(() => {
    setOrdered(data)
  }, [data])
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => ordered.map((item, idx) => (item as any)?.id ?? `row-${idx}`), [ordered])
  const items = enableReorder ? ordered : data
  const safeTotalItems = typeof totalItems === 'number' ? totalItems : items.length
  const safePerPage = typeof perPage === 'number' ? perPage : Math.max(items.length, 1)
  const safePage = typeof page === 'number' ? page : 1
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / Math.max(safePerPage, 1)))
  const startIndex = (safePage - 1) * safePerPage
  const endIndex = Math.min(startIndex + safePerPage, safeTotalItems)

  const goToFirstPage = () => {
    if (safePage > 1) onChange?.({ page: 1 })
  }
  const goToPreviousPage = () => {
    if (safePage > 1) onChange?.({ page: safePage - 1 })
  }
  const goToNextPage = () => {
    if (safePage < totalPages) onChange?.({ page: safePage + 1 })
  }
  const goToLastPage = () => {
    if (safePage < totalPages) onChange?.({ page: totalPages })
  }

  const handlePerPageChange = (value: string) => {
    const next = parseInt(value)
    if (!Number.isNaN(next) && next !== safePerPage) {
      onChange?.({ perPage: next })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIndex = dataIds.indexOf(active.id)
      const newIndex = dataIds.indexOf(over.id)
      const next = arrayMove(ordered, oldIndex, newIndex)
      setOrdered(next)
      onReorder?.(next)
      const movedItem = next[newIndex] as T | undefined
      if (movedItem) {
        onReorderItem?.({ item: movedItem, index: newIndex })
      }
    }
  }

  function DragHandle({ id, disabled }: { id: UniqueIdentifier; disabled?: boolean }) {
    const sortable = useSortable({ id, disabled })
    const attributes = disabled ? {} : sortable.attributes
    const listeners = disabled ? {} : sortable.listeners
    return (
      <Button {...attributes} {...listeners} variant='ghost' size='icon' className='text-muted-foreground size-7 hover:bg-transparent'>
        <IconGripVertical className='text-muted-foreground size-4' />
        <span className='sr-only'>Reordenar</span>
      </Button>
    )
  }

  function DraggableRow({ id, className, children, onClick, disabled }: { id: UniqueIdentifier; className?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({ id, disabled })
    return (
      <TableRow
        data-dragging={isDragging}
        onClick={onClick}
        ref={setNodeRef}
        className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 ${className ?? ''}`}
        style={{ transform: CSS.Transform.toString(transform), transition: transition }}
      >
        {children}
      </TableRow>
    )
  }

  return (
    <div className='flex flex-col w-full h-full min-h-0 overflow-y-auto overflow-x-hidden'>

      <div className='relative h-full'>
        <div className={`w-full overflow-x-auto ${isDraggingTable ? 'overflow-y-hidden' : 'overflow-y-auto'}`} data-slot='datatable-scroller' ref={mainScrollerRef}>
        {enableReorder ? (
          <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]} onDragStart={() => setIsDraggingTable(true)} onDragCancel={() => setIsDraggingTable(false)} onDragEnd={(e: DragEndEvent) => { setIsDraggingTable(false); handleDragEnd(e) }} sensors={sensors}>
          <Table className='border-b table-fixed'>
            <TableHeader className='sticky top-0 bg-neutral-50 z-10 border-b'>
              <TableRow className='bg-neutral-50'>
                <TableHead className='border-r w-[50px]' />
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={`border-r ${col.headerClassName ?? ''}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {typeof col.header === 'function' ? col.header(items) : col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <>
                  {Array.from({ length: (typeof skeletonCount === 'number' ? Math.max(0, skeletonCount) : 3) }).map((_, rIdx) => (
                    <TableRow key={`skeleton-row-${rIdx}`} className={`${rowClassName ?? 'h-10'} ${rIdx % 2 === 1 ? 'bg-neutral-50' : ''}`}>
                      <TableCell className='border-r !px-2 w-[60px]' />
                      {columns.map((col, cIdx) => {
                        const fixedCellWidthPx = col.id === 'select' ? 60 : undefined

                        const pxMatch = (col.width ?? '').match(/(\d+)/)
                        const base = pxMatch ? Math.min(parseInt(pxMatch[1]), 220) : 160
                        const variance = 0.6 + ((rIdx + cIdx) % 5) * 0.08
                        const dynamicWidth = Math.round(base * variance)

                        let cellContent: React.ReactNode
                        if (col.id === 'select') {
                          cellContent = (
                            <div className='flex items-center justify-center'>
                              <Skeleton className='h-4 w-4 rounded-[4px]' />
                            </div>
                          )
                        } else if (col.id === 'active') {
                          cellContent = (
                            <div className='flex items-center justify-start'>
                              <Skeleton className='h-5 w-9 rounded-full' />
                            </div>
                          )
                        } else if (col.id === 'name') {
                          cellContent = (
                            <div className='flex items-center gap-2'>
                              <Skeleton className='h-6 w-6 rounded-full' />
                              <Skeleton className='h-4 w-32' />
                            </div>
                          )
                        } else if (col.id === 'email') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-40' />
                            </div>
                          )
                        } else if (col.id === 'user_profile' || col.id === 'team') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-[120px]' />
                            </div>
                          )
                        } else if (col.id === 'created_at') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-32' />
                            </div>
                          )
                        } else if (col.id === 'status') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-6 w-[100px] rounded-lg' />
                            </div>
                          )
                        } else if (col.id === 'actions') {
                          cellContent = (
                            <div className='flex items-center justify-center'>
                              <Skeleton className='h-5 w-5 rounded-full' />
                            </div>
                          )
                        } else {
                          cellContent = (
                            <div className='flex items-center gap-2'>
                              <Skeleton className='h-4' style={{ width: dynamicWidth }} />
                            </div>
                          )
                        }

                        return (
                          <TableCell
                            key={col.id}
                            className={`border-r !px-4 ${col.className ?? ''}`}
                            style={fixedCellWidthPx ? { width: `${fixedCellWidthPx}px` } : col.width ? { width: col.width } : undefined}
                          >
                            {cellContent}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </>
              )}

              {!loading && items.length > 0 && (
                enableReorder ? (
                  <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                    {items.map((item, index) => {
                      const id = (item as any)?.id ?? `row-${index}`
                      return (
                        <DraggableRow
                          key={id}
                          id={id}
                          onClick={() => onRowClick?.(item)}
                          disabled={reorderDisabled}
                          className={`${rowClassName ?? 'h-10'} ${index % 2 === 0 ? '' : 'bg-neutral-50/20'}`}
                        >
                          <TableCell className='border-r !px-2 w-[60px]'>
                            <DragHandle id={id} disabled={reorderDisabled} />
                          </TableCell>
                          {columns.map((col) => (
                            <TableCell key={col.id} className={`border-r !px-4 ${col.className ?? ''}`} style={col.width ? { width: col.width } : undefined}>
                              {col.cell(item)}
                            </TableCell>
                          ))}
                        </DraggableRow>
                      )
                    })}
                  </SortableContext>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <TableRow
                        key={(item as any).id ?? index}
                        onClick={() => onRowClick?.(item)}
                        className={`${rowClassName ?? 'h-10'} ${index % 2 === 0 ? '' : 'bg-neutral-50/20'}`}
                      >
                        {columns.map((col) => (
                          <TableCell key={col.id} className={`border-r !px-4 ${col.className ?? ''}`} style={col.width ? { width: col.width } : undefined}>
                            {col.cell(item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                )
              )}

              {!loading && items.length === 0 && !emptySlot && (
                <TableRow>
                  <TableCell colSpan={columns.length + (enableReorder ? 1 : 0)} className='text-center'>
                    {emptySlot ?? (
                      <div className='py-16 text-center text-muted-foreground'>{emptyMessage}</div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
        ) : (
          <Table className='border-b table-fixed'>
            <TableHeader className='sticky top-0 bg-neutral-50 z-10 border-b'>
              <TableRow className='bg-neutral-50'>
                {columns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={`border-r ${col.headerClassName ?? ''}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {typeof col.header === 'function' ? col.header(items) : col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && (
                <>
                  {Array.from({ length: (typeof skeletonCount === 'number' ? Math.max(0, skeletonCount) : 3) }).map((_, rIdx) => (
                    <TableRow key={`skeleton-row-${rIdx}`} className={`${rowClassName ?? 'h-10'} ${rIdx % 2 === 1 ? 'bg-neutral-50' : ''}`}>
                      {columns.map((col, cIdx) => {
                        const fixedCellWidthPx = col.id === 'select' ? 60 : undefined

                        const pxMatch = (col.width ?? '').match(/(\d+)/)
                        const base = pxMatch ? Math.min(parseInt(pxMatch[1]), 220) : 160
                        const variance = 0.6 + ((rIdx + cIdx) % 5) * 0.08
                        const dynamicWidth = Math.round(base * variance)

                        let cellContent: React.ReactNode
                        if (col.id === 'select') {
                          cellContent = (
                            <div className='flex items-center justify-center'>
                              <Skeleton className='h-4 w-4 rounded-[4px]' />
                            </div>
                          )
                        } else if (col.id === 'active') {
                          cellContent = (
                            <div className='flex items-center justify-start'>
                              <Skeleton className='h-5 w-9 rounded-full' />
                            </div>
                          )
                        } else if (col.id === 'name') {
                          cellContent = (
                            <div className='flex items-center gap-2'>
                              <Skeleton className='h-6 w-6 rounded-full' />
                              <Skeleton className='h-4 w-32' />
                            </div>
                          )
                        } else if (col.id === 'email') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-40' />
                            </div>
                          )
                        } else if (col.id === 'user_profile' || col.id === 'team') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-[120px]' />
                            </div>
                          )
                        } else if (col.id === 'created_at') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-4 w-32' />
                            </div>
                          )
                        } else if (col.id === 'status') {
                          cellContent = (
                            <div className='flex items-center'>
                              <Skeleton className='h-6 w-[100px] rounded-lg' />
                            </div>
                          )
                        } else if (col.id === 'actions') {
                          cellContent = (
                            <div className='flex items-center justify-center'>
                              <Skeleton className='h-5 w-5 rounded-full' />
                            </div>
                          )
                        } else {
                          cellContent = (
                            <div className='flex items-center gap-2'>
                              <Skeleton className='h-4' style={{ width: dynamicWidth }} />
                            </div>
                          )
                        }

                        return (
                          <TableCell
                            key={col.id}
                            className={`border-r !px-4 ${col.className ?? ''}`}
                            style={fixedCellWidthPx ? { width: `${fixedCellWidthPx}px` } : col.width ? { width: col.width } : undefined}
                          >
                            {cellContent}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </>
              )}

              {!loading && items.length > 0 && (
                <>
                  {items.map((item, index) => (
                    <TableRow key={(item as any).id ?? index} className={`${rowClassName ?? 'h-10'} ${index % 2 === 0 ? '' : 'bg-neutral-50/20'}`}>
                      {columns.map((col) => (
                        <TableCell key={col.id} className={`border-r !px-4 ${col.className ?? ''}`} style={col.width ? { width: col.width } : undefined}>
                          {col.cell(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              )}

              {!loading && items.length === 0 && !emptySlot && (
                <TableRow>
                  <TableCell colSpan={columns.length} className='text-center'>
                    {emptySlot ?? (
                      <div className='py-16 text-center text-muted-foreground'>{emptyMessage}</div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        </div>

        {!loading && data.length === 0 && emptySlot && (
          <div className='absolute inset-0 flex items-center justify-center p-4'>
            {emptySlot}
          </div>
        )}
      </div>

      {hideFooter ? null : (
        <div className='border-t h-12 w-full p-2 flex items-center'>
          <span className='text-sm xl:hidden'>
            {safeTotalItems > 0 ? startIndex + 1 : 0} ao {endIndex} de {safeTotalItems} iten(s).
          </span>
          <span className='text-sm hidden xl:inline'>
            Mostrando do {safeTotalItems > 0 ? startIndex + 1 : 0} ao {endIndex} de {safeTotalItems} itens.
          </span>

          <div className='flex items-center gap-2 flex-1 justify-end'>
            <span className='text-sm xl:hidden'>Por página</span>
            <span className='text-sm hidden xl:inline'>Itens por página</span>
            <Select value={safePerPage.toString()} onValueChange={handlePerPageChange}>
              <SelectTrigger className='w-[90px]'>
                <SelectValue placeholder={safePerPage.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='30'>30</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Separator orientation='vertical' />

            <span className='text-sm'>Página {safePage} de {totalPages}</span>

            <Separator orientation='vertical' />

            <Button variant={'outline'} size={'icon'} onClick={goToFirstPage} disabled={safePage === 1}>
              <ChevronsLeft />
            </Button>
            <Button variant={'outline'} size={'icon'} onClick={goToPreviousPage} disabled={safePage === 1}>
              <ChevronLeft />
            </Button>
            <Button variant={'outline'} size={'icon'} onClick={goToNextPage} disabled={safePage === totalPages}>
              <ChevronRight />
            </Button>
            <Button variant={'outline'} size={'icon'} onClick={goToLastPage} disabled={safePage === totalPages}>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
