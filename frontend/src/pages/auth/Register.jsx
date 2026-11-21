import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Printer, Eye, EyeOff, Lock, Mail, User, Phone, BookOpen, Hash, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    roll_number: '',
    department: 'Computer Science & Engineering',
    semester: 'Semester 4',
    phone: '',
    password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const departments = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Electrical & Electronics',
    'Mechanical Engineering',
    'Civil Engineering',
    'Biotechnology',
    'Business Administration (MBA)',
    'Other'
  ];

  const semesters = [
    'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
    'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const res = await register(formData);
      if (res.success) {
        navigate('/login', {
          state: { registrationSuccess: res.message || 'Account created. Please sign in.' },
        });
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to the Node.js backend. Please start it on http://localhost:5000.');
      } else {
        setError(err.response?.data?.message || 'Server error occurred during registration. Please check the backend console.');
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
        padding: '2rem 1.5rem'
      }}
    >
      <div style={{ maxWidth: '580px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
              marginBottom: '0.75rem'
            }}
          >
            <Printer size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            Student Registration
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Join the SmartPrint campus printing queue network
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.1)' }}>
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
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    name="full_name"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. Alex Johnson"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Roll / Student ID *</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    name="roll_number"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. 2024CS105"
                    value={formData.roll_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Campus Email *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="alex@campus.edu"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select
                  name="department"
                  className="form-select"
                  value={formData.department}
                  onChange={handleChange}
                >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Semester *</label>
                <select
                  name="semester"
                  className="form-select"
                  value={formData.semester}
                  onChange={handleChange}
                >
                  {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    placeholder="Min. 8 chars"
                    value={formData.password}
                    onChange={handleChange}
                    maxLength={72}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirm_password"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4f46e5', fontWeight: 700 }}>
              Sign In
            </Link>
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/" style={{ color: '#4f46e5', fontWeight: 700 }}>
                Back to welcome page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
