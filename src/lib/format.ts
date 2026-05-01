export function toCents(input: unknown): number | undefined {
  if (input == null || input === '') return undefined
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : undefined
  const s = String(input)
  const cleaned = s.replace(/[^0-9,.-]/g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return undefined
  return Math.round(n * 100)
}

export function fromCents(cents: unknown): number | undefined {
  if (typeof cents !== 'number') return undefined
  if (!Number.isFinite(cents)) return undefined
  return cents / 100
}

export function formatMoneyFromCents(cents?: number, currency: string = 'BRL', locale: string = 'pt-BR'): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '-'
  const value = cents / 100
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

export function maskMoneyInput(raw: string, currency: string = 'BRL', locale: string = 'pt-BR'): { text: string; value: number | undefined } {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return { text: '', value: undefined }
  const cents = Number(digits)
  return { text: formatMoneyFromCents(cents, currency, locale), value: cents }
}

export function formatPercentFromCents(cents?: number, locale: string = 'pt-BR'): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '-'
  const value = cents / 100
  try {
    const txt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    return `${txt}%`
  } catch {
    return `${value.toFixed(2)}%`
  }
}

export function maskPercentInput(raw: string, locale: string = 'pt-BR'): { text: string; value: number | undefined } {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return { text: '', value: undefined }
  const cents = Number(digits)
  return { text: formatPercentFromCents(cents, locale), value: cents }
}

export function formatarMoeda(valor: unknown): string {
  const num = typeof valor === 'number' ? valor : (() => {
    const s = String(valor ?? '')
    const cleaned = s.replace(/[^0-9,.-]/g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : NaN
  })()
  if (!Number.isFinite(num)) return '-'
  const currency = 'BRL'
  const localeMap: Record<string, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    MXN: 'es-MX',
    CAD: 'en-CA',
    AUD: 'en-AU',
  }
  const locale = localeMap[currency] ?? 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num)
  } catch {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
    } catch {
      return num.toFixed(2)
    }
  }
}

export type CompanyConfig = {
  currency?: string
  date_format?: string
  number_format?: string
  time_zone?: string
  image?: { url?: string }
  website?: string
}

export function getCompanyConfig(): CompanyConfig | null {
  try {
    if (typeof window === 'undefined') return null
    const ls = window.localStorage
    const sub = (() => {
      try { return window.location.hostname.split('.')[0] } catch { return '' }
    })()
    const keys = [
      sub ? `${sub}-directa-company` : '',
      'directa-company',
      'empresaConfig',
    ].filter(Boolean)
    for (const k of keys) {
      const raw = ls.getItem(k)
      if (raw) {
        try { return JSON.parse(raw) } catch {}
      }
    }
    return null
  } catch {
    return null
  }
}

export function getCurrencyInfo() {
  return { code: 'BRL', symbol: 'R$' }
}

export function formatDateByCompany(value?: number | Date): string {
  if (!value) return '-'
  const d = value instanceof Date ? value : new Date(value)
  const mask = 'dd/mm/yyyy HH:mm:ss'
  const tz = getCompanyTimeZone()
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).formatToParts(d)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const dd = get('day')
    const MM = get('month')
    const yyyy = get('year')
    const HH = get('hour')
    const mm = get('minute')
    const ss = get('second')
    const tzName = get('timeZoneName')
    if (/^dd\/mm\/yyyy\sHH:mm:ss$/i.test(mask)) return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss} ${tzName}`.trim()
    if (/^yyyy\/mm\/dd\sHH:mm:ss$/i.test(mask)) return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss} ${tzName}`.trim()
    if (/^dd\/mm\/yyyy$/i.test(mask)) return `${dd}/${MM}/${yyyy}`
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).format(d)
  } catch {
    try { return d.toLocaleString() } catch { return String(value) }
  }
}

export function formatNumberByCompany(n?: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  const locale = 'pt-BR'
  try { return new Intl.NumberFormat(locale).format(n) } catch { return n.toLocaleString(locale) }
}

export type StockNumberType = 'int' | 'decimal'

export function normalizeStockNumberType(type: unknown): StockNumberType {
  const t = String(type ?? '').toLowerCase().trim()
  if (t === 'int' || t === 'integer') return 'int'
  return 'decimal'
}

export function formatStockQuantity(type: StockNumberType, value: unknown, locale: string = 'pt-BR'): string {
  const cents = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(cents)) return '-'
  const n = cents / 100
  const digits = type === 'int' ? 0 : 2
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n)
  } catch {
    return n.toFixed(digits)
  }
}

export function getCompanyTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function getCompanyLogoUrl(): string | null {
  const cfg = getCompanyConfig()
  const raw = String(cfg?.image?.url ?? '').trim()
  const cleaned = raw.replace(/`/g, '').trim()
  return cleaned || null
}

export function getCompanyWebsite(): string | null {
  const cfg = getCompanyConfig()
  const raw = String(cfg?.website ?? '').trim()
  const cleaned = raw.replace(/`/g, '').trim()
  return cleaned || null
}

export type RoundingMode = 'half_up' | 'up' | 'down'
export type MoneyFormatConfig = {
  symbol: string
  symbolPosition: 'prefix' | 'suffix' | 'none'
  thousandSeparator: string
  decimalSeparator: string
  decimalPlaces: number
  rounding: RoundingMode
  spaceBetweenSymbol: boolean
}

const defaultMoneyConfig: MoneyFormatConfig = {
  symbol: '¤',
  symbolPosition: 'prefix',
  thousandSeparator: ',',
  decimalSeparator: '.',
  decimalPlaces: 2,
  rounding: 'half_up',
  spaceBetweenSymbol: true,
}

const companyMoneyConfigs = new Map<string, MoneyFormatConfig>()

export function defineCompanyMoneyConfig(key: string, cfg: Partial<MoneyFormatConfig>): MoneyFormatConfig {
  const merged: MoneyFormatConfig = {
    symbol: cfg.symbol ?? defaultMoneyConfig.symbol,
    symbolPosition: cfg.symbolPosition ?? defaultMoneyConfig.symbolPosition,
    thousandSeparator: cfg.thousandSeparator ?? defaultMoneyConfig.thousandSeparator,
    decimalSeparator: cfg.decimalSeparator ?? defaultMoneyConfig.decimalSeparator,
    decimalPlaces: typeof cfg.decimalPlaces === 'number' ? cfg.decimalPlaces : defaultMoneyConfig.decimalPlaces,
    rounding: cfg.rounding ?? defaultMoneyConfig.rounding,
    spaceBetweenSymbol: typeof cfg.spaceBetweenSymbol === 'boolean' ? cfg.spaceBetweenSymbol : defaultMoneyConfig.spaceBetweenSymbol,
  }
  companyMoneyConfigs.set(key, merged)
  return merged
}

export function getCompanyMoneyConfig(key: string = 'default'): MoneyFormatConfig | null {
  return companyMoneyConfigs.get(key) ?? null
}

function groupThousands(intPart: string, sep: string): string {
  const s = intPart.replace(/^(-)/, '')
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const idx = s.length - i - 1
    out = s[idx] + out
    if (i % 3 === 2 && idx !== 0) out = sep + out
  }
  return (intPart.startsWith('-') ? '-' : '') + out
}

function roundNumber(value: number, places: number, mode: RoundingMode): number {
  const factor = Math.pow(10, places)
  const scaled = value * factor
  if (mode === 'up') return Math.ceil(scaled) / factor
  if (mode === 'down') return Math.floor(scaled) / factor
  return Math.round(scaled) / factor
}

export function formatMoneyWithConfig(value: number, cfg: MoneyFormatConfig): string {
  if (!Number.isFinite(value)) return '-'
  const neg = value < 0
  const abs = Math.abs(value)
  const rounded = roundNumber(abs, cfg.decimalPlaces, cfg.rounding)
  const [intStr, fracStrRaw] = rounded.toFixed(cfg.decimalPlaces).split('.')
  const intFmt = groupThousands(intStr, cfg.thousandSeparator)
  const fracFmt = cfg.decimalPlaces > 0 ? cfg.decimalSeparator + fracStrRaw : ''
  const core = intFmt + fracFmt
  const space = cfg.spaceBetweenSymbol ? ' ' : ''
  const withSymbol = cfg.symbolPosition === 'prefix'
    ? (cfg.symbol !== 'none' ? (cfg.symbol + space + core) : core)
    : cfg.symbolPosition === 'suffix'
      ? (core + (cfg.symbol !== 'none' ? space + cfg.symbol : ''))
      : core
  return neg ? '-' + withSymbol : withSymbol
}

export function formatCentsWithConfig(cents: number, cfg: MoneyFormatConfig): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '-'
  const value = cents / 100
  return formatMoneyWithConfig(value, cfg)
}

export function parseMoneyStringToCents(text: string, cfg: MoneyFormatConfig): number | undefined {
  if (typeof text !== 'string' || !text.trim()) return undefined
  const cleaned = text
    .replace(new RegExp('\\s', 'g'), '')
    .replace(cfg.symbol, '')
    .replace(new RegExp('\\' + cfg.thousandSeparator, 'g'), '')
    .replace(cfg.decimalSeparator, '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return undefined
  const value = roundNumber(n, 2, 'half_up')
  return Math.round(value * 100)
}

export function validateMoneyString(text: string, cfg: MoneyFormatConfig): boolean {
  if (typeof text !== 'string' || !text.trim()) return false
  const re = new RegExp(`^-?(${cfg.symbolPosition === 'prefix' ? cfg.symbol + '\\s?' : ''})?[0-9${cfg.thousandSeparator}]+(${cfg.decimalSeparator}[0-9]+)?(${cfg.symbolPosition === 'suffix' ? '\\s?' + cfg.symbol : ''})?$`)
  return re.test(text.replaceAll('\u0000', ''))
}

export function convertMoneyString(text: string, fromCfg: MoneyFormatConfig, toCfg: MoneyFormatConfig): string {
  const cents = parseMoneyStringToCents(text, fromCfg)
  if (typeof cents !== 'number') return '-'
  return formatCentsWithConfig(cents, toCfg)
}

export function formatarMoedaFlex(valor: number, key: string = 'default'): string {
  const cfg = getCompanyMoneyConfig(key)
  if (!cfg) return formatarMoeda(valor)
  return formatMoneyWithConfig(valor, cfg)
}

export type DateFormatConfig = {
  pattern: string
  timeZone?: string
}

const defaultDateConfig: DateFormatConfig = {
  pattern: 'dd/MM/yyyy HH:mm:ss',
}

const companyDateConfigs = new Map<string, DateFormatConfig>()

export function defineCompanyDateConfig(key: string, cfg: Partial<DateFormatConfig>): DateFormatConfig {
  const merged: DateFormatConfig = {
    pattern: cfg.pattern ?? defaultDateConfig.pattern,
    timeZone: cfg.timeZone ?? getCompanyTimeZone(),
  }
  companyDateConfigs.set(key, merged)
  return merged
}

export function getCompanyDateConfig(key: string = 'default'): DateFormatConfig | null {
  return companyDateConfigs.get(key) ?? null
}

function getDatePartsByTz(date: Date, tz?: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || getCompanyTimeZone(),
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    dd: get('day'),
    MM: get('month'),
    yyyy: get('year'),
    HH: get('hour'),
    mm: get('minute'),
    ss: get('second'),
  }
}

export function formatDateWithConfig(value: number | Date, cfg: DateFormatConfig): string {
  const d = value instanceof Date ? value : new Date(value)
  const t = getDatePartsByTz(d, cfg.timeZone)
  let out = cfg.pattern
  out = out.replace('dd', t.dd)
  out = out.replace('MM', t.MM)
  out = out.replace('yyyy', t.yyyy)
  out = out.replace('HH', t.HH)
  out = out.replace(/(^|[^m])mm/g, `$1${t.mm}`)
  out = out.replace('ss', t.ss)
  return out
}

export function validateDateString(text: string, cfg: DateFormatConfig): boolean {
  const tokens: Array<{ key: string; re: string }> = [
    { key: 'dd', re: '(\\d{2})' },
    { key: 'MM', re: '(\\d{2})' },
    { key: 'yyyy', re: '(\\d{4})' },
    { key: 'HH', re: '(\\d{2})' },
    { key: 'mm', re: '(\\d{2})' },
    { key: 'ss', re: '(\\d{2})' },
  ]
  let pattern = cfg.pattern
  for (const t of tokens) pattern = pattern.replace(t.key, t.re)
  const re = new RegExp('^' + pattern + '$')
  return re.test(text)
}

export function parseDateString(text: string, cfg: DateFormatConfig): Date | null {
  const order: string[] = []
  let pattern = cfg.pattern
  const map: Record<string, string> = { dd: '(\\d{2})', MM: '(\\d{2})', yyyy: '(\\d{4})', HH: '(\\d{2})', mm: '(\\d{2})', ss: '(\\d{2})' }
  ;(['dd', 'MM', 'yyyy', 'HH', 'mm', 'ss'] as const).forEach((tok) => {
    if (pattern.includes(tok)) {
      order.push(tok)
      pattern = pattern.replace(tok, map[tok])
    }
  })
  const re = new RegExp('^' + pattern + '$')
  const m = text.match(re)
  if (!m) return null
  const vals: Record<string, number> = {}
  for (let i = 0; i < order.length; i++) vals[order[i]] = parseInt(m[i + 1], 10)
  const yyyy = vals.yyyy ?? 1970
  const MM = (vals.MM ?? 1) - 1
  const dd = vals.dd ?? 1
  const HH = vals.HH ?? 0
  const mi = vals.mm ?? 0
  const ss = vals.ss ?? 0
  return new Date(Date.UTC(yyyy, MM, dd, HH, mi, ss))
}

export function convertDateString(text: string, fromCfg: DateFormatConfig, toCfg: DateFormatConfig): string {
  const d = parseDateString(text, fromCfg)
  if (!d) return text
  return formatDateWithConfig(d, toCfg)
}

export function formatarDataFlex(value: number | Date, key: string = 'default'): string {
  const cfg = getCompanyDateConfig(key)
  if (!cfg) return formatDateByCompany(value)
  return formatDateWithConfig(value, cfg)
}
