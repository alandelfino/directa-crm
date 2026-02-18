import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopbarUser } from "./topbar-user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type BreadcrumbItem = {
    label: string
    href: string
    isLast: boolean
}

type CartSummary = {
    id: string
    customerName: string
    itemsCount: number
    totalFormatted: string
}

function TopbarCarts() {
    const carts: CartSummary[] = [
        { id: "1", customerName: "Loja Central LTDA", itemsCount: 5, totalFormatted: "R$ 1.250,00" },
        { id: "2", customerName: "Mercado São João", itemsCount: 3, totalFormatted: "R$ 780,90" },
        { id: "3", customerName: "Distribuidora Nova Era", itemsCount: 12, totalFormatted: "R$ 3.540,00" },
    ]

    const totalCarts = carts.length

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2 px-3 shadow-[0_0_0_1px_rgba(15,23,42,0.02)]"
                >
                    <div className="flex items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 h-7 w-7">
                        <ShoppingCart className="size-4 text-neutral-700 dark:text-neutral-100" />
                    </div>
                    <div className="hidden md:flex flex-col text-left">
                        <span className="text-[11px] uppercase tracking-wide text-neutral-800 dark:text-neutral-400">
                            Meus carrinhos
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            2 ativos: R$ 5.653,00
                        </span>
                    </div>
                    <div className="md:hidden flex flex-col text-left">
                        <span className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            Meus carrinhos
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            2 ativos: R$ 5.653,00
                        </span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-80 rounded-xl p-1.5"
                align="end"
                sideOffset={8}
            >
                <DropdownMenuLabel className="flex items-center justify-between px-2 pb-1 pt-1.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-100">
                        Meus carrinhos
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                        {totalCarts}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {carts.map((cart) => (
                    <DropdownMenuItem
                        key={cart.id}
                        className="flex flex-col items-start gap-1.5 py-2.5 px-2"
                    >
                        <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 truncate max-w-[220px]">
                                {cart.customerName}
                            </span>
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                                {cart.totalFormatted}
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {cart.itemsCount} item(s)
                        </span>
                    </DropdownMenuItem>
                ))}
                {carts.length === 0 && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground py-3">
                        Nenhum carrinho criado
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
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

                <div className='ml-auto flex items-center gap-3'>
                    <TopbarCarts />
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
