import React, { useState, useEffect } from 'react';
import { Layers, Search, Filter, RefreshCw, Eye, Download } from 'lucide-react';
import { adminService, documentService } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { ErrorBanner } from '../../components/ErrorBanner';

export const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getOrders();
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load campus orders.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      o.order_code?.toLowerCase().includes(q) ||
      o.student_name?.toLowerCase().includes(q) ||
      o.roll_number?.toLowerCase().includes(q) ||
      o.original_filename?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDocumentAction = async (documentId) => {
    try {
      await documentService.download(documentId, true);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not open this document.');
    }
  };

  const totalRevenue = filteredOrders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Campus Printing Orders</h1>
          <p className="page-subtitle">
            System-wide audit trail of all student submissions, billing, and fulfillment operations.
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      <div className="card">
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search Order ID, Student, Roll..."
                className="form-input"
                style={{ paddingLeft: '2.2rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Filtered Orders Value:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{totalRevenue.toFixed(2)} ({filteredOrders.length} jobs)
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
            Loading orders audit trail...
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Student & Roll</th>
                  <th>Document</th>
                  <th>Print Specs</th>
                  <th>Amount</th>
                  <th>Staff Handled</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord.order_id}>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{ord.order_code}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{ord.student_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {ord.roll_number} • {ord.department}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#334155' }}>{ord.original_filename}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {ord.total_pages_billed || ord.doc_pages} pages
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
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {ord.staff_name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={ord.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <Layers size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontWeight: 700, color: '#334155' }}>No Orders Found</h4>
            <p style={{ fontSize: '0.875rem' }}>No orders match your filter criteria.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Audit Record: ${selectedOrder?.order_code}`}
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
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Billed Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{parseFloat(selectedOrder.total_price).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Student</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.student_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedOrder.roll_number}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Document</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedOrder.original_filename}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedOrder.doc_pages} pages</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Print Specs</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.color_mode?.toUpperCase()} • {selectedOrder.sides} • {selectedOrder.paper_size}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Processed By Staff</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedOrder.staff_name || 'Pending assignment'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDocumentAction(selectedOrder.document_id)}
                className="btn btn-sm btn-secondary"
              >
                <Eye size={14} /> Open Uploaded PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
