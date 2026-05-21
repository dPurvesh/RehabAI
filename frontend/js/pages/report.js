// Medical Report Extraction — OCR + AI + Condition Mapping
const ReportPage = {
  render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="file-text"></i> Medical document AI</div>
          <h1>Medical Report AI</h1>
          <p>Upload medical reports (PDF, images) or paste text. AI extracts clinical details and maps your condition.</p>
        </div>
        <div class="header-pills">
          <span class="pill"><i data-lucide="sparkles"></i>Gemini + OCR</span>
          <span class="pill"><i data-lucide="scan-text"></i>Tesseract OCR</span>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px">
          <div class="contact-avatar" style="background:var(--primary-soft);color:var(--primary)"><i data-lucide="scan-text"></i></div>
          <div>
            <h3>Extract Clinical Details</h3>
            <p style="color:var(--ink-soft);margin-top:4px">Upload a medical report file or paste text. RehabAI extracts diagnosis, surgery details, medications, restrictions, and maps your knee condition.</p>
          </div>
        </div>

        <div class="report-upload-zone" id="report-drop-zone">
          <input type="file" id="report-file-input" accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.webp" style="display:none"
            onchange="ReportPage.onFileSelected(event)">
          <div class="upload-icon"><i data-lucide="upload-cloud"></i></div>
          <p class="upload-text">Drag & drop a PDF or image here</p>
          <p class="upload-hint">or <a href="#" onclick="event.preventDefault();document.getElementById('report-file-input').click()">browse files</a> — PDF, JPG, PNG supported</p>
          <div id="report-file-name" class="upload-file-name"></div>
        </div>

        <div class="upload-divider"><span>or paste report text</span></div>

        <div class="form-group"><textarea class="form-textarea" id="rpt-text" style="min-height:140px" placeholder="Paste surgical notes, MRI findings, or discharge summaries..."></textarea></div>
        <button class="btn btn-primary btn-full btn-lg" id="rpt-btn" onclick="ReportPage.extract()"><i data-lucide="sparkles"></i>Extract & Identify Condition</button>
      </div>
      <div id="rpt-result" style="margin-top:20px"></div>`;

    this.setupDragDrop();
    App.refreshIcons();
  },

  selectedFile: null,

  setupDragDrop() {
    const zone = document.getElementById('report-drop-zone');
    if (!zone) return;
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.setFile(e.dataTransfer.files[0]);
      }
    });
  },

  onFileSelected(e) {
    if (e.target.files.length > 0) {
      this.setFile(e.target.files[0]);
    }
  },

  setFile(file) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|bmp|tiff|webp)$/i)) {
      alert('Please upload a PDF or image file (JPG, PNG).');
      return;
    }
    this.selectedFile = file;
    const nameEl = document.getElementById('report-file-name');
    if (nameEl) {
      const icon = file.type === 'application/pdf' ? '📄' : '🖼️';
      nameEl.innerHTML = `${icon} <strong>${this.escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }
  },

  async extract() {
    const text = document.getElementById('rpt-text').value.trim();
    const hasFile = !!this.selectedFile;

    if (!text && !hasFile) {
      alert('Please upload a file or paste report text.');
      return;
    }

    const btn = document.getElementById('rpt-btn');
    btn.disabled = true;
    btn.textContent = hasFile ? 'Processing file with OCR + AI...' : 'Extracting with AI...';

    try {
      let res;
      if (hasFile) {
        // Send file via FormData
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        const resp = await fetch(`${API_BASE}/api/extract-report`, { method: 'POST', body: formData });
        res = await resp.json();
        if (!resp.ok) throw new Error(res.message || 'Extraction failed');
      } else {
        res = await api.extractReport(text);
      }

      const d = res.extracted_data;
      const condition = d.identified_condition;
      const conditionName = condition ? condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;

      let conditionHtml = '';
      if (condition) {
        conditionHtml = `
          <div class="condition-match">
            <div class="condition-badge"><i data-lucide="check-circle-2"></i> Condition Identified</div>
            <div class="condition-name">${this.escapeHtml(conditionName)}</div>
            <p class="condition-desc">This matches one of RehabAI's 10 supported knee conditions. Would you like to update your profile?</p>
            <button class="btn btn-primary btn-sm" onclick="ReportPage.applyCondition('${this.escapeHtml(condition)}')">
              <i data-lucide="arrow-right"></i>Apply to My Profile
            </button>
          </div>`;
      }

      this._lastExtraction = d;
      document.getElementById('rpt-result').innerHTML = `
        ${conditionHtml}
        <div class="result-card">
          <h3>Extraction Results <span class="badge badge-phase" style="margin-left:8px">${res.source}</span></h3>
          <div class="result-row"><span class="result-label">Diagnosis:</span><span class="result-value">${this.escapeHtml(d.diagnosis || '--')}</span></div>
          <div class="result-row"><span class="result-label">Surgery:</span><span class="result-value">${this.escapeHtml(d.surgery_details || '--')}</span></div>
          <div class="result-row"><span class="result-label">Follow-up:</span><span class="result-value">${this.escapeHtml(d.follow_up_date || '--')}</span></div>
          <div class="result-row"><span class="result-label">Medications:</span><span class="result-value">${(d.medications || []).map((m) => this.escapeHtml(m)).join(', ') || '--'}</span></div>
          <div class="result-row"><span class="result-label">Restrictions:</span><span class="result-value">${(d.restrictions || []).map((r) => `- ${this.escapeHtml(r)}`).join('<br>') || '--'}</span></div>
          <div class="result-row"><span class="result-label">Physio Notes:</span><span class="result-value">${this.escapeHtml(d.physio_instructions || '--')}</span></div>
        </div>
        <button class="btn btn-secondary btn-full" style="margin-top:14px" onclick="PdfExport.exportReport(ReportPage._lastExtraction)">
          <i data-lucide="download"></i> Download Report as PDF
        </button>`;
    } catch (e) {
      document.getElementById('rpt-result').innerHTML = `<div class="alert-banner alert-danger"><i data-lucide="circle-alert"></i>Failed: ${this.escapeHtml(e.message)}</div>`;
    }

    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles"></i>Extract & Identify Condition';
    this.selectedFile = null;
    document.getElementById('report-file-name').innerHTML = '';
    App.refreshIcons();
  },

  async applyCondition(conditionKey) {
    try {
      const { error } = await sb
        .from('patient_profiles')
        .update({ injury_type: conditionKey })
        .eq('user_id', App.user.id);
      if (error) throw error;
      App.patientProfile.injury_type = conditionKey;
      const conditionName = conditionKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      document.querySelector('.condition-match').innerHTML = `
        <div class="alert-banner alert-success"><i data-lucide="check-circle-2"></i>Profile updated to <strong>${this.escapeHtml(conditionName)}</strong>. Exercise recommendations will now be tailored to this condition.</div>`;
      App.refreshIcons();
    } catch (e) {
      alert('Failed to update profile: ' + e.message);
    }
  },

  escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },
};
