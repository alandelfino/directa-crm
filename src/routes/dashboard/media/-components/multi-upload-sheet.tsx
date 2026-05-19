import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { UploadCloud, Loader, Check, FileIcon, AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type QueueItem = {
  id: string
  file: File
  name: string
  to: 'product' | 'logo' | 'banner' | 'icon'
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

function deriveName(file: File) {
  const n = file.name || 'arquivo'
  return n
}

interface MultiUploadSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MultiUploadSheet({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: MultiUploadSheetProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : localOpen
  const setOpen = isControlled ? controlledOnOpenChange : setLocalOpen

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [hasNotified, setHasNotified] = useState(false)
  const [viewErrors, setViewErrors] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const uploadingRef = useRef(false)
  const queryClient = useQueryClient()
  const [uploadTo, setUploadTo] = useState<'product' | 'logo' | 'banner' | 'icon'>('product')

  const allProcessed = useMemo(() => queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error'), [queue])
  const isUploading = useMemo(() => queue.some((q) => q.status === 'pending' || q.status === 'uploading'), [queue])

  const okCount = useMemo(() => queue.filter((q) => q.status === 'done').length, [queue])
  const failCount = useMemo(() => queue.filter((q) => q.status === 'error').length, [queue])

  const overallProgress = useMemo(() => {
    if (queue.length === 0) return 0
    const sum = queue.reduce((acc, curr) => acc + (curr.status === 'done' ? 100 : curr.progress), 0)
    return Math.round(sum / queue.length)
  }, [queue])

  useEffect(() => {
    if (!allProcessed) {
      setHasNotified(false)
    }
  }, [allProcessed])

  useEffect(() => {
    if (uploadingRef.current) return
    const nextIndex = queue.findIndex((q) => q.status === 'pending')
    if (nextIndex >= 0) {
      uploadingRef.current = true
        ; (async () => {
          const item = queue[nextIndex]
          try {
            setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'uploading', progress: 0, error: undefined } : q))
            const fd = new FormData()
            fd.append('name', item.name)
            fd.append('to', item.to)
            fd.append('type', 'file')
            fd.append('file', item.file)
            const res = await privateInstance.post('/tenant/medias', fd, {
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
            const errorData = err?.response?.data
            const rawMsg = errorData?.detail || errorData?.message || errorData?.title || err?.message || 'Erro ao enviar'
            const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg
            setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'error', error: msg } : q))
          } finally {
            uploadingRef.current = false
          }
        })()
    } else if (queue.length > 0 && allProcessed && !hasNotified) {
      if (failCount === queue.length) {
        toast.error("Falha ao enviar os arquivos", {
          description: "Todos os uploads falharam. Verifique os erros listados abaixo."
        })
      } else if (failCount > 0) {
        toast.warning("Uploads concluídos com erros", {
          description: `${okCount} arquivo(s) enviado(s) com sucesso, ${failCount} falhou(aram).`
        })
      } else {
        toast.success("Uploads concluídos com sucesso!")
      }

      try {
        queryClient.invalidateQueries({ queryKey: ['medias'] })
        try {
          window.dispatchEvent(new CustomEvent('directa:medias-updated'))
        } catch { }
      } catch { }
      setHasNotified(true)
    }
  }, [open, queue, allProcessed, hasNotified, queryClient, okCount, failCount])

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) {
      toast.error('Selecione apenas imagens', {
        description: 'Formatos suportados: JPG, PNG, WEBP, GIF'
      })
      return
    }
    const nextItems: QueueItem[] = arr.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      name: deriveName(f),
      to: uploadTo,
      status: 'pending',
      progress: 0,
    }))
    setViewErrors(false)
    setQueue((prev) => [...prev, ...nextItems])
    setOpen?.(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleOpenChange = (v: boolean) => {
    if (!v && isUploading) {
      toast.warning('Aguarde o término do upload para fechar')
      return
    }
    setOpen?.(v)
    if (!v) {
      setQueue([])
      setViewErrors(false)
    }
  }

  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <>
      <input ref={inputRef} type='file' accept='image/*' multiple className='hidden' onChange={(e) => handleFilesSelected(e.target.files)} />
      {!isControlled && (
        <Button size={'sm'} variant={'default'} onClick={() => setOpen?.(true)}>
          <UploadCloud className="size-[0.85rem]" /> Upload
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col p-6 overflow-hidden gap-0">
          <DialogHeader className="mb-6">
            <DialogTitle>Upload em lote</DialogTitle>
            <DialogDescription>Acompanhe o progresso dos uploads</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* 1. SELETOR E AREA DE DROP (Visível apenas se NÃO estiver fazendo upload E se NÃO estiver tudo concluído) */}
            {!isUploading && !allProcessed && (
              <div className='space-y-4 animate-in fade-in duration-200'>
                <div className='grid gap-2'>
                  <Label>Destino</Label>
                  <Select value={uploadTo} onValueChange={(v) => setUploadTo(v as any)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Produto</SelectItem>
                      <SelectItem value="logo">Logo</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="icon">Ícone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => {
                    inputRef.current?.click()
                  }}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 gap-3 min-h-[140px] select-none ${isDragActive
                    ? 'border-primary bg-primary/5 scale-[0.98]'
                    : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50/50 dark:border-neutral-800 dark:hover:border-primary/50 dark:hover:bg-neutral-900/50'
                    }`}
                >
                  <div className={`p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 transition-transform duration-300 ${isDragActive ? 'scale-110 text-primary' : ''}`}>
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      Arraste e solte as imagens aqui ou clique para selecionar
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      JPG, PNG, WEBP, GIF (apenas imagens)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROGRESSO ÚNICO (Visível apenas se estiver fazendo upload) */}
            {isUploading && (
              <div className='space-y-4 p-5 border rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10 animate-in fade-in slide-in-from-bottom-2 duration-300'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='space-y-1'>
                    <div className='text-sm font-semibold text-foreground flex items-center gap-2'>
                      <Loader className="h-4 w-4 animate-spin text-primary" />
                      Enviando arquivos...
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Processando {queue.filter(q => q.status === 'done' || q.status === 'error').length} de {queue.length} mídias
                    </div>
                  </div>
                  <span className='text-lg font-bold text-primary tabular-nums'>{overallProgress}%</span>
                </div>
                <div className='h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-primary rounded-full transition-all duration-300 ease-out'
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 3. RESUMO E LISTAGEM DE ERROS (Se tudo processado) */}
            {allProcessed && (
              <div className='space-y-4 animate-in fade-in duration-300'>
                {failCount > 0 ? (
                  <div className='flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'>
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                    <div className='space-y-1'>
                      <h4 className='text-sm font-semibold'>Upload concluído com {failCount === 1 ? '1 erro' : `${failCount} erros`}</h4>
                      <p className='text-xs text-amber-700/90 dark:text-amber-400/80'>
                        {okCount} de {queue.length} arquivos enviados com sucesso. {failCount} arquivo(s) falhou(aram).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-300'>
                    <Check className="h-5 w-5 shrink-0 mt-0.5 text-green-600 dark:text-green-500" />
                    <div className='space-y-1'>
                      <h4 className='text-sm font-semibold'>Sucesso total!</h4>
                      <p className='text-xs text-green-700/90 dark:text-green-400/80'>
                        Todos os {okCount} arquivos foram enviados e processados com sucesso.
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista detalhada de erros se viewErrors estiver ativo */}
                {viewErrors && failCount > 0 && (
                  <div className='space-y-2 border-t pt-4 animate-in fade-in slide-in-from-top-2 duration-300'>
                    <div className='text-xs font-bold text-destructive uppercase tracking-wider mb-2'>
                      Arquivos com erro ({failCount}):
                    </div>
                    <div className='flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1'>
                      {queue
                        .filter((item) => item.status === 'error')
                        .map((item) => (
                          <div key={item.id} className='rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex flex-col gap-1.5 animate-in fade-in duration-200'>
                            <div className='flex items-center justify-between gap-3 min-w-0'>
                              <div className='flex items-center gap-2 min-w-0 flex-1'>
                                <FileIcon className='h-4 w-4 text-destructive shrink-0' />
                                <span className='text-xs font-semibold text-foreground truncate' title={item.name}>{item.name}</span>
                              </div>
                            </div>
                            <div className='text-xs text-destructive flex items-start gap-1 bg-destructive/10 p-2 rounded break-all'>
                              <AlertCircle className='h-3.5 w-3.5 shrink-0 mt-0.5' />
                              <span>{item.error ?? 'Erro ao enviar arquivo'}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer de ações fixo */}
          {allProcessed && (
            <div className="border-t pt-4 mt-4 flex justify-end gap-2 shrink-0">
              {failCount > 0 && (
                <Button
                  onClick={() => setViewErrors(!viewErrors)}
                  variant="outline"
                  className="text-amber-700 hover:text-amber-800 dark:text-amber-400 border-amber-200 hover:bg-amber-50 dark:border-amber-900/30"
                >
                  {viewErrors ? 'Ocultar erros' : 'Ver erros'} ({failCount})
                </Button>
              )}
              <Button onClick={() => handleOpenChange(false)} variant="default">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
