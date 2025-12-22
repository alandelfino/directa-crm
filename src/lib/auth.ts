import z from "zod"
import axios from 'axios'
import { toast } from 'sonner'

export const formSchema = z.object({
    email: z.email(),
    password: z.string().min(2, 'A senha deve ter pelo menos 2 caracteres'),
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
                detail: { name: response?.data?.user?.name, email: response?.data?.user?.email, avatarUrl }
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
            try { toast.dismiss() } catch {}
            try {
                window.location.href = '/sign-in'
            } catch {}
        }
        
        return Promise.reject(error)
    }
)

export const auth = {
    // Normaliza o armazenamento do token: grava na chave preferida e remove chaves antigas de dev
    normalizeTokenStorage: (token: string) => normalizeTokenStorage(token),
    fetchUser: async () => {
        try {
            const response = await privateInstance.get('/api:eA5lqIuH/auth/me')
            if (response.status === 200) {
                const data = response?.data
                const user = Array.isArray(data) ? (data[0] ?? null) : data
                
                if (user && user.id) {
                    localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(user))
                    const avatarUrl = user?.image?.url ?? user?.avatar_url ?? null
                    window.dispatchEvent(new CustomEvent('directa:user-updated', {
                        detail: { name: user?.name, email: user?.email, avatarUrl }
                    }))
                    return user
                }
            }
        } catch (error) {
            console.warn('fetchUser failed:', error)
        }
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
    initGoogleLogin: async (redirectUri: string) => {
        const response = await publicInstance.get(`/api:U0aE1wpF/oauth/google/init`, {
            params: {
                redirect_uri: redirectUri
            }
        })
        return response.data?.authUrl
    },
    continueWithGoogle: async (code: string, redirectUri: string) => {
        // Usa publicInstance para evitar o interceptor do loginInstance que espera formato diferente
        const response = await publicInstance.get(`/api:U0aE1wpF/oauth/google/continue`, {
            params: {
                code,
                redirect_uri: redirectUri
            }
        })
        
        if (response.status === 200 && response.data?.token) {
            normalizeTokenStorage(response.data.token)

            const { name, email, image } = response.data
            // Se houver dados de usuário na resposta (flat structure), armazena e notifica
            if (name || email) {
                // Constrói objeto de usuário compatível com o resto da aplicação
                // Mapeia 'image' (string url) para avatar_url e image object
                const user = {
                    name,
                    email,
                    avatar_url: image,
                    image: image ? { url: image } : null
                }
                
                localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(user))
                
                try {
                    window.dispatchEvent(new CustomEvent('directa:user-updated', {
                        detail: { name, email, avatarUrl: image }
                    }))
                } catch { }
            }
            
            // Busca o usuário completo (com ID, etc) para garantir consistência
            await auth.fetchUser()
        }
        
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
            //window.location.href = '/sign-in'
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

        try {
            const response = await privateInstance.get('/api:eA5lqIuH/auth/me')
            if (response.status !== 200) {
                const status = response.status
                if (status === 401 || status === 403) {
                    //window.location.href = '/sign-in'
                }
                return
            }

            const data = response?.data
            const user = Array.isArray(data) ? (data[0] ?? null) : data
            if (!user || !user.id) {
                //window.location.href = '/sign-in'
                return
            }

            try {
                localStorage.setItem(`${getSubdomain()}-directa-user`, JSON.stringify(user))
            } catch { }
            try {
                const avatarUrl = user?.image?.url ?? user?.avatar_url ?? null
                window.dispatchEvent(new CustomEvent('directa:user-updated', {
                    detail: { name: user?.name, email: user?.email, avatarUrl }
                }))
            } catch { }
        } catch (err: any) {
            const status = err?.response?.status
            if (status === 401 || status === 403) {
                //window.location.href = '/sign-in'
            } else {
                console.warn('dashboardGuard (/auth/me): falha ao validar sessão, mantendo usuário na página:', err?.message ?? err)
            }
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
