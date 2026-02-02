import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { TenantRoleGuard, RequireTenantRole, SkipTenantGuard } from '../tenant';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('plans')
  @SkipTenantGuard()
  @ApiOperation({ summary: 'Get available subscription plans with pricing' })
  @ApiResponse({ status: 200, description: 'List of available plans' })
  getAvailablePlans() {
    return this.paymentService.getAvailablePlans();
  }

  @Post('stripe/checkout')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Create Stripe checkout session for plan upgrade' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  @ApiResponse({ status: 403, description: 'Only tenant owners can upgrade' })
  async createStripeCheckout(@Body() body: { plan: string; billingType?: 'monthly' | 'yearly' | 'biannual' }) {
    return this.paymentService.createStripeCheckoutSession(body.plan, body.billingType || 'monthly');
  }

  @Post('stripe/verify')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Verify Stripe checkout session and complete upgrade' })
  @ApiResponse({ status: 200, description: 'Payment verified and plan upgraded' })
  async verifyStripeSession(@Body() body: { sessionId: string }) {
    return this.paymentService.verifyStripeSession(body.sessionId);
  }

  @Post('stripe/webhook')
  @SkipTenantGuard()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new Error('Raw body not available');
    }
    await this.paymentService.handleStripeWebhook(signature, rawBody);
    return { received: true };
  }

  @Post('paypal/create-order')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Create PayPal order for plan upgrade' })
  @ApiResponse({ status: 200, description: 'PayPal order created' })
  @ApiResponse({ status: 403, description: 'Only tenant owners can upgrade' })
  async createPayPalOrder(@Body() body: { plan: string; billingType?: 'monthly' | 'yearly' | 'biannual' }) {
    return this.paymentService.createPayPalOrder(body.plan, body.billingType || 'monthly');
  }

  @Post('paypal/capture-order')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Capture PayPal order after approval' })
  @ApiResponse({ status: 200, description: 'Payment captured and plan upgraded' })
  async capturePayPalOrder(@Body() body: { orderId: string }) {
    return this.paymentService.capturePayPalOrder(body.orderId);
  }

  @Post('aba-payway/create-order')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Create ABA PayWay order for plan upgrade (Cambodia only)' })
  @ApiResponse({ status: 200, description: 'ABA PayWay order created' })
  @ApiResponse({ status: 403, description: 'Only tenant owners can upgrade' })
  async createABAPayWayOrder(@Body() body: { plan: string; billingType?: 'monthly' | 'yearly' | 'biannual' }) {
    return this.paymentService.createABAPayWayOrder(body.plan, body.billingType || 'monthly');
  }

  @Post('aba-payway/verify')
  @ApiBearerAuth()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Verify ABA PayWay transaction and complete upgrade' })
  @ApiResponse({ status: 200, description: 'Payment verified and plan upgraded' })
  async verifyABAPayWayTransaction(@Body() body: { transactionId: string; plan: string }) {
    return this.paymentService.verifyABAPayWayTransaction(body.transactionId, body.plan);
  }
}
