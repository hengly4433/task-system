'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import SignInModal from './SignInModal';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About us' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact Us' },
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-container">
          {/* Logo */}
          <Link href="/" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L28 8V24L16 30L4 24V8L16 2Z" stroke="#f1184c" strokeWidth="2" fill="none"/>
              <path d="M16 2L16 30" stroke="#f1184c" strokeWidth="2"/>
              <path d="M4 8L28 24" stroke="#f1184c" strokeWidth="2"/>
              <path d="M28 8L4 24" stroke="#f1184c" strokeWidth="2"/>
            </svg>
            <span>BiTi</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Sign In Button */}
          <button
            onClick={() => setSignInOpen(true)}
            className="btn btn-outline"
            style={{ padding: '0.625rem 1.5rem' }}
          >
            Sign in
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            padding: '1.5rem',
          }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                style={{ display: 'block', padding: '0.75rem 0' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSignInOpen(true);
              }}
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Sign in
            </button>
          </div>
        )}
      </nav>

      {/* Sign In Modal */}
      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block !important;
          }
          .btn-outline {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
