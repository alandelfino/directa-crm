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

export const getSubdomain = () => {
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
    baseURL: "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
})

const loginInstance = axios.create({
    baseURL: "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
})

loginInstance.interceptors.response.use((response) => {
    if (response.status === 200) {
        const token = response.data.token
        // Normaliza armazenamento do token para a chave preferida
        try {
            normalizeTokenStorage(token)
        } catch {
            localStorage.setItem(`${getSubdomain()}-directa-authToken`, token)
        }
        // Atualiza dados do usuário
        if (response.data.user) {
            updateUserStorage(response.data.user)
        }

        // Atualiza dados da empresa
        if (response.data.company) {
            updateCompanyStorage(response.data.company)
        }
    }
    return response
})

const privateInstance = axios.create({
    baseURL: "http://localhost:3000",
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
    login: async (values: z.infer<typeof formSchema>, companyAlias: string) => {
        // Endpoint absoluto para o grupo de auth
        const response = await loginInstance.post(`/tenant/sign-in`, {
            ...values,
            companyAlias
        })
        // Garante que os dados do usuário estejam atualizados se não vierem no login
        if (response.status === 200 && !response.data?.user) {
            await auth.fetchUser()
        }
        return response
    },
    signup: async (values: z.infer<typeof signUpSchema>) => {
        const { confirmPassword, ...payload } = values
        const response = await publicInstance.post(`/tenant/sign-up`, payload)
        if (response.status === 200 || response.status === 201) {
            updateUserStorage(response.data?.user)
        }
        return response
    },
    verifyEmail: async (token: string) => {
        const response = await publicInstance.post(`/tenant/verify-email`, { token })
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

                // Se houver dados de usuário na resposta, armazena e notifica
                updateUserStorage(response.data?.user)
                
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
    getTenant: async (alias: string) => {
        const response = await publicInstance.get(`/tenant/company/${alias}`)
        return response.data
    },
    getCompany: async () => {
        // Usar o servidor n7 para companies
        const response = await publicInstance.get(`/api:kdrFy_tm/companies/${getSubdomain()}`)
        if (response.status === 200) {
            updateCompanyStorage(response.data)
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
    },
    validateSession: async () => {
        const token = getToken()
        if (!token) return false
        try {
            const response = await privateInstance.get('/tenant/check-token')
            if (response.status === 200) {
                if (response.data?.user) updateUserStorage(response.data.user)
                if (response.data?.company) updateCompanyStorage(response.data.company)
                return true
            }
            return false
        } catch {
            return false
        }
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

function updateUserStorage(userData: any) {
    if (!userData) return
    
    const { name, email, image, avatar_url, emailVerified, verified_email } = userData
    const avatarUrl = image?.url ?? avatar_url ?? null
    // Prefer emailVerified (from signup/login response) or verified_email (fallback)
    const isVerified = emailVerified ?? verified_email
    
    const user = {
        name,
        email,
        verified_email: isVerified,
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
                verified_email: isVerified
            }
        }))
    } catch { }
}

function updateCompanyStorage(companyData: any) {
    if (!companyData) return
    
    localStorage.setItem(`${getSubdomain()}-directa-company`, JSON.stringify(companyData))
    
    try {
        window.dispatchEvent(new CustomEvent('directa:company-updated', {
            detail: companyData
        }))
    } catch { }
}