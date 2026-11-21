import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck,
  FileText,
  Trash2,
  Printer,
  Copy,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { documentService, orderService } from '../../services/api';
import { Modal } from '../../components/Modal';
import { ErrorBanner } from '../../components/ErrorBanner';

export const NewOrder = () => {
  const navigate = useNavigate();

  // Upload State
  const [file, setFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Print Settings State
  const [settings, setSettings] = useState({
    color_mode: 'bw', // 'bw' | 'color'
    sides: 'single', // 'single' | 'double'
    copies: 1,
    paper_size: 'A4', // 'A4' | 'A3'
    paper_type: 'standard', // 'standard' | 'premium' | 'glossy'
    orientation: 'portrait', // 'portrait' | 'landscape'
    page_range: 'all',
    binding_type: 'none' // 'none' | 'staple' | 'spiral' | 'hardbound'
  });

  const [customRange, setCustomRange] = useState('');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'custom'
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Pricing Quote State
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [pricingError, setPricingError] = useState('');

  // Order Placement & Success Modal
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => () => {
    if (uploadedDoc?.preview_url) URL.revokeObjectURL(uploadedDoc.preview_url);
  }, [uploadedDoc]);

  // Recalculate cost whenever settings, range, or uploaded document changes
  useEffect(() => {
    if (uploadedDoc) {
      calculateCost();
    }
  }, [settings, uploadedDoc, rangeMode, customRange]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    setUploadError('');
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported. Please select a valid .pdf document.');
      return;
    }

    if (selectedFile.size > 10485760) {
      setUploadError('File size exceeds the 10 MB limit.');
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await documentService.upload(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      if (res.data.success) {
        const document = { ...res.data.document };
        try {
          document.preview_url = await documentService.getPreviewUrl(document.document_id);
        } catch {
          setUploadError('PDF uploaded, but preview could not be loaded.');
        }
        setUploadedDoc(document);
      } else {
        setUploadError(res.data.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Error occurred while uploading the document.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = () => {
    if (uploadedDoc?.preview_url) URL.revokeObjectURL(uploadedDoc.preview_url);
    setFile(null);
    setUploadedDoc(null);
    setPricingBreakdown(null);
    setUploadProgress(0);
    setUploadError('');
  };

  const calculateCost = async () => {
    if (!uploadedDoc) return;
    setCalculatingPrice(true);
    setPricingError('');
    setPricingBreakdown(null);

    const payloadSettings = {
      ...settings,
      page_range: rangeMode === 'all' ? 'all' : customRange
    };

    try {
      const res = await orderService.calculateQuote({
        document_id: uploadedDoc.document_id,
        settings: payloadSettings
      });

      if (res.data.success) {
        setPricingBreakdown(res.data.pricing_breakdown);
      } else {
        setPricingError(res.data.message || 'Could not calculate the print price.');
      }
    } catch (err) {
      setPricingError(err.response?.data?.message || 'Could not calculate the print price.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCopiesChange = (delta) => {
    setSettings((prev) => ({
      ...prev,
      copies: Math.max(1, Math.min(100, prev.copies + delta))
    }));
  };

  const handlePlaceOrder = async () => {
    if (!uploadedDoc) {
      alert('Please upload a PDF document first.');
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await orderService.createOrder({
        document_id: uploadedDoc.document_id,
        settings: {
          ...settings,
          page_range: rangeMode === 'all' ? 'all' : customRange
        },
        special_instructions: specialInstructions
      });

      if (res.data.success) {
        setOrderSuccess(res.data.order);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place print order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">New Print Order</h1>
          <p className="page-subtitle">
            Upload document, choose options, check real-time cost, and submit to the campus printing queue.
          </p>
        </div>
        <ErrorBanner>{pricingError}</ErrorBanner>
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        {/* Left Column (2 Cols): Upload & Settings */}
        <div style={{ gridColumn: 'span 2' }}>
          {/* 1. Document Upload Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title">
              <UploadCloud size={20} color="#6366f1" /> 1. Upload PDF Document
            </h3>

            {!uploadedDoc ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
                onClick={() => document.getElementById('pdf-upload-input').click()}
              >
                <input
                  id="pdf-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelected(e.target.files[0])}
                />

                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}
                >
                  <UploadCloud size={28} />
                </div>

                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                  Click to upload or drag & drop PDF here
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Supports PDF files up to 10 MB
                </div>

                {uploading && (
                  <div style={{ marginTop: '1.25rem', maxWidth: '300px', margin: '1.25rem auto 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, marginBottom: '0.35rem' }}>
                      <span>Reading pages & uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: '#6366f1',
                          width: `${uploadProgress}%`,
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <FileCheck size={26} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {uploadedDoc.original_filename}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Size: {uploadedDoc.file_size_formatted} • Detected Total Pages:{' '}
                      <strong style={{ color: '#4f46e5' }}>{uploadedDoc.total_pages} pages</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="btn btn-sm btn-secondary"
                    title="Preview Document"
                  >
                    <Eye size={15} /> Preview
                  </button>
                  <button
                    onClick={handleRemoveDocument}
                    className="btn btn-sm btn-danger"
                    title="Remove and replace file"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div style={{ marginTop: '0.75rem', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={15} /> {uploadError}
              </div>
            )}
          </div>

          {/* 2. Print Settings Card */}
          <div className="card">
            <h3 className="card-title">
              <Printer size={20} color="#6366f1" /> 2. Print Preferences & Settings
            </h3>

            {/* Color Mode Selection */}
            <div className="form-group">
              <label className="form-label">Color Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleSettingChange('color_mode', 'bw')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: `2px solid ${settings.color_mode === 'bw' ? '#6366f1' : '#e2e8f0'}`,
                    backgroundColor: settings.color_mode === 'bw' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Black & White (Monochrome)</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Economical, best for lecture notes & assignments</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSettingChange('color_mode', 'color')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: `2px solid ${settings.color_mode === 'color' ? '#6366f1' : '#e2e8f0'}`,
                    backgroundColor: settings.color_mode === 'color' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Full Color Laser</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>High vibrancy, best for charts, diagrams & posters</div>
                </button>
              </div>
            </div>

            {/* Sides Selection */}
            <div className="form-group">
              <label className="form-label">Print Sides (Duplex)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleSettingChange('sides', 'single')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: `2px solid ${settings.sides === 'single' ? '#6366f1' : '#e2e8f0'}`,
                    backgroundColor: settings.sides === 'single' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Single-Sided (Simplex)</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>One printed side per physical paper sheet</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSettingChange('sides', 'double')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: `2px solid ${settings.sides === 'double' ? '#6366f1' : '#e2e8f0'}`,
                    backgroundColor: settings.sides === 'double' ? '#f5f3ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Double-Sided (Duplex)</div>
                  <div style={{ fontSize: '0.8rem', color: '#16a34a' }}>Eco-friendly & discounted cost per page</div>
                </button>
              </div>
            </div>

            {/* Number of Copies & Paper Size */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Number of Copies</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleCopiesChange(-1)}
                    className="btn btn-secondary"
                    style={{ width: '40px', height: '40px', padding: 0 }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.copies}
                    onChange={(e) => handleSettingChange('copies', Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopiesChange(1)}
                    className="btn btn-secondary"
                    style={{ width: '40px', height: '40px', padding: 0 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Paper Size</label>
                <select
                  className="form-select"
                  value={settings.paper_size}
                  onChange={(e) => handleSettingChange('paper_size', e.target.value)}
                >
                  <option value="A4">A4 (Standard 210 x 297 mm)</option>
                  <option value="A3">A3 (Large 297 x 420 mm - Architectural/Drawings)</option>
                </select>
              </div>
            </div>

            {/* Paper Type & Orientation */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Paper Type / Quality</label>
                <select
                  className="form-select"
                  value={settings.paper_type}
                  onChange={(e) => handleSettingChange('paper_type', e.target.value)}
                >
                  <option value="standard">Standard 75 GSM (Daily Print)</option>
                  <option value="premium">Premium 100 GSM Bond (Project Reports)</option>
                  <option value="glossy">Glossy Photo / Cardstock 200 GSM</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Orientation</label>
                <select
                  className="form-select"
                  value={settings.orientation}
                  onChange={(e) => handleSettingChange('orientation', e.target.value)}
                >
                  <option value="portrait">Portrait (Vertical)</option>
                  <option value="landscape">Landscape (Horizontal)</option>
                </select>
              </div>
            </div>

            {/* Page Range */}
            <div className="form-group">
              <label className="form-label">Page Range</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="range_type"
                    checked={rangeMode === 'all'}
                    onChange={() => {
                      setRangeMode('all');
                      handleSettingChange('page_range', 'all');
                    }}
                  />
                  <span>All Pages {uploadedDoc ? `(1 to ${uploadedDoc.total_pages})` : ''}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="range_type"
                    checked={rangeMode === 'custom'}
                    onChange={() => setRangeMode('custom')}
                  />
                  <span>Custom Page Range</span>
                </label>
              </div>

              {rangeMode === 'custom' && (
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1-5, 8, 11-14"
                    value={customRange}
                    onChange={(e) => {
                      setCustomRange(e.target.value);
                      handleSettingChange('page_range', e.target.value);
                    }}
                  />
                  <div className="form-helper">
                    Specify comma-separated pages or page ranges (e.g. 1-3, 5).
                  </div>
                </div>
              )}
            </div>

            {/* Binding Options */}
            <div className="form-group">
              <label className="form-label">Post-Print Binding (Optional)</label>
              <select
                className="form-select"
                value={settings.binding_type}
                onChange={(e) => handleSettingChange('binding_type', e.target.value)}
              >
                <option value="none">None (Loose Printed Sheets)</option>
                <option value="staple">Corner Staple (+₹5 per copy)</option>
                <option value="spiral">Spiral Comb Binding with Plastic Covers (+₹30 per copy)</option>
                <option value="hardbound">Hardbound Thesis / Project Book Binding (+₹150 per copy)</option>
              </select>
            </div>

            {/* Special Instructions for Operator */}
            <div className="form-group">
              <label className="form-label">Notes for Operator (Optional)</label>
              <textarea
                rows="2"
                className="form-textarea"
                placeholder="e.g. Please staple top-left corner, or handle with care for final year project submission."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Dynamic Cost & Order Confirmation */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '90px', border: '2px solid #e0e7ff' }}>
            <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
              <Sparkles size={18} color="#7c3aed" /> Dynamic Cost Summary
            </h3>

            {uploadedDoc ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Pages selected:</span>
                    <strong style={{ color: '#0f172a' }}>{pricingBreakdown?.pages_to_print || uploadedDoc.total_pages} pages</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Number of copies:</span>
                    <strong style={{ color: '#0f172a' }}>{settings.copies} {settings.copies > 1 ? 'copies' : 'copy'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Total billed pages:</span>
                    <strong style={{ color: '#0f172a' }}>{pricingBreakdown?.total_pages_billed || '-'} pages</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Physical paper sheets:</span>
                    <strong style={{ color: '#0f172a' }}>{pricingBreakdown?.total_sheets ?? '-'} sheets</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Base rate per page:</span>
                    <span>₹{pricingBreakdown?.base_price_per_page?.toFixed(2) || '0.00'}</span>
                  </div>

                  {pricingBreakdown?.paper_surcharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Paper surcharge ({settings.paper_type}):</span>
                      <span>+₹{pricingBreakdown.paper_surcharge.toFixed(2)}</span>
                    </div>
                  )}

                  {pricingBreakdown?.binding_price > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Binding ({settings.binding_type}):</span>
                      <span>+₹{pricingBreakdown.binding_price.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: '2px dashed #e2e8f0',
                    paddingTop: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Estimated Total:</span>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dynamic backend calculation</div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4f46e5' }}>
                    ₹{pricingBreakdown ? pricingBreakdown.total_price.toFixed(2) : '0.00'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || calculatingPrice || !pricingBreakdown}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  {placingOrder ? 'Submitting to Queue...' : 'Confirm & Place Order'}
                  {!placingOrder && <ArrowRight size={18} />}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                <FileText size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ fontSize: '0.875rem' }}>
                  Upload a PDF above to compute live cost and place your order.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview: ${uploadedDoc?.original_filename}`}
        maxWidth="800px"
        footer={
          <button onClick={() => setPreviewOpen(false)} className="btn btn-secondary">
            Close Preview
          </button>
        }
      >
        {uploadedDoc && (
          <div>
            <iframe
              src={uploadedDoc.preview_url}
              style={{ width: '100%', height: '550px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              title="PDF Preview"
            />
          </div>
        )}
      </Modal>

      {/* Order Placement Success Modal */}
      <Modal
        isOpen={!!orderSuccess}
        onClose={() => {
          setOrderSuccess(null);
          navigate('/student/queue');
        }}
        title="Print Order Placed Successfully!"
        footer={
          <button
            onClick={() => {
              setOrderSuccess(null);
              navigate('/student/queue');
            }}
            className="btn btn-primary"
          >
            Track in Queue <ArrowRight size={16} />
          </button>
        }
      >
        {orderSuccess && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Order Code: {orderSuccess.order_code}
            </h3>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your document has been sent to the campus printing queue.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', textAlign: 'left', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Assigned Queue Position</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#6366f1' }}>
                  #{orderSuccess.queue_position}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Estimated Wait Time</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  ~{orderSuccess.estimated_wait_minutes} minutes
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
