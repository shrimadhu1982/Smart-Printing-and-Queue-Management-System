import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/api';
import { ErrorBanner } from '../../components/ErrorBanner';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers();
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the student directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this student account?`)) return;

    try {
      const res = await adminService.toggleUser(userId);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.roll_number?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">
            Directory of all registered college students, printing activity, and account access controls.
          </p>
        </div>
        <button onClick={fetchUsers} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh Directory
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', maxWidth: '340px', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search student, roll number, dept..."
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Students: <strong>{filteredUsers.length}</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
            Loading student directory...
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Department & Sem</th>
                  <th>Contact</th>
                  <th>Jobs Placed</th>
                  <th>Total Spent</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.student_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{u.roll_number}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Enrolled {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div>{u.department}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.semester}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{u.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.phone || 'No phone'}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#4f46e5' }}>{u.total_orders} jobs</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>₹{parseFloat(u.total_spent || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#15803d', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                          <CheckCircle2 size={13} /> Active
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                          <XCircle size={13} /> Suspended
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggle(u.student_id, u.is_active)}
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155' }}>No Students Found</h4>
            <p style={{ fontSize: '0.875rem' }}>Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};
