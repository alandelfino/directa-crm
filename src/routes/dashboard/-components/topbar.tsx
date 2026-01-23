import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopbarUser } from "./topbar-user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Types
export type BreadcrumbItem = {
    label: string
    href: string
    isLast: boolean
}

export function Topbar({ title, breadcrumbs }: { title: string, breadcrumbs: BreadcrumbItem[] }) {
    const [user, setUser] = useState<any | null>(null)

    useEffect(() => {
        const loadUser = () => {
            const subdomain = window.location.hostname.split('.')[0]
            const storageKey = `${subdomain}-directa-user`
            try {
                const raw = localStorage.getItem(storageKey)
                if (raw) setUser(JSON.parse(raw))
            } catch { }
        }
        loadUser()

        const handler = () => loadUser()
        window.addEventListener('directa:user-updated', handler)
        return () => window.removeEventListener('directa:user-updated', handler)
    }, [])

    const handleResend = async () => {
        try {
            toast.loading("Enviando email...", { id: "resend-email", description: undefined })
            const res = await auth.resendVerification()
            if (res.status === 200 || res.status === 201) {
                toast.success("Email de confirmação enviado!", { id: "resend-email", description: undefined })
            } else {
                const errorTitle = res.data?.title || "Erro ao enviar email"
                const errorDetail = res.data?.detail || "Erro desconhecido"
                toast.error(errorTitle, { id: "resend-email", description: errorDetail })
            }
        } catch (e: any) {
            const errorTitle = e?.response?.data?.title || "Erro ao enviar email"
            const errorDetail = e?.response?.data?.detail || "Erro desconhecido"
            toast.error(errorTitle, { id: "resend-email", description: errorDetail })
        }
    }

    return (
        <div className='w-full bg-pattern dark:bg-neutral-950'>

            {/* Top navigation - Fixed */}
            <div className='border-b h-16 w-full flex items-center px-2 bg-white dark:bg-neutral-900 sticky top-0 z-10 gap-4'>

                <SidebarTrigger />

                <h1 className='font-semibold'>{title}</h1>

                <div className='w-px h-6 border-l'></div>

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((breadcrumb) => (
                            <div key={breadcrumb.href} className='flex items-center text-sm'>
                                <BreadcrumbItem>
                                    {breadcrumb.isLast ? (
                                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!breadcrumb.isLast && <BreadcrumbSeparator />}
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className='ml-auto'>
                    <TopbarUser />
                </div>

            </div>

            {user && user.verified_email === false && (
                <div className="px-4 py-2 bg-white dark:bg-neutral-900 border-b">
                    <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Email não verificado</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-4 mt-2 sm:mt-0">
                            <span>
                                Por favor, verifique seu email ({user.email}) para acessar todos os recursos.
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResend}
                                className="bg-white hover:bg-orange-50 border-orange-200 text-orange-700 dark:bg-transparent dark:hover:bg-orange-900/40 dark:border-orange-800 dark:text-orange-100 whitespace-nowrap h-8"
                            >
                                Reenviar confirmação
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            )}

        </div>
    )


}