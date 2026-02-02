/**
 * Plan pricing configuration for subscriptions.
 * Prices are in cents (e.g., 1299 = $12.99)
 */
export interface PlanPrice {
  price: number;           // monthly price in cents
  annualPrice: number;     // annual price in cents (with discount)
  biannualPrice?: number;  // 2-year price in cents (with discount) - optional
  currency: string;
  name: string;
  description: string;
  isContactSales: boolean; // true for Enterprise to show "Contact Sales" instead of price
  trialDays: number;       // free trial days
}

export const PLAN_PRICING: Record<string, PlanPrice> = {
  STARTER: {
    price: 1299,           // $12.99/month
    annualPrice: 13188,    // $131.88/year = $10.99/month (15% off)
    currency: 'usd',
    name: 'Starter Plan',
    description: '15 team members, 20 projects, 1,000 tasks, 5 GB storage',
    isContactSales: false,
    trialDays: 7,
  },
  PRO: {
    price: 3499,           // $34.99/month
    annualPrice: 33588,    // $335.88/year = $27.99/month (20% off)
    biannualPrice: 54576,  // $545.76/2years = $22.74/month (35% off)
    currency: 'usd',
    name: 'Pro Plan',
    description: '50 team members, 100 projects, 10,000 tasks, 25 GB storage',
    isContactSales: false,
    trialDays: 7,
  },
  ENTERPRISE: {
    price: 0,              // Contact Sales
    annualPrice: 0,
    currency: 'usd',
    name: 'Enterprise Plan',
    description: 'Unlimited users, projects, tasks, 100 GB storage, Priority Support',
    isContactSales: true,
    trialDays: 7,
  },
};

/**
 * Get pricing for a plan
 */
export function getPlanPricing(plan: string): PlanPrice | null {
  return PLAN_PRICING[plan] || null;
}

/**
 * Format price for display (e.g., "$12.99")
 */
export function formatPrice(cents: number, currency: string = 'usd'): string {
  if (cents === 0) return 'Contact Sales';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Get all available plans for display
 */
export function getAllPlans(): Array<{ plan: string } & PlanPrice> {
  return Object.entries(PLAN_PRICING).map(([plan, pricing]) => ({
    plan,
    ...pricing,
  }));
}
