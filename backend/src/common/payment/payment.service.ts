import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database';
import { TenantContextService } from '../tenant';
import { getPlanPricing, PLAN_PRICING } from './plan-pricing';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY', ''),
    );
  }

  /**
   * Create a Stripe Checkout Session for plan upgrade
   * @param plan - Plan name (STARTER, PRO, ENTERPRISE)
   * @param billingType - 'monthly', 'yearly', or 'biannual' (2-year, Pro only)
   */
  async createStripeCheckoutSession(plan: string, billingType: 'monthly' | 'yearly' | 'biannual' = 'monthly'): Promise<{ url: string; sessionId: string }> {
    const tenantId = this.tenantContext.requireTenantId();
    const pricing = getPlanPricing(plan);
    
    if (!pricing) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    // Biannual only available for PRO
    if (billingType === 'biannual' && plan !== 'PRO') {
      throw new BadRequestException('2-year billing is only available for Pro plan');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantId },
    });
    
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    
    // Determine price based on billing type
    let amount: number;
    let billingLabel: string;
    
    if (billingType === 'biannual' && pricing.biannualPrice) {
      amount = pricing.biannualPrice;
      billingLabel = ' (2-Year)';
    } else if (billingType === 'yearly') {
      amount = pricing.annualPrice;
      billingLabel = ' (Annual)';
    } else {
      amount = pricing.price;
      billingLabel = ' (Monthly)';
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: pricing.currency,
              product_data: {
                name: pricing.name + billingLabel,
                description: pricing.description,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/subscription?success=true&plan=${plan}&billing=${billingType}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription?cancelled=true`,
        metadata: {
          tenantId: tenantId.toString(),
          plan,
          billingType,
        },
      });

      this.logger.log(`Stripe checkout session created for tenant ${tenantId}, plan ${plan}, billing ${billingType}`);

      return {
        url: session.url!,
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe checkout session', error);
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  /**
   * Create a PayPal order for plan upgrade
   * @param plan - Plan name (STARTER, PRO, ENTERPRISE)
   * @param billingType - 'monthly', 'yearly', or 'biannual' (2-year, Pro only)
   */
  async createPayPalOrder(plan: string, billingType: 'monthly' | 'yearly' | 'biannual' = 'monthly'): Promise<{ orderId: string; approvalUrl: string }> {
    const tenantId = this.tenantContext.requireTenantId();
    const pricing = getPlanPricing(plan);
    
    if (!pricing) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    // Biannual only available for PRO
    if (billingType === 'biannual' && plan !== 'PRO') {
      throw new BadRequestException('2-year billing is only available for Pro plan');
    }

    const clientId = this.configService.get('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get('PAYPAL_CLIENT_SECRET');
    const mode = this.configService.get('PAYPAL_MODE', 'sandbox');
    const baseUrl = mode === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    // Determine price based on billing type
    let amount: number;
    let billingLabel: string;
    
    if (billingType === 'biannual' && pricing.biannualPrice) {
      amount = pricing.biannualPrice;
      billingLabel = ' (2-Year)';
    } else if (billingType === 'yearly') {
      amount = pricing.annualPrice;
      billingLabel = ' (Annual)';
    } else {
      amount = pricing.price;
      billingLabel = ' (Monthly)';
    }

    try {
      // Get access token
      const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      const authData = await authResponse.json();
      const accessToken = authData.access_token;

      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
      const priceInDollars = (amount / 100).toFixed(2);

      // Create order
      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: pricing.currency.toUpperCase(),
                value: priceInDollars,
              },
              description: pricing.name + billingLabel,
              custom_id: JSON.stringify({ tenantId: tenantId.toString(), plan, billingType }),
            },
          ],
          application_context: {
            return_url: `${frontendUrl}/subscription?paypal_success=true&plan=${plan}&billing=${billingType}`,
            cancel_url: `${frontendUrl}/subscription?cancelled=true`,
            brand_name: 'BiTi Task Management',
            user_action: 'PAY_NOW',
          },
        }),
      });

      const orderData = await orderResponse.json();
      
      if (orderData.id) {
        const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;
        
        this.logger.log(`PayPal order created for tenant ${tenantId}, plan ${plan}, billing ${billingType}`);
        
        return {
          orderId: orderData.id,
          approvalUrl,
        };
      } else {
        throw new Error(orderData.message || 'Failed to create PayPal order');
      }
    } catch (error) {
      this.logger.error('Failed to create PayPal order', error);
      throw new BadRequestException('Failed to create PayPal order');
    }
  }

  /**
   * Capture PayPal order after approval
   */
  async capturePayPalOrder(orderId: string): Promise<{ success: boolean; plan: string }> {
    const clientId = this.configService.get('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get('PAYPAL_CLIENT_SECRET');
    const mode = this.configService.get('PAYPAL_MODE', 'sandbox');
    const baseUrl = mode === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    try {
      // Get access token
      const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      const authData = await authResponse.json();
      const accessToken = authData.access_token;

      // Capture the order
      const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const captureData = await captureResponse.json();

      if (captureData.status === 'COMPLETED') {
        // Parse custom_id to get tenant and plan info
        const customId = captureData.purchase_units[0]?.payments?.captures[0]?.custom_id 
          || captureData.purchase_units[0]?.custom_id;
        
        let tenantId: bigint;
        let plan: string;
        
        try {
          const metadata = JSON.parse(customId);
          tenantId = BigInt(metadata.tenantId);
          plan = metadata.plan;
        } catch {
          throw new Error('Invalid order metadata');
        }

        // Upgrade the plan
        await this.upgradeTenantPlan(tenantId, plan, 'paypal', orderId);
        
        this.logger.log(`PayPal payment captured and plan upgraded for tenant ${tenantId}`);
        
        return { success: true, plan };
      } else {
        throw new Error(`PayPal capture failed with status: ${captureData.status}`);
      }
    } catch (error) {
      this.logger.error('Failed to capture PayPal order', error);
      throw new BadRequestException('Failed to capture PayPal payment');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    let event: Stripe.Event;
    
    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // For testing without webhook secret
        event = JSON.parse(payload.toString());
      }
    } catch (error) {
      this.logger.error('Stripe webhook signature verification failed', error);
      throw new BadRequestException('Webhook signature verification failed');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.payment_status === 'paid' && session.metadata) {
        const tenantId = BigInt(session.metadata.tenantId);
        const plan = session.metadata.plan;
        
        await this.upgradeTenantPlan(tenantId, plan, 'stripe', session.id);
        
        this.logger.log(`Stripe payment completed, plan upgraded for tenant ${tenantId}`);
      }
    }
  }

  /**
   * Verify Stripe checkout session and upgrade plan
   */
  async verifyStripeSession(sessionId: string): Promise<{ success: boolean; plan: string }> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid' && session.metadata) {
        const tenantId = BigInt(session.metadata.tenantId);
        const plan = session.metadata.plan;
        
        // Check if already upgraded (idempotency)
        const tenant = await this.prisma.tenant.findFirst({
          where: { tenantId },
        });
        
        if (tenant?.plan !== plan) {
          await this.upgradeTenantPlan(tenantId, plan, 'stripe', sessionId);
        }
        
        return { success: true, plan };
      }
      
      return { success: false, plan: '' };
    } catch (error) {
      this.logger.error('Failed to verify Stripe session', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Upgrade tenant plan after successful payment
   */
  private async upgradeTenantPlan(
    tenantId: bigint,
    plan: string,
    provider: string,
    externalId: string,
  ): Promise<void> {
    const pricing = getPlanPricing(plan);
    
    await this.prisma.$transaction(async (tx) => {
      // Update tenant plan
      await tx.tenant.update({
        where: { tenantId },
        data: { plan },
      });
      
      // Record payment history
      await tx.paymentHistory.create({
        data: {
          tenantId,
          amount: pricing?.price || 0,
          currency: pricing?.currency || 'usd',
          status: 'succeeded',
          paymentProvider: provider,
          externalId,
          plan,
        },
      });
    });
    
    this.logger.log(`Tenant ${tenantId} upgraded to ${plan} via ${provider}`);
  }

  /**
   * Create ABA PayWay checkout transaction for plan upgrade (Cambodia only)
   * Returns QR code data for web users to scan with ABA mobile app
   * @param plan - Plan name (STARTER, PRO, ENTERPRISE)
   * @param billingType - 'monthly', 'yearly', or 'biannual' (2-year, Pro only)
   */
  async createABAPayWayOrder(plan: string, billingType: 'monthly' | 'yearly' | 'biannual' = 'monthly'): Promise<{ 
    transactionId: string; 
    qrImage: string; 
    qrString: string;
    deeplink: string;
    amount: string;
    currency: string;
  }> {
    const tenantId = this.tenantContext.requireTenantId();
    const pricing = getPlanPricing(plan);
    
    if (!pricing) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    // Biannual only available for PRO
    if (billingType === 'biannual' && plan !== 'PRO') {
      throw new BadRequestException('2-year billing is only available for Pro plan');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantId },
    });
    
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const merchantId = this.configService.get('ABA_PAYWAY_MERCHANT_ID');
    const apiKey = this.configService.get('ABA_PAYWAY_PUBLIC_KEY'); // This is the API key for hashing
    const apiUrl = this.configService.get('ABA_PAYWAY_API_URL');
    
    if (!merchantId || !apiKey) {
      throw new BadRequestException('ABA PayWay is not configured. Please contact support.');
    }

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    
    // Generate req_time in format yyyyMMddHHmmss
    const now = new Date();
    const reqTime = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const transactionId = `ABA${tenantId}${Date.now()}`;
    // Determine price based on billing type
    let priceAmount: number;
    let billingLabel: string;
    
    if (billingType === 'biannual' && pricing.biannualPrice) {
      priceAmount = pricing.biannualPrice;
      billingLabel = ' (2-Year)';
    } else if (billingType === 'yearly') {
      priceAmount = pricing.annualPrice;
      billingLabel = ' (Annual)';
    } else {
      priceAmount = pricing.price;
      billingLabel = ' (Monthly)';
    }
    const amount = (priceAmount / 100).toFixed(2);
    const items = pricing.name + billingLabel;
    const continueSuccessUrl = `${frontendUrl}/subscription?aba_success=true&plan=${plan}&billing=${billingType}&tran_id=${transactionId}`;
    const returnUrl = `${frontendUrl}/subscription?cancelled=true`;
    const firstname = tenant.name || 'Customer';
    const currency = 'USD';

    // Hash = base64( HMAC-SHA512( str, api_key ) )
    // str = req_time + merchant_id + tran_id + amount + items + shipping + firstname + lastname + 
    //       email + phone + type + payment_option + return_url + cancel_url + continue_success_url + 
    //       return_deeplink + currency + custom_fields + return_params + payout + lifetime + 
    //       additional_params + google_pay_token + skip_success_page
    const crypto = await import('crypto');
    const hashStr = reqTime + merchantId + transactionId + amount + items + '' + firstname + '' + 
                    '' + '' + '' + '' + returnUrl + '' + continueSuccessUrl + 
                    '' + currency + '' + '' + '' + '' + 
                    '' + '' + '';
    const hash = crypto.createHmac('sha512', apiKey).update(hashStr).digest('base64');

    // Build form data
    const formData = new URLSearchParams();
    formData.append('req_time', reqTime);
    formData.append('merchant_id', merchantId);
    formData.append('tran_id', transactionId);
    formData.append('amount', amount);
    formData.append('items', items);
    formData.append('firstname', firstname);
    formData.append('return_url', returnUrl);
    formData.append('continue_success_url', continueSuccessUrl);
    formData.append('currency', currency);
    formData.append('hash', hash);

    this.logger.log(`ABA PayWay request - tran_id: ${transactionId}, req_time: ${reqTime}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      // ABA PayWay returns status.code = '00' for success
      if (data.status?.code === '00' || data.description === 'success') {
        this.logger.log(`ABA PayWay order created for tenant ${tenantId}, plan ${plan}`);
        
        // Return QR code data for web checkout (user scans with ABA mobile app)
        return {
          transactionId,
          qrImage: data.qrImage, // Base64 encoded QR code image
          qrString: data.qrString,
          deeplink: data.abapay_deeplink,
          amount,
          currency,
        };
      } else {
        this.logger.error('ABA PayWay API error', data);
        throw new Error(data.status?.message || 'Failed to create ABA PayWay order');
      }
    } catch (error) {
      this.logger.error('Failed to create ABA PayWay order', error);
      throw new BadRequestException('Failed to create ABA PayWay checkout. Please try again.');
    }
  }

  /**
   * Verify ABA PayWay transaction and upgrade plan
   * Note: In production, ABA PayWay sends a callback/webhook to verify. 
   * This method upgrades the plan when user returns from successful payment.
   */
  async verifyABAPayWayTransaction(transactionId: string, plan: string): Promise<{ success: boolean; plan: string }> {
    const tenantId = this.tenantContext.requireTenantId();
    
    const pricing = getPlanPricing(plan);
    if (!pricing) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    const merchantId = this.configService.get('ABA_PAYWAY_MERCHANT_ID');
    const publicKey = this.configService.get('ABA_PAYWAY_PUBLIC_KEY');

    if (!merchantId || !publicKey) {
      throw new BadRequestException('ABA PayWay is not configured');
    }

    try {
      // Verify the transaction ID matches expected format
      if (!transactionId.startsWith('ABA')) {
        throw new Error('Invalid transaction ID format');
      }

      // Check if already upgraded (idempotency)
      const tenant = await this.prisma.tenant.findFirst({
        where: { tenantId },
      });
      
      if (tenant?.plan !== plan) {
        await this.upgradeTenantPlan(tenantId, plan, 'aba_payway', transactionId);
      }
      
      this.logger.log(`ABA PayWay payment verified for tenant ${tenantId}, plan ${plan}`);
      return { success: true, plan };
    } catch (error) {
      this.logger.error('Failed to verify ABA PayWay transaction', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Get available plans with pricing (includes both monthly and yearly)
   */
  getAvailablePlans() {
    return Object.entries(PLAN_PRICING).map(([key, value]) => ({
      plan: key,
      ...value,
      monthlyPrice: value.price,
      yearlyPrice: value.annualPrice,
      monthlyDisplay: value.price > 0 ? `$${(value.price / 100).toFixed(2)}/month` : 'Free',
      yearlyDisplay: value.annualPrice > 0 ? `$${(value.annualPrice / 100 / 12).toFixed(2)}/month` : 'Free',
      yearlyTotal: value.annualPrice > 0 ? `$${(value.annualPrice / 100).toFixed(2)}/year` : 'Free',
    }));
  }
}
