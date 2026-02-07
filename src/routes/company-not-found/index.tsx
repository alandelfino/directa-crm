import { createFileRoute } from '@tanstack/react-router'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { auth } from '@/lib/auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/company-not-found/')({
  component: CompanyNotFound,
})

function CompanyNotFound() {
  const [alias, setAlias] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: (alias: string) => auth.getTenant(alias),
    onSuccess: () => {
        const protocol = window.location.protocol
        const host = window.location.host
        const parts = host.split('.')
        
        let targetHost = host

        // Lógica para substituir o subdomínio
        if (host.includes('localhost') || /^127(\.\d+){0,3}$/.test(host)) {
             // Ambiente de desenvolvimento
             // const port = window.location.port ? `:${window.location.port}` : ''
             // Assumindo que o alias substitui tudo antes de localhost, ou é adicionado
             // Se estivermos em algo.localhost:3000 -> alias.localhost:3000
             // Se estivermos em localhost:3000 -> alias.localhost:3000
             if (parts.length > 1 && parts[0] !== 'localhost') {
                 parts[0] = alias
                 targetHost = parts.join('.')
             } else {
                 targetHost = `${alias}.${host}`
             }
        } else {
            // Produção (ex: errado.app.com -> certo.app.com)
            // Substitui o primeiro componente do domínio
            if (parts.length >= 2) {
                parts[0] = alias
                targetHost = parts.join('.')
            }
        }

        window.location.href = `${protocol}//${targetHost}/sign-in`
    },
    onError: () => {
        toast.error("Empresa não encontrada", {
            description: "Verifique o alias digitado e tente novamente."
        })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!alias.trim()) return
    mutate(alias)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        
        {/* Icon */}
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border bg-background shadow-sm">
            <Building2 className="size-5 text-muted-foreground/70" />
        </div>

        {/* Text */}
        <h3 className="mb-2 text-base font-semibold text-foreground tracking-tight">
            Loja não encontrada
        </h3>
        <p className="mb-8 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
            A loja que você está tentando acessar não existe ou está indisponível no momento.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs items-center gap-2">
            <Input 
                placeholder="Alias da empresa" 
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="h-9"
                autoFocus
            />
            <Button 
                type="submit" 
                size="icon" 
                className="h-9 w-9 shrink-0" 
                disabled={isPending || !alias.trim()}
            >
                {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <ArrowRight className="size-4" />
                )}
            </Button>
        </form>
        
        {/* Footer Link */}
        <div className="mt-16">
            <a 
                href="#" 
                className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
                Precisa de ajuda? 
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </a>
        </div>
      </div>
    </div>
  )
}
