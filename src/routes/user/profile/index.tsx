import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
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
import { Loader, Mail, User, Lock, Save } from 'lucide-react'

export const Route = createFileRoute('/user/profile/')({
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
  verified_email?: boolean
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
  const originalFileRef = useRef<File | null>(null)
  const [removeImage, setRemoveImage] = useState<boolean>(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: '',
      image: undefined,
    },
  })

  // Carrega dados iniciais do usuário do localStorage
  useEffect(() => {
    function loadFromStorage() {
      try {
        const subdomain = getSubdomain()
        const raw = localStorage.getItem(`${subdomain}-directa-user`)
        if (raw) {
          const user = JSON.parse(raw)
          // Tenta obter ID do user, se não existir usa 0 (já que o login pode não retornar ID)
          const meData: MeResponse = { 
              id: user.id || 0, 
              name: user.name ?? '', 
              email: user.email ?? '', 
              image: user.image ?? null,
              verified_email: user.verified_email 
          }
          setMe(meData)
          form.reset({ name: meData.name ?? '' })
          setPreviewUrl(meData.image?.url ?? user.avatar_url ?? null)
        } else {
          toast.error('Não foi possível carregar seus dados locais')
        }
      } catch (err: any) {
        console.error(err)
      } finally {
        setLoadingMe(false)
      }
    }
    loadFromStorage()
  }, [])

  // Removido: derivação de userId local; os dados agora são sempre provenientes do endpoint `me`

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const fd = new FormData()
      fd.append('name', values.name)
      const imageVal: File | undefined = values.image instanceof FileList ? values.image.item(0) ?? undefined : (values.image as File | undefined)
      const uploadFile: File | undefined = removeImage ? undefined : imageVal
      if (uploadFile && (uploadFile.size === 0 || !uploadFile.type)) {
        toast.error('Falha ao gerar a imagem recortada. Tente novamente.')
        return
      }
      if (uploadFile) {
        fd.append('file', uploadFile, uploadFile.name)
      }
      if (removeImage) { fd.append('remove_file', 'true') }

  const res = await privateInstance.put('/api:paM0Fhtw/users', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

      if (res.status >= 200 && res.status < 300) {
        toast.success('Perfil atualizado!')
        try {
          const subdomain = getSubdomain()
          const raw = localStorage.getItem(`${subdomain}-directa-user`)
          let localUser: any = null
          try { localUser = raw ? JSON.parse(raw) : null } catch { localUser = null }

          const updatedImage = removeImage ? null : (res?.data?.image ?? null)
          const oldUrl: string | null = (localUser?.image?.url ?? me?.image?.url ?? null) as string | null
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

          setMe((prev) => prev ? ({ ...prev, name: values.name, image: (removeImage ? null : (nextUser.image ?? prev.image)) }) : prev)
          if (!removeImage && finalImage?.url && !String(finalImage.url).startsWith('blob:')) {
            if (finalImage.url !== previewUrl) {
              setPreviewUrl(finalImage.url)
            }
          }
          if (removeImage) { setPreviewUrl(null) }

          try {
            window.dispatchEvent(new CustomEvent('directa:user-updated', {
              detail: {
                name: values.name,
                email: nextUser?.email ?? undefined,
                avatarUrl: (removeImage ? null : (finalImage?.url ?? previewUrl ?? null)) as string | null,
              }
            }))
          } catch {}

          if (!removeImage) {
            // Atualização local já realizada acima
          } else {
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
        toast.error('Erro ao atualizar seu perfil')
      }
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message ?? 'Erro ao atualizar seu perfil'
      const apiCode = error?.response?.data?.code
      if (apiCode === 'ERROR_CODE_ACCESS_DENIED') {
        toast.error('Não permitido!', { description: 'Você não possui permissão para editar este perfil. Contate o administrador.' })
      } else {
        toast.error(apiMessage)
      }
    }
  }

  // Simplified file change handler to use shadcn ImageCrop flow only
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    const file = files && files[0] ? files[0] : undefined
    if (!file) return
    originalFileRef.current = file
    setRemoveImage(false)
    // Open crop dialog; final image will be set in handleShadcnCrop
    setCropOpen(true)
  }

  async function handleShadcnCrop(croppedDataUrl: string) {
    try {
      const resp = await fetch(croppedDataUrl)
      const blob = await resp.blob()
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      form.setValue('image', file as any)
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
    try { if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current) } catch {}
    lastBlobUrlRef.current = null
    originalFileRef.current = null
    setPreviewUrl(null)
    setRemoveImage(true)
    form.setValue('image', undefined as any)
  }

  return (
    <div className='flex flex-col w-full h-full'>
      {/* Conteúdo centralizado sem topbar (usa o layout /user) */}
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
                    <button type='button' className='cursor-pointer' onClick={() => fileInputRef.current?.click()} title='Clique para escolher uma imagem' aria-label='Alterar avatar'>
                      <Avatar className='h-24 w-24 rounded-2xl'>
                        <AvatarImage src={previewUrl || undefined} alt={me?.name || ''} />
                        <AvatarFallback className='rounded-2xl'>
                          {getAvatarAbbrev(me?.name || form.getValues('name') || '') || 'AU'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div>
                      <Button type='button' variant={'ghost'} className='h-8 rounded-lg px-3 text-xs gap-1.5 border-muted-foreground/20 text-muted-foreground hover:text-foreground' onClick={removeAvatar} disabled={!previewUrl && !me?.image?.url}>
                        Remover
                      </Button>
                    </div>
                  </div>

                  <FormField control={form.control} name='name' render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <User className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                          <Input placeholder='Seu nome' className='h-9 rounded-lg pl-10' {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                        <Input placeholder='Seu email' value={me?.email ?? ''} readOnly disabled className='h-9 rounded-lg pl-10 pr-10' />
                        <Lock className='absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                      </div>
                    </FormControl>
                  </FormItem>

                  <input ref={fileInputRef} type='file' accept='image/jpeg,image/png,image/webp' className='hidden' onChange={handleFileChange} />
                </div>

                <div className='flex w-full justify-end items-center gap-2'>
                  <Button type='submit' className='h-9 rounded-lg px-6' disabled={form.formState.isSubmitting}>
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

// Removido getInitials em favor de utilitário compartilhado getAvatarAbbrev
