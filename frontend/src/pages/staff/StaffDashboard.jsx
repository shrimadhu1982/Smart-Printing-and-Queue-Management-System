import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  Clock,
  CheckCircle2,
  ListOrdered,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';
import { staffService } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorBanner } from '../../components/ErrorBanner';

export const StaffDashboard = () => {
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
      const res = await staffService.getDashboard();
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load staff dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
        Loading staff dashboard...
      </div>
    );
  }

  const { staff, stats } = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Print Operator Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {staff?.full_name} • Assigned Desk: <strong>{staff?.counter_number || 'Counter 1'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchDashboard} className="btn btn-secondary btn-sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <Link to="/staff/orders" className="btn btn-primary btn-sm">
            <Printer size={16} /> Open Print Queue Manager
          </Link>
        </div>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      {/* KPI Counters */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Awaiting Review"
          value={stats?.pending_count || 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="New student orders"
        />
        <StatCard
          title="Accepted & In Queue"
          value={stats?.accepted_count || 0}
          icon={ListOrdered}
          color="purple"
          subtitle="Ready for print execution"
        />
        <StatCard
          title="Currently Printing"
          value={stats?.printing_count || 0}
          icon={PlayCircle}
          color="indigo"
          subtitle="Machines active"
        />
        <StatCard
          title="Completed Jobs"
          value={stats?.completed_count || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Fulfilled & ready for pickup"
        />
      </div>

      {/* Queue Volume Card */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)', border: '1px solid #ddd6fe' }}>
          <h3 className="card-title">
            <Layers size={20} color="#7c3aed" /> Active Queue Volume
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Current pending workload queued across campus high-speed laser printers:
          </p>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a' }}>
                {stats?.queue_length || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>JOBS IN QUEUE</div>
            </div>
            <div style={{ height: '40px', width: '1px', backgroundColor: '#cbd5e1' }} />
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#6366f1' }}>
                {stats?.pages_queued || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>PAGES TO PRINT</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe' }}>
          <h3 className="card-title">
            <Printer size={20} color="#2563eb" /> Operator Quick Actions
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Quickly navigate to active orders or monitor the campus-wide student queue:
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/staff/orders?status=Pending" className="btn btn-primary btn-sm">
              Process Pending Orders ({stats?.pending_count || 0})
            </Link>
            <Link to="/student/queue" className="btn btn-secondary btn-sm">
              View Public Queue Board
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
