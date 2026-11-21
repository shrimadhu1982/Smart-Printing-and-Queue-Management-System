import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Printer, XCircle, Ban, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const QueueTracker = ({ order, onCancel }) => {
  if (!order) return null;

  const steps = [
    { key: 'Pending', label: 'Order Placed', desc: 'Awaiting operator review' },
    { key: 'Accepted', label: 'In Queue', desc: 'Approved for printing' },
    { key: 'Printing', label: 'Printing', desc: 'Currently running on printer' },
    { key: 'Completed', label: 'Ready', desc: 'Available at print counter' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Accepted': return 1;
      case 'Printing': return 2;
      case 'Completed': return 3;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(order.status);
  const isFailed = order.status === 'Rejected' || order.status === 'Cancelled';

  return (
    <div className="card" style={{ border: '2px solid #e0e7ff', background: 'linear-gradient(to bottom, #ffffff, #fafbff)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {order.order_code}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Document: <strong>{order.original_filename}</strong> ({order.copies || 1} {order.copies > 1 ? 'copies' : 'copy'}, {order.color_mode?.toUpperCase()})
          </p>
        </div>

        {/* Live Queue Position & Wait Time Highlights */}
        {!isFailed && order.status !== 'Completed' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#f5f3ff', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Queue Position</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#6d28d9' }}>
                #{order.queue_position || 1}
              </div>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Est. Wait</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8' }}>
                ~{order.estimated_wait_minutes || 5} min
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Progress Bar */}
      {!isFailed ? (
        <div style={{ margin: '1.5rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', position: 'relative' }}>
            {steps.map((step, idx) => {
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              return (
                <div key={step.key} style={{ textAlign: 'center', position: 'relative' }}>
                  {/* Step Circle */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      margin: '0 auto 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      background: isPast
                        ? '#22c55e'
                        : isCurrent
                        ? '#6366f1'
                        : '#f1f5f9',
                      color: isPast || isCurrent ? '#ffffff' : '#94a3b8',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isPast ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <div style={{ fontWeight: isCurrent ? 700 : 600, fontSize: '0.85rem', color: isCurrent ? '#0f172a' : '#64748b' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: order.status === 'Rejected' ? '#fef2f2' : '#f8fafc',
            border: `1px solid ${order.status === 'Rejected' ? '#fecaca' : '#e2e8f0'}`,
            color: order.status === 'Rejected' ? '#991b1b' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          {order.status === 'Rejected' ? <XCircle size={20} /> : <Ban size={20} />}
          <div>
            <strong>Order {order.status}:</strong> {order.rejection_reason || 'This order was terminated.'}
          </div>
        </div>
      )}

      {/* Footer Info & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Total Amount: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₹{parseFloat(order.total_price).toFixed(2)}</strong>
        </div>

        {order.status === 'Pending' && onCancel && (
          <button
            onClick={() => onCancel(order.order_id)}
            className="btn btn-sm btn-danger"
          >
            Cancel Order
          </button>
        )}

        {order.status === 'Completed' && (
          <span style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} /> Ready for Pickup at Main Campus Print Desk
          </span>
        )}
      </div>
    </div>
  );
};
