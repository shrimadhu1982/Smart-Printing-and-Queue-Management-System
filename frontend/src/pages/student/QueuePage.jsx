import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Clock,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { orderService, studentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { QueueTracker } from '../../components/QueueTracker';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorBanner } from '../../components/ErrorBanner';

export const QueuePage = () => {
  const { user, isStudent } = useAuth();
  const [queue, setQueue] = useState([]);
  const [activeUserOrder, setActiveUserOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueueData();
    // Refresh queue every 15 seconds
    const interval = setInterval(fetchQueueData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    setError('');
    try {
      const res = await orderService.getQueue();
      if (res.data.success) {
        setQueue(res.data.queue || []);
      }

      if (isStudent) {
        const dashRes = await studentService.getDashboard();
        if (dashRes.data.success) {
          setActiveUserOrder(dashRes.data.active_order);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the campus queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this pending order?')) return;
    try {
      const res = await orderService.cancelOrder(orderId);
      if (res.data.success) {
        fetchQueueData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  const filteredQueue = queue.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.order_code?.toLowerCase().includes(q) ||
      item.original_filename?.toLowerCase().includes(q) ||
      item.student_name?.toLowerCase().includes(q) ||
      item.roll_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Printing Queue</h1>
          <p className="page-subtitle">
            Real-time queue monitoring, estimated wait times, and job execution status.
          </p>
        </div>
        <button onClick={fetchQueueData} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh Queue
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      {/* If current user has an active order, show their dedicated Tracker banner */}
      {isStudent && activeUserOrder && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'inline-block' }}></span>
            Your Active Print Job
          </div>
          <QueueTracker order={activeUserOrder} onCancel={handleCancelOrder} />
        </div>
      )}

      {/* Main Campus Queue Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              <ListOrdered size={20} color="#6366f1" /> Live Queue Feed ({queue.length} active print jobs)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Auto-refreshes periodically • Ordered by priority and queue position
            </span>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Order ID, Name..."
              className="form-input"
              style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', fontSize: '0.85rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
            Loading campus queue...
          </div>
        ) : filteredQueue.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Pos.</th>
                  <th>Order Code</th>
                  <th>Student</th>
                  <th>Document</th>
                  <th>Print Specs</th>
                  <th>Est. Wait</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => {
                  const isMine = user && (item.student_name === user.full_name || item.roll_number === user.roll_number);
                  return (
                    <tr
                      key={item.queue_id}
                      style={{
                        backgroundColor: isMine ? '#f5f3ff' : undefined,
                        fontWeight: isMine ? 600 : 400
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: item.position === 1 ? '#4f46e5' : '#f1f5f9',
                            color: item.position === 1 ? '#ffffff' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {item.position}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{item.order_code}</strong>
                        {isMine && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            YOU
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ color: '#0f172a' }}>{item.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {item.roll_number} • {item.department}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#334155' }}>{item.original_filename}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {item.color_mode?.toUpperCase()} • {item.sides === 'double' ? 'Duplex' : 'Single'} ({item.copies} {item.copies > 1 ? 'copies' : 'copy'}, {item.paper_size})
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Clock size={14} /> ~{item.estimated_wait_minutes} min
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontWeight: 700, color: '#0f172a' }}>No Print Jobs Currently in Queue</h4>
            <p style={{ fontSize: '0.875rem' }}>All campus printing machines are ready for new requests.</p>
          </div>
        )}
      </div>
    </div>
  );
};
