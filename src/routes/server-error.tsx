import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { WifiOff, RefreshCw, ServerCrash } from "lucide-react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute('/server-error')({
  component: ServerErrorPage,
})

function ServerErrorPage() {
  const navigate = useNavigate()

  const handleRetry = () => {
    // Tenta voltar para a página anterior ou para o dashboard
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <Card className="border-none shadow-xl bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto bg-destructive/10 p-6 rounded-full w-fit mb-2">
              <WifiOff className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Sem Conexão</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Não conseguimos conectar ao servidor. Parece que você está offline ou o servidor está indisponível no momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
              <ServerCrash className="h-4 w-4" />
              <span>Status: Offline</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full gap-2 font-semibold" 
              size="lg" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={handleRetry}
            >
              Voltar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
