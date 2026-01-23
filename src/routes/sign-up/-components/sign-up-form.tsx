import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff, Check } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { auth, signUpSchema } from "@/lib/auth"
import { useState } from "react"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const password = form.watch("password")
  
  const rules = [
    { label: "Mínimo 8 caracteres", valid: password?.length >= 8 },
    { label: "Pelo menos 1 letra maiúscula", valid: /[A-Z]/.test(password || "") },
    { label: "Pelo menos 1 letra minúscula", valid: /[a-z]/.test(password || "") },
    { label: "Pelo menos 1 número", valid: /[0-9]/.test(password || "") },
    { label: "Pelo menos 1 caractere especial", valid: /[@_\-$%&()]/.test(password || "") },
  ]

  const { isPending, mutate } = useMutation({
    mutationFn: auth.signup,
    onSuccess: (response) => {
      // O backend retorna {"status": "success"} ou similar
      if (response.status === 200 || response.status === 201 || response.data?.status === 'success') {
        toast.success("Conta criada com sucesso!", {
            description: "Você já pode fazer login."
        })
        navigate({ to: "/sign-in" })
      } else {
        const errorData = response?.data
        toast.error(errorData?.title || 'Erro no cadastro', {
          description: errorData?.detail || 'Não foi possível criar sua conta.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro no cadastro', {
        description: errorData?.detail || 'Ocorreu um erro ao tentar realizar o cadastro.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof signUpSchema>) {
    mutate(values)
  }

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Crie sua conta</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Preencha os dados abaixo para começar
            </p>
          </div>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="********" {...field} type={showConfirmPassword ? "text" : "password"} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2 text-sm">
            <p className="font-medium text-muted-foreground">Requisitos da senha:</p>
            <ul className="space-y-1">
              {rules.map((rule, index) => (
                <li key={index} className={cn("flex items-center gap-2", rule.valid ? "text-green-600" : "text-muted-foreground")}>
                  {rule.valid ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                  )}
                  <span className="text-xs">{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              "Cadastrar"
            )}
          </Button>

          <Field>
            <FieldDescription className="text-center">
              Já tem uma conta?{" "}
              <a href="/sign-in" className="underline underline-offset-4">
                Fazer login
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  )
}
