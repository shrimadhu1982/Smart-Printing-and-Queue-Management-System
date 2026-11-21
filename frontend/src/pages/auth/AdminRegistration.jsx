import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Mail, Printer, User } from 'lucide-react';
import { authService } from '../../services/api';

export const AdminRegistration = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    admin_access_id: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...registration } = formData;
      const response = await authService.registerInitialAdmin(registration);
      if (response.data.success) {
        setFormData((current) => ({ ...current, admin_access_id: '' }));
        navigate('/admin/login', {
          state: { registrationSuccess: response.data.message || 'Admin account created. Please sign in.' },
        });
      } else {
        setError(response.data.message || 'Admin registration failed.');
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        (requestError.response
          ? 'Admin registration failed. Please review your details and try again.'
          : 'Cannot connect to the Node.js backend. Please try again when it is available.')
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { paddingLeft: '2.5rem' };
  const iconStyle = {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#e0e7ff 1.2px, transparent 1.2px), radial-gradient(#ede9fe 1.2px, #f8fafc 1.2px)',
        backgroundSize: '48px 48px',
        backgroundPosition: '0 0, 24px 24px',
        padding: '2rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)',
              marginBottom: '0.75rem',
            }}
          >
            <Printer size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Admin Registration</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Create the initial administrator account using your Admin Access ID.
          </p>
        </div>

        <section className="card" style={{ padding: '2rem', boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.1)' }}>
          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-full-name">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={iconStyle} />
                <input
                  id="admin-full-name"
                  name="full_name"
                  type="text"
                  className="form-input"
                  style={inputStyle}
                  value={formData.full_name}
                  onChange={handleChange}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={iconStyle} />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  className="form-input"
                  style={inputStyle}
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={100}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-access-id">Secret Admin Access ID *</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={iconStyle} />
                <input
                  id="admin-access-id"
                  name="admin_access_id"
                  type="password"
                  className="form-input"
                  style={inputStyle}
                  value={formData.admin_access_id}
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={iconStyle} />
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    className="form-input"
                    style={inputStyle}
                    value={formData.password}
                    onChange={handleChange}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-confirm-password">Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={iconStyle} />
                  <input
                    id="admin-confirm-password"
                    name="confirm_password"
                    type="password"
                    className="form-input"
                    style={inputStyle}
                    value={formData.confirm_password}
                    onChange={handleChange}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Admin Account'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.25rem', fontSize: '0.9rem' }}>
            <Link to="/admin/login" style={{ color: '#4f46e5', fontWeight: 600 }}>
              Admin Login
            </Link>
            <Link to="/" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowLeft size={15} /> Welcome page
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
