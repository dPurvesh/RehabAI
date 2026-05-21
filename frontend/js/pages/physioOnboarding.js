// Physio Onboarding — Professional details setup
const PhysioOnboardingPage = {
  data: {},
  error: '',

  render() {
    // Update the onboarding header for physios
    document.querySelector('.onboarding-header h2').textContent = 'Set Up Your Physio Profile';
    document.querySelector('.onboarding-header p').textContent = 'Help your patients find you and allow RehabAI to set up your professional portal.';
    document.getElementById('onboarding-progress').style.width = '50%';
    // Hide step indicators (single step for physio)
    const stepDots = document.querySelector('.step-indicators');
    if (stepDots) stepDots.style.display = 'none';

    const c = document.getElementById('onboarding-content');
    c.innerHTML = `
      <div class="onboarding-card">
        <div class="auth-error" id="physio-ob-error" style="display:${this.error ? 'block' : 'none'}">${this.error || ''}</div>

        <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding:16px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border-radius:14px;border:1px solid #a7f3d0">
          <div style="width:48px;height:48px;border-radius:14px;background:#0f766e;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-lucide="stethoscope" style="color:#fff;width:24px;height:24px"></i>
          </div>
          <div>
            <div style="font-weight:700;color:#065f46">Welcome, Dr. ${App.profile?.full_name?.split(' ').slice(-1)[0] || 'Doctor'}!</div>
            <div style="font-size:0.82rem;color:#047857">Fill in your professional details to get started. Your unique Physio Code will be generated automatically.</div>
          </div>
        </div>

        <h4 style="margin-bottom:14px;color:var(--ink)">Professional Information</h4>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Specialization <span style="color:#ef4444">*</span></label>
            <select class="form-select" id="po-specialization">
              <option value="">Select specialization</option>
              <option value="Orthopedic Physiotherapy">Orthopedic Physiotherapy</option>
              <option value="Sports Physiotherapy">Sports Physiotherapy</option>
              <option value="Neurological Physiotherapy">Neurological Physiotherapy</option>
              <option value="Pediatric Physiotherapy">Pediatric Physiotherapy</option>
              <option value="Geriatric Physiotherapy">Geriatric Physiotherapy</option>
              <option value="Cardiopulmonary Physiotherapy">Cardiopulmonary Physiotherapy</option>
              <option value="Post-Surgical Rehabilitation">Post-Surgical Rehabilitation</option>
              <option value="General Physiotherapy">General Physiotherapy</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Years of Experience <span style="color:#ef4444">*</span></label>
            <input class="form-input" id="po-experience" type="number" placeholder="e.g. 5" min="0" max="60">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Qualification / Degree <span style="color:#ef4444">*</span></label>
          <input class="form-input" id="po-qualification" placeholder="e.g. BPT, MPT (Ortho), MIAP">
        </div>

        <div class="form-group">
          <label class="form-label">License / Registration Number</label>
          <input class="form-input" id="po-license" placeholder="e.g. MCI-12345 or IAP-67890">
        </div>

        <h4 style="margin:20px 0 14px;color:var(--ink)">Hospital / Clinic Details</h4>

        <div class="form-group">
          <label class="form-label">Hospital / Clinic Name <span style="color:#ef4444">*</span></label>
          <input class="form-input" id="po-hospital" placeholder="e.g. Apollo Hospital, City Physio Clinic">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">City</label>
            <input class="form-input" id="po-city" placeholder="e.g. Mumbai">
          </div>
          <div class="form-group">
            <label class="form-label">State</label>
            <input class="form-input" id="po-state" placeholder="e.g. Maharashtra">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Clinic Contact / Phone</label>
          <input class="form-input" id="po-phone" type="tel" placeholder="e.g. +91 98765 43210">
        </div>

        <div class="form-group">
          <label class="form-label">Brief Bio (optional)</label>
          <textarea class="form-textarea" id="po-bio" rows="3" placeholder="e.g. Specialized in post-ACL reconstruction rehabilitation with 8+ years of clinical experience..."></textarea>
        </div>

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-lg" id="physio-ob-finish" onclick="PhysioOnboardingPage.finish()" style="width:100%">
            <i data-lucide="check-circle-2"></i> Complete Setup & Enter Portal
          </button>
        </div>
      </div>`;

    App.refreshIcons();
  },

  async finish() {
    const specialization = document.getElementById('po-specialization').value;
    const experience = document.getElementById('po-experience').value;
    const qualification = document.getElementById('po-qualification').value.trim();
    const hospital = document.getElementById('po-hospital').value.trim();
    const errEl = document.getElementById('physio-ob-error');

    // Validate required fields
    if (!specialization) { errEl.textContent = 'Please select your specialization.'; errEl.style.display = 'block'; return; }
    if (!experience || experience < 0) { errEl.textContent = 'Please enter years of experience.'; errEl.style.display = 'block'; return; }
    if (!qualification) { errEl.textContent = 'Please enter your qualification/degree.'; errEl.style.display = 'block'; return; }
    if (!hospital) { errEl.textContent = 'Please enter your hospital or clinic name.'; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';

    const btn = document.getElementById('physio-ob-finish');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="animation:spin 1s linear infinite"></i> Saving...';
    App.refreshIcons();

    try {
      const { error } = await sb.from('profiles').update({
        onboarding_done: true,
        physio_specialization: specialization,
        physio_experience_years: parseInt(experience),
        physio_qualification: qualification,
        physio_license: document.getElementById('po-license').value.trim(),
        physio_hospital: hospital,
        physio_city: document.getElementById('po-city').value.trim(),
        physio_state: document.getElementById('po-state').value.trim(),
        physio_phone: document.getElementById('po-phone').value.trim(),
        physio_bio: document.getElementById('po-bio').value.trim(),
      }).eq('id', App.user.id);

      if (error) throw error;

      // Refresh profile and go to app
      App.profile.onboarding_done = true;
      App.showApp();
    } catch (e) {
      errEl.textContent = e.message || 'Failed to save. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="check-circle-2"></i> Complete Setup & Enter Portal';
      App.refreshIcons();
    }
  },
};
