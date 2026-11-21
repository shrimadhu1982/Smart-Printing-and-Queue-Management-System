import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, Hash, CheckCircle2, Save } from 'lucide-react';
import { studentService } from '../../services/api';

export const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    department: '',
    semester: ''
  });

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

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await studentService.getProfile();
      if (res.data.success) {
        setProfile(res.data.profile);
        setFormData({
          phone: res.data.profile.phone || '',
          department: res.data.profile.department || departments[0],
          semester: res.data.profile.semester || semesters[0]
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await studentService.updateProfile(formData);
      if (res.data.success) {
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile</h1>
          <p className="page-subtitle">Manage your campus printing identity and contact preferences.</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="card">
        {/* Profile Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
            }}
          >
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'S'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{profile?.full_name}</h2>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Roll Number: <strong style={{ color: '#0f172a' }}>{profile?.roll_number}</strong> • Registered: {new Date(profile?.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={profile?.full_name || ''} disabled style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
              <div className="form-helper">Name is fixed as per college enrollment.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number / Student ID</label>
              <input type="text" className="form-input" value={profile?.roll_number || ''} disabled style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
              <div className="form-helper">Unique institutional identifier.</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Campus Email</label>
              <input type="email" className="form-input" value={profile?.email || ''} disabled style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
              <div className="form-helper">Used for login and order alerts.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Current Semester</label>
              <select
                className="form-select"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                {semesters.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
