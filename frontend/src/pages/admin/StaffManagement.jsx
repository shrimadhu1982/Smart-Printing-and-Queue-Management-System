import React, { useEffect, useState } from 'react';
import { RefreshCw, UserCheck, UserPlus } from 'lucide-react';
import { adminService } from '../../services/api';
import { Modal } from '../../components/Modal';
import { ErrorBanner } from '../../components/ErrorBanner';

const emptyForm = {
  full_name: '',
  staff_code: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
};

export const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingStaffId, setUpdatingStaffId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await adminService.getStaff();
      if (res.data.success) {
        setStaffList(res.data.staff || []);
      } else {
        setLoadError(res.data.message || 'Could not load staff accounts.');
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load staff accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (staff) => {
    const nextStatus = !staff.is_active;
    const action = nextStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} '${staff.full_name}'?`)) return;

    setUpdatingStaffId(staff.staff_id);
    setLoadError('');
    setSuccessMessage('');
    try {
      const res = await adminService.updateStaffStatus(staff.staff_id, nextStatus);
      if (!res.data.success) {
        setLoadError(res.data.message || `Could not ${action} staff account.`);
        return;
      }
      setSuccessMessage(res.data.message);
      await fetchStaff();
    } catch (err) {
      setLoadError(err.response?.data?.message || `Could not ${action} staff account.`);
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      const { confirm_password, ...staffData } = formData;
      const res = await adminService.createStaff(staffData);
      if (!res.data.success) {
        setError(res.data.message || 'Could not create staff account.');
        return;
      }
      setFormData(emptyForm);
      setCreateModalOpen(false);
      setSuccessMessage('Staff account created successfully.');
      await fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create staff account.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Create staff accounts and manage their access.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchStaff} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => {
              setError('');
              setCreateModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={16} /> Add Staff
          </button>
        </div>
      </div>
      <ErrorBanner>{loadError}</ErrorBanner>
      {successMessage && (
        <div role="status" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {successMessage}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            Loading staff accounts...
          </div>
        ) : staffList.length ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name / Staff ID</th>
                  <th>Email & Phone</th>
                  <th>Counter Desk</th>
                  <th>Jobs Fulfilled</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.staff_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{staff.full_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{staff.staff_code}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{staff.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{staff.phone || 'No phone'}</div>
                    </td>
                    <td>{staff.counter_number}</td>
                    <td>{staff.processed_orders} orders</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: staff.is_active ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleStatusChange(staff)}
                        disabled={updatingStaffId === staff.staff_id}
                        className={`btn btn-sm ${staff.is_active ? 'btn-danger' : 'btn-secondary'}`}
                      >
                        {updatingStaffId === staff.staff_id
                          ? 'Saving...'
                          : staff.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <UserCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155' }}>No Staff Members Found</h4>
            <p style={{ fontSize: '0.875rem' }}>Add a staff account to get started.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register Staff Account"
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="create-staff-form" type="submit" disabled={creating} className="btn btn-primary">
              {creating ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        }
      >
        <form id="create-staff-form" onSubmit={handleCreateSubmit}>
          {error && (
            <div role="alert" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="staff-full-name">Full Name *</label>
            <input id="staff-full-name" name="full_name" type="text" className="form-input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} maxLength={100} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-code">Staff ID *</label>
            <input id="staff-code" name="staff_code" type="text" className="form-input" value={formData.staff_code} onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })} maxLength={50} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-email">Email *</label>
            <input id="staff-email" name="email" type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} maxLength={100} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-phone">Phone Number *</label>
            <input id="staff-phone" name="phone" type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} maxLength={20} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-password">Password *</label>
            <input id="staff-password" name="password" type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} minLength={8} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="staff-confirm-password">Confirm Password *</label>
            <input id="staff-confirm-password" name="confirm_password" type="password" className="form-input" value={formData.confirm_password} onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} minLength={8} required />
          </div>
        </form>
      </Modal>
    </div>
  );
};
