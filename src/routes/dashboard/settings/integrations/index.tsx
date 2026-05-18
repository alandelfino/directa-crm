import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Calendar, BrainCircuit, BarChart3 } from 'lucide-react'

export const Route = createFileRoute('/dashboard/settings/integrations/')({
  component: RouteComponent,
})

function RouteComponent() {
  const items = [
    { id: 'resend', name: 'Resend', icon: Mail, description: 'Envio de e-mails transacionais com templates e tracking' },
    { id: 'google-calendar', name: 'Google Calendar', icon: Calendar, description: 'Agendamento e eventos no Google Calendar' },
    { id: 'openai', name: 'OpenAI', icon: BrainCircuit, description: 'IA generativa e automações com OpenAI' },
    { id: 'google-analytics', name: 'Google Analytics', icon: BarChart3, description: 'Métricas e relatórios do Google Analytics' },
  ]

  return (
    <div className='flex flex-col w-full h-full p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>Integrações</h2>
          <p className='text-sm text-muted-foreground'>Gerencie as integrações com serviços externos.</p>
        </div>
      </div>

      <div className='flex-1 min-h-0 overflow-y-auto p-2'>
        <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6'>
          {items.map((it) => (
            <Card key={it.id} className='group rounded-xl border border-neutral-200 hover:border-ring transition-colors'>
              <CardContent className='h-full p-4 flex flex-col justify-between'>
                <div className='flex flex-col items-center gap-3'>
                  <div className='size-16 flex items-center justify-center'>
                    <it.icon className='h-10 w-10 text-neutral-300' />
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-sm text-center font-medium'>{it.name}</span>
                    <span className='text-xs text-center text-muted-foreground'>{it.description}</span>
                  </div>
                </div>
                <div className='flex items-center justify-end pt-6'>
                  <Button className='w-full' variant={'ghost'} aria-label={`Configurar ${it.name}`} title={`Configurar ${it.name}`}>
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
