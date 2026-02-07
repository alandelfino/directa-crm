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
    { separator: true },
    { label: 'Perfis', href: '/dashboard/settings/profiles' },
    { label: 'Equipes', href: '/dashboard/settings/teams' },
    { label: 'Usuários', href: '/dashboard/settings/users' },

    { separator: true },
    { label: 'Integrações', href: '/dashboard/settings/integrations' },
    { label: 'Webhooks', href: '/dashboard/settings/webhooks' },
  ]
  return (
    <aside className='w-42 pr-2 shrink-0  p-4'>
      <nav className='flex flex-col gap-1'>
        {items.map((item) => {
          const active = router.location.pathname.startsWith(item?.href ?? '')
          return (
            item.separator ? <div className='h-px my-2 w-full' /> : (
              <Button asChild variant={'link'} className='flex justify-start font-normal text-foreground-muted'>
                <Link key={item.href} to={item.href} className={`block rounded-md px-3 py-2 text-sm transition-colors ${active ? 'text-primary underline underline-offset-4' : 'text-muted-foreground underline-offset-4 hover:underline hover:text-primary'}`}>{item.label}</Link>
              </Button>
            )
          )
        })}
      </nav>
    </aside>
  )
}


