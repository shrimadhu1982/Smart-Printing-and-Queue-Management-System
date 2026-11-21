import React, { useState, useEffect } from 'react';
import { Tag, Save, RefreshCw, CheckCircle2, AlertCircle, Info, IndianRupee } from 'lucide-react';
import { adminService } from '../../services/api';

export const PricingManagement = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await adminService.getPricing();
      if (res.data.success) {
        setPrices(res.data.pricing || []);
      }
    } catch (err) {
      setErrorMsg('Failed to load pricing table.');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (category, newPrice) => {
    setPrices((prev) =>
      prev.map((item) =>
        item.category === category ? { ...item, unit_price: newPrice } : item
      )
    );
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = prices.map((p) => ({
        category: p.category,
        unit_price: parseFloat(p.unit_price) || 0.0
      }));

      const res = await adminService.updatePricing(payload);
      if (res.data.success) {
        setSuccessMsg('Campus printing pricing rules updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update pricing rules.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
        Loading price configurations...
      </div>
    );
  }

  // Categorize prices for clean display
  const baseRates = prices.filter((p) => ['bw_single', 'bw_double', 'color_single', 'color_double', 'a3_multiplier'].includes(p.category));
  const paperRates = prices.filter((p) => p.category.startsWith('paper_'));
  const bindingRates = prices.filter((p) => p.category.startsWith('bind_'));

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Printing Price Management</h1>
          <p className="page-subtitle">
            Configure campus printing base rates, color multiplier, sheet premiums, and finishing add-ons.
          </p>
        </div>
        <button onClick={fetchPricing} className="btn btn-secondary btn-sm">
          <RefreshCw size={15} /> Reload Prices
        </button>
      </div>

      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSaveAll}>
        {/* Section 1: Base Page Rates & Duplex */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">
            <Tag size={20} color="#4f46e5" /> 1. Standard Page Print Rates (A4 Base)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Base per-page pricing billed to students upon submission.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {baseRates.map((item) => (
              <div key={item.category} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>{item.display_name}</label>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{item.description}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem', fontWeight: 700 }}
                    value={item.unit_price}
                    onChange={(e) => handlePriceChange(item.category, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Paper Quality Surcharges */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">
            <Tag size={20} color="#7c3aed" /> 2. Paper Stock Surcharges (Per Sheet)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Additional surcharge added per physical sheet when students select premium paper.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {paperRates.map((item) => (
              <div key={item.category} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>{item.display_name}</label>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{item.description}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem', fontWeight: 700 }}
                    value={item.unit_price}
                    onChange={(e) => handlePriceChange(item.category, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Binding & Finishing Services */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">
            <Tag size={20} color="#059669" /> 3. Post-Print Binding & Finishing Fees (Per Copy)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Fixed finishing fees charged per copy when stapling, spiral, or hardbound thesis binding is selected.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {bindingRates.map((item) => (
              <div key={item.category} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>{item.display_name}</label>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{item.description}</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    style={{ paddingLeft: '2.2rem', fontWeight: 700 }}
                    value={item.unit_price}
                    onChange={(e) => handlePriceChange(item.category, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            <Save size={18} /> {saving ? 'Saving Changes...' : 'Save All Pricing Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};
