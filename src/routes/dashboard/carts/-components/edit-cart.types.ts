export type DerivatedProduct = {
  id: number
  name: string
  price: number
  oldPrice: number
  amount: number
  productId: number
  cartId: number
  totalValue: number
  derivatedProductId: number
}

export type ProductGroup = {
  id: number
  productId: number
  name: string
  sku?: string
  cartId: number
  totalItems: number
  totalValue: number
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
  complement: string
  isDefault: boolean
}

export type CustomerAddress = CartAddress & {
  createdAt: string
  updatedAt: string
}

export type Cart = {
  id: number
  customer: { id: number; name: string }
  store: { id: number; name: string }
  address?: CartAddress | null
  status: "open" | "abandoned" | "finished"
  totalItems: number
  totalAdditions: number
  totalDiscounts: number
  totalValue: number
  createdAt: string
  updatedAt: string
  additions: { id: number; name: string; value: number }[]
  discounts: { id: number; name: string; value: number }[]
  cupons?: {
    id: number
    code: string
    description: string
    customerMessage: string
    type: string
    value: number
    storeId: number
    discountApplied: number
  }[]
  products: ProductGroup[]
  shippingQuote?: ShippingQuote[]
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
