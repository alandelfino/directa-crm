import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Images, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'

type ApiMedia = {
  id: number
  name?: string
  image?: { url?: string | null } | null
}

const schema = z.object({ name: z.string().min(1, { message: 'Nome é obrigatório' }) })

export function EditMediaDialog({ media, onClose, onSaved }: { media: ApiMedia | null, onClose?: () => void, onSaved?: () => void }) {
  const open = !!media
  const [saving, setSaving] = useState(false)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  useEffect(() => {
    if (!media) return
    form.reset({ name: media.name ?? '' })
  }, [media])

  const submit = async (values: z.infer<typeof schema>) => {
    if (!media) return
    try {
      setSaving(true)
      const res = await privateInstance.put(`/api:qSTOvw0A/medias/${media.id}`, { name: values.name })
      if (res.status !== 200 && res.status !== 204) throw new Error('Erro ao atualizar mídia')
      toast.success('Mídia atualizada!')
      onSaved?.()
      onClose?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao atualizar mídia')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.() }}>
      <DialogContent className='sm:max-w-[600px]'>
        {media && (
          <div className='flex flex-col gap-4'>
            <div className='aspect-video w-full bg-muted overflow-hidden rounded'>
              {media.image?.url ? (
                <img src={media.image.url} alt={media.name ?? 'media'} className='object-cover w-full h-full' />
              ) : (
                <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
                  <Images className='w-12 h-12' />
                </div>
              )}
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => submit(v))} className='flex flex-col gap-4'>
                <FormField control={form.control} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex.: Banner da Home' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline' size={'sm'}>Fechar</Button>
                  </DialogClose>
                  <Button type='submit' size={'sm'} disabled={saving}>
                    {saving ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}