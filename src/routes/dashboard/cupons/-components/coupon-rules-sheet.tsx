import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { formatMoneyFromCents } from '@/lib/utils'
import { dataTime } from '@/lib/format'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { CouponRuleCreateSheet } from './coupon-rule-create-sheet'
import { CouponRuleDeleteDialog } from './coupon-rule-delete-dialog'
import { CouponRuleEditSheet, type CouponRule } from './coupon-rule-edit-sheet'

type RuleType =
  | 'total_value_is_greater_than_or_equal'
  | 'products_value_is_greater_than_or_equal'
  | 'shipping_value_is_greater_than_or_equal'

const ruleTypes: Array<{ value: RuleType; label: string }> = [
  { value: 'total_value_is_greater_than_or_equal', label: 'O valor total é maior ou igual a' },
  { value: 'products_value_is_greater_than_or_equal', label: 'O valor dos produtos é maior ou igual a' },
  { value: 'shipping_value_is_greater_than_or_equal', label: 'O frete é maior ou igual a' },
]

function getRuleTypeLabel(type: string) {
  return ruleTypes.find((t) => t.value === type)?.label ?? type
}

export function CouponRulesSheet({
  cuponId,
  trigger,
}: {
  cuponId: number
  trigger?: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['cupon-rules', cuponId],
    enabled: open && Number(cuponId) > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/cupons/${cuponId}/rules`)
      if (response.status !== 200) throw new Error('Erro ao carregar regras')
      const raw = response.data as any
      const items = Array.isArray(raw?.items) ? raw.items : []
      return items as CouponRule[]
    },
  })

  const rules = useMemo(() => data ?? [], [data])
  const selectedRuleId = selectedRuleIds.length === 1 ? selectedRuleIds[0] : null
  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) ?? null : null

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar regras', {
        description: errorData?.detail || 'Não foi possível carregar as regras do cupom.',
      })
    }
  }, [isError, error])

  useEffect(() => {
    if (!open) setSelectedRuleIds([])
  }, [open])

  const toggleSelectAll = () => {
    if (selectedRuleIds.length === rules.length) setSelectedRuleIds([])
    else setSelectedRuleIds(rules.map((r) => r.id))
  }

  const toggleSelectRule = (id: number) => {
    if (selectedRuleIds.includes(id)) setSelectedRuleIds(selectedRuleIds.filter((x) => x !== id))
    else setSelectedRuleIds([...selectedRuleIds, id])
  }

  const columns: ColumnDef<CouponRule>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className="flex justify-center items-center">
          <Checkbox checked={rules.length > 0 && selectedRuleIds.length === rules.length} onCheckedChange={toggleSelectAll} />
        </div>
      ),
      cell: (row) => (
        <div className="flex justify-center items-center">
          <Checkbox checked={selectedRuleIds.includes(row.id)} onCheckedChange={() => toggleSelectRule(row.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] font-medium border-r p-2!',
    },
    {
      id: 'type',
      header: 'Regra',
      cell: (row) => (
        <Badge variant="secondary" className="font-normal">
          {getRuleTypeLabel(row.type)}
        </Badge>
      ),
      headerClassName: 'min-w-[220px] border-r',
      className: 'min-w-[220px] p-2!',
    },
    {
      id: 'value',
      header: 'Valor',
      cell: (row) => <span className="tabular-nums">{formatMoneyFromCents(Number(row.value) || 0)}</span>,
      headerClassName: 'w-[190px] min-w-[190px] border-r text-right',
      className: 'w-[190px] min-w-[190px] p-2! text-right',
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (row) => <span className="text-sm">{dataTime(row.createdAt)}</span>,
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px] p-2!',
    },
  ]

  const { isPending: isDeleting, mutate: deleteRule } = useMutation({
    mutationFn: async (ruleId: number) => {
      const response = await privateInstance.delete(`/tenant/cupons/${cuponId}/rules/${ruleId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir regra')
      return true
    },
    onSuccess: () => {
      toast.success('Regra excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cupon-rules', cuponId] })
      setSelectedRuleIds([])
      setDeleteOpen(false)
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir regra', {
        description: errorData?.detail || 'Não foi possível excluir a regra.',
      })
    },
  })

  const disabled = Number(cuponId) <= 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" disabled={disabled}>
            <ShieldCheck className="size-[0.85rem]" /> Regras de aplicação
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden min-w-4xl">
        <SheetHeader>
          <SheetTitle>Regras de aplicação</SheetTitle>
          <SheetDescription>Defina quando o cupom pode ser aplicado.</SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 px-4 py-3 border-b">

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading || isRefetching}
              onClick={() => {
                setSelectedRuleIds([])
                refetch()
              }}
            >
              {(isLoading || isRefetching) ? <RefreshCw className="animate-spin size-[0.85rem]" /> : <RefreshCw className="size-[0.85rem]" />}
            </Button>
            <CouponRuleCreateSheet cuponId={cuponId} />
            <CouponRuleEditSheet
              cuponId={cuponId}
              rule={selectedRule as CouponRule | null}
              disabled={!selectedRule}
              onSaved={() => {
                setSelectedRuleIds([])
              }}
            />

            <CouponRuleDeleteDialog
              open={deleteOpen}
              onOpenChange={(next) => {
                setDeleteOpen(next)
                if (!next) setSelectedRuleIds([])
              }}
              ruleId={selectedRuleId}
              disabled={!selectedRuleId}
              isDeleting={isDeleting}
              onConfirm={(ruleId) => deleteRule(ruleId)}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <DataTable
            columns={columns}
            data={rules}
            loading={isLoading || isRefetching}
            totalItems={rules.length}
            emptyMessage="Nenhuma regra encontrada"
            hideFooter
          />
        </div>

        <div className="mt-auto border-t p-4 flex justify-end">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="w-fit">
              Fechar
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
