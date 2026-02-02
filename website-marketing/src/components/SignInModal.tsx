'use client';

import { useState } from 'react';
import { X, Mail, User, Lock, Building2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
}

type AuthMode = 'signin' | 'signup';

export default function SignInModal({ isOpen, onClose, selectedPlan }: SignInModalProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const adminPanelUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173';

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    const googleAuthUrl = api.getGoogleAuthUrl();
    if (selectedPlan && selectedPlan !== 'FREE') {
      sessionStorage.setItem('selectedPlan', selectedPlan);
    }
    window.location.href = googleAuthUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const result = await api.register({
          username,
          email,
          password,
          fullName: fullName || undefined,
          organizationName: organizationName || undefined,
        });

        localStorage.setItem('authToken', result.accessToken);
        localStorage.setItem('userId', result.userId);
        setSuccess(true);
        
        setTimeout(() => {
          if (selectedPlan && selectedPlan !== 'FREE') {
            handlePayment(selectedPlan, result.accessToken);
          } else {
            window.location.href = `${adminPanelUrl}/auth/callback?token=${result.accessToken}`;
          }
        }, 1500);
        
      } else {
        const username = email.includes('@') ? email.split('@')[0] : email;
        const result = await api.login({ username, password });

        localStorage.setItem('authToken', result.accessToken);
        localStorage.setItem('userId', result.userId);
        setSuccess(true);
        
        setTimeout(() => {
          window.location.href = `${adminPanelUrl}/auth/callback?token=${result.accessToken}`;
        }, 1500);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (plan: string, token: string) => {
    try {
      const result = await api.createStripeCheckout(plan, token);
      window.location.href = result.url;
    } catch (err) {
      console.error('Payment error:', err);
      window.location.href = `${adminPanelUrl}/subscription?plan=${plan}`;
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setOrganizationName('');
    setError(null);
    setSuccess(false);
  };

  const toggleMode = () => {
    resetForm();
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  // Dark themed input styles
  const inputWrapperStyle = {
    position: 'relative' as const,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    fontSize: '0.9375rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    marginBottom: '0.5rem',
    color: 'var(--text-secondary)',
  };

  return (
    // Disabled close on overlay click
    <div className="modal-overlay">
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2rem', maxWidth: 480 }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {mode === 'signup' ? 'Account Created!' : 'Welcome Back!'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
              {selectedPlan && selectedPlan !== 'FREE' 
                ? 'Redirecting to payment...'
                : 'Redirecting to your dashboard...'}
            </p>
            <div style={{
              width: 28,
              height: 28,
              border: '3px solid var(--primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                {mode === 'signup' 
                  ? selectedPlan 
                    ? `Get started with the ${selectedPlan} plan`
                    : 'Start managing your tasks for free'
                  : 'Sign in to access your dashboard'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                color: '#f87171',
                fontSize: '0.875rem',
              }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'white',
                border: 'none',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: '#333',
                marginBottom: '1.25rem',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="divider" style={{ margin: '1rem 0' }}>or</div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Signup form */}
              {mode === 'signup' && (
                <>
                  {/* Name + Organization row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <div style={inputWrapperStyle}>
                        <User size={16} style={iconStyle} />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Organization <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                      </label>
                      <div style={inputWrapperStyle}>
                        <Building2 size={16} style={iconStyle} />
                        <input
                          type="text"
                          placeholder="Acme Inc."
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          style={inputStyle}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email - full width */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Email Address</label>
                    <div style={inputWrapperStyle}>
                      <Mail size={16} style={iconStyle} />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Password - full width */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Password</label>
                    <div style={inputWrapperStyle}>
                      <Lock size={16} style={iconStyle} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sign in form */}
              {mode === 'signin' && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Email Address</label>
                    <div style={inputWrapperStyle}>
                      <Mail size={16} style={iconStyle} />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={labelStyle}>Password</label>
                    <div style={inputWrapperStyle}>
                      <Lock size={16} style={iconStyle} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(241, 24, 76, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%', padding: '0.875rem' }}
              >
                {isLoading ? 'Processing...' : (
                  <>
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <p style={{
              textAlign: 'center',
              marginTop: '1.25rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}>
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
