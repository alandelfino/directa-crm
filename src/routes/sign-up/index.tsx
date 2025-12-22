import { createFileRoute } from '@tanstack/react-router'
import { SignUpForm } from "./-components/sign-up-form"

export const Route = createFileRoute('/sign-up/')({
    component: RouteComponent,
})

export default function RouteComponent() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center md:justify-start">
                    <a href="#" className="text-primary hover:text-primary/90">
                        <img src="/directa-crm-logo.png" alt="Directa" className="h-8 w-auto rounded-md" />
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <SignUpForm />
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
