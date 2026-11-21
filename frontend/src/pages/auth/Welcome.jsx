import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, Printer, ShieldCheck, UserCheck } from 'lucide-react';

const accessOptions = [
  {
    role: 'STUDENT',
    description: 'Place print orders, track the queue, and manage your documents.',
    icon: GraduationCap,
    loginLabel: 'Student Login',
    loginPath: '/login',
    registerLabel: 'Student Registration',
    registerPath: '/register',
    color: '#4f46e5',
    background: '#eef2ff',
  },
  {
    role: 'ADMIN',
    description: 'Manage campus printing operations, staff accounts, and services.',
    icon: ShieldCheck,
    loginLabel: 'Admin Login',
    loginPath: '/admin/login',
    registerLabel: ' Admin Registration',
    registerPath: '/admin/register',
    color: '#7c3aed',
    background: '#f5f3ff',
  },
  {
    role: 'PRINTING STAFF',
    description: 'Process print requests and help keep the campus queue moving.',
    icon: UserCheck,
    loginLabel: 'Staff Login',
    loginPath: '/staff/login',
    color: '#0f766e',
    background: '#f0fdfa',
  },
];

export const Welcome = () => (
  <main
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #f8fafc 0%, #eef2ff 55%, #f5f3ff 100%)',
      padding: '2rem 1.5rem 3rem',
    }}
  >
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: 'clamp(3rem, 9vh, 6rem)' }}>
        <span
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff',
            boxShadow: '0 8px 18px rgba(79,70,229,0.22)',
          }}
        >
          <Printer size={24} />
        </span>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
          Smart<span style={{ color: '#6366f1' }}>Print</span>
        </span>
      </header>

      <section style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
        <div style={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.14em', marginBottom: '1rem' }}>
          CAMPUS PRINTING & QUEUE MANAGEMENT
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.12, fontWeight: 800, color: '#0f172a' }}>
          Welcome to a smarter campus print experience
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.7, margin: '1.1rem auto 0', maxWidth: '620px' }}>
          Choose your account type to sign in. Students can register, and the initial administrator can register with the secret Admin Access ID.
        </p>
      </section>

      <section
        aria-label="Choose account type"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '1.1rem',
        }}
      >
        {accessOptions.map((option) => {
          const Icon = option.icon;
          return (
            <article
              key={option.role}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '300px',
                padding: '1.6rem',
                borderRadius: '18px',
                boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '15px',
                  color: option.color,
                  background: option.background,
                  marginBottom: '1.2rem',
                }}
              >
                <Icon size={25} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em' }}>{option.role}</h2>
              <p style={{ color: '#64748b', lineHeight: 1.65, fontSize: '0.9rem', margin: '0.55rem 0 1.4rem' }}>
                {option.description}
              </p>
              <div style={{ display: 'grid', gap: '0.65rem', marginTop: 'auto' }}>
                <Link
                  to={option.loginPath}
                  className="btn btn-primary"
                  style={{ background: option.color, borderColor: option.color }}
                >
                  {option.loginLabel} <ArrowRight size={16} />
                </Link>
                {option.registerPath ? (
                  <Link
                    to={option.registerPath}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center' }}
                  >
                    {option.registerLabel}
                  </Link>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '0.55rem 0' }}>
                   
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <footer style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '2rem' }}>
        Secure access for the campus printing community
      </footer>
    </div>
  </main>
);
