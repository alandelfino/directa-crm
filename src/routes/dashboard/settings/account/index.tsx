import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
import { Edit } from 'lucide-react'
import { EditCompanySheet } from './-components/edit-company-sheet'

type VaultImage = {
  access?: string
  path?: string
  name?: string
  type?: string
  size?: number
  mime?: string
  meta?: { width?: number; height?: number }
  url?: string
} | null

type CompanyProfile = {
  id: number
  created_at?: number
  updated_At?: number
  name?: string
  user_id?: number
  alias?: string
  website?: string
  segment?: string
  description?: string
  image?: VaultImage
}

function getSubdomain() { return window.location.hostname.split('.')[0] }

export function CompanyProfileContent() {
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState<boolean>(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['company-profile'],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get('/api:kdrFy_tm/companies/single')
      if (res.status !== 200) {
        throw new Error(res?.data?.message ?? 'Erro ao carregar dados da empresa')
      }
      const payload = res.data as any
      const normalized: CompanyProfile = {
        id: Number(payload?.id ?? 3),
        created_at: Number(payload?.created_at ?? 1762798128984),
        updated_At: Number(payload?.updated_At ?? 1762798129000),
        name: String(payload?.name ?? 'Di Véus'),
        user_id: Number(payload?.user_id ?? 4),
        alias: String(payload?.alias ?? 'diveus'),
        website: String(payload?.website ?? ''),
        description: String(payload?.description ?? ''),
        image: payload?.image ?? null,
      }
      return normalized
    }
  })

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar dados da empresa', {
        description: errorData?.detail || 'Não foi possível carregar os dados da empresa.'
      })
    }
  }, [isError, error])

  useEffect(() => {
    if (!data) return
    setCompany(data)
    setPreviewUrl(data?.image?.url ?? null)
    try {
      const sub = getSubdomain()
      localStorage.setItem(`${sub}-directa-company`, JSON.stringify(data))
      try { window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: data })) } catch {}
    } catch {}
  }, [data])

  useEffect(() => {
    function onUpdated(e: any) {
      const next = e?.detail
      if (next) {
        setCompany(next)
        setPreviewUrl(next?.image?.url ?? null)
      }
    }
    window.addEventListener('directa:company-updated', onUpdated as any)
    return () => {
      window.removeEventListener('directa:company-updated', onUpdated as any)
    }
  }, [])

  return (
    <div className='w-full space-y-6 p-4'>
        <EditCompanySheet open={editOpen} onOpenChange={setEditOpen} />

        {isLoading ? (
          <div className='flex flex-col gap-8'>
            <div className='flex items-center justify-between gap-6'>
              <div className='flex items-center gap-6'>
                <Skeleton className='h-20 w-20 rounded-2xl' />
                <div className='flex flex-col gap-2'>
                  <Skeleton className='h-6 w-40' />
                  <Skeleton className='h-4 w-56' />
                </div>
              </div>
              <Skeleton className='h-9 w-24' />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 pt-2'>
              <div className='flex flex-col gap-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`left-${i}`} className='flex flex-col gap-2'>
                    <Skeleton className='h-3 w-24' />
                    <Skeleton className='h-4 w-48' />
                  </div>
                ))}
              </div>
              <div className='flex flex-col gap-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`right-${i}`} className='flex flex-col gap-2'>
                    <Skeleton className='h-3 w-24' />
                    <Skeleton className='h-4 w-48' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : company ? (
          <div className='flex flex-col gap-8'>
            <div className='flex items-center justify-between gap-6'>
              <div className='flex items-center gap-6'>
                <Avatar className='h-20 w-20 rounded-2xl border shadow-xs'>
                <AvatarImage src={previewUrl || company?.image?.url || undefined} alt={company?.name || ''} />
                <AvatarFallback className='rounded-2xl'>
                  {getAvatarAbbrev(company?.name ?? 'Empresa')}
                </AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <span className='text-xl font-semibold'>{company?.name ?? '—'}</span>
                  {company?.website ? (
                    <a href={company.website} target='_blank' rel='noreferrer' className='text-base text-sky-500'>
                      {company.website}
                    </a>
                  ) : (
                    <span className='text-base text-muted-foreground'>—</span>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Edit className='size-[0.85rem]' />
                Editar
              </Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 pt-2'>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-col'>
                  <span className='text-xs font-medium text-muted-foreground'>Descrição</span>
                  <span className='text-sm'>{company?.description ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='text-sm text-muted-foreground'>Nenhum dado disponível</div>
        )}
    </div>
  )
}

export const Route = createFileRoute('/dashboard/settings/account/')({
  component: CompanyProfileContent,
})
