import { Check, Mail } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  features: string[];
  featured?: boolean;
  buttonText: string;
  buttonVariant?: 'primary' | 'outline' | 'enterprise';
  onButtonClick?: () => void;
}

export default function PricingCard({
  name,
  price,
  period,
  features,
  featured = false,
  buttonText,
  buttonVariant = 'outline',
  onButtonClick,
}: PricingCardProps) {
  return (
    <div className={`card ${featured ? 'card-featured' : ''}`}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="heading-sm" style={{ marginBottom: '1rem' }}>
          {name}
          {name === 'Basic' && <span style={{ fontSize: '0.8em', opacity: 0.7 }}>.</span>}
        </h3>
        
        {/* Price */}
        {price === 'Contact Sales' ? (
          <div className="price">
            <span className="price-amount" style={{ fontSize: '2rem' }}>
              Contact Sales
            </span>
          </div>
        ) : (
          <div className="price">
            <span className="price-currency">$</span>
            <span className="price-amount">{price}</span>
            {period && <span className="price-period">/{period}</span>}
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="feature-list" style={{ marginBottom: '2rem' }}>
        {features.map((feature, index) => (
          <li key={index}>
            <Check className="check-icon" size={16} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        className={`btn btn-${buttonVariant}`}
        style={{ width: '100%' }}
        onClick={onButtonClick}
      >
        {buttonVariant === 'enterprise' && <Mail size={18} />}
        {buttonText}
      </button>
    </div>
  );
}
