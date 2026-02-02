'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Users,
  Calendar,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';
import SignInModal from '@/components/SignInModal';

export default function HomePage() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('FREE');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: <CheckSquare size={28} />,
      title: 'Task Management',
      description: 'Create, organize, and track tasks with ease. Assign priorities and due dates.',
    },
    {
      icon: <Users size={28} />,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with real-time chat, comments, and team meetings.',
    },
    {
      icon: <Calendar size={28} />,
      title: 'Sprint Planning',
      description: 'Plan and manage agile sprints with milestone tracking and burndown charts.',
    },
    {
      icon: <BarChart3 size={28} />,
      title: 'Reports & Analytics',
      description: 'Get insights into team productivity with detailed analytics and reports.',
    },
  ];

  // Production-ready pricing matching the admin panel
  const pricingPlans = [
    {
      name: 'Free',
      price: 'Free',
      features: ['5 team members', '3 projects', '100 tasks', '500 MB storage'],
    },
    {
      name: 'Starter',
      price: '12',
      period: '.99',
      features: ['15 team members', '20 projects', '1,000 tasks', '5 GB storage'],
    },
    {
      name: 'Pro',
      price: '34',
      period: '.99',
      features: ['50 team members', '100 projects', '10,000 tasks', '25 GB storage'],
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingTop: '10rem', paddingBottom: '6rem' }}>
        <div className="container">
          <div style={{ maxWidth: 850, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <div 
              className={mounted ? 'animate-fade-in-down' : ''}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(241, 24, 76, 0.1)',
                border: '1px solid rgba(241, 24, 76, 0.2)',
                borderRadius: 100,
                marginBottom: '2rem',
                fontSize: '0.875rem',
                color: 'var(--primary)',
              }}
            >
              <Sparkles size={16} />
              <span>Now with AI-powered task suggestions</span>
            </div>

            <h1 
              className={`heading-xl ${mounted ? 'animate-fade-in-up' : ''}`}
              style={{ marginBottom: '1.5rem', animationDelay: '0.1s' }}
            >
              Manage Your Tasks,<br />
              <span>Empower Your Team.</span>
            </h1>
            <p 
              className={mounted ? 'animate-fade-in-up' : ''}
              style={{
                fontSize: '1.25rem',
                color: 'var(--text-secondary)',
                marginBottom: '2.5rem',
                maxWidth: 600,
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.7,
                animationDelay: '0.2s',
              }}
            >
              BiTi is a powerful task management platform designed to help teams collaborate, 
              organize projects, and achieve their goals efficiently.
            </p>
            <div 
              className={mounted ? 'animate-fade-in-up' : ''}
              style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'center', 
                flexWrap: 'wrap',
                animationDelay: '0.3s',
              }}
            >
              <button onClick={() => setSignInOpen(true)} className="btn btn-primary">
                Get Started Free
                <ArrowRight size={18} />
              </button>
              <Link href="/features" className="btn btn-outline">
                Explore Features
              </Link>
            </div>

            {/* Stats */}
            <div 
              className={mounted ? 'animate-fade-in-up' : ''}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '3rem',
                marginTop: '4rem',
                flexWrap: 'wrap',
                animationDelay: '0.4s',
              }}
            >
              {[
                { value: '10K+', label: 'Teams' },
                { value: '500K+', label: 'Tasks Completed' },
                { value: '99.9%', label: 'Uptime' },
              ].map((stat, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="section" style={{ background: 'rgba(18, 18, 26, 0.5)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="heading-lg">
              Everything You Need to<br />
              <span>Get Work Done.</span>
            </h2>
            <p className="subtitle">
              Powerful features to help your team collaborate effectively and deliver results.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card hover-lift"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="icon-wrapper" style={{ marginBottom: '1.25rem' }}>
                  {feature.icon}
                </div>
                <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>
                  {feature.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="heading-lg">
              Choose Your<br />
              <span style={{ fontStyle: 'italic' }}>Favorite Package.</span>
            </h2>
            <p className="subtitle">
              Select one of your favorite package and get the facilities.
            </p>
          </div>

          {/* Toggle */}
          <div className="toggle-container">
            <span className="toggle-label active">Monthly</span>
            <div className="toggle active"></div>
            <span className="toggle-label">Yearly</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            maxWidth: 1000,
            margin: '0 auto',
          }}>
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`card ${index === 1 ? 'card-featured' : ''}`}
              >
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 className="heading-sm" style={{ marginBottom: '1rem' }}>
                    {plan.name}.
                  </h3>
                  
                  <div className="price">
                    {plan.price === 'Free' ? (
                      <>
                        <span className="price-currency">$</span>
                        <span className="price-amount" style={{ fontStyle: 'italic' }}>Free</span>
                      </>
                    ) : (
                      <>
                        <span className="price-currency">$</span>
                        <span className="price-amount">{plan.price}</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>{plan.period}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="feature-list" style={{ marginBottom: '2rem' }}>
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex}>
                      <Check className="check-icon" size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/pricing"
                  className={`btn ${index === 1 ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: '100%' }}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link 
              href="/pricing" 
              style={{ 
                color: 'var(--primary)', 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500,
                transition: 'gap 0.3s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.gap = '0.75rem')}
              onMouseLeave={(e) => (e.currentTarget.style.gap = '0.5rem')}
            >
              View all pricing options <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, var(--bg-secondary) 100%)',
            border: '1px solid rgba(241, 24, 76, 0.2)',
            borderRadius: 28,
            padding: '5rem 3rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: 'radial-gradient(circle, rgba(241, 24, 76, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              position: 'absolute',
              bottom: -50,
              left: -50,
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(255, 107, 138, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'var(--gradient-primary)',
                marginBottom: '1.5rem',
              }}>
                <Zap size={32} color="white" />
              </div>
              <h2 className="heading-lg" style={{ marginBottom: '1rem' }}>
                Ready to Get Started?
              </h2>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '1.125rem',
                marginBottom: '2rem',
                maxWidth: 500,
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: 1.7,
              }}>
                Join thousands of teams already using BiTi to manage their projects and boost productivity.
              </p>
              <button onClick={() => setSignInOpen(true)} className="btn btn-primary">
                Start Your Free Trial
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} selectedPlan={selectedPlan} />
    </>
  );
}
