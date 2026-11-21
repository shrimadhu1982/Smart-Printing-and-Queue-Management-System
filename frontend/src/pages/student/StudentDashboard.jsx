import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  PlusCircle,
  Clock,
  CheckCircle2,
  ListOrdered,
  FileText,
  IndianRupee,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import { studentService, orderService } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { QueueTracker } from '../../components/QueueTracker';
import { Modal } from '../../components/Modal';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await studentService.getDashboard();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this pending print order?')) return;
    try {
      const res = await orderService.cancelOrder(orderId);
      if (res.data.success) {
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: '#64748b' }}>Loading your student dashboard...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { student, stats, active_order, recent_orders } = data || {};

  return (
    <div>
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {student?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            {student?.department} • Roll No: {student?.roll_number}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchDashboard} className="btn btn-secondary btn-sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/student/new-order" className="btn btn-primary btn-sm">
            <PlusCircle size={16} /> New Print Order
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Orders"
          value={stats?.total_orders || 0}
          icon={FileText}
          color="indigo"
          subtitle="All time submitted"
        />
        <StatCard
          title="In Queue / Pending"
          value={stats?.pending_orders || 0}
          icon={Clock}
          color="purple"
          subtitle={stats?.current_queue_position ? `Active Position: #${stats.current_queue_position}` : 'No active print job'}
        />
        <StatCard
          title="Completed"
          value={stats?.completed_orders || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Ready / Picked up"
        />
        <StatCard
          title="Total Spent"
          value={`₹${stats?.total_spent || '0.00'}`}
          icon={IndianRupee}
          color="blue"
          subtitle="Campus print ledger"
        />
      </div>

      {/* Active Order Queue Tracker */}
      {active_order && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListOrdered size={20} color="#6366f1" /> Live Queue Tracking
            </h2>
            <Link to="/student/queue" style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Full campus queue <ArrowRight size={14} />
            </Link>
          </div>
          <QueueTracker order={active_order} onCancel={handleCancelOrder} />
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '1px solid #dbeafe' }}>
        <h3 className="card-title">Quick Student Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link
            to="/student/new-order"
            style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{ background: '#ede9fe', padding: '10px', borderRadius: '10px', color: '#7c3aed' }}>
              <PlusCircle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Upload & Print</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Configure PDF settings</div>
            </div>
          </Link>

          <Link
            to="/student/queue"
            style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '10px', color: '#4f46e5' }}>
              <ListOrdered size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Campus Queue</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Check wait time & line</div>
            </div>
          </Link>

          <Link
            to="/student/history"
            style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Order History</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Receipts & records</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Recent Print Jobs</h3>
          <Link to="/student/history" style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 600 }}>
            View all
          </Link>
        </div>

        {recent_orders && recent_orders.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Document</th>
                  <th>Print Specs</th>
                  <th>Total Cost</th>
                  <th>Queue Pos.</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.map((ord) => (
                  <tr key={ord.order_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{ord.order_code}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{ord.original_filename}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(ord.created_at).toLocaleDateString()} {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {ord.color_mode?.toUpperCase()} • {ord.sides === 'double' ? 'Duplex' : 'Single'} • {ord.copies} {ord.copies > 1 ? 'copies' : 'copy'} ({ord.paper_size})
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>₹{parseFloat(ord.total_price).toFixed(2)}</strong>
                    </td>
                    <td>
                      {['Pending', 'Accepted', 'Printing'].includes(ord.status) ? (
                        <span style={{ fontWeight: 700, color: '#6366f1' }}>#{ord.queue_position || '-'}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={ord.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '4px 8px' }}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Printer size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>No Printing Orders Yet</h4>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Upload your lecture notes, lab manuals, or assignments to place your first print job.
            </p>
            <Link to="/student/new-order" className="btn btn-primary">
              <PlusCircle size={16} /> Place First Order
            </Link>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.order_code}`}
        footer={
          <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">
            Close
          </button>
        }
      >
        {selectedOrder && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Status</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Billed</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{parseFloat(selectedOrder.total_price).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Document</div>
                <div style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{selectedOrder.original_filename}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Color & Sides</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.color_mode === 'color' ? 'Full Color' : 'Black & White'} ({selectedOrder.sides === 'double' ? 'Duplex' : 'Single-Sided'})
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Paper & Copies</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.paper_size} ({selectedOrder.copies} {selectedOrder.copies > 1 ? 'copies' : 'copy'})
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Queue Position</div>
                <div style={{ fontWeight: 600, color: '#6366f1' }}>
                  {selectedOrder.queue_position ? `#${selectedOrder.queue_position}` : 'Completed / Archival'}
                </div>
              </div>
            </div>

            {selectedOrder.status === 'Pending' && (
              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <button
                  onClick={() => {
                    handleCancelOrder(selectedOrder.order_id);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-danger btn-sm"
                >
                  Cancel This Order
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
