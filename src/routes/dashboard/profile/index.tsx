import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/shadcn-io/image-crop'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { Loader, Mail, User, Lock, Trash, Save } from 'lucide-react'

export const Route = createFileRoute('/dashboard/profile/')({
  component: RouteComponent,
})

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

type MeResponse = {
  id: number
  name?: string
  email?: string
  image?: VaultImage
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  image: z.any().optional(),
})

function getSubdomain() {
  return window.location.hostname.split('.')[0]
}

  function RouteComponent() {
  const [loadingMe, setLoadingMe] = useState<boolean>(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastBlobUrlRef = useRef<string | null>(null)
  // Guarda arquivo original selecionado para preservar MIME/EXT quando recortar
  const originalFileRef = useRef<File | null>(null)
  // Flag para indicar remoção do avatar
  const [removeImage, setRemoveImage] = useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: '',
      image: undefined,
    },
  })

  // Carrega dados iniciais do usuário
  useEffect(() => {
    async function loadMe() {
      try {
        setLoadingMe(true)
        // Tenta primeiro do localStorage
        const subdomain = getSubdomain()
        const raw = localStorage.getItem(`${subdomain}-directa-user`)
        let localUser: any = null
        try { localUser = raw ? JSON.parse(raw) : null } catch { localUser = null }

        if (localUser && localUser.id) {
          // Usa dados locais imediatamente para evitar flicker
          setMe({ id: localUser.id, name: localUser.name ?? '', email: localUser.email ?? '', image: localUser.image ?? null })
          form.reset({ name: localUser.name ?? '' })
          setPreviewUrl(localUser.image?.url ?? localUser.avatar_url ?? null)

          // Se não houver imagem no localStorage, não buscamos mais do backend (endpoint removido)
          // const hasLocalImage = ...
        } else {
          // Fallback: endpoint /auth/me removido
          toast.error('Sessão expirada ou dados locais não encontrados. Por favor, faça login novamente.')
        }
      } catch (err: any) {
        const errorData = err?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar perfil', {
          description: errorData?.detail || 'Não foi possível carregar os dados do perfil.'
        })
      } finally {
        setLoadingMe(false)
      }
    }
    loadMe()
  }, [])

  // userId local removido: os dados do usuário são inferidos pelo token e mantidos no localStorage

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const fd = new FormData()
      fd.append('name', values.name)
      const imageVal: File | undefined = values.image instanceof FileList ? values.image.item(0) ?? undefined : (values.image as File | undefined)
      const uploadFile: File | undefined = removeImage ? undefined : imageVal
      // Validação básica do arquivo gerado pelo crop
      if (uploadFile && (uploadFile.size === 0 || !uploadFile.type)) {
        toast.error('Erro no processamento', {
          description: 'Falha ao gerar a imagem recortada. Tente novamente.'
        })
        return
      }
      if (uploadFile) {
        // Backend (Xano) espera o parâmetro 'file' conforme o erro retornado.
        // Anexa explicitamente o nome do arquivo para Content-Disposition
        fd.append('file', uploadFile, uploadFile.name)
      }
      // Se usuário removeu a imagem, sinaliza ao backend
      if (removeImage) {
        fd.append('remove_file', 'true')
      }

      // Endpoint não precisa mais do {user_id}; backend infere pelo token
      // Alinha com new-media-dialog: define explicitamente multipart/form-data no cabeçalho
  const res = await privateInstance.put('/api:paM0Fhtw/users', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      if (res.status >= 200 && res.status < 300) {
        toast.success('Perfil atualizado!')
        // Atualiza localStorage e sidebar (avatar e nome)
        try {
          const subdomain = getSubdomain()
          const raw = localStorage.getItem(`${subdomain}-directa-user`)
          let localUser: any = null
          try { localUser = raw ? JSON.parse(raw) : null } catch { localUser = null }

          // Tenta usar a imagem retornada pela API; se não vier, usa o preview atual como um placeholder imediato
          const updatedImage = removeImage ? null : (res?.data?.image ?? null)
          const oldUrl: string | null = (localUser?.image?.url ?? me?.image?.url ?? null) as string | null
          // Se a resposta ainda contiver a URL antiga (processamento não concluiu), mantemos o preview (blob) temporariamente
          const finalImage = removeImage
            ? null
            : ((!updatedImage?.url || updatedImage.url === oldUrl)
              ? (previewUrl ? { url: previewUrl } : (localUser?.image ?? null))
              : updatedImage)
          const nextUser = {
            ...(localUser ?? {}),
            name: values.name,
            image: finalImage,
          }
          localStorage.setItem(`${subdomain}-directa-user`, JSON.stringify(nextUser))

          // Atualiza estado local
          setMe((prev) => prev ? ({ ...prev, name: values.name, image: (removeImage ? null : (nextUser.image ?? prev.image)) }) : prev)
          // Não sobrescreve o preview com uma URL antiga do backend.
          // Se o backend já retornar a nova URL (não blob:), aplicamos; caso contrário mantemos o preview atual (blob) até a confirmação.
          if (!removeImage && finalImage?.url && !String(finalImage.url).startsWith('blob:')) {
            if (finalImage.url !== previewUrl) {
              setPreviewUrl(finalImage.url)
            }
          }
          if (removeImage) {
            setPreviewUrl(null)
          }

          // Notifica o sidebar/nav para atualizar imediatamente
          try {
            window.dispatchEvent(new CustomEvent('directa:user-updated', {
              detail: {
                name: values.name,
                email: nextUser?.email ?? undefined,
                avatarUrl: (removeImage ? null : (finalImage?.url ?? previewUrl ?? null)) as string | null,
              }
            }))
          } catch {}

          // Passo opcional: refetch leve para sincronizar a imagem definitiva do backend (evita ficar com blob após upload)
          if (!removeImage) {
            try {
              setTimeout(async () => {
  const check = await privateInstance.get('/api:eA5lqIuH/auth/me')
                const data2 = Array.isArray(check?.data) ? (check?.data[0] ?? null) : check?.data
                const finalUrl: string | undefined = data2?.image?.url
                if (finalUrl && typeof finalUrl === 'string' && !finalUrl.startsWith('blob:')) {
                  // Atualiza localStorage e estado com a URL definitiva
                  const raw2 = localStorage.getItem(`${subdomain}-directa-user`)
                  let localUser2: any = null
                  try { localUser2 = raw2 ? JSON.parse(raw2) : null } catch { localUser2 = null }
                  const nextUser2 = { ...(localUser2 ?? {}), image: { ...(localUser2?.image ?? {}), url: finalUrl } }
                  localStorage.setItem(`${subdomain}-directa-user`, JSON.stringify(nextUser2))
                  setMe((prev) => prev ? ({ ...prev, image: nextUser2.image }) : prev)
                  setPreviewUrl(finalUrl)
                  // Notifica o sidebar
                  try {
                    window.dispatchEvent(new CustomEvent('directa:user-updated', { detail: { avatarUrl: finalUrl, name: nextUser2?.name, email: nextUser2?.email } }))
                  } catch {}
                }
              }, 1500)
            } catch {}
          } else {
            // Se removido, garante que localStorage e preview estejam limpos
            try {
              const raw3 = localStorage.getItem(`${subdomain}-directa-user`)
              let localUser3: any = null
              try { localUser3 = raw3 ? JSON.parse(raw3) : null } catch { localUser3 = null }
              const nextUser3 = { ...(localUser3 ?? {}), image: null }
              localStorage.setItem(`${subdomain}-directa-user`, JSON.stringify(nextUser3))
              setPreviewUrl(null)
            } catch {}
          }
        } catch {}
      } else {
        const errorData = res?.data
        toast.error(errorData?.title || 'Erro ao atualizar perfil', {
          description: errorData?.detail || 'Não foi possível salvar as alterações.'
        })
      }
    } catch (error: any) {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar perfil', {
        description: errorData?.detail || 'Ocorreu um erro ao tentar salvar as alterações.'
      })
    }
  }

  // Removido fluxo de crop manual via canvas (usamos ImageCrop do shadcn-io)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    const file = files && files[0] ? files[0] : undefined
    if (!file) return
    originalFileRef.current = file
    setRemoveImage(false)
    const url = URL.createObjectURL(file)
    // Revoga blob anterior para evitar vazamento
    try { if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current) } catch {}
    lastBlobUrlRef.current = url
    setPreviewUrl(url)
    setCropOpen(true)
    // Armazena arquivo original no form (campo 'image')
    form.setValue('image', file as any)
  }

  // Handler para integrar o crop do shadcn-io
  async function handleShadcnCrop(croppedDataUrl: string) {
    try {
      // Converte dataURL (PNG) em Blob e File
      const resp = await fetch(croppedDataUrl)
      const blob = await resp.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      form.setValue('image', file as any)
      // Atualiza preview
      try { if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current) } catch {}
      lastBlobUrlRef.current = null
      setPreviewUrl(croppedDataUrl)
      setRemoveImage(false)
      setCropOpen(false)
    } catch {
      toast.error('Não foi possível aplicar o recorte. Tente novamente.')
    }
  }

  function removeAvatar() {
    // Marca remoção e limpa pré-visualização
    try { if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current) } catch {}
    lastBlobUrlRef.current = null
    originalFileRef.current = null
    setPreviewUrl(null)
    setRemoveImage(true)
    form.setValue('image', undefined as any)
  }

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title='Meu Perfil' breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Meu Perfil', href: '/dashboard/profile', isLast: true }]} />

      {/* Conteúdo centralizado sem card */}
      <div className='flex-1 overflow-auto p-4'>
        <div className='w-full max-w-xl mx-auto space-y-6 pt-10 md:pt-12'>
          {loadingMe ? (
            <div className='flex items-center gap-2 text-sm text-muted-foreground'><Loader className='w-4 h-4 animate-spin' /> Carregando...</div>
          ) : !me ? (
            <div className='text-sm text-muted-foreground'>Não foi possível carregar seus dados.</div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                <div className='grid gap-6'>
                  <div className='flex flex-col items-center gap-2'>
                    <button
                      type='button'
                      className='cursor-pointer'
                      onClick={() => fileInputRef.current?.click()}
                      title='Clique para escolher uma imagem'
                      aria-label='Alterar avatar'
                    >
                      <Avatar className='h-24 w-24 rounded-2xl'>
                        <AvatarImage src={previewUrl || undefined} alt={me?.name || ''} />
                        <AvatarFallback className='rounded-2xl'>
                          {getAvatarAbbrev(me?.name || form.getValues('name') || '') || 'AU'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div>
                      <Button
                        type='button'
                        variant={'outline'}
                        size={'sm'}
                        className='h-8 rounded-full px-3 text-xs gap-1.5 border-muted-foreground/20 text-muted-foreground hover:text-foreground'
                        onClick={removeAvatar}
                        disabled={!previewUrl && !me?.image?.url}
                      >
                        <Trash className='size-3.5' />
                        Remover imagem
                      </Button>
                    </div>
                  </div>

                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <User className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                              <Input placeholder='Seu nome' className='h-12 rounded-xl pl-10' {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email (somente leitura) */}
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                          <Input placeholder='Seu email' value={me?.email ?? ''} readOnly disabled className='h-12 rounded-xl pl-10 pr-10' />
                          <Lock className='absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                        </div>
                      </FormControl>
                    </FormItem>

                    {/* Input de arquivo oculto */}
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      className='hidden'
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className='flex w-full justify-end items-center gap-2'>
                    <Button type='submit' className='h-11 rounded-xl px-6' disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <Loader className='w-4 h-4 mr-2 animate-spin' />
                      ) : (
                        <Save className='w-4 h-4 mr-2' />
                      )}
                      {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
        </div>
      </div>
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Recortar avatar</DialogTitle>
          </DialogHeader>
          {originalFileRef.current ? (
            <ImageCrop file={originalFileRef.current} aspect={1} maxImageSize={1024 * 1024 * 5} onCrop={handleShadcnCrop}>
              <div className='space-y-4'>
                <ImageCropContent className='max-h-[300px]' />
                <div className='flex justify-end gap-2'>
                  <ImageCropReset asChild>
                    <Button variant={'ghost'}>Resetar</Button>
                  </ImageCropReset>
                  <ImageCropApply asChild>
                    <Button>Aplicar recorte</Button>
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
  )
}
  // Removido getInitials em favor do utilitário compartilhado getAvatarAbbrev