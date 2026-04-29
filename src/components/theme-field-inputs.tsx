import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export type UnitOption = 'px' | 'rem' | 'em' | '%'

export function parseUnitValue(raw: string | null): { amount: string; unit: UnitOption } {
  const base = { amount: '', unit: 'px' as UnitOption }
  if (!raw) return base
  const compact = String(raw).trim().replace(/\s+/g, '')
  if (!compact) return base
  const match = compact.match(/^(-?\d+(?:[.,]\d+)?)(px|rem|em|%)$/i)
  if (match) {
    const amount = String(match[1] ?? '').replace(',', '.')
    const unit = String(match[2] ?? 'px').toLowerCase() as UnitOption
    if (unit === 'px' || unit === 'rem' || unit === 'em' || unit === '%') return { amount, unit }
    return { amount, unit: 'px' }
  }
  const normalized = compact.replace(',', '.')
  const n = Number(normalized)
  if (Number.isFinite(n)) return { amount: normalized, unit: 'px' }
  return base
}

export function ThemeFieldTextInput({
  value,
  onChange,
  disabled,
  placeholder,
  type,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <Input
      type={type ?? 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder ?? '—'}
    />
  )
}

export function ThemeFieldLongText({
  value,
  onChange,
  disabled,
  placeholder,
  rows,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
  placeholder?: string
  rows?: number
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder ?? '—'}
      rows={rows ?? 4}
    />
  )
}

export function ThemeFieldNumberInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
  placeholder?: string
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder ?? '0'}
    />
  )
}

export function ThemeFieldUnitInput({
  value,
  onChange,
  disabled,
}: {
  value: { amount: string; unit: UnitOption }
  onChange: (next: { amount: string; unit: UnitOption }) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value.amount}
        onChange={(e) => onChange({ ...value, amount: e.target.value })}
        disabled={disabled}
        placeholder="0"
        className="flex-1"
      />
      <Select value={value.unit} onValueChange={(v) => onChange({ ...value, unit: v as UnitOption })} disabled={disabled}>
        <SelectTrigger className="w-[92px]">
          <SelectValue placeholder="px" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="px">px</SelectItem>
          <SelectItem value="rem">rem</SelectItem>
          <SelectItem value="em">em</SelectItem>
          <SelectItem value="%">%</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function ThemeFieldBooleanToggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: boolean
  onChange: (next: boolean) => void
  disabled: boolean
  label?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <Label className="text-sm">{label ?? 'Ativo'}</Label>
        <div className="text-xs text-muted-foreground truncate">
          {value ? 'Habilitado' : 'Desabilitado'}
        </div>
      </div>
      <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(Boolean(v))} disabled={disabled} />
    </div>
  )
}

