import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '2rem'
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '450px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: '#ffffff'
          }}
        >
          <Printer size={32} />
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', margin: '0.75rem 0' }}>Page Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          The page or route you requested does not exist or has moved.
        </p>
        <Link to="/login" className="btn btn-primary">
          <Home size={16} /> Return to Homepage
        </Link>
      </div>
    </div>
  );
};
