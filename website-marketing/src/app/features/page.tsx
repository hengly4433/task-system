import {
  CheckSquare,
  Users,
  FolderKanban,
  Calendar,
  Clock,
  MessageSquare,
  Bell,
  FileText,
  Paperclip,
  Shield,
  BarChart3,
  Layers,
  Building2,
  Video,
  Tag,
  ListChecks,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Features - BiTi',
  description: 'Discover all the powerful features in BiTi: task management, team collaboration, sprint planning, time tracking, reports, and more.',
};

export default function FeaturesPage() {
  const featureCategories = [
    {
      title: 'Task Management',
      description: 'Comprehensive tools to manage your tasks efficiently',
      gradient: 'linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, transparent 100%)',
      features: [
        {
          icon: <CheckSquare size={24} />,
          title: 'Task Creation & Tracking',
          description: 'Create tasks with descriptions, priorities, due dates, and custom labels. Track progress through customizable status workflows.',
        },
        {
          icon: <ListChecks size={24} />,
          title: 'Checklists & Subtasks',
          description: 'Break down complex tasks into manageable subtasks and checklists. Track completion progress for each item.',
        },
        {
          icon: <Tag size={24} />,
          title: 'Labels & Categories',
          description: 'Organize tasks with custom labels and color-coded categories for easy filtering and organization.',
        },
        {
          icon: <Layers size={24} />,
          title: 'Task Dependencies',
          description: 'Define task relationships and dependencies to manage complex project workflows effectively.',
        },
      ],
    },
    {
      title: 'Project Organization',
      description: 'Keep your projects structured and on track',
      gradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, transparent 100%)',
      features: [
        {
          icon: <FolderKanban size={24} />,
          title: 'Project Workspaces',
          description: 'Create dedicated workspaces for each project with custom settings, team assignments, and milestones.',
        },
        {
          icon: <Calendar size={24} />,
          title: 'Sprint Planning',
          description: 'Plan and manage agile sprints with customizable sprint templates, backlog management, and velocity tracking.',
        },
        {
          icon: <Layers size={24} />,
          title: 'Milestones',
          description: 'Set project milestones to track major deliverables and keep the team aligned on key objectives.',
        },
        {
          icon: <BarChart3 size={24} />,
          title: 'Progress Tracking',
          description: 'Visualize project progress with burndown charts, completion rates, and timeline views.',
        },
      ],
    },
    {
      title: 'Team Collaboration',
      description: 'Work together seamlessly with your team',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)',
      features: [
        {
          icon: <MessageSquare size={24} />,
          title: 'Real-time Chat',
          description: 'Communicate instantly with team members through project-specific chat channels and direct messages.',
        },
        {
          icon: <Video size={24} />,
          title: 'Team Meetings',
          description: 'Schedule and manage team meetings with agendas, notes, and action items all in one place.',
        },
        {
          icon: <Users size={24} />,
          title: 'Team Management',
          description: 'Create teams, assign roles, and manage permissions to ensure the right people have access to the right projects.',
        },
        {
          icon: <Bell size={24} />,
          title: 'Notifications',
          description: 'Stay informed with customizable notifications for task updates, mentions, and important deadlines.',
        },
      ],
    },
    {
      title: 'Time & Productivity',
      description: 'Track time and boost productivity',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)',
      features: [
        {
          icon: <Clock size={24} />,
          title: 'Time Tracking',
          description: 'Track time spent on tasks with built-in timers. Generate timesheets and billable hours reports.',
        },
        {
          icon: <BarChart3 size={24} />,
          title: 'Reports & Analytics',
          description: 'Generate detailed reports on team productivity, project progress, and resource allocation.',
        },
        {
          icon: <Paperclip size={24} />,
          title: 'File Attachments',
          description: 'Attach files and documents directly to tasks. Support for images, PDFs, and various file formats.',
        },
        {
          icon: <FileText size={24} />,
          title: 'Activity Logs',
          description: 'Complete audit trail of all activities for compliance and tracking project history.',
        },
      ],
    },
    {
      title: 'Enterprise Features',
      description: 'Advanced features for larger organizations',
      gradient: 'linear-gradient(135deg, rgba(241, 24, 76, 0.15) 0%, transparent 100%)',
      features: [
        {
          icon: <Building2 size={24} />,
          title: 'Multi-Tenancy',
          description: 'Manage multiple organizations with complete data isolation and independent configurations.',
        },
        {
          icon: <Shield size={24} />,
          title: 'Custom Roles & Permissions',
          description: 'Create custom roles with granular permissions to control access at every level.',
        },
        {
          icon: <Layers size={24} />,
          title: 'Departments & Positions',
          description: 'Organize users by department and position for better resource management and reporting.',
        },
        {
          icon: <BarChart3 size={24} />,
          title: 'Advanced Reporting',
          description: 'Custom report builder with export options for detailed business intelligence.',
        },
      ],
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="section" style={{ paddingTop: '6rem' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '3rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(241, 24, 76, 0.1)',
              border: '1px solid rgba(241, 24, 76, 0.2)',
              borderRadius: 100,
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--primary)',
            }}>
              <Sparkles size={16} />
              <span>50+ Powerful Features</span>
            </div>
            <h1 className="heading-xl">
              Powerful <span>Features</span>
            </h1>
            <p className="subtitle" style={{ maxWidth: 700 }}>
              Everything you need to manage projects, collaborate with your team, 
              and deliver exceptional results.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, catIndex) => (
        <section
          key={catIndex}
          className="section"
          style={{
            background: catIndex % 2 === 0 ? 'transparent' : 'rgba(18, 18, 26, 0.5)',
            paddingTop: catIndex === 0 ? 0 : undefined,
          }}
        >
          <div className="container">
            <div style={{ 
              marginBottom: '3rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div>
                <h2 className="heading-lg" style={{ marginBottom: '0.5rem' }}>
                  {category.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {category.description}
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}>
              {category.features.map((feature, index) => (
                <div 
                  key={index} 
                  className="card hover-lift"
                  style={{
                    background: `${category.gradient}, var(--bg-secondary)`,
                  }}
                >
                  <div className="icon-wrapper" style={{ 
                    marginBottom: '1rem',
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                  }}>
                    {feature.icon}
                  </div>
                  <h3 className="heading-sm" style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem', lineHeight: 1.6 }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(241, 24, 76, 0.1) 0%, var(--bg-secondary) 100%)',
            border: '1px solid rgba(241, 24, 76, 0.2)',
            borderRadius: 24,
            padding: '4rem 2rem',
            textAlign: 'center',
          }}>
            <h2 className="heading-lg" style={{ marginBottom: '1rem' }}>
              Ready to <span>get started</span>?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
              Start your free trial today and experience all these powerful features.
            </p>
            <Link href="/pricing" className="btn btn-primary">
              View Pricing
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
