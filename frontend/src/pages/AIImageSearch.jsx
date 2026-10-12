import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { 
  getLostFoundItems, 
  searchItemsWithAIImage, 
  reportLostFoundItem, 
  updateLostFoundItem,
  deleteLostFoundItem 
} from '../services/api';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Search, 
  Tag, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  Eye, 
  ShieldCheck, 
  Clock, 
  Layers, 
  FileText,
  Mail,
  Zap,
  ArrowRight,
  Trash2,
  Check,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

const SAMPLE_CAMPUS_ITEMS = [
  {
    name: 'AirPods Pro Case',
    category: 'Electronics',
    type: 'Found',
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=60',
    description: 'White wireless earbuds case found in library'
  },
  {
    name: 'Student ID Card',
    category: 'ID Card',
    type: 'Found',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    description: 'RFID Student ID Card found in cafeteria'
  },
  {
    name: 'Blue Hydro Flask',
    category: 'Drinkware',
    type: 'Lost',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60',
    description: 'Insulated sports water bottle'
  },
  {
    name: 'Scientific Calculator',
    category: 'Electronics',
    type: 'Found',
    image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500&auto=format&fit=crop&q=60',
    description: 'Casio ClassWiz fx-991EX calculator'
  },
  {
    name: 'Black Tech Backpack',
    category: 'Bags',
    type: 'Lost',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60',
    description: 'Wildcraft backpack with engineering notes'
  },
  {
    name: 'Bike Key & Ring',
    category: 'Keys',
    type: 'Found',
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=60',
    description: 'Honda bike ignition key with lanyard'
  }
];

export default function AIImageSearch() {
  const { currentUser, isStudent, isAdmin } = useUser();
  const fileInputRef = useRef(null);

  // Lost & Found Items list
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchKeyword, setSearchKeyword] = useState('');

  // AI Image Search state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(SAMPLE_CAMPUS_ITEMS[0].image);
  const [selectedSample, setSelectedSample] = useState(SAMPLE_CAMPUS_ITEMS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Report Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    item_name: '',
    category: 'Electronics',
    item_type: 'Lost',
    location: '',
    description: '',
    contact_info: currentUser?.email || '',
    image_url: ''
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportNotice, setReportNotice] = useState(null);

  const [isDragging, setIsDragging] = useState(false);

  const handleAnalyzeImage = () => {
    executeRealTimeMatch(selectedFile, selectedSample);
  };

  const fetchCatalog = async () => {
    try {
      setLoadingItems(true);
      const params = {};
      if (filterType !== 'All') params.item_type = filterType;
      if (filterCategory !== 'All') params.category = filterCategory;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchKeyword.trim()) params.search = searchKeyword.trim();
      const data = await getLostFoundItems(params);
      setItems(data);
    } catch (err) {
      console.error('Failed to load lost and found items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleToggleClaimed = async (item) => {
    if (!isAdmin) return;
    try {
      const newStatus = item.status === 'Resolved' ? 'Active' : 'Resolved';
      await updateLostFoundItem(item.item_id, { status: newStatus });
      setReportNotice({ type: 'success', text: `Item "${item.item_name}" marked as ${newStatus}.` });
      setTimeout(() => setReportNotice(null), 3500);
      fetchCatalog();
    } catch (err) {
      alert(err.message || 'Failed to update item status');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this Lost & Found record?')) return;
    try {
      await deleteLostFoundItem(itemId);
      setReportNotice({ type: 'success', text: 'Item record successfully removed.' });
      setTimeout(() => setReportNotice(null), 3500);
      fetchCatalog();
    } catch (err) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // Real-time AI Match Execution
  const executeRealTimeMatch = async (fileObj = null, sampleObj = null) => {
    setAnalyzing(true);
    setSearchError(null);
    try {
      let res;
      if (fileObj) {
        const formData = new FormData();
        formData.append('file', fileObj);
        res = await searchItemsWithAIImage(formData);
      } else {
        const targetSample = sampleObj || selectedSample;
        res = await searchItemsWithAIImage({
          image_url: targetSample?.image || previewUrl,
          category_hint: targetSample?.category,
          query_hint: targetSample?.name
        });
      }
      setAiResult(res);
    } catch (err) {
      console.error('AI image search error:', err);
      setSearchError(err.message || 'Image analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    const interval = setInterval(() => {
      fetchCatalog();
    }, 25000);
    return () => clearInterval(interval);
  }, [filterType, filterCategory, filterStatus, searchKeyword]);

  useEffect(() => {
    // Run initial real-time match on default sample so user sees live results right away
    executeRealTimeMatch(null, SAMPLE_CAMPUS_ITEMS[0]);
  }, []);

  // Handle local file selection - MATCHES IN REAL TIME
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSelectedSample(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      executeRealTimeMatch(file, null);
    }
  };

  // Drag and drop handlers - MATCHES IN REAL TIME
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setSelectedSample(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      executeRealTimeMatch(file, null);
    }
  };

  // Handle sample selection - MATCHES IN REAL TIME
  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setSelectedFile(null);
    setPreviewUrl(sample.image);
    executeRealTimeMatch(null, sample);
  };


  // Submit new item report
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await reportLostFoundItem({
        ...reportFormData,
        student_id: currentUser?.id
      });
      setReportNotice({ type: 'success', text: `Item "${reportFormData.item_name}" reported successfully!` });
      setIsReportOpen(false);
      setReportFormData({
        item_name: '',
        category: 'Electronics',
        item_type: 'Lost',
        location: '',
        description: '',
        contact_info: currentUser?.email || '',
        image_url: ''
      });
      await fetchCatalog();
    } catch (err) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="page-wrapper ai-vision-page">
      {/* Header Banner */}
      <header className="page-header-row">
        <div>
          <div className="badge-tag ai-tag">
            <Camera size={14} />
            <span>AI Computer Vision Agent</span>
          </div>
          <h1 className="page-title">AI Image Search & Lost-and-Found</h1>
          <p className="page-subtitle">
            Upload a photo of a lost or found item. Our AI agent detects visual attributes, extracts categories, and performs live semantic matching.
          </p>
        </div>

        <div className="header-actions-row">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={fetchCatalog}
            disabled={loadingItems}
            title="Sync catalog with live database"
          >
            <RefreshCw size={15} className={loadingItems ? 'spin' : ''} />
            <span>Sync</span>
          </button>
          <button 
            type="button" 
            className="btn-primary"
            onClick={() => setIsReportOpen(true)}
          >
            <Plus size={16} />
            <span>Report Lost / Found Item</span>
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {reportNotice && (
        <div className="notification-banner success">
          <div className="notice-inner">
            <CheckCircle2 size={18} />
            <span>{reportNotice.text}</span>
          </div>
          <button className="close-notice-btn" onClick={() => setReportNotice(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* SECTION 1: AI Visual Search Workspace */}
      <section className="ai-workspace-grid">
        {/* Left Box: Upload & Image Preview */}
        <div className="ai-input-card">
          <div className="card-header-line">
            <h3 className="card-title-text">
              <Camera size={18} /> 1. Upload or Select Item Photo
            </h3>
            <span className="step-tag">Step 1</span>
          </div>

          <div 
            className={`image-preview-stage ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            title="Click or Drag & Drop item photo here to match in real time"
          >
            {analyzing && <div className="scanning-laser-beam" />}

            {previewUrl ? (
              <img src={previewUrl} alt="Item to search" className="preview-image-element" />
            ) : (
              <div className="empty-preview-placeholder">
                <Upload size={36} />
                <span>Drag & drop photo here or click to browse</span>
              </div>
            )}

            <div className="drag-drop-instruction-overlay">
              <span>{selectedFile ? `File: ${selectedFile.name}` : (selectedSample ? `Sample: ${selectedSample.name}` : 'Click or drop photo')}</span>
              <span className="real-time-match-indicator">
                <span className="pulse-dot"></span> Real-Time AI Match Active
              </span>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Sample Photos Selector */}
          <div className="samples-selector-block">
            <span className="samples-heading">Or choose from sample campus items:</span>
            <div className="samples-pills-grid">
              {SAMPLE_CAMPUS_ITEMS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`sample-thumbnail-chip ${selectedSample?.name === sample.name ? 'active' : ''}`}
                  onClick={() => handleSelectSample(sample)}
                >
                  <img src={sample.image} alt={sample.name} className="sample-mini-img" />
                  <span className="sample-chip-name">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Input & Analyze Button */}
          <div className="upload-controls-row">
            <button 
              type="button"
              className="custom-file-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Choose Photo File</span>
            </button>

            <button 
              type="button" 
              className="btn-primary analyze-action-btn"
              onClick={handleAnalyzeImage}
              disabled={analyzing || !previewUrl}
            >
              <Sparkles size={16} className={analyzing ? 'spin' : ''} />
              <span>{analyzing ? 'AI Agent Analyzing...' : 'Analyze with AI Agent'}</span>
            </button>
          </div>

          {searchError && (
            <div className="analysis-error-banner">
              <AlertCircle size={16} />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Right Box: AI Vision Breakdown & Live Matches */}
        <div className="ai-results-card">
          <div className="card-header-line">
            <h3 className="card-title-text">
              <Sparkles size={18} /> 2. AI Agent Vision & Semantic Matches
            </h3>
            {aiResult && (
              <span className="engine-badge-tag">
                Engine: {aiResult.engine}
              </span>
            )}
          </div>

          {!aiResult && !analyzing && (
            <div className="ai-waiting-state">
              <div className="waiting-icon-circle">
                <Search size={32} />
              </div>
              <h4>Ready to Inspect</h4>
              <p>
                Select an item photo on the left and click <strong>"Analyze with AI Agent"</strong> to detect object attributes and view database matches.
              </p>
            </div>
          )}

          {analyzing && (
            <div className="ai-analyzing-state">
              <div className="pulsing-lens">
                <Camera size={36} />
              </div>
              <h4>Vision Agent in Action</h4>
              <p>Inspecting color histograms, visual category markers, and running semantic similarity search across campus records...</p>
            </div>
          )}

          {aiResult && (
            <div className="ai-analysis-output-content">
              {/* Detection Summary Box */}
              <div className="detection-summary-box">
                <div className="detected-item-header">
                  <div>
                    <span className="detected-label">Detected Item</span>
                    <h4 className="detected-title">{aiResult.analysis.item_name}</h4>
                  </div>
                  <div className="confidence-pill">
                    <CheckCircle2 size={13} />
                    <span>{Math.round(aiResult.analysis.confidence * 100)}% Confidence</span>
                  </div>
                </div>

                <div className="attributes-grid">
                  <div className="attr-pill">
                    <strong>Category:</strong>
                    <span>{aiResult.analysis.category}</span>
                  </div>
                  <div className="attr-pill">
                    <strong>Dominant Colors:</strong>
                    <span>{aiResult.analysis.dominant_colors.join(', ') || 'Neutral'}</span>
                  </div>
                  <div className="attr-pill full-width">
                    <strong>Key Features:</strong>
                    <span>{aiResult.analysis.distinguishing_features.join(' • ')}</span>
                  </div>
                </div>
              </div>

              {/* Matched Database Items */}
              <div className="matches-list-container">
                <h4 className="matches-heading">
                  Ranked Database Matches ({aiResult.matches.length})
                </h4>

                {aiResult.matches.length === 0 ? (
                  <div className="no-matches-notice">
                    <AlertCircle size={18} />
                    <span>No active lost/found record matched this photo. You can report it as a new item below!</span>
                  </div>
                ) : (
                  <div className="matches-cards-grid">
                    {aiResult.matches.map((match, mIdx) => {
                      const matchItem = match.item;
                      const score = match.match_score;
                      const isHighMatch = score >= 70;
                      return (
                        <div key={mIdx} className={`matched-item-card ${isHighMatch ? 'high-confidence' : ''}`}>
                          <div className="match-card-img-block">
                            {matchItem.image_url ? (
                              <img src={matchItem.image_url} alt={matchItem.item_name} className="match-thumb-img" />
                            ) : (
                              <div className="match-placeholder-img">
                                <Tag size={20} />
                              </div>
                            )}
                            <div className={`score-badge ${isHighMatch ? 'high' : 'medium'}`}>
                              <Zap size={11} /> {score}% Match
                            </div>
                          </div>

                          <div className="match-card-info">
                            <div className="match-title-row">
                              <span className={`item-type-badge ${matchItem.item_type.toLowerCase()}`}>
                                {matchItem.item_type}
                              </span>
                              <h5 className="match-item-title">{matchItem.item_name}</h5>
                            </div>

                            <p className="match-desc">{matchItem.description}</p>

                            <div className="match-metadata-row">
                              <span><MapPin size={13} /> {matchItem.location}</span>
                              <span><Mail size={13} /> {matchItem.contact_info}</span>
                            </div>

                            <div className="match-reasons-chips">
                              {match.match_reasons.map((r, rIdx) => (
                                <span key={rIdx} className="reason-chip">✓ {r}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Next Steps Recommendations */}
              {aiResult.recommendations && (
                <div className="recommendations-box">
                  <h5 className="rec-title">Next Recommended Steps:</h5>
                  <ul>
                    {aiResult.recommendations.map((rec, rIdx) => (
                      <li key={rIdx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Campus Lost & Found Catalog */}
      <section className="catalog-section">
        <div className="catalog-header-bar">
          <div>
            <h2 className="catalog-title">Active Campus Lost & Found Catalog</h2>
            <p className="catalog-sub">All items currently reported across university blocks</p>
          </div>

          <div className="catalog-filters-group">
            {/* Type selector */}
            <select 
              className="catalog-dropdown"
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types (Lost & Found)</option>
              <option value="Lost">Only Lost Items</option>
              <option value="Found">Only Found Items</option>
            </select>

            {/* Category selector */}
            <select 
              className="catalog-dropdown"
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="ID Card">ID Cards</option>
              <option value="Drinkware">Drinkware</option>
              <option value="Bags">Bags & Pouches</option>
              <option value="Keys">Keys</option>
            </select>

            {/* Status selector */}
            <select 
              className="catalog-dropdown"
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Resolved">Claimed / Returned</option>
            </select>

            {/* Search Input */}
            <div className="catalog-search-box">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Search catalog..." 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loadingItems ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state-card">
            <Tag size={32} />
            <h3>No items matching your filter</h3>
            <p>Report an item or try searching for another keyword.</p>
          </div>
        ) : (
          <div className="items-grid">
            {items.map(item => (
              <div key={item.item_id} className="campus-item-card">
                <div className="item-card-image-wrap">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.item_name} className="item-card-image" />
                  ) : (
                    <div className="no-image-banner">
                      <Camera size={24} />
                      <span>No Photo Attached</span>
                    </div>
                  )}
                  <span className={`floating-type-pill ${item.item_type.toLowerCase()}`}>
                    {item.item_type}
                  </span>
                  <span className="floating-category-pill">
                    {item.category}
                  </span>
                </div>

                <div className="item-card-body">
                  <h4 className="item-title">{item.item_name}</h4>
                  <p className="item-desc-text">{item.description}</p>

                  <div className="item-location-meta">
                    <MapPin size={14} />
                    <span>{item.location || 'Campus'}</span>
                  </div>

                  <div className="item-card-footer-row">
                    <div className="contact-meta-wrap">
                      <span className="contact-meta">
                        <strong>Contact:</strong> {item.contact_info || 'Security Desk'}
                      </span>
                      {item.status === 'Resolved' && (
                        <span className="status-tag resolved-pill" style={{ marginLeft: '6px', color: '#10b981', fontWeight: 600 }}>
                          ✓ Claimed
                        </span>
                      )}
                    </div>

                    <div className="card-actions-toolbar" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isAdmin && (
                        <>
                          <button 
                            type="button"
                            className="btn-sm btn-outline"
                            onClick={() => handleToggleClaimed(item)}
                            title={item.status === 'Resolved' ? "Reopen ticket" : "Mark as Claimed/Returned"}
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {item.status === 'Resolved' ? <RotateCcw size={12} /> : <Check size={12} />}
                            <span>{item.status === 'Resolved' ? 'Reopen' : 'Claimed'}</span>
                          </button>
                          <button 
                            type="button"
                            className="btn-sm btn-outline"
                            onClick={() => handleDeleteItem(item.item_id)}
                            title="Delete Item Record (Admin Only)"
                            style={{ padding: '4px 6px', color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}

                      <button 
                        className="test-match-btn"
                        onClick={() => {
                          const targetSample = { name: item.item_name, category: item.category, image: item.image_url };
                          setPreviewUrl(item.image_url || previewUrl);
                          setSelectedSample(targetSample);
                          setSelectedFile(null);
                          executeRealTimeMatch(null, targetSample);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        title="Run real-time AI visual matching on this item"
                      >
                        <Sparkles size={13} />
                        <span>Match This</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Report Item Modal */}
      {isReportOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setIsReportOpen(false)}>
          <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">Report a Lost or Found Campus Item</h3>
              <button className="modal-close-icon-btn" onClick={() => setIsReportOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="report-form">
              <div className="form-group-field">
                <label className="field-label">Report Type</label>
                <div className="radio-group-row">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="item_type" 
                      value="Lost" 
                      checked={reportFormData.item_type === 'Lost'}
                      onChange={(e) => setReportFormData({...reportFormData, item_type: e.target.value})}
                    />
                    <span>🔴 I Lost Something</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="item_type" 
                      value="Found" 
                      checked={reportFormData.item_type === 'Found'}
                      onChange={(e) => setReportFormData({...reportFormData, item_type: e.target.value})}
                    />
                    <span>🟢 I Found Something</span>
                  </label>
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Item Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Wireless Mouse, Red Water Bottle, ID Card"
                  className="form-input-control"
                  value={reportFormData.item_name}
                  onChange={(e) => setReportFormData({...reportFormData, item_name: e.target.value})}
                />
              </div>

              <div className="form-row-two-col">
                <div className="form-group-field">
                  <label className="field-label">Category</label>
                  <select 
                    className="form-input-control"
                    value={reportFormData.category}
                    onChange={(e) => setReportFormData({...reportFormData, category: e.target.value})}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="ID Card">ID Card</option>
                    <option value="Drinkware">Drinkware</option>
                    <option value="Bags">Bags</option>
                    <option value="Keys">Keys</option>
                    <option value="Books">Books / Notes</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group-field">
                  <label className="field-label">Campus Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. Library 2nd Floor, Canteen B"
                    className="form-input-control"
                    value={reportFormData.location}
                    onChange={(e) => setReportFormData({...reportFormData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group-field">
                <label className="field-label">Detailed Description</label>
                <textarea 
                  rows={3}
                  placeholder="Describe color, brand, stickers, scratches, or where it was spotted..."
                  className="form-input-control"
                  value={reportFormData.description}
                  onChange={(e) => setReportFormData({...reportFormData, description: e.target.value})}
                />
              </div>

              <div className="form-row-two-col">
                <div className="form-group-field">
                  <label className="field-label">Contact Info / Security Desk</label>
                  <input 
                    type="text"
                    placeholder="Email or phone number"
                    className="form-input-control"
                    value={reportFormData.contact_info}
                    onChange={(e) => setReportFormData({...reportFormData, contact_info: e.target.value})}
                  />
                </div>

                <div className="form-group-field">
                  <label className="field-label">Photo URL (Optional)</label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    className="form-input-control"
                    value={reportFormData.image_url}
                    onChange={(e) => setReportFormData({...reportFormData, image_url: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setIsReportOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submittingReport}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
