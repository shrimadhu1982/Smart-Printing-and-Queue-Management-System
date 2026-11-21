import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Layers,
  IndianRupee,
  Clock,
  CheckCircle2,
  RefreshCw,
  Tag,
  PieChart,
  ArrowRight,
  TrendingUp,
  Printer
} from 'lucide-react';
import { adminService } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorBanner } from '../../components/ErrorBanner';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getDashboard();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load administrator metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
        Loading administrator metrics...
      </div>
    );
  }

  const { metrics, status_distribution, print_types, recent_orders } = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus System Administration</h1>
          <p className="page-subtitle">
            System overview, infrastructure status, users, printing pricing, and revenue analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchDashboard} className="btn btn-secondary btn-sm">
            <RefreshCw size={15} /> Refresh Data
          </button>
          <Link to="/admin/pricing" className="btn btn-primary btn-sm">
            <Tag size={15} /> Configure Print Pricing
          </Link>
        </div>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      {/* KPI Stats */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Students"
          value={metrics?.total_students || 0}
          icon={Users}
          color="indigo"
          subtitle="Enrolled accounts"
        />
        <StatCard
          title="Staff Operators"
          value={metrics?.total_staff || 0}
          icon={UserCheck}
          color="purple"
          subtitle="Assigned to counters"
        />
        <StatCard
          title="Total Print Jobs"
          value={metrics?.total_orders || 0}
          icon={Layers}
          color="blue"
          subtitle={`${metrics?.pending_orders || 0} pending / ${metrics?.completed_orders || 0} completed`}
        />
        <StatCard
          title="Total Campus Revenue"
          value={`₹${metrics?.total_revenue?.toFixed(2) || '0.00'}`}
          icon={IndianRupee}
          color="emerald"
          subtitle="Gross print collections"
        />
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Status Distribution */}
        <div className="card">
          <h3 className="card-title">
            <TrendingUp size={20} color="#4f46e5" /> Order Fulfillment Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {status_distribution && status_distribution.length > 0 ? (
              status_distribution.map((item) => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatusBadge status={item.status} />
                    <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>{item.count} orders</span>
                  </div>
                  <strong style={{ color: '#0f172a' }}>₹{parseFloat(item.revenue || 0).toFixed(2)}</strong>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No orders recorded yet.</div>
            )}
          </div>
        </div>

        {/* Popular Print Options */}
        <div className="card">
          <h3 className="card-title">
            <Printer size={20} color="#7c3aed" /> Print Configuration Usage
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {print_types && print_types.length > 0 ? (
              print_types.map((pt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                      {pt.color_mode === 'color' ? 'Color' : 'B&W'} • {pt.sides === 'double' ? 'Duplex' : 'Single'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({pt.paper_size})</span>
                  </div>
                  <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    {pt.count} jobs
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No print preference data.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Recent System Activity</h3>
          <Link to="/admin/orders" style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all orders <ArrowRight size={14} />
          </Link>
        </div>

        {recent_orders && recent_orders.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Document</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent_orders.map((ord) => (
                  <tr key={ord.order_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{ord.order_code}</strong>
                    </td>
                    <td>{ord.student_name}</td>
                    <td>{ord.department}</td>
                    <td>{ord.original_filename}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>₹{parseFloat(ord.total_price).toFixed(2)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={ord.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(ord.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
            No recent activity recorded.
          </div>
        )}
      </div>
    </div>
  );
};
