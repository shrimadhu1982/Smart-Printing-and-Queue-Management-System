import React from 'react';

export const ErrorBanner = ({ children }) => (
  children ? (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        marginBottom: '1rem',
      }}
    >
      {children}
    </div>
  ) : null
);
