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
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { auth, formSchema } from "@/lib/auth"
import { useEffect, useState, useRef } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const navigate = useNavigate()
  const location = useLocation()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const processingCode = useRef<string | null>(null)

  const { isPending, mutate } = useMutation({
    mutationFn: auth.login,
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Login realizado com sucesso!")
        // Após login, direciona para o novo dashboard do usuário (Minhas contas)
        navigate({ to: "/user/companies" })
      } else {
        const errorData = response?.data
        toast.error(errorData?.title || 'Erro no login', {
          description: errorData?.message || 'Credenciais inválidas'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro no login', {
        description: errorData?.message || 'Ocorreu um erro ao tentar realizar o login.'
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

  const processGoogleLogin = async (code: string) => {
    if (processingCode.current === code || isGoogleLoading) return
    
    processingCode.current = code
    setIsGoogleLoading(true)
    try {
      const redirectUri = window.location.origin + '/sign-in'
      const response = await auth.continueWithGoogle(code, redirectUri)

      if (response.status === 200) {
        toast.success("Login com Google realizado com sucesso!")
        await navigate({ to: "/user/companies" })
      } else {
        const errorData = response?.data
        toast.error(errorData?.payload.title || "Falha no login com Google", {
          description: errorData?.message || "Não foi possível completar o login com Google."
        })
        setIsGoogleLoading(false)
      }
    } catch (error: any) {
      console.error("Google login error:", error)
      const errorData = error?.response?.data
      toast.error(errorData?.payload?.title || "Erro no login com Google", {
        description: errorData?.message || "Ocorreu um erro inesperado ao processar o login."
      })
      setIsGoogleLoading(false)
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'GOOGLE_LOGIN_SUCCESS' && event.data?.code) {
        processGoogleLogin(event.data.code)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [navigate])

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // TanStack Router: Acessa o parâmetro 'code' diretamente do estado da rota
      const code = (location.search as any)?.code

      if (code) {
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_LOGIN_SUCCESS', code }, window.location.origin)
          window.close()
          return
        }

        // Fallback para login direto via URL (se não for popup)
        await navigate({ to: '/sign-in', replace: true })
        processGoogleLogin(code)
      }
    }

    handleGoogleCallback()
  }, [navigate])

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      const redirectUri = window.location.origin + '/sign-in'
      const authUrl = await auth.initGoogleLogin(redirectUri)
      if (authUrl) {
        const width = 500
        const height = 600
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2

        window.open(
          authUrl,
          'google_login',
          `width=${width},height=${height},top=${top},left=${left},status=yes,scrollbars=yes`
        )
      } else {
        toast.error("Erro ao iniciar login", {
          description: "Não foi possível obter a URL de autenticação do Google."
        })
      }
    } catch (error: any) {
      console.error("Google init error:", error)
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro ao conectar", {
        description: errorData?.message || "Não foi possível conectar com o Google."
      })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
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

          <Button type="submit" disabled={isPending || isGoogleLoading}>
            {isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              ou continuar com
            </span>
          </div>

          <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin} disabled={isPending || isGoogleLoading}>
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Entrar com Google
          </Button>

          <Field>
            <FieldDescription className="text-center">
              Não tem uma conta?{" "}
              <a href="/sign-up" className="underline underline-offset-4">
                Cadastre-se
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  )
}
