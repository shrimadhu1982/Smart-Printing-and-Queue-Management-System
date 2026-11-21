import React, { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { adminService, documentService } from '../services/api';

export const DocumentLibrary = ({ admin = false }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = admin
        ? await adminService.getDocuments()
        : await documentService.getDocuments();
      setDocuments(response.data.documents || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load uploaded documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const openDocument = async (id) => {
    setOpeningId(id);
    try {
      await documentService.download(id, true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not open this PDF.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{admin ? 'Uploaded Documents' : 'My Documents'}</h1>
          <p className="page-subtitle">
            {admin
              ? 'Uploaded PDF files across the campus with their owners and page counts.'
              : 'Your uploaded PDF files and extracted page counts.'}
          </p>
        </div>
        <button onClick={loadDocuments} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading documents...</div>
        ) : documents.length ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {admin && <th>Student</th>}
                  <th>File</th>
                  <th>Pages</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((item) => (
                  <tr key={item.document_id}>
                    {admin && (
                      <td>
                        <strong>{item.student_name}</strong>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.roll_number}</div>
                      </td>
                    )}
                    <td>
                      <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <FileText size={16} color="#6366f1" /> {item.original_filename}
                      </span>
                    </td>
                    <td>{item.total_pages}</td>
                    <td>{(item.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td>{new Date(item.uploaded_at).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        disabled={openingId === item.document_id}
                        onClick={() => openDocument(item.document_id)}
                        className="btn btn-sm btn-secondary"
                      >
                        <Download size={14} /> {openingId === item.document_id ? 'Opening...' : 'Open PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No uploaded documents yet.
          </div>
        )}
      </div>
    </div>
  );
};
