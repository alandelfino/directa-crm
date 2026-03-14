import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader, Settings } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import type { MediaItem } from '@/routes/dashboard/media'

type StoreSettings = {
  storeId: number
  logoMedia: {
    id: number
    url: string | null
  } | null
  iconMedia: {
    id: number
    url: string | null
  } | null
  facebookUrl: string | null
  instagramUrl: string | null
  twitterUrl: string | null
  youtubeUrl: string | null
  pinterestUrl: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  addressComplement: string | null
}

const formSchema = z.object({
  logoMediaId: z.coerce.number().nullable().optional(),
  iconMediaId: z.coerce.number().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  pinterestUrl: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  addressComplement: z.string().nullable().optional(),
})

function toNullIfEmpty(v: unknown) {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length === 0 ? null : s
}

export function EditStoreSettingsSheet({ storeId, onSaved }: { storeId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [selectedLogoMedia, setSelectedLogoMedia] = useState<MediaItem | null>(null)
  const [selectedIconMedia, setSelectedIconMedia] = useState<MediaItem | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      logoMediaId: null,
      iconMediaId: null,
      facebookUrl: null,
      instagramUrl: null,
      twitterUrl: null,
      youtubeUrl: null,
      pinterestUrl: null,
      email: null,
      phone: null,
      whatsapp: null,
      address: null,
      addressComplement: null,
    },
  })

  const logoMediaId = useWatch({ control: form.control as any, name: 'logoMediaId' })
  const iconMediaId = useWatch({ control: form.control as any, name: 'iconMediaId' })

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['store-settings', storeId],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    enabled: open,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/stores/${storeId}/settings`)
      if (response.status !== 200) throw new Error('Erro ao carregar configurações da loja')
      return response.data as StoreSettings
    },
  })

  useEffect(() => {
    if (!open) return
    if (!data) return
    form.reset({
      logoMediaId: data.logoMedia?.id ?? null,
      iconMediaId: data.iconMedia?.id ?? null,
      facebookUrl: data.facebookUrl ?? null,
      instagramUrl: data.instagramUrl ?? null,
      twitterUrl: data.twitterUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
      pinterestUrl: data.pinterestUrl ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      address: data.address ?? null,
      addressComplement: data.addressComplement ?? null,
    })
    setSelectedLogoMedia(null)
    setSelectedIconMedia(null)
  }, [data, open])

  const logoPreviewUrl = useMemo(() => {
    if (selectedLogoMedia?.url) return selectedLogoMedia.url
    if (!logoMediaId) return null
    return data?.logoMedia?.url ?? null
  }, [selectedLogoMedia, data, logoMediaId])

  const iconPreviewUrl = useMemo(() => {
    if (selectedIconMedia?.url) return selectedIconMedia.url
    if (!iconMediaId) return null
    return data?.iconMedia?.url ?? null
  }, [selectedIconMedia, data, iconMediaId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload: any = {
        logoMediaId: values.logoMediaId && values.logoMediaId > 0 ? values.logoMediaId : null,
        iconMediaId: values.iconMediaId && values.iconMediaId > 0 ? values.iconMediaId : null,
        facebookUrl: toNullIfEmpty(values.facebookUrl),
        instagramUrl: toNullIfEmpty(values.instagramUrl),
        twitterUrl: toNullIfEmpty(values.twitterUrl),
        youtubeUrl: toNullIfEmpty(values.youtubeUrl),
        pinterestUrl: toNullIfEmpty(values.pinterestUrl),
        email: toNullIfEmpty(values.email),
        phone: toNullIfEmpty(values.phone),
        whatsapp: toNullIfEmpty(values.whatsapp),
        address: toNullIfEmpty(values.address),
        addressComplement: toNullIfEmpty(values.addressComplement),
      }
      const response = await privateInstance.put(`/tenant/stores/${storeId}/settings`, payload)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao atualizar configurações da loja')
      return response.data as StoreSettings
    },
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso!')
      setOpen(false)
      onSaved?.()
      queryClient.invalidateQueries({ queryKey: ['store-settings', storeId] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar configurações', {
        description: errorData?.detail || 'Não foi possível salvar as configurações.'
      })
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) refetch()
      else {
        form.reset()
        setSelectedLogoMedia(null)
        setSelectedIconMedia(null)
      }
    }}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size="sm">
          <Settings className="size-[0.85rem]" /> Configurações
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[640px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Configurações da loja</SheetTitle>
              <SheetDescription>Edite os dados de contato, redes sociais e mídia.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Logo</div>
                  <div className="rounded-lg border bg-neutral-50 overflow-hidden">
                    <div className="aspect-video w-full bg-muted flex items-center justify-center">
                      {logoPreviewUrl ? (
                        <img src={logoPreviewUrl} alt="Logo" className="h-full w-full object-contain p-4" />
                      ) : (
                        <div className="text-sm text-muted-foreground">Sem pré-visualização</div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-end gap-2">
                      <FormField control={form.control as any} name="logoMediaId" render={({ field }) => (
                        <FormItem className="hidden">
                          <FormLabel className="sr-only">logoMediaId</FormLabel>
                          <FormControl>
                            <input type="hidden" value={field.value ? String(field.value) : ''} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <MediaSelectorDialog
                        multiple={false}
                        toFilter="logo"
                        onSelect={(medias) => {
                          const m = medias[0] ?? null
                          setSelectedLogoMedia(m)
                          form.setValue('logoMediaId', m?.id ?? null)
                        }}
                        trigger={<Button variant="outline" size="sm" type="button">Selecionar</Button>}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => { setSelectedLogoMedia(null); form.setValue('logoMediaId', null) }}
                        disabled={isPending}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Ícone</div>
                  <div className="rounded-lg border bg-neutral-50 overflow-hidden">
                    <div className="aspect-video w-full bg-muted flex items-center justify-center">
                      {iconPreviewUrl ? (
                        <img src={iconPreviewUrl} alt="Ícone" className="h-full w-full object-contain p-6" />
                      ) : (
                        <div className="text-sm text-muted-foreground">Sem pré-visualização</div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-end gap-2">
                      <FormField control={form.control as any} name="iconMediaId" render={({ field }) => (
                        <FormItem className="hidden">
                          <FormLabel className="sr-only">iconMediaId</FormLabel>
                          <FormControl>
                            <input type="hidden" value={field.value ? String(field.value) : ''} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <MediaSelectorDialog
                        multiple={false}
                        toFilter="icon"
                        onSelect={(medias) => {
                          const m = medias[0] ?? null
                          setSelectedIconMedia(m)
                          form.setValue('iconMediaId', m?.id ?? null)
                        }}
                        trigger={<Button variant="outline" size="sm" type="button">Selecionar</Button>}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => { setSelectedIconMedia(null); form.setValue('iconMediaId', null) }}
                        disabled={isPending}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name='facebookUrl' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input placeholder='https://facebook.com/...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='instagramUrl' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder='https://instagram.com/...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='twitterUrl' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter</FormLabel>
                    <FormControl>
                      <Input placeholder='https://x.com/...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='youtubeUrl' render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input placeholder='https://youtube.com/...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='pinterestUrl' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pinterest</FormLabel>
                    <FormControl>
                      <Input placeholder='https://pinterest.com/...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name='email' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='contato@...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='phone' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder='(00) 0000-0000' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='whatsapp' render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder='(00) 00000-0000' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name='address' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder='Rua, número, bairro...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name='addressComplement' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder='Apto, bloco, referência...' {...field} value={field.value ?? ''} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={isPending || isLoading || isRefetching} size="sm" className='w-full'>
                  {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

