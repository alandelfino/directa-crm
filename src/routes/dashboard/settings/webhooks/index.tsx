import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/settings/webhooks/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-2'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Webhooks</h2>
        </div>
      </div>
    </div>
  )
}
