import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Printer, Eye, EyeOff, Lock, Mail, ShieldCheck, UserCheck, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Login = ({ defaultRole = 'student', fixedRole = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password, selectedRole);
      if (res.success) {
        if (res.user.role === 'student') navigate('/student/dashboard');
        else if (res.user.role === 'staff') navigate('/staff/dashboard');
        else if (res.user.role === 'admin') navigate('/admin/dashboard');
        else setError('The server returned an unsupported account role.');
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to the Node.js backend. Please start it on http://localhost:5000.');
      } else {
        setError(err.response?.data?.message || 'Server error occurred during login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        backgroundImage: 'radial-gradient(#e0e7ff 1.2px, transparent 1.2px), radial-gradient(#ede9fe 1.2px, #f8fafc 1.2px)',
        backgroundSize: '48px 48px',
        backgroundPosition: '0 0, 24px 24px',
        padding: '1.5rem'
      }}
    >
      <div style={{ maxWidth: '460px', width: '100%' }}>
        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
              marginBottom: '1rem'
            }}
          >
            <Printer size={30} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
            {fixedRole
              ? `${selectedRole.charAt(0).toUpperCase()}${selectedRole.slice(1)} Login`
              : <>Smart<span style={{ color: '#6366f1' }}>Print</span> Campus</>}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Automated Printing & Real-Time Queue Management
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem', boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.1)' }}>
          {location.state?.registrationSuccess && (
            <div role="status" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {location.state.registrationSuccess}
            </div>
          )}
          {!fixedRole && <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '1.5rem'
            }}
          >
            {[
              { id: 'student', label: 'Student', icon: GraduationCap },
              { id: 'staff', label: 'Staff', icon: UserCheck },
              { id: 'admin', label: 'Admin', icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = selectedRole === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(tab.id);
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: active ? 700 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>}

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1.25rem'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Campus Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder={selectedRole === 'student' ? 'student@campus.edu' : `${selectedRole}@campus.edu`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field with Toggle */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              {loading ? 'Authenticating...' : `Sign In as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            {selectedRole === 'student' && (
              <div>
                New student?{' '}
                <Link to="/register" style={{ color: '#4f46e5', fontWeight: 700 }}>
                  Create an account
                </Link>
              </div>
            )}
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/" style={{ color: '#4f46e5', fontWeight: 700 }}>
                Back 
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
