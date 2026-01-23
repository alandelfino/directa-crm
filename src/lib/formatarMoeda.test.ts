import { formatarMoeda } from './format'
import { getCurrencyInfo, formatDateByCompany, formatNumberByCompany, getCompanyLogoUrl, getCompanyWebsite, getCompanyTimeZone } from './format'

function setEmpresaConfig(currency: string) {
  const cfg = JSON.stringify({ currency })
  const ls = typeof window !== 'undefined' && (window as any).localStorage
  if (ls && typeof ls.setItem === 'function') {
    ls.setItem('empresaConfig', cfg)
    return
  }
  ;(globalThis as any).window = (globalThis as any).window || {}
  ;(globalThis as any).window.localStorage = (globalThis as any).window.localStorage || {
    _store: new Map<string, string>(),
    getItem(k: string) { return this._store.get(k) ?? null },
    setItem(k: string, v: string) { this._store.set(k, v) },
  }
  ;(globalThis as any).window.localStorage.setItem('empresaConfig', cfg)
}

function assert(cond: boolean, name: string) {
  if (!cond) throw new Error(name)
}

export function runFormatarMoedaTests() {
  setEmpresaConfig('BRL')
  const brl = formatarMoeda(1234.56)
  assert(/^R\$\s?1\.234,56$/.test(brl), 'BRL formato')

  setEmpresaConfig('USD')
  const usd = formatarMoeda(1234.56)
  assert(/^\$1,234\.56$/.test(usd), 'USD formato')

  setEmpresaConfig('EUR')
  const eur = formatarMoeda(1234.56)
  assert(/^1\.234,56\s?€$/.test(eur) || /^€\s?1\.234,56$/.test(eur), 'EUR formato')

  setEmpresaConfig('BRL')
  const neg = formatarMoeda(-987.65)
  assert(/-\s?R\$\s?987,65|R\$\s?-987,65/.test(neg), 'Negativo')

  setEmpresaConfig('INV')
  const inv = formatarMoeda(100)
  assert(typeof inv === 'string' && inv.length > 0, 'Moeda inválida resiliente')

  setEmpresaConfig('USD')
  const a = formatarMoeda(1000)
  const b = formatarMoeda(2000)
  const c = formatarMoeda(3000)
  assert(a !== b && b !== c, 'Múltiplas chamadas')

  const invalidInput = formatarMoeda('abc')
  assert(invalidInput === '-', 'Entrada inválida')

  ;(window as any).localStorage.setItem('empresaConfig', JSON.stringify({ currency: 'BRL ( R$ )', date_format: 'dd/mm/yyyy-HH:mm:ss', number_format: '0.000,00', time_zone: 'America/Sao_Paulo', image: { url: ' `http://localhost:3000/logo.png` ' }, website: ' `https://example.com/` ' }))
  ;(window as any).localStorage.setItem('directa-company', JSON.stringify({ currency: 'USD' }))
  const info = getCurrencyInfo()
  assert(info.code === 'USD', 'Lê USD de directa-company')
  const date = formatDateByCompany(new Date('2024-01-02T03:04:05Z'))
  assert(typeof date === 'string' && date.length > 0, 'Formata data')
  const num = formatNumberByCompany(1234567)
  assert(/1\.234\.567|1,234,567/.test(num), 'Formata número')
  const tz = getCompanyTimeZone()
  assert(tz === 'America/Sao_Paulo', 'Fuso horário')
  const logo = getCompanyLogoUrl()
  assert(logo === 'http://localhost:3000/logo.png', 'Logo URL limpa')
  const site = getCompanyWebsite()
  assert(site === 'https://example.com/', 'Website URL limpa')

  return true
}