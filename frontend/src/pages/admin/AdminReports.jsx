import React, { useState, useEffect } from 'react';
import { PieChart, BarChart3, RefreshCw, FileText, IndianRupee, Layers } from 'lucide-react';
import { adminService } from '../../services/api';
import { ErrorBanner } from '../../components/ErrorBanner';

export const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getReports();
      if (res.data.success) {
        setReports(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate system reports.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
        Generating system reports...
      </div>
    );
  }

  const { department_stats, color_stats, paper_stats } = reports || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & System Statistics</h1>
          <p className="page-subtitle">
            Printing analytics by academic department, ink utilization, and paper format consumption.
          </p>
        </div>
        <button onClick={fetchReports} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Refresh Reports
        </button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>

      {/* Grid: Department & Color Breakdown */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Department Statistics */}
        <div className="card">
          <h3 className="card-title">
            <BarChart3 size={20} color="#4f46e5" /> Orders & Revenue by Department
          </h3>
          {department_stats && department_stats.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Jobs</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {department_stats.map((dept, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{dept.department}</strong>
                      </td>
                      <td>{dept.order_count} jobs</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>₹{parseFloat(dept.revenue || 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No department data available.
            </div>
          )}
        </div>

        {/* Color Mode & Ink Breakdown */}
        <div className="card">
          <h3 className="card-title">
            <PieChart size={20} color="#7c3aed" /> Ink Utilization (Color vs B&W)
          </h3>
          {color_stats && color_stats.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mode</th>
                    <th>Orders</th>
                    <th>Pages Printed</th>
                    <th>Total Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {color_stats.map((c, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{ fontWeight: 700, color: c.color_mode === 'color' ? '#7c3aed' : '#0f172a' }}>
                          {c.color_mode === 'color' ? 'Full Color' : 'Black & White'}
                        </span>
                      </td>
                      <td>{c.total_orders}</td>
                      <td>{c.total_pages || 0} pages</td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>₹{parseFloat(c.total_revenue || 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No ink mode data recorded.
            </div>
          )}
        </div>
      </div>

      {/* Paper Size Distribution */}
      <div className="card">
        <h3 className="card-title">
          <Layers size={20} color="#059669" /> Paper Sheet Consumption by Size
        </h3>
        {paper_stats && paper_stats.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {paper_stats.map((p, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Paper Format {p.paper_size}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                  {p.count}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Jobs Processed</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No paper size statistics available.
          </div>
        )}
      </div>
    </div>
  );
};
