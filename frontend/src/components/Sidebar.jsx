import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Printer,
  LayoutDashboard,
  PlusCircle,
  Clock,
  History,
  User,
  Users,
  UserCheck,
  Tag,
  PieChart,
  LogOut,
  Layers,
  ListOrdered,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isMobileOpen, closeMobile }) => {
  const { user, logout, isStudent, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/new-order', label: 'New Print Order', icon: PlusCircle },
    { to: '/student/queue', label: 'Queue Status', icon: ListOrdered },
    { to: '/student/history', label: 'Order History', icon: History },
    { to: '/student/documents', label: 'My Documents', icon: FileText },
    { to: '/student/profile', label: 'Student Profile', icon: User },
  ];

  const staffLinks = [
    { to: '/staff/dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { to: '/staff/orders', label: 'Order Processing', icon: Printer },
    { to: '/student/queue', label: 'Queue Board', icon: ListOrdered },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Students', icon: Users },
    { to: '/admin/staff', label: 'Staff Management', icon: UserCheck },
    { to: '/admin/orders', label: 'Orders Overview', icon: Layers },
    { to: '/admin/documents', label: 'Uploaded Documents', icon: FileText },
    { to: '/admin/pricing', label: 'Pricing Settings', icon: Tag },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: PieChart },
  ];

  let links = [];
  if (isStudent) links = studentLinks;
  else if (isStaff) links = staffLinks;
  else if (isAdmin) links = adminLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          boxShadow: '4px 0 10px rgba(0, 0, 0, 0.05)',
          transition: 'transform 0.3s ease',
          transform: isMobileOpen ? 'translateX(0)' : undefined
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.5rem 1.25rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Printer size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Smart<span style={{ color: '#818cf8' }}>Print</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Campus Queue System
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '1.25rem 0.75rem', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0.75rem 0.5rem' }}>
            Menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMobile}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#1e293b' : 'transparent',
                    borderLeft: isActive ? '4px solid #818cf8' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  })}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout Footer */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid #1e293b',
            backgroundColor: '#090d16'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.full_name || 'Campus User'}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#818cf8', textTransform: 'capitalize', fontWeight: 600 }}>
                {user?.role} {user?.roll_number ? `(${user.roll_number})` : ''}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
