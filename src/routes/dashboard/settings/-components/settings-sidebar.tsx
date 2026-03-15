import { Button } from '@/components/ui/button'
import { Link, useRouterState } from '@tanstack/react-router'

export function SettingsSidebar() {
  const router = useRouterState()
  const items = [
    { label: 'Conta', href: '/dashboard/settings/account' },
    { label: 'Cobranças', href: '/dashboard/settings/billings' },
    { separator: true },
    { label: 'Tabelas de Preço', href: '/dashboard/settings/price-tables' },
    { label: 'Tamanhos de mídias', href: '/dashboard/settings/media-sizes' },
    { label: 'Lojas', href: '/dashboard/settings/stores' },
    { label: 'Menus da loja', href: '/dashboard/settings/menus' },

    { separator: true },
    { label: 'Perfis', href: '/dashboard/settings/profiles' },
    { label: 'Equipes', href: '/dashboard/settings/teams' },
    { label: 'Usuários', href: '/dashboard/settings/users' },
    
    { separator: true },
    { label: 'Integrações', href: '/dashboard/settings/integrations' },
    { label: 'Webhooks', href: '/dashboard/settings/webhooks' },
    { label: 'Integrações de Transportadoras', href: '/dashboard/settings/carrier-integrations' },
    { label: 'Integrações de Pagamento', href: '/dashboard/settings/payment-integrations' },
  ]
  return (
    <aside className='min-w-42 w-fit pr-2 shrink-0  p-4 h-full overflow-y-auto'>
      <nav className='flex flex-col gap-1'>
        {items.map((item, index) => {
          const active = router.location.pathname.startsWith(item?.href ?? '')
          return (
            item.separator ? <div key={`sep-${index}`} className='h-px my-2 w-full' /> : (
              !item.href ? (
                <Button key={`disabled-${index}`} variant={'link'} className='flex justify-start font-normal text-foreground-muted' disabled>
                  <span className='block rounded-md px-3 py-2 text-sm text-muted-foreground'>{item.label}</span>
                </Button>
              ) : (
                <Button key={item.href} asChild variant={'link'} className='flex justify-start font-normal text-foreground-muted'>
                  <Link to={item.href} className={`block rounded-md px-3 py-2 text-sm transition-colors ${active ? 'text-primary underline underline-offset-4' : 'text-muted-foreground underline-offset-4 hover:underline hover:text-primary'}`}>{item.label}</Link>
                </Button>
              )
            )
          )
        })}
      </nav>
    </aside>
  )
}
