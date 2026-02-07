import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoginForm } from "./-components/login-form"
import { auth, getSubdomain } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

export const Route = createFileRoute('/sign-in/')({
    component: RouteComponent,
})

export default function RouteComponent() {
    const navigate = useNavigate()
    const subdomain = getSubdomain()
    
    const { data: tenant, isError } = useQuery({
        queryKey: ['tenant', subdomain],
        queryFn: () => auth.getTenant(subdomain),
        enabled: !!subdomain,
        retry: false
    })

    useEffect(() => {
        if (isError) {
            navigate({ to: '/company-not-found' })
        }
    }, [isError, navigate])

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center md:justify-start">
                    <a href="#" className="text-primary hover:text-primary/90">
                        <img src="/directa-crm-logo.png" alt="Directa" className="h-8 w-auto rounded-md" />
                    </a>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm tenantName={tenant?.name} companyAlias={subdomain} />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <img
                    src="/sign-in-background.png"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>
        </div>
    )
}
