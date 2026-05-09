export type DerivatedProduct = {
  id: number
  derivatedProductId: number
  name: string
  amount: number
  oldPrice: number
  price: number
  totalValue: number
}

export type ProductGroup = {
  id: number
  name: string
  sku?: string
  derivatedProducts: DerivatedProduct[]
}

export type ShippingQuote = {
  id: number
  carrierName: string
  serviceName: string
  price: number
  deadline: number
  isSelected: boolean
}

export type CartAddress = {
  id: number
  name: string
  streetName: string
  number: number
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
  complement: string | null
  isDefault: boolean
}

export type CustomerAddress = CartAddress & {
  createdAt: string
  updatedAt: string
}

export type CartStatus = "open" | "abandoned" | "finished"

export type CartBasic = {
  id: number
  customer: { id: number; name: string }
  store: { id: number; name: string }
  address: CartAddress | null
  status: CartStatus
  createdAt: string
  updatedAt: string
}

export type CartProductsResponse = {
  cartId: number
  products: ProductGroup[]
}

export type CartCuponsResponse = {
  cartId: number
  cupons: Array<{
    id: number
    code: string
    description: string
    customerMessage: string
    type: string
    value: number
    storeId: number
    discountApplied: number
  }>
}

export type CartShippingQuoteResponse = {
  cartId: number
  shippingQuote: ShippingQuote[]
}

export type PaymentMethod = {
  id: number
  name: string
}

export type PaymentMethodQuote = {
  cartId: number
  paymentMethod: {
    id: number
    name: string
    activeDiscount: boolean
    discountAmount: number
    discountType: string
  }
  shippingQuote: null | { id: number; price: number; deadline: number }
  totals: {
    productsValue: number
    shippingValue: number
    totalDiscounts: number
    baseTotalValue: number
    discountApplied: number
    discountedTotalValue: number
  }
  payIns: Array<{
    id: number
    name: string
    numberOfInstallments: number
    paymentMethodId: number
    active: boolean
    payInInterestType: "simple" | "price_table"
    installmentType: "fixed" | "dynamic"
    createdAt: string
    updatedAt: string
    noInterestRate: boolean
    totals: {
      baseTotalValue: number
      discountApplied: number
      discountedTotalValue: number
      totalValue: number
      totalInterest: number
    }
    installmentValue: number | null
    installmentValues?: number[]
  }>
}
