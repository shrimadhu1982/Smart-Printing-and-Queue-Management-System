import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Printer,
  CheckCircle2,
  XCircle,
  PlayCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';
import { staffService, orderService, documentService } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ErrorBanner } from '../../components/ErrorBanner';

export const StaffOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState(initialStatus);
  const [error, setError] = useState('');

  // Rejection modal
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('File formatting or margins incompatible with print paper.');

  // Document Preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [statusTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffService.getOrders({
        status: statusTab !== 'all' ? statusTab : undefined
      });
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load print orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, reason = null) => {
    try {
      const res = await orderService.updateStatus(orderId, {
        status: newStatus,
        rejection_reason: reason
      });
      if (res.data.success) {
        fetchOrders();
        setRejectingOrder(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  const handleDocumentAction = async (documentId, inline) => {
    try {
      await documentService.download(documentId, inline);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not open this document.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    return (
      o.order_code?.toLowerCase().includes(q) ||
      o.student_name?.toLowerCase().includes(q) ||
      o.roll_number?.toLowerCase().includes(q) ||
      o.original_filename?.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { id: 'all', label: 'All Orders' },
    { id: 'Pending', label: 'Pending Review' },
    { id: 'Accepted', label: 'In Queue' },
    { id: 'Printing', label: 'Printing Now' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Rejected', label: 'Rejected' }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Print Queue Management</h1>
          <p className="page-subtitle">
            Verify print specifications, download documents, and advance job status through the queue.
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh Orders
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {tabs.map((tab) => {
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setStatusTab(tab.id);
                setSearchParams(tab.id === 'all' ? {} : { status: tab.id });
              }}
              style={{
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 500,
                border: '1px solid',
                borderColor: active ? '#6366f1' : '#e2e8f0',
                backgroundColor: active ? '#6366f1' : '#ffffff',
                color: active ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders Container */}
      <div className="card">
        {/* Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', maxWidth: '360px', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search student, roll no, order ID..."
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing <strong>{filteredOrders.length}</strong> matching print jobs
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
            Loading orders feed...
          </div>
        ) : filteredOrders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredOrders.map((ord) => (
              <div
                key={ord.order_id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  backgroundColor: ord.status === 'Printing' ? '#faf5ff' : '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Header row: Order ID, Status, Queue Position, Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {ord.order_code}
                    </span>
                    <StatusBadge status={ord.status} />
                    {ord.queue_position && ['Pending', 'Accepted', 'Printing'].includes(ord.status) && (
                      <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Queue #{ord.queue_position}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Submitted: {new Date(ord.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Main Content Grid: Student, Document, Print Specs */}
                <div className="grid-3" style={{ marginBottom: '1rem' }}>
                  {/* Col 1: Student info */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Student Details
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.student_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {ord.roll_number} • {ord.department}
                    </div>
                    {ord.student_phone && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        📞 {ord.student_phone}
                      </div>
                    )}
                  </div>

                  {/* Col 2: Document */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      File & Pages
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                      {ord.original_filename}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Doc Pages: <strong>{ord.doc_pages}</strong> • Billed Pages: <strong>{ord.total_pages_billed}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleDocumentAction(ord.document_id, true)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        <Eye size={13} /> View PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocumentAction(ord.document_id, false)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        <Download size={13} /> Download
                      </button>
                    </div>
                  </div>

                  {/* Col 3: Print Settings & Cost */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Print Specifications
                    </div>
                    <div style={{ fontWeight: 700, color: '#4f46e5' }}>
                      {ord.color_mode === 'color' ? 'Full Color' : 'Black & White'} • {ord.sides === 'double' ? 'Duplex' : 'Single Sided'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {ord.copies} {ord.copies > 1 ? 'copies' : 'copy'} • {ord.paper_size} ({ord.paper_type})
                    </div>
                    {ord.binding_type && ord.binding_type !== 'none' && (
                      <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                        Binding: {ord.binding_type.toUpperCase()}
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                      Total Amount: ₹{parseFloat(ord.total_price).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Notes or Rejection Reason */}
                {ord.special_instructions && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e', marginBottom: '0.75rem' }}>
                    <strong>Student Note:</strong> {ord.special_instructions}
                  </div>
                )}

                {ord.rejection_reason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.5rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', color: '#991b1b', marginBottom: '0.75rem' }}>
                    <strong>Rejection Reason:</strong> {ord.rejection_reason}
                  </div>
                )}

                {/* Operator Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f8fafc' }}>
                  {ord.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => setRejectingOrder(ord)}
                        className="btn btn-sm btn-danger"
                      >
                        <XCircle size={15} /> Reject Order
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.order_id, 'Accepted')}
                        className="btn btn-sm btn-primary"
                      >
                        <CheckCircle2 size={15} /> Accept Order into Queue
                      </button>
                    </>
                  )}

                  {ord.status === 'Accepted' && (
                    <>
                      <button
                        onClick={() => setRejectingOrder(ord)}
                        className="btn btn-sm btn-danger"
                      >
                        <XCircle size={15} /> Reject Order
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.order_id, 'Printing')}
                        className="btn btn-sm btn-primary"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' }}
                      >
                        <PlayCircle size={15} /> Start Printing
                      </button>
                    </>
                  )}

                  {ord.status === 'Printing' && (
                    <button
                      onClick={() => handleStatusChange(ord.order_id, 'Completed')}
                      className="btn btn-sm btn-success"
                    >
                      <CheckCircle2 size={15} /> Mark as Completed & Ready
                    </button>
                  )}

                  {ord.status === 'Completed' && (
                    <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={16} /> Ready at Counter • Fulfilled by {ord.staff_name || 'Counter Staff'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Printer size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155' }}>No Orders in Selected Tab</h4>
            <p style={{ fontSize: '0.875rem' }}>There are currently no print requests matching this filter.</p>
          </div>
        )}
      </div>

      {/* Reject Order Modal */}
      <Modal
        isOpen={!!rejectingOrder}
        onClose={() => setRejectingOrder(null)}
        title={`Reject Order: ${rejectingOrder?.order_code}`}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setRejectingOrder(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => handleStatusChange(rejectingOrder.order_id, 'Rejected', rejectionReason)}
              className="btn btn-danger"
            >
              Confirm Rejection
            </button>
          </div>
        }
      >
        {rejectingOrder && (
          <div>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              Please provide a reason for rejecting order <strong>{rejectingOrder.order_code}</strong> ({rejectingOrder.original_filename}). The student will be notified.
            </p>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea
                rows="3"
                className="form-textarea"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. PDF file is password protected, illegible scan, or paper dimensions unsupported."
                required
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
