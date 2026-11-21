import React, { useState, useEffect } from 'react';
import { Search, Filter, History, Eye, RefreshCw, FileText, Ban } from 'lucide-react';
import { orderService } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ErrorBanner } from '../../components/ErrorBanner';

export const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderService.getOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load order history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this pending order?')) return;
    try {
      const res = await orderService.cancelOrder(id);
      if (res.data.success) {
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    return (
      o.order_code?.toLowerCase().includes(q) ||
      o.original_filename?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">
            Review past submissions, receipts, specifications, and print fulfillment status.
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      <div className="card">
        {/* Search and Filters Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by Order ID or Document..."
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#64748b" />
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Printing">Printing</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
            Loading order records...
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Document</th>
                  <th>Date & Time</th>
                  <th>Print Settings</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord.order_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{ord.order_code}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{ord.original_filename}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {ord.doc_pages} pages • {ord.file_size_bytes ? `${Math.round(ord.file_size_bytes / 1024)} KB` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {ord.color_mode?.toUpperCase()} • {ord.sides === 'double' ? 'Duplex' : 'Single'} ({ord.copies} {ord.copies > 1 ? 'copies' : 'copy'}, {ord.paper_size})
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>₹{parseFloat(ord.total_price).toFixed(2)}</strong>
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
                        <Eye size={15} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <History size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155' }}>No Orders Found</h4>
            <p style={{ fontSize: '0.875rem' }}>No printing orders match the selected filter or search keyword.</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.order_code}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              {selectedOrder?.status === 'Pending' && (
                <button
                  onClick={() => handleCancel(selectedOrder.order_id)}
                  className="btn btn-sm btn-danger"
                >
                  <Ban size={15} /> Cancel Order
                </button>
              )}
            </div>
            <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">
              Close
            </button>
          </div>
        }
      >
        {selectedOrder && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Status</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Billed</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{parseFloat(selectedOrder.total_price).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Document</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.original_filename}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Color & Duplex</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.color_mode === 'color' ? 'Color Laser' : 'Black & White'} ({selectedOrder.sides === 'double' ? 'Duplex' : 'Single-Sided'})
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Paper Size & Type</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.paper_size} • {selectedOrder.paper_type}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Copies & Pages</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.copies} {selectedOrder.copies > 1 ? 'copies' : 'copy'} ({selectedOrder.total_pages_billed || selectedOrder.doc_pages} pages billed)
                </div>
              </div>
            </div>

            {selectedOrder.special_instructions && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  Special Instructions
                </div>
                <div style={{ fontSize: '0.85rem', color: '#78350f', marginTop: '0.2rem' }}>
                  {selectedOrder.special_instructions}
                </div>
              </div>
            )}

            {selectedOrder.rejection_reason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
                  Rejection Reason
                </div>
                <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '0.2rem' }}>
                  {selectedOrder.rejection_reason}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
