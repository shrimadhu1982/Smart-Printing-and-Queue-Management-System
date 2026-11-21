import React, { useState, useEffect } from 'react';
import { Menu, Bell, Printer, User, LogOut, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { studentService } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar = ({ toggleMobile }) => {
  const { user, logout, isStudent } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    if (isStudent) {
      loadNotifications();
    }
  }, [isStudent]);

  const loadNotifications = async () => {
    setNotificationError('');
    try {
      const res = await studentService.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        const unread = (res.data.notifications || []).filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      setNotificationError(error.response?.data?.message || 'Could not load notifications.');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await studentService.markNotificationRead(id);
      loadNotifications();
    } catch (error) {
      setNotificationError(error.response?.data?.message || 'Could not update this notification.');
    }
  };

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={toggleMobile}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: '#334155'
          }}
          className="mobile-toggle-btn"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              display: 'inline-block'
            }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Campus Printers: <strong>Operational</strong>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Link to Public Queue View */}
        <Link
          to="/student/queue"
          className="btn btn-sm btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
        >
          <Printer size={15} />
          <span>Live Queue</span>
        </Link>

        {/* Notifications Dropdown (for Student) */}
        {isStudent && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  zIndex: 50,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  Notifications ({unreadCount} new)
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {notificationError && (
                    <div role="alert" style={{ padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.8rem' }}>
                      {notificationError}
                    </div>
                  )}
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.notification_id}
                        onClick={() => handleMarkRead(n.notification_id)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f8fafc',
                          backgroundColor: n.is_read ? '#ffffff' : '#faf5ff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {n.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
            }}
          >
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
              {user?.full_name}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
