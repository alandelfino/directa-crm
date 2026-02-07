import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MoreHorizontal, Plus, Calendar } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useEffect } from 'react'

export const Route = createFileRoute('/dashboard/pipeline/')({
  component: PipelineRoute,
})

// Tipos Mockados
type Deal = {
  id: string
  clientName: string
  storeName: string
  value: number
  dueDate: string
  priority: 'low' | 'medium' | 'high'
}

type Column = {
  id: string
  title: string
  accentColor: string
  deals: Deal[]
}

// Dados Mockados
const MOCK_DATA: Column[] = [
  {
    id: 'qualificacao',
    title: 'Qualificação',
    accentColor: 'bg-blue-500',
    deals: [
      {
        id: '1',
        clientName: 'Mariana Silva',
        storeName: 'Boutique Elegance',
        value: 12500,
        dueDate: '12 mai',
        priority: 'high'
      },
      {
        id: '2',
        clientName: 'Roberto Almeida',
        storeName: 'Urban Style Store',
        value: 5400,
        dueDate: '15 mai',
        priority: 'medium'
      },
      {
        id: '3',
        clientName: 'Carla Souza',
        storeName: 'Solaris Beachwear',
        value: 8200,
        dueDate: '18 mai',
        priority: 'low'
      }
    ]
  },
  {
    id: 'proposta',
    title: 'Proposta Enviada',
    accentColor: 'bg-yellow-500',
    deals: [
      {
        id: '4',
        clientName: 'Fernanda Costa',
        storeName: 'Maison D\'Or',
        value: 45000,
        dueDate: '10 mai',
        priority: 'high'
      },
      {
        id: '5',
        clientName: 'João Pedro',
        storeName: 'Fashion Kids',
        value: 18000,
        dueDate: '20 mai',
        priority: 'medium'
      }
    ]
  },
  {
    id: 'negociacao',
    title: 'Em Negociação',
    accentColor: 'bg-orange-500',
    deals: [
      {
        id: '6',
        clientName: 'Patrícia Lima',
        storeName: 'Velvet Roupas',
        value: 22000,
        dueDate: '08 mai',
        priority: 'high'
      }
    ]
  },
  {
    id: 'fechado',
    title: 'Fechado Ganho',
    accentColor: 'bg-emerald-500',
    deals: [
      {
        id: '7',
        clientName: 'Ricardo Mendes',
        storeName: 'Zara Imports',
        value: 120000,
        dueDate: '01 mai',
        priority: 'high'
      },
      {
        id: '8',
        clientName: 'Camila Oliveira',
        storeName: 'Casual Day Modas',
        value: 3500,
        dueDate: '02 mai',
        priority: 'low'
      }
    ]
  }
]

function PipelineRoute() {
  const { setOpen } = useSidebar()

  useEffect(() => {
    setOpen(false)
  }, [setOpen])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="flex flex-col h-full w-full bg-neutral-50 dark:bg-neutral-950">
      <Topbar 
        title="Pipeline de Vendas" 
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard', isLast: false },
          { label: 'Comercial', href: '/dashboard/pipeline', isLast: false },
          { label: 'Pipeline', href: '/dashboard/pipeline', isLast: true }
        ]}
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex px-6 pb-6 pt-4 gap-3 min-w-max">
          {MOCK_DATA.map((column) => (
            <div key={column.id} className="flex flex-col w-[340px] h-full max-h-full">
              {/* Column Header Minimalista */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${column.accentColor}`} />
                  <h3 className="font-semibold text-[13px] text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                    {column.title}
                  </h3>
                  <span className="text-xs font-medium text-neutral-400 tabular-nums">
                    {column.deals.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-neutral-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-neutral-700">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Column Content Clean */}
              <div className="flex-1 rounded-xl bg-neutral-100/40 dark:bg-neutral-900/40 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-3 p-3">
                    {column.deals.map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="group relative shadow-sm hover:shadow-md transition-all duration-200 border bg-white dark:bg-neutral-900 cursor-grab active:cursor-grabbing"
                      >
                        <CardContent className="p-4 flex flex-col gap-3">
                          {/* Header: Cliente e Loja */}
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                                {deal.storeName}
                              </span>
                              <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-snug">
                                {deal.clientName}
                              </h4>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 text-neutral-300 hover:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Footer: Valor e Data */}
                          <div className="flex items-end justify-between pt-1">
                            <span className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                              {formatCurrency(deal.value)}
                            </span>

                            {deal.dueDate && (
                              <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border bg-neutral-50 text-neutral-500 border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700">
                                <Calendar className="h-3 w-3" />
                                <span>{deal.dueDate}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
