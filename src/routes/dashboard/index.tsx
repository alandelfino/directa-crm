import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Topbar } from './-components/topbar'

export const Route = createFileRoute('/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [companyName, setCompanyName] = useState('Workspace')

  useEffect(() => {
    try {
      const subdomain = window.location.hostname.split('.')[0]
      const storageKey = `${subdomain}-directa-company`
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const name = parsed?.name ?? parsed?.alias ?? 'Workspace'
        setCompanyName(name)
      }
    } catch {}
  }, [])

  return (
    <div className='flex flex-col w-full h-full overflow-hidden'>
      <Topbar
        title="Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard', isLast: true },
        ]}
      />
      <div className='relative flex-1 w-full h-full overflow-hidden bg-white dark:bg-neutral-950'>
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <div className='text-center leading-tight px-4'>
            <div className='text-[min(13vw,5rem)] font-semibold tracking-tight text-neutral-200 dark:text-neutral-900/30 select-none'>
              {companyName}
            </div>
            <div className='mt-2 text-sm font-medium tracking-[0.35em] uppercase text-neutral-300 dark:text-neutral-700 select-none'>
              workspace
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
