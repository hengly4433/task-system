import {
  Target,
  Lightbulb,
  Users,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Award,
  Clock,
} from 'lucide-react';

export const metadata = {
  title: 'About Us - BiTi',
  description: 'Learn about BiTi, our mission to revolutionize team collaboration, and the technology behind our task management platform.',
};

export default function AboutPage() {
  const values = [
    {
      icon: <Target size={28} />,
      title: 'Mission-Driven',
      description: 'We\'re committed to helping teams achieve their goals through better organization and collaboration.',
    },
    {
      icon: <Lightbulb size={28} />,
      title: 'Innovation',
      description: 'We continuously improve our platform with cutting-edge technology to meet evolving team needs.',
    },
    {
      icon: <Users size={28} />,
      title: 'User-Centric',
      description: 'Every feature we build starts with understanding what teams actually need to succeed.',
    },
    {
      icon: <Shield size={28} />,
      title: 'Security First',
      description: 'Your data security is our top priority. We use enterprise-grade encryption and multi-tenancy isolation.',
    },
    {
      icon: <Zap size={28} />,
      title: 'Performance',
      description: 'Built for speed and reliability, ensuring your team stays productive without interruptions.',
    },
    {
      icon: <Globe size={28} />,
      title: 'Global Reach',
      description: 'Supporting teams worldwide with multi-language support and regional payment options.',
    },
  ];

  const stats = [
    { icon: <Users size={24} />, value: '10K+', label: 'Teams Worldwide' },
    { icon: <TrendingUp size={24} />, value: '500K+', label: 'Tasks Completed' },
    { icon: <Award size={24} />, value: '99.9%', label: 'Uptime' },
    { icon: <Clock size={24} />, value: '24/7', label: 'Support' },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingTop: '6rem' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem' }}>
            <h1 className="heading-xl">
              About <span>BiTi</span>
            </h1>
            <p className="subtitle" style={{ maxWidth: 700 }}>
              We believe that great teams deserve great tools. BiTi was built to transform 
              how teams collaborate, organize, and deliver exceptional results.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '4rem',
            alignItems: 'center',
          }}>
            <div>
              <h2 className="heading-lg" style={{ marginBottom: '1.5rem' }}>
                Our <span>Story</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7 }}>
                BiTi was born from a simple observation: teams spend too much time managing tools 
                instead of doing meaningful work. We set out to change that.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.7 }}>
                Built by a team of developers and project managers who experienced these challenges 
                firsthand, BiTi combines powerful task management with intuitive design. Every feature 
                is designed to reduce friction and help teams focus on what matters most.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Today, BiTi powers teams of all sizes—from startups to enterprises—helping them 
                organize projects, track progress, and achieve their goals efficiently.
              </p>
            </div>
            
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
            }}>
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="card hover-lift"
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                  }}
                >
                  <div className="icon-wrapper" style={{ 
                    margin: '0 auto 1rem',
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                  }}>
                    {stat.icon}
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '0.25rem',
                  }}>
                    {stat.value}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section" style={{ background: 'rgba(18, 18, 26, 0.5)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="heading-lg">
              Our <span>Values</span>
            </h2>
            <p className="subtitle">
              The principles that guide everything we do at BiTi.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
            {values.map((value, index) => (
              <div key={index} className="card hover-lift">
                <div className="icon-wrapper" style={{ marginBottom: '1.25rem' }}>
                  {value.icon}
                </div>
                <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>
                  {value.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="section">
        <div className="container">
          <div style={{ 
            maxWidth: 800, 
            margin: '0 auto', 
            textAlign: 'center',
          }}>
            <h2 className="heading-lg" style={{ marginBottom: '1.5rem' }}>
              Built with <span>Modern Technology</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
              BiTi is built on a robust, modern tech stack designed for performance, 
              security, and scalability. Our architecture supports multi-tenancy, 
              real-time collaboration, and enterprise-grade security out of the box.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {['NestJS', 'Vue.js', 'PostgreSQL', 'Prisma', 'Supabase'].map((tech) => (
                <span 
                  key={tech} 
                  className="hover-lift"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    cursor: 'default',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
