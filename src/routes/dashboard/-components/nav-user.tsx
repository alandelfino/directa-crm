import { Check, ChevronsUpDown, LogOut, Moon, User, } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage, } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { privateInstance } from "@/lib/auth"
import { toast } from "sonner"


type User = { email: string, name: string, avatarUrl?: string | null }

export function NavUser() {

    const navigate = useNavigate()

    const [user, setUser] = useState<User | null>(null)
    const { isMobile } = useSidebar()

    const darkModeKey = import.meta.env.VITE_DARK_MODE_KEY

    const isDarkMode = localStorage.getItem(darkModeKey) === 'true'
    const [darkMode, setDarkMode] = useState(isDarkMode)

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem(darkModeKey, 'true')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem(darkModeKey, 'false')
        }
    }, [darkMode])

    useEffect(() => {
        // Respeita o mesmo padrão de chave usado em lib/auth.ts (subdomínio + sufixo)
        const subdomain = window.location.hostname.split('.')[0]
        const storageKey = `${subdomain}-directa-user`

        const raw = localStorage.getItem(storageKey)
        let parsed: any = null
        try {
            parsed = raw ? JSON.parse(raw) : null
        } catch {
            parsed = null
        }

        if (parsed && typeof parsed === 'object') {
            const avatarUrl: string | null = parsed?.image?.url ?? parsed?.avatar_url ?? null
            setUser({ email: parsed.email ?? '', name: parsed.name ?? '', avatarUrl })
        } else {
            setUser(null)
            navigate({ to: '/sign-in' })
        }
    }, [navigate])

    // Ouve atualizações do perfil para refletir imediatamente no sidebar
    useEffect(() => {
        const handler = (evt: Event) => {
            const e = evt as CustomEvent<{ name?: string, email?: string, avatarUrl?: string | null }>
            const detail = e.detail
            if (!detail) return
            setUser((prev) => ({
                email: detail.email ?? prev?.email ?? '',
                name: detail.name ?? prev?.name ?? '',
                avatarUrl: detail.avatarUrl ?? prev?.avatarUrl ?? null,
            }))
        }
        window.addEventListener('directa:user-updated', handler as EventListener)
        return () => window.removeEventListener('directa:user-updated', handler as EventListener)
    }, [])

    // Utilitário compartilhado para gerar a abreviação do avatar

    const getSubdomain = () => window.location.hostname.split('.')[0]

    const { isPending: isLoggingOut, mutateAsync: doLogout } = useMutation({
        mutationFn: async () => {
            // Executa logout na API
    const res = await privateInstance.post('/api:eA5lqIuH/auth/logout', {})
            return res.data
        },
        onSettled: () => {
            // Limpa storage e redireciona
            try {
                const sub = getSubdomain()
                localStorage.removeItem(`${sub}-directa-authToken`)
                localStorage.removeItem(`${sub}-directa-user`)
                localStorage.removeItem(`${sub}-kayla-authToken`)
                localStorage.removeItem(`${sub}-kayla-user`)
            } catch {}
            toast.success('Você saiu da sua conta')
            navigate({ to: '/sign-in' })
        },
        onError: () => {
            // Mesmo se falhar na API, prossegue com logout local
        }
    })

    async function handleLogout() {
        await doLogout()
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || ''} />
                                <AvatarFallback className="rounded-lg">{getAvatarAbbrev(user?.name || '')}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user?.name || ''}</span>
                                <span className="truncate text-xs">{user?.email || ''}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || ''} />
                                    <AvatarFallback className="rounded-lg">{getAvatarAbbrev(user?.name || '')}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user?.name || ''}</span>
                                    <span className="truncate text-xs">{user?.email || ''}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => navigate({ to: '/user' })}> <User /> Meu Perfil </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
                                <Moon /><span className="w-full">Dark mode</span> {darkMode && <Check />}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                            <LogOut /> {isLoggingOut ? 'Saindo...' : 'Sair'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}