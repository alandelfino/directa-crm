import * as React from "react"
import { auth } from '@/lib/auth'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarMenuButton } from "@/components/ui/sidebar"
//
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
import { Navigation } from "./navigation"


type CompanyInfo = {
    id?: number
    name?: string
    alias?: string | null
    cnpj?: string | null
    document?: string | null
    image?: { url?: string | null } | null
    logo_url?: string | null
}

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [company, setCompany] = React.useState<CompanyInfo | null>(null)

    React.useEffect(() => {
        const sub = window.location.hostname.split('.')[0]
        const key = `${sub}-directa-company`
        const fromLocal = (() => {
            try {
                const raw = localStorage.getItem(key)
                return raw ? JSON.parse(raw) as CompanyInfo : null
            } catch { return null }
        })()

        if (fromLocal && (fromLocal.name || fromLocal.alias)) {
            setCompany(fromLocal)
        } else {
            auth.getCompany().then((res) => {
                if (res?.status === 200 && res?.data) {
                    setCompany(res.data as CompanyInfo)
                }
            }).catch(() => { })
        }

        const handleStorage = (e: StorageEvent) => {
            if (!e.key || !e.key.endsWith('-directa-company')) return
            try {
                const next = e.newValue ? JSON.parse(e.newValue) as CompanyInfo : null
                setCompany(next)
            } catch { }
        }
        window.addEventListener('storage', handleStorage)
        // Listen to custom event to update immediately within the same tab
        const handleCompanyUpdated = (evt: Event) => {
            try {
                const e = evt as CustomEvent<CompanyInfo>
                const detail = e.detail
                if (detail && (detail.name || detail.alias || detail.image || detail.logo_url)) {
                    setCompany((prev) => ({ ...(prev ?? {}), ...detail }))
                }
            } catch { }
        }
        window.addEventListener('directa:company-updated', handleCompanyUpdated as EventListener)
        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('directa:company-updated', handleCompanyUpdated as EventListener)
        }
    }, [])

    // Initial collapse handled by SidebarProvider in dashboard/route.tsx

    const companyName = company?.name ?? 'Empresa'
    const companyDoc = company?.cnpj ?? company?.document ?? company?.alias ?? '—'

    return (
        <Sidebar collapsible="icon" {...props} variant="sidebar">
            <SidebarHeader className="dark:bg-neutral-950 border-b h-16 p-2! flex flex-row items-center justify-center group-data-[state=collapsed]:items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0!">
                <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:text-2xl data-[slot=sidebar-menu-button]:p-1.5! h-full font-confortaa rounded-lg hover:bg-transparent group-data-[state=collapsed]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center" >

                    {/* Company */}
                    <div className='flex h-full items-center gap-2 group-data-[collapsible=icon]:mx-auto group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:gap-0 group-data-[state=collapsed]:grid group-data-[state=collapsed]:place-items-center transition-[padding] duration-200 ease-in-out' aria-label='Empresa'>
                        <Avatar className='self-center h-8 w-8 rounded-md border shadow-xs group-data-[state=collapsed]:h-6 group-data-[state=collapsed]:w-6 transition-all duration-200 ease-in-out'>
                            <AvatarImage src={company?.image?.url ?? company?.logo_url ?? undefined} alt={companyName} />
                            <AvatarFallback className='rounded-md text-[10px] leading-none font-semibold bg-white border'>
                                {getAvatarAbbrev(companyName || 'Empresa')}
                            </AvatarFallback>
                        </Avatar>
                        <span className="flex flex-col transition-transform duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:translate-x-1 group-data-[state=collapsed]:absolute group-data-[state=collapsed]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:translate-x-1">
                            <div className='font-semibold text-sm leading-none text-slate-800'>{companyName}</div>
                            <span className='text-xs text-slate-500 dark:text-neutral-500'>{companyDoc}</span>
                        </span>
                    </div>

                </SidebarMenuButton>
            </SidebarHeader>
            <SidebarContent className="dark:bg-neutral-950 group-data-[collapsible=icon]:overflow-y-auto group-data-[collapsible=icon]:overflow-x-hidden">
                <Navigation />
            </SidebarContent>
            {/* User session moved to Topbar */}
            <SidebarFooter className="dark:bg-neutral-950 h-12 border-t justify-center items-center flex">
                <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:text-2xl data-[slot=sidebar-menu-button]:p-1.5! h-14 font-confortaa rounded-lg hover:bg-transparent" >
                    <a href="https://directacrm.com.br" target="_blank" rel="noreferrer" className="relative flex items-center justify-center h-10">
                        <img src='/directa-crm-logo.png' alt='Directa' className='w-[80px] opacity-100 scale-100 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:scale-95' />
                        <img src='/directa-icon-logo-sm.png' alt='Directa' className='absolute w-6 h-6 opacity-0 scale-95 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-100 group-data-[state=collapsed]:scale-100' />
                    </a>
                </SidebarMenuButton>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
