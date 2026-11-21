import React from 'react';

export const StatCard = ({ title, value, icon: Icon, color = 'indigo', subtitle }) => {
  const colorMap = {
    indigo: { bg: '#eef2ff', text: '#4f46e5' },
    purple: { bg: '#f5f3ff', text: '#7c3aed' },
    emerald: { bg: '#ecfdf5', text: '#059669' },
    amber: { bg: '#fffbeb', text: '#d97706' },
    rose: { bg: '#fff1f2', text: '#e11d48' },
    blue: { bg: '#eff6ff', text: '#2563eb' }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="stat-card">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && (
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
            {subtitle}
          </div>
        )}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper" style={{ backgroundColor: scheme.bg, color: scheme.text }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};
