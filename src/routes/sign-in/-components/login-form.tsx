import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { auth, formSchema } from "@/lib/auth"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"

interface LoginFormProps extends React.ComponentProps<"form"> {
  tenantName?: string
  companyAlias: string
}

export function LoginForm({
  className,
  tenantName,
  companyAlias,
  ...props
}: LoginFormProps) {

  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => auth.login(values, companyAlias),
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Login realizado com sucesso!")
        // Após login, direciona para o dashboard
        navigate({ to: "/dashboard" })
      } else {
        const errorData = response?.data
        toast.error(errorData?.title || 'Erro no login', {
          description: errorData?.detail || 'Credenciais inválidas'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro no login', {
        description: errorData?.detail || 'Ocorreu um erro ao tentar realizar o login.'
      })
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "alan_delfino@hotmail.com",
      password: "160512@Adc",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            {tenantName && (
              <Badge variant="outline" className="mb-2 font-medium">
                {tenantName}
              </Badge>
            )}
            <h1 className="text-2xl font-bold">Entrar na sua conta</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Insira seu email abaixo para entrar na sua conta
            </p>
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="seuemail@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="********" {...field} type={showPassword ? "text" : "password"} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Esconder senha" : "Mostrar senha"}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              "Entrar"
            )}
          </Button>
        </FieldGroup>
      </form>
    </Form>
  )
}
