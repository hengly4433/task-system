import api from './api'

export type BillingType = 'monthly' | 'yearly' | 'biannual'

export interface PlanPricing {
  plan: string
  price: number
  annualPrice: number
  biannualPrice?: number  // 2-year price (Pro only)
  currency: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  yearlyTotal: string
  biannualDisplay?: string  // $22.74/mo (Pro only)
  biannualTotal?: string    // $545.76/2yr (Pro only)
  monthlyDisplay: string
  yearlyDisplay: string
}

export interface StripeCheckoutResponse {
  url: string
  sessionId: string
}

export interface PayPalOrderResponse {
  orderId: string
  approvalUrl: string
}

export interface PaymentVerifyResponse {
  success: boolean
  plan: string
}

export interface ABAPayWayOrderResponse {
  transactionId: string
  qrImage: string
  qrString: string
  deeplink: string
  amount: string
  currency: string
}

export const paymentService = {
  /**
   * Get available plans with pricing
   */
  async getAvailablePlans(): Promise<PlanPricing[]> {
    const response = await api.get('/payment/plans')
    return response.data
  },

  /**
   * Create a Stripe checkout session
   */
  async createStripeCheckout(plan: string, billingType: BillingType = 'monthly'): Promise<StripeCheckoutResponse> {
    const response = await api.post('/payment/stripe/checkout', { plan, billingType })
    return response.data
  },

  /**
   * Verify Stripe payment and complete upgrade
   */
  async verifyStripeSession(sessionId: string): Promise<PaymentVerifyResponse> {
    const response = await api.post('/payment/stripe/verify', { sessionId })
    return response.data
  },

  /**
   * Create a PayPal order
   */
  async createPayPalOrder(plan: string, billingType: BillingType = 'monthly'): Promise<PayPalOrderResponse> {
    const response = await api.post('/payment/paypal/create-order', { plan, billingType })
    return response.data
  },

  /**
   * Capture PayPal order after approval
   */
  async capturePayPalOrder(orderId: string): Promise<PaymentVerifyResponse> {
    const response = await api.post('/payment/paypal/capture-order', { orderId })
    return response.data
  },

  /**
   * Create an ABA PayWay order (Cambodia only)
   */
  async createABAPayWayOrder(plan: string, billingType: BillingType = 'monthly'): Promise<ABAPayWayOrderResponse> {
    const response = await api.post('/payment/aba-payway/create-order', { plan, billingType })
    return response.data
  },

  /**
   * Verify ABA PayWay transaction and complete upgrade
   */
  async verifyABAPayWayTransaction(transactionId: string, plan: string): Promise<PaymentVerifyResponse> {
    const response = await api.post('/payment/aba-payway/verify', { transactionId, plan })
    return response.data
  },
}

