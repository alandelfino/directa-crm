import z from "zod"
import axios from 'axios'
import { toast } from 'sonner'
import { Navigate } from "@tanstack/react-router"

export const formSchema = z.object({
    email: z.email(),
    password: z.string().min(2, 'A senha deve ter pelo menos 2 caracteres'),
})

export const signUpSchema = z.object({
    name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
    email: z.email('E-mail inválido'),
    password: z.string()
        .min(8, 'A senha deve ter pelo menos 8 caracteres')
        .regex(/[A-Z]/, 'Pelo menos 1 letra maiúscula')
        .regex(/[a-z]/, 'Pelo menos 1 letra minúscula')
        .regex(/[0-9]/, 'Pelo menos 1 número')
        .regex(/[@_\-$%&()]/, 'Pelo menos 1 caractere especial (@ _ - $ % & ( ))'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
})

const getSubdomain = () => {
    const host = window.location.hostname
    const parts = host.split('.')
    // Em ambiente de desenvolvimento, padronizar para 'localhost' (mesmo para 127.x.x.x)
    if (host === 'localhost' || /^127(\.\d+){0,3}$/.test(host)) {
        return 'localhost'
    }
    // Em produção, usa o primeiro label como subdomínio
    return parts[0] ?? host
}

const getToken = () => {
    // Tenta chave preferencial e fallbacks (inclui 'local' para compatibilidade)
    const keys = [
        `${getSubdomain()}-directa-authToken`,
        'localhost-directa-authToken',
        '127.0.0.1-directa-authToken',
        'local-directa-authToken',
        // Fallback para chaves antigas
        `${getSubdomain()}-kayla-authToken`,
        'localhost-kayla-authToken',
        '127.0.0.1-kayla-authToken',
        'local-kayla-authToken',
    ]
    for (const key of keys) {
        const token = localStorage.getItem(key)
        if (token) return token
    }
    return null
}

const publicInstance = axios.create({
    baseURL: "https://server.directacrm.com.br",
    headers: {
        "Content-Type": "application/json",
    },
})

const loginInstance = axios.create({
    baseURL: "https://server.directacrm.com.br",
    headers: {
        "Content-Type": "application/json",
    },
})

loginInstance.interceptors.response.use((response) => {
    if (response.status === 200) {
        const authToken = response.data.authToken
        // Normaliza armazenamento do token para a chave preferida
        try {
            normalizeTokenStorage(authToken)
        } catch {
            localStorage.setItem(`${getSubdomain()}-directa-authToken`, authToken)
        }
        localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(response.data.user))
        // Notifica UI (sidebar/nav) que o usuário foi carregado/atualizado
        try {
            const avatarUrl = response?.data?.user?.image?.url ?? response?.data?.user?.avatar_url ?? null
            window.dispatchEvent(new CustomEvent('directa:user-updated', {
                detail: { 
                    name: response?.data?.user?.name, 
                    email: response?.data?.user?.email, 
                    avatarUrl,
                    verified_email: response?.data?.user?.verified_email
                }
            }))
        } catch { }
    }
    return response
})

const privateInstance = axios.create({
    baseURL: "https://server.directacrm.com.br",
})

privateInstance.interceptors.request.use((config) => {
    // Preserve existing Content-Type if already set (e.g., multipart/form-data for file uploads)
    if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json'
    }
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }
    return config
})

// Intercepta respostas para tratar 401 e 403
privateInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            // Redireciona para a tela de login ao detectar sessão inválida
            // Verifica se já não está na página de login para evitar loop/reload desnecessário
            if (window.location.pathname !== '/sign-in') {
                try { toast.dismiss() } catch {}
                try {
                    window.location.href = '/sign-in'
                } catch {}
            }
        }
        
        return Promise.reject(error)
    }
)

export const auth = {
    // Normaliza o armazenamento do token: grava na chave preferida e remove chaves antigas de dev
    normalizeTokenStorage: (token: string) => normalizeTokenStorage(token),
    fetchUser: async () => {
        // Endpoint /auth/me removido do backend.
        // Dados do usuário são atualizados apenas no login ou edição.
        return null
    },
    login: async (values: z.infer<typeof formSchema>) => {
        // Endpoint absoluto para o grupo de auth
        const response = await loginInstance.post(`/api:eA5lqIuH/auth/login`, values)
        // Garante que os dados do usuário estejam atualizados se não vierem no login
        if (response.status === 200 && !response.data?.user) {
            await auth.fetchUser()
        }
        return response
    },
    signup: async (values: z.infer<typeof signUpSchema>) => {
        const response = await publicInstance.post(`/api:eA5lqIuH/auth/signup`, values)
        return response
    },
    initGoogleLogin: async (redirectUri: string) => {
        const response = await publicInstance.get(`/api:U0aE1wpF/oauth/google/init`, {
            params: {
                redirect_uri: redirectUri
            }
        })
        return response.data?.authUrl
    },
    continueWithGoogle: async (code: string, redirectUri: string) => {
        try {
            // Usa publicInstance para evitar o interceptor do loginInstance que espera formato diferente
            const response = await publicInstance.get(`/api:U0aE1wpF/oauth/google/continue`, {
                params: {
                    code,
                    redirect_uri: redirectUri
                }
            })
            
            if (response.status === 200 && response.data?.token) {
                normalizeTokenStorage(response.data.token)

                const { name, email, image, verified_email } = response.data?.user || {}
                // Se houver dados de usuário na resposta, armazena e notifica
                if (name || email) {
                    const avatarUrl = image?.url ?? null
                    // Constrói objeto de usuário compatível com o resto da aplicação
                    const user = {
                        name,
                        email,
                        verified_email,
                        avatar_url: avatarUrl,
                        image: image
                    }
                    
                    localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(user))
                    
                    try {
                        window.dispatchEvent(new CustomEvent('directa:user-updated', {
                            detail: { 
                                name, 
                                email, 
                                avatarUrl,
                                verified_email
                            }
                        }))
                    } catch { }
                }
                
                // Busca o usuário completo (com ID, etc) para garantir consistência
                await auth.fetchUser()
            }
            
            return response
        } catch (error: any) {
            // Retorna o erro para ser tratado pelo chamador em vez de lançar exceção
            // Isso previne comportamentos inesperados em alguns fluxos
            if (error.response) {
                return error.response
            }
            throw error
        }
    },
    resendVerification: async () => {
        const response = await privateInstance.post(`/api:eA5lqIuH/auth/send-confirmation-email`)
        return response
    },
    getCompany: async () => {
        // Usar o servidor n7 para companies
        const response = await publicInstance.get(`/api:kdrFy_tm/companies/${getSubdomain()}`)
        if (response.status === 200) {
            localStorage.setItem(`${getSubdomain()}-directa-company`, JSON.stringify(response.data))
            return { status: response.status, data: response.data }
        }
        return { status: response.status, data: null }
    },
    // Guard específico para rotas fora do dashboard (/user/**)
    userGuard: async () => {
        const authToken = getToken()
        if (!authToken) {
            // Sem token: redireciona imediatamente
            Navigate({ to: '/sign-in' })
            return
        }
        // Sem requisição de validação: apenas verifica presença do token.
        // A captura dos dados do usuário fica concentrada na página de perfil.
        return
    },
    // Guard específico para rotas do dashboard (/dashboard/**)
    dashboardGuard: async () => {
        const authToken = getToken()
        if (!authToken) {
            //window.location.href = '/sign-in'
            return
        }
        // Validação de sessão ocorre via interceptors nas chamadas de API
    }
}

// Exportar instâncias n7 para uso em páginas que manipulam companies
export { publicInstance, privateInstance }

// Helpers privados
function normalizeTokenStorage(token: string) {
    const preferredKey = `${getSubdomain()}-directa-authToken`
    localStorage.setItem(preferredKey, token)
    // Remove chaves antigas de desenvolvimento
    try { localStorage.removeItem('local-kayla-authToken') } catch {}
    try { localStorage.removeItem('127.0.0.1-kayla-authToken') } catch {}
}
