import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { auth, privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { User as UserIcon, Building2, Mail, AlertCircle } from 'lucide-react'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/user')({
  component: UserLayout,
})

type UserT = { email: string, name: string, avatarUrl?: string | null, verified_email?: boolean }
function getSubdomain() { return window.location.hostname.split('.')[0] }

function UserLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserT | null>(null)

  useEffect(() => {
    auth.userGuard()
    try {
      const sub = getSubdomain()
      const raw = localStorage.getItem(`${sub}-directa-user`)
      const parsed = raw ? JSON.parse(raw) : null
      const avatarUrl: string | null = parsed?.image?.url ?? parsed?.avatar_url ?? null
      setUser(parsed ? { 
        email: parsed?.email ?? '', 
        name: parsed?.name ?? '', 
        avatarUrl,
        verified_email: parsed?.verified_email
      } : null)
    } catch { }
    const handler = (evt: Event) => {
      const e = evt as CustomEvent<{ name?: string, email?: string, avatarUrl?: string | null, verified_email?: boolean }>
      const d = e.detail
      if (!d) return
      setUser((prev) => ({
        email: d.email ?? prev?.email ?? '',
        name: d.name ?? prev?.name ?? '',
        avatarUrl: d.avatarUrl ?? prev?.avatarUrl ?? null,
        verified_email: d.verified_email ?? prev?.verified_email
      }))
    }
    window.addEventListener('directa:user-updated', handler as EventListener)
    return () => window.removeEventListener('directa:user-updated', handler as EventListener)
  }, [])

  async function signOut() {
    try { await privateInstance.post('/api:eA5lqIuH/auth/logout', {}) } catch { }
    try {
      const sub = getSubdomain()
      localStorage.removeItem(`${sub}-directa-authToken`)
      localStorage.removeItem(`${sub}-directa-user`)
      localStorage.removeItem(`${sub}-directa-company`)
      localStorage.removeItem(`${sub}-kayla-authToken`)
      localStorage.removeItem(`${sub}-kayla-user`)
      localStorage.removeItem(`${sub}-kayla-company`)
    } catch { }
    navigate({ to: '/sign-in' })
  }

  const handleResend = async () => {
    try {
        toast.loading("Enviando email...", { id: "resend-email" })
        const res = await auth.resendVerification()
        if (res.status === 200 || res.status === 201) {
            toast.success("Email de confirmação enviado!", { id: "resend-email" })
        } else {
            toast.error("Erro ao enviar email", { id: "resend-email", description: res.data?.message })
        }
    } catch (e: any) {
        toast.error("Erro ao enviar email", { id: "resend-email", description: e?.response?.data?.message || "Erro desconhecido" })
    }
  }

  const navigationLinks = [
    { href: '/user/profile', label: 'Meu Perfil', icon: <UserIcon className='size-4' /> },
    { href: '/user/companies', label: 'Minhas contas', icon: <Building2 className='size-4' /> },
    { href: '/user/invites', label: 'Convites', icon: <Mail className='size-4' /> },
  ]
  const navItems = navigationLinks

  return (
    <div className='flex flex-col w-full h-lvh'>
      {user && user.verified_email === false && (
        <div className="w-full bg-orange-50 border-b border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-200 px-4 py-2 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Por favor, verifique seu email ({user.email}) para acessar todos os recursos.</span>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                className="bg-white hover:bg-orange-50 border-orange-200 text-orange-700 dark:bg-transparent dark:hover:bg-orange-900/40 dark:border-orange-800 dark:text-orange-100 whitespace-nowrap h-7 text-xs"
            >
                Reenviar confirmação
            </Button>
        </div>
      )}

      <header className='border-b px-4 md:px-6 sticky top-0 z-10 bg-white dark:bg-neutral-900'>
        <div className='flex h-16 items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <Popover>
              <PopoverTrigger asChild>
                <Button className='group size-8 md:hidden' variant='ghost' size='icon'>
                  <svg className='pointer-events-none' width={16} height={16} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' xmlns='http://www.w3.org/2000/svg'>
                    <path d='M4 12L20 12' className='origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]' />
                    <path d='M4 12H20' className='origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45' />
                    <path d='M4 12H20' className='origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]' />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align='start' className='w-36 p-1 md:hidden'>
                <NavigationMenu className='max-w-none *:w-full'>
                  <NavigationMenuList className='flex-col items-start gap-0 md:gap-2'>
                    {navigationLinks.map((link) => (
                      <NavigationMenuItem key={link.href} className='w-full'>
                        <NavigationMenuLink asChild>
                          <Link to={link.href} className='py-1.5'>
                            {link.label}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
            <div className='flex items-center gap-6'>
              <a href='#' className='text-primary hover:text-primary/90'>
                <img src='/directa-crm-logo.png' alt='Directa' className='h-7 w-auto' />
              </a>
              <NavigationMenu className='max-md:hidden'>
                <NavigationMenuList className='gap-2'>
                  {navigationLinks.map((link) => (
                    <NavigationMenuItem key={link.href}>
                      <NavigationMenuLink asChild>
                        <Link to={link.href} className='py-1.5 font-medium text-muted-foreground hover:text-primary'>
                          {link.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-11 rounded-md flex items-center gap-2'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || ''} />
                    <AvatarFallback className='rounded-lg'>{(user?.name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className='hidden sm:grid text-left text-sm leading-tight'>
                    <span className='truncate font-medium max-w-[160px]'>{user?.name || ''}</span>
                    <span className='truncate text-xs max-w-[160px] text-muted-foreground'>{user?.email || ''}</span>
                  </div>
                  <ChevronsUpDown className='ml-auto size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='min-w-56 rounded-lg' side={'bottom'} align='end' sideOffset={8}>
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className='w-full'>
                      {item.icon}
                      <span className='ml-2'>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className='size-4' />
                  <span className='ml-2'>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className='flex-1 overflow-auto'>
        <Outlet />
      </main>
    </div>
  )
}