import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DashboardSidebar } from './-components/dashboard-sidebar'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // Tenta recuperar do cookie
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )sidebar_state=([^;]+)'))
      if (match) return match[2] === 'true'
    }
    // Fallback inicial
    try {
      if (typeof window !== 'undefined') {
        return !window.matchMedia('(max-width: 1279px)').matches
      }
    } catch {}
    return true
  })

  useEffect(() => {
    auth.dashboardGuard()
  }, [])

  // Removemos o useEffect que sobrescrevia o estado baseado na media query na montagem
  // Mantemos apenas listener se necessário, mas o estado inicial já cobre.
  
  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <DashboardSidebar />
      <main className='flex flex-col w-full h-lvh overflow-x-hidden'>
        <Outlet />
      </main>

    </SidebarProvider>
  )
}