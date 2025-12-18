import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { UploadCloud, Loader, Check, FileIcon, CloudUpload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type QueueItem = {
  id: string
  file: File
  name: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

function deriveName(file: File) {
  const n = file.name || 'arquivo'
  return n
}

export function MultiUploadSheet() {
  const [open, setOpen] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const uploadingRef = useRef(false)
  const queryClient = useQueryClient()

  const allProcessed = useMemo(() => queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error'), [queue])

  useEffect(() => {
    if (uploadingRef.current) return
    const nextIndex = queue.findIndex((q) => q.status === 'pending')
    if (nextIndex >= 0) {
      uploadingRef.current = true
      ;(async () => {
        const item = queue[nextIndex]
        try {
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'uploading', progress: 0, error: undefined } : q))
          const fd = new FormData()
          fd.append('name', item.name)
          fd.append('file', item.file)
          const res = await privateInstance.post('/api:qSTOvw0A/medias', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const total = e.total ?? item.file.size
              const prog = total > 0 ? Math.round((e.loaded / total) * 100) : 0
              setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, progress: prog } : q))
            },
          })
          if (res.status !== 200 && res.status !== 201) throw new Error('Falha ao enviar')
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'done', progress: 100 } : q))
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao enviar'
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'error', error: msg } : q))
        } finally {
          uploadingRef.current = false
        }
      })()
    } else if (queue.length > 0 && allProcessed) {
      const ok = queue.filter((q) => q.status === 'done').length
      const fail = queue.filter((q) => q.status === 'error').length
      toast.success(`Uploads concluídos${fail > 0 ? ` (${ok} ok, ${fail} erro)` : ''}`)
      try {
        queryClient.invalidateQueries({ queryKey: ['medias'] })
        try {
          window.dispatchEvent(new CustomEvent('directa:medias-updated'))
        } catch {}
      } catch {}
      if (open) {
        setOpen(false)
      }
      setQueue([])
    }
  }, [open, queue, allProcessed])

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) { toast.error('Selecione apenas imagens'); return }
    const nextItems: QueueItem[] = arr.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      name: deriveName(f),
      status: 'pending',
      progress: 0,
    }))
    setQueue((prev) => [...prev, ...nextItems])
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const dt = e.dataTransfer
    handleFilesSelected(dt.files)
  }

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { if (queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error')) { setQueue([]) } } }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'default'}>
          <UploadCloud className="size-[0.85rem]" /> Upload
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className='flex flex-col h-full'>
          <SheetHeader>
            <SheetTitle>Upload em lote</SheetTitle>
            <SheetDescription>Selecione vários arquivos para enviar</SheetDescription>
          </SheetHeader>
          <div className='px-4 py-4'>
            <input ref={inputRef} type='file' accept='image/*' multiple className='hidden' onChange={(e) => handleFilesSelected(e.target.files)} />
            <div
              className='rounded-md border-2 border-dashed h-40 w-full overflow-hidden cursor-pointer'
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <div className='h-full w-full flex items-center justify-center'>
                <div className='flex flex-col items-center justify-center'>
                  <CloudUpload className='w-10 h-10 text-neutral-300' />
                  <span className='text-sm mt-2'>Clique para selecionar</span>
                </div>
              </div>
            </div>
          </div>

          <div className='flex-1 min-h-0 overflow-auto px-4'>
            <div className='flex flex-col gap-2'>
              {queue.map((item) => (
                <div key={item.id} className='rounded-md bg-neutral-50 p-3 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3 min-w-0 flex-1'>
                    <FileIcon className='h-5 w-5 text-muted-foreground' />
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-medium truncate'>{item.name}</div>
                      <div className='text-xs text-muted-foreground'>{(item.file.size / 1024).toFixed(2)} KB</div>
                      {item.status === 'uploading' && (
                        <div className='mt-2 h-2 w-full bg-muted rounded'>
                          <div className='h-full bg-primary rounded' style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    {item.status === 'uploading' && <span className='text-sm text-muted-foreground'>{item.progress}%</span>}
                    {item.status === 'done' && <Check className='h-5 w-5 text-green-600' />}
                    {item.status === 'uploading' && <Loader className='h-5 w-5 animate-spin text-muted-foreground' />}
                    {item.status === 'error' && <span className='text-sm text-destructive'>{item.error ?? 'Erro'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}