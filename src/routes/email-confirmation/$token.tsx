import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/auth'
import { Loader2, FolderCheck, AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export const Route = createFileRoute('/email-confirmation/$token')({
  component: EmailConfirmationPage,
})

function EmailConfirmationPage() {
  const { token } = Route.useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorData, setErrorData] = useState<{ title: string, message: string } | null>(null)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await auth.verifyEmail(token)
        if (response.status === 200 || response.status === 201) {
          setStatus('success')
        } else {
            setStatus('error')
            setErrorData({
                title: response.data?.title || "Erro na verificação",
                message: response.data?.detail || "Não foi possível verificar o email."
            })
        }
      } catch (error: any) {
        setStatus('error')
        const responseData = error.response?.data
        setErrorData({
            title: responseData?.title || "Erro na verificação",
            message: responseData?.detail || "Não foi possível verificar o email."
        })
      }
    }

    if (token) {
        verifyEmail()
    }
  }, [token])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex flex-col items-center max-w-[450px] w-full">
        
        {status === 'loading' && (
          <Empty className="border-none shadow-none">
            <EmptyMedia variant="icon" className="">
               <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle className="text-2xl font-semibold tracking-tight">Verificando email...</EmptyTitle>
              <EmptyDescription className="text-base">Aguarde enquanto confirmamos sua identidade.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {status === 'success' && (
          <Empty className="border-none shadow-none">
             <EmptyMedia variant="icon" className="">
               <FolderCheck className="size-4 text-foreground" />
             </EmptyMedia>
             <EmptyHeader>
               <EmptyTitle className="text-2xl font-semibold tracking-tight">Email verificado!</EmptyTitle>
               <EmptyDescription className="text-base">
                 Sua conta foi verificada com sucesso. Agora você pode acessar todos os recursos da plataforma.
               </EmptyDescription>
             </EmptyHeader>
             <EmptyContent className="mt-4">
               <Button asChild className="h-10 px-8">
                <Link to="/sign-in">Ir para o login</Link>
              </Button>
             </EmptyContent>
          </Empty>
        )}

        {status === 'error' && (
          <Empty className="border-none shadow-none">
             <EmptyMedia variant="icon" className="">
               <AlertOctagon className="size-4 text-foreground" />
             </EmptyMedia>
             <EmptyHeader>
               <EmptyTitle className="text-2xl font-semibold tracking-tight">{errorData?.title}</EmptyTitle>
               <EmptyDescription className="text-base">
                 {errorData?.message}
               </EmptyDescription>
             </EmptyHeader>
             <EmptyContent className="mt-4">
               <Button asChild variant="outline" className="h-10 px-8">
                <Link to="/sign-in">Voltar para o login</Link>
              </Button>
             </EmptyContent>
          </Empty>
        )}
        
      </div>
    </div>
  )
}
