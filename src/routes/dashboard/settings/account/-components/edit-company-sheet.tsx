import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Edit } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/shadcn-io/image-crop'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetDescription } from '@/components/ui/sheet'
import { toast } from 'sonner'

type VaultImage = {
  access?: string
  path?: string
  name?: string
  type?: string
  size?: number
  mime?: string
  meta?: { width?: number; height?: number }
  url?: string
} | null

type CompanyProfile = {
  id: number
  created_at?: number
  updated_At?: number
  name?: string
  user_id?: number
  alias?: string
  website?: string
  segment?: string
  description?: string
  image?: VaultImage
}

function getSubdomain() { return window.location.hostname.split('.')[0] }

export function EditCompanySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removedLogo, setRemovedLogo] = useState<boolean>(false)
  const [cropOpen, setCropOpen] = useState<boolean>(false)
  const originalFileRef = useRef<File | null>(null)

  const formSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    website: z.string().optional().default(''),
    description: z.string().optional().default(''),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: '',
      website: '',
      description: '',
    },
  })

  const { data, isError } = useQuery({
    queryKey: ['company-profile', 'edit-sheet'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get('/api:kdrFy_tm/companies/single')
      if (res.status !== 200) {
        throw new Error(res?.data?.message ?? 'Erro ao carregar dados da empresa')
      }
      const payload = res.data as any
      const normalized: CompanyProfile = {
        id: Number(payload?.id ?? 3),
        created_at: Number(payload?.created_at ?? 1762798128984),
        updated_At: Number(payload?.updated_At ?? 1762798129000),
        name: String(payload?.name ?? 'Empresa'),
        user_id: Number(payload?.user_id ?? 0),
        alias: String(payload?.alias ?? ''),
        website: String(payload?.website ?? ''),
        description: String(payload?.description ?? ''),
        image: payload?.image ?? null,
      }
      return normalized
    }
  })

  useEffect(() => {
    if (isError) {
      toast.error('Erro ao carregar dados da empresa')
    }
  }, [isError])

  useEffect(() => {
    if (!data || !open) return
    setCompany(data)
    setPreviewUrl(data?.image?.url ?? null)
    if (data?.image === null) {
      try {
        setSelectedFile(null)
        setRemovedLogo(false)
      } catch {}
    }
    form.reset({
      name: data?.name ?? '',
      website: data?.website ?? '',
      description: data?.description ?? '',
    })
    try {
      const sub = getSubdomain()
      localStorage.setItem(`${sub}-directa-company`, JSON.stringify(data))
      try { window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: data })) } catch {}
    } catch {}
  }, [data, open])

  function handlePickLogo() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const MAX_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        toast.error('Arquivo muito grande. Tamanho máximo permitido é 10MB.')
        return
      }
      setRemovedLogo(false)
      originalFileRef.current = file
      setCropOpen(true)
    } catch {
      toast.error('Falha ao carregar a imagem da logo')
    }
  }

  async function handleShadcnCrop(croppedDataUrl: string) {
    try {
      const resp = await fetch(croppedDataUrl)
      const blob = await resp.blob()
      const fileName = (originalFileRef.current?.name || 'logo').replace(/\.[^/.]+$/, '') + '-cropped.png'
      const croppedFile = new File([blob], fileName, { type: 'image/png' })
      setPreviewUrl(croppedDataUrl)
      setSelectedFile(croppedFile)
      const sub = getSubdomain()
      const raw = localStorage.getItem(`${sub}-directa-company`)
      let localCompany: any = null
      try { localCompany = raw ? JSON.parse(raw) : null } catch { localCompany = null }
      const nextCompany = { ...(localCompany ?? {}), image: { ...(localCompany?.image ?? {}), url: croppedDataUrl } }
      localStorage.setItem(`${sub}-directa-company`, JSON.stringify(nextCompany))
      try { window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: nextCompany })) } catch {}
      setCropOpen(false)
    } catch {
      toast.error('Falha ao aplicar recorte da imagem')
      setCropOpen(false)
    }
  }

  function handleRemoveLogo() {
    try {
      setRemovedLogo(true)
      setSelectedFile(null)
      setPreviewUrl(null)
      const sub = getSubdomain()
      const raw = localStorage.getItem(`${sub}-directa-company`)
      let localCompany: any = null
      try { localCompany = raw ? JSON.parse(raw) : null } catch { localCompany = null }
      const nextCompany = { ...(localCompany ?? {}), image: { ...(localCompany?.image ?? {}), url: null } }
      localStorage.setItem(`${sub}-directa-company`, JSON.stringify(nextCompany))
      try { window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: nextCompany })) } catch {}
    } catch {}
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const fd = new FormData()
      fd.append('name', values.name)
      fd.append('website', values.website ?? '')
      fd.append('description', values.description ?? '')
      if (selectedFile) {
        fd.append('file', selectedFile, selectedFile.name)
      }
      if (removedLogo) {
        fd.append('remove_file', '1')
      }
      const res = await privateInstance.put(
        '/api:kdrFy_tm/companies',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      if (res.status >= 200 && res.status < 300) {
        try {
          const payload = res.data as any
          const sub = getSubdomain()
          const nextCompany: CompanyProfile = {
            ...(company ?? {} as CompanyProfile),
            ...(payload ?? {}),
          } as CompanyProfile
          const finalUrl = nextCompany?.image?.url ?? payload?.image?.url ?? null
          if (finalUrl) setPreviewUrl(finalUrl)
          setCompany(nextCompany)
          localStorage.setItem(`${sub}-directa-company`, JSON.stringify(nextCompany))
          try { window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: nextCompany })) } catch {}
          onOpenChange(false)
        } catch {}
        toast.success('Dados da empresa atualizados!')
      } else {
        toast.error('Erro ao atualizar os dados da empresa')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao atualizar os dados da empresa'
      toast.error(msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-lg md:max-w-2xl lg:max-w-xl w-full'>
        <Form {...form}>
          <form id='company-edit-form' className='flex flex-col h-full' onSubmit={form.handleSubmit(async (vals) => { await onSubmit(vals) })}>
            <SheetHeader>
              <SheetTitle>Editar empresa</SheetTitle>
              <SheetDescription>Atualize os dados da sua empresa.</SheetDescription>
            </SheetHeader>
            <div className='flex-1 min-h-0 overflow-y-auto grid auto-rows-min gap-6 px-4 py-4'>
              <div className='grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4'>
                <div className='text-xs font-medium text-muted-foreground'>Logo da empresa</div>
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    className='group relative cursor-pointer'
                    onClick={handlePickLogo}
                    title='Clique para escolher uma imagem'
                    aria-label='Alterar logo'
                  >
                    <Avatar className='h-14 w-14 rounded-2xl border shadow-xs'>
                      <AvatarImage src={previewUrl || undefined} alt={company?.name || ''} />
                      <AvatarFallback className='rounded-2xl'>
                        {getAvatarAbbrev(company?.name ?? 'Empresa')}
                      </AvatarFallback>
                    </Avatar>
                    <div className='absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center'>
                      <Edit className='h-4 w-4 text-white' />
                    </div>
                  </button>
                  <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp' className='hidden' onChange={handleFileChange} />
                  {(previewUrl || (company?.image?.url && !removedLogo)) && (
                    <Button variant='ghost' size="sm" type='button' className='text-xs font-light text-muted-foreground' onClick={handleRemoveLogo}>Remover logo</Button>
                  )}
                </div>
              </div>
              <div className='grid grid-cols-1 gap-4'>
                <FormField control={form.control} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa</FormLabel>
                    <FormControl>
                      <Input placeholder='Nome da empresa' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name='website' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder='https://exemplo.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name='description' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder='Descrição da empresa'
                        className='file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input min-h-24 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <Dialog open={cropOpen} onOpenChange={setCropOpen}>
                <DialogContent className='sm:max-w-[600px]'>
                  <DialogHeader>
                    <DialogTitle>Recortar logo</DialogTitle>
                  </DialogHeader>
                  {originalFileRef.current ? (
                    <ImageCrop file={originalFileRef.current} aspect={1} maxImageSize={1024 * 1024 * 5} onCrop={handleShadcnCrop}>
                      <div className='space-y-4'>
                        <ImageCropContent className='max-h-[300px]' />
                        <div className='flex justify-end gap-2'>
                          <ImageCropReset asChild>
                            <Button variant={'ghost'} size="sm">Resetar</Button>
                          </ImageCropReset>
                          <ImageCropApply asChild>
                            <Button size="sm">Aplicar recorte</Button>
                          </ImageCropApply>
                        </div>
                      </div>
                    </ImageCrop>
                  ) : (
                    <div className='text-sm text-muted-foreground'>Selecione uma imagem para recortar.</div>
                  )}
                  <DialogFooter>
                    <Button variant={'outline'} onClick={() => setCropOpen(false)}>Cancelar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={form.formState.isSubmitting} className='w-full'>
                  {form.formState.isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}