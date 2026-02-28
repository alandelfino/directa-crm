import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  streetName: z.string().min(1, 'Rua é obrigatória'),
  number: z.coerce.number().int().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.enum(states as unknown as [string, ...string[]], { message: 'Estado é obrigatório' }),
  zipCode: z.string().min(1, 'CEP é obrigatório'),
  country: z.string().min(1, 'País é obrigatório'),
  complement: z.string().optional(),
})

export function CustomerAddressCreateDialog({ customerId, onCreated }: {
  customerId: number
  onCreated?: () => void
}) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      streetName: '',
      number: undefined,
      neighborhood: '',
      city: '',
      state: undefined,
      zipCode: '',
      country: 'BR',
      complement: ''
    },
  })

  const { isPending: creating, mutate: createItem } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = { ...values }
      const response = await privateInstance.post(`/tenant/customers/${customerId}/address`, payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao cadastrar endereço')
      return response
    },
    onSuccess: () => {
      toast.success('Endereço cadastrado com sucesso!')
      form.reset()
      setOpen(false)
      onCreated?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao cadastrar endereço', {
        description: errorData?.detail || 'Não foi possível criar o endereço.'
      })
    }
  })

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 8) value = value.slice(0, 8)
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d)/, '$1-$2')
    }
    form.setValue('zipCode', value)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) form.reset()
    }}>
      <DialogTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Novo Endereço
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => createItem(values))} className='flex flex-col gap-4'>
            <DialogHeader>
              <DialogTitle>Novo Endereço</DialogTitle>
              <DialogDescription>Preencha os dados do endereço.</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name='name' render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome (Casa, Trabalho...)</FormLabel>
                    <FormControl>
                    <Input placeholder='Ex.: Casa' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name='zipCode' render={({ field }) => (
                <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                    <Input placeholder='00000-000' {...field} onChange={handleZipCodeChange} maxLength={9} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name='country' render={({ field }) => (
                <FormItem>
                    <FormLabel>País</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="País" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="BR">Brasil</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-[1fr_100px] gap-4">
                <FormField control={form.control} name='streetName' render={({ field }) => (
                <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                    <Input placeholder='Nome da rua' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name='number' render={({ field }) => (
                <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                    <Input type="number" placeholder='123' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name='neighborhood' render={({ field }) => (
                <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                    <Input placeholder='Bairro' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name='complement' render={({ field }) => (
                <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                    <Input placeholder='Apto, Bloco...' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-[1fr_100px] gap-4">
                <FormField control={form.control} name='city' render={({ field }) => (
                <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                    <Input placeholder='Cidade' {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name='state' render={({ field }) => (
                <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {states.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline' size="sm">Cancelar</Button>
              </DialogClose>
              <Button type='submit' size="sm" disabled={creating}>{creating ? <Loader className='animate-spin size-[0.85rem]' /> : 'Cadastrar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
