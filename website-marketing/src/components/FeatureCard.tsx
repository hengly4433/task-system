interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: 'rgba(0, 255, 127, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem',
        color: 'var(--primary)',
      }}>
        {icon}
      </div>
      <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        {description}
      </p>
    </div>
  );
}
