'use client';

import { useState } from 'react';
import { Check, Mail, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import SignInModal from '@/components/SignInModal';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('FREE');

  // Production-ready pricing matching the admin panel
  const plans = [
    {
      name: 'Free',
      planKey: 'FREE',
      description: 'For individuals getting started',
      monthlyPrice: '0',
      yearlyPrice: '0',
      isFree: true,
      features: [
        '5 team members',
        '3 projects',
        '100 tasks',
        '500 MB storage',
        'Basic support',
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Starter',
      planKey: 'STARTER',
      description: 'For small teams',
      monthlyPrice: '12.99',
      yearlyPrice: '10.99',
      features: [
        'Everything in Free',
        '15 team members',
        '20 projects',
        '1,000 tasks',
        '5 GB storage',
        'Custom roles',
        'Time tracking',
      ],
      buttonText: 'Get Started',
      buttonVariant: 'primary' as const,
      featured: true,
      badge: 'Most Popular',
    },
    {
      name: 'Pro',
      planKey: 'PRO',
      description: 'For growing teams',
      monthlyPrice: '34.99',
      yearlyPrice: '29.99',
      features: [
        'Everything in Starter',
        '50 team members',
        '100 projects',
        '10,000 tasks',
        '25 GB storage',
        'Advanced reports',
        'API access',
        'Custom branding',
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
    },
  ];

  const enterprisePlan = {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Contact Sales',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Unlimited projects',
      'Unlimited tasks',
      '100 GB storage',
      'Priority support (24/7)',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantees',
      'On-premise deployment option',
      '365-day audit logs',
    ],
  };

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey);
    setSignInOpen(true);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingTop: '6rem', paddingBottom: '3rem' }}>
        <div className="container">
          <div className="section-header">
            <h1 className="heading-xl">
              Simple, Transparent<br />
              <span style={{ fontStyle: 'italic' }}>Pricing.</span>
            </h1>
            <p className="subtitle">
              Choose the plan that fits your team's needs. No hidden fees.
            </p>
          </div>

          {/* Toggle */}
          <div className="toggle-container">
            <span className={`toggle-label ${!isYearly ? 'active' : ''}`}>Monthly</span>
            <div
              className={`toggle ${isYearly ? 'active' : ''}`}
              onClick={() => setIsYearly(!isYearly)}
              role="button"
              tabIndex={0}
            />
            <span className={`toggle-label ${isYearly ? 'active' : ''}`}>Yearly</span>
            {isYearly && (
              <span style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.375rem 0.875rem',
                borderRadius: 20,
                marginLeft: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                boxShadow: '0 4px 12px rgba(241, 24, 76, 0.3)',
              }}>
                <Sparkles size={12} />
                Save up to 20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            maxWidth: 1000,
            margin: '0 auto',
          }}>
            {plans.map((plan, index) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <div
                  key={index}
                  className={`card hover-lift ${plan.featured ? 'card-featured' : ''}`}
                  style={{ position: 'relative' }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.375rem 1rem',
                      borderRadius: 20,
                      boxShadow: '0 4px 12px rgba(241, 24, 76, 0.4)',
                    }}>
                      {plan.badge}
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>
                      {plan.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="price" style={{ marginBottom: '1.5rem' }}>
                    {plan.isFree ? (
                      <>
                        <span className="price-amount" style={{ fontStyle: 'italic' }}>Free</span>
                      </>
                    ) : (
                      <>
                        <span className="price-currency">$</span>
                        <span className="price-amount">{price}</span>
                        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>/month</span>
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="feature-list" style={{ marginBottom: '2rem' }}>
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex}>
                        <Check className="check-icon" size={16} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.planKey)}
                    className={`btn btn-${plan.buttonVariant}`}
                    style={{ width: '100%' }}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="section">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, var(--bg-secondary) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 24,
            padding: '3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative */}
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="heading-lg" style={{ marginBottom: '0.5rem' }}>
                {enterprisePlan.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {enterprisePlan.description}
              </p>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '1.5rem',
              }}>
                {enterprisePlan.price}
              </div>
              <Link href="/contact" className="btn btn-enterprise">
                <Mail size={18} />
                Contact Sales
              </Link>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <ul className="feature-list">
                {enterprisePlan.features.map((feature, index) => (
                  <li key={index}>
                    <Check className="check-icon" size={16} style={{ color: '#9f67ff' }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section" style={{ background: 'rgba(18, 18, 26, 0.5)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="heading-lg">Frequently Asked <span>Questions</span></h2>
          </div>

          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {[
              {
                q: 'Can I try before I buy?',
                a: 'Yes! All paid plans come with a 7-day free trial. No credit card required to start.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept Visa, Mastercard, American Express via Stripe, PayPal, and ABA PayWay for Cambodia.',
              },
              {
                q: 'Can I upgrade or downgrade at any time?',
                a: 'Absolutely. You can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your billing cycle.',
              },
              {
                q: 'Is there a discount for annual billing?',
                a: 'Yes! Save 15% on Starter and 20% on Pro when you choose yearly billing.',
              },
              {
                q: 'What happens when I exceed my plan limits?',
                a: 'We\'ll notify you when you\'re approaching your limits. You can upgrade anytime or remove items to stay within your current plan.',
              },
            ].map((faq, index) => (
              <div 
                key={index} 
                className="card hover-lift" 
                style={{ marginBottom: '1rem' }}
              >
                <h4 style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{faq.q}</h4>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem', lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center' }}>
            <h2 className="heading-lg" style={{ marginBottom: '1rem' }}>
              Still have <span>questions</span>?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Our team is here to help. Get in touch and we'll get back to you within 24 hours.
            </p>
            <Link href="/contact" className="btn btn-outline">
              Contact Us
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={signInOpen} 
        onClose={() => setSignInOpen(false)}
        selectedPlan={selectedPlan}
      />
    </>
  );
}
