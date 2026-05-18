import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/settings/webhooks/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='flex flex-col w-full h-full p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>Webhooks</h2>
          <p className='text-sm text-muted-foreground'>Configure os webhooks para integrar com outros sistemas.</p>
        </div>
      </div>
    </div>
  )
}
