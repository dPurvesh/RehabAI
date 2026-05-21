// 3-Step Medical Onboarding
const OnboardingPage = {
  step: 1,
  data: {},
  error: '',

  render() {
    this.step = 1;
    this.data = App.patientProfile ? { ...App.patientProfile } : {};
    this.error = '';
    this.renderStep();
  },

  renderStep() {
    const c = document.getElementById('onboarding-content');
    document.getElementById('onboarding-progress').style.width = `${this.step * 33.33}%`;
    for (let i = 1; i <= 3; i++) {
      const d = document.getElementById(`step-ind-${i}`);
      d.className = `step-dot${i < this.step ? ' done' : i === this.step ? ' active' : ''}`;
    }
    if (this.step === 1) this.renderStep1(c);
    else if (this.step === 2) this.renderStep2(c);
    else this.renderStep3(c);
    App.refreshIcons();
  },

  renderStep1(c) {
    c.innerHTML = `<div class="onboarding-card">
      <h3 style="margin-bottom:20px">Step 1: Personal Information</h3>
      <div class="auth-error" id="ob-error" style="display:${this.error ? 'block' : 'none'}">${this.error || ''}</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Age</label><input class="form-input" id="ob-age" type="number" value="${this.data.age || 30}" min="10" max="100"></div>
        <div class="form-group"><label class="form-label">Gender</label><select class="form-select" id="ob-gender"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" id="ob-weight" type="number" value="${this.data.weight_kg || 70}" step="0.1"></div>
        <div class="form-group"><label class="form-label">Height (cm)</label><input class="form-input" id="ob-height" type="number" value="${this.data.height_cm || 170}" step="0.1"></div>
      </div>
      <div class="onboarding-actions"><button class="btn btn-primary btn-lg" onclick="OnboardingPage.next()">Next</button></div>
    </div>`;
    if (this.data.gender) document.getElementById('ob-gender').value = this.data.gender;
  },

  renderStep2(c) {
    c.innerHTML = `<div class="onboarding-card">
      <h3 style="margin-bottom:20px">Step 2: Knee Injury Details</h3>
      <div class="auth-error" id="ob-error" style="display:${this.error ? 'block' : 'none'}">${this.error || ''}</div>
      <div class="form-group"><label class="form-label">Injury Type</label><select class="form-select" id="ob-injury">
        <option value="acl_tear">ACL Tear</option><option value="pcl_tear">PCL Tear</option><option value="mcl_tear">MCL Tear</option><option value="lcl_tear">LCL Tear</option><option value="meniscus_tear">Meniscus Tear</option><option value="knee_replacement">Knee Replacement</option><option value="patellar_tendon">Patellar Tendon</option><option value="knee_fracture">Knee Fracture</option><option value="osteoarthritis">Osteoarthritis</option><option value="knee_dislocation">Knee Dislocation</option>
      </select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Severity</label><select class="form-select" id="ob-severity"><option value="mild">Mild</option><option value="moderate" selected>Moderate</option><option value="severe">Severe</option></select></div>
        <div class="form-group"><label class="form-label">Affected Side</label><select class="form-select" id="ob-side"><option value="left">Left</option><option value="right" selected>Right</option><option value="bilateral">Bilateral</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Surgery Type</label><select class="form-select" id="ob-surgery">
        <option value="acl_reconstruction">ACL Reconstruction</option><option value="pcl_reconstruction">PCL Reconstruction</option><option value="ligament_repair">Ligament Repair</option><option value="meniscectomy">Meniscectomy</option><option value="meniscus_repair">Meniscus Repair</option><option value="total_knee_replacement">Total Knee Replacement</option><option value="partial_knee_replacement">Partial Knee Replacement</option><option value="tendon_repair">Tendon Repair</option><option value="fracture_fixation">Fracture Fixation</option><option value="arthroscopy">Arthroscopy</option><option value="conservative_treatment">Conservative Treatment</option>
      </select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Surgery Date</label><input class="form-input" id="ob-date" type="date" value="${this.data.surgery_date || new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Graft Type</label><select class="form-select" id="ob-graft"><option value="none">None</option><option value="autograft">Autograft</option><option value="allograft">Allograft</option><option value="synthetic">Synthetic</option></select></div>
      </div>
      <div class="onboarding-actions"><button class="btn btn-secondary btn-lg" onclick="OnboardingPage.prev()">Back</button><button class="btn btn-primary btn-lg" onclick="OnboardingPage.next()">Next</button></div>
    </div>`;
    if (this.data.injury_type) document.getElementById('ob-injury').value = this.data.injury_type;
    if (this.data.injury_severity) document.getElementById('ob-severity').value = this.data.injury_severity;
    if (this.data.surgery_type) document.getElementById('ob-surgery').value = this.data.surgery_type;
  },

  renderStep3(c) {
    c.innerHTML = `<div class="onboarding-card">
      <h3 style="margin-bottom:20px">Step 3: Medical History & Physio Link</h3>
      <div class="auth-error" id="ob-error" style="display:${this.error ? 'block' : 'none'}">${this.error || ''}</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Comorbidities</label><select class="form-select" id="ob-comorbid"><option value="none">None</option><option value="diabetes">Diabetes</option><option value="hypertension">Hypertension</option><option value="obesity">Obesity</option><option value="osteoporosis">Osteoporosis</option></select></div>
        <div class="form-group"><label class="form-label">Activity Before Injury</label><select class="form-select" id="ob-activity"><option value="sedentary">Sedentary</option><option value="moderate" selected>Moderate</option><option value="active">Active</option><option value="athlete">Athlete</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Physiotherapist Name</label><input class="form-input" id="ob-physio" placeholder="Dr. Smith" value="${this.data.physio_name || ''}"></div>
        <div class="form-group"><label class="form-label">Surgeon Name</label><input class="form-input" id="ob-surgeon" placeholder="Dr. Jones" value="${this.data.surgeon_name || ''}"></div>
      </div>
      <div class="form-group" style="margin-top:8px;padding:14px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #a7f3d0;border-radius:12px">
        <label class="form-label" style="color:#065f46;font-weight:700"><i data-lucide="link" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> Link to Your Physiotherapist (Optional)</label>
        <input class="form-input" id="ob-physio-code" placeholder="e.g. PHY-A3F9K2" value="${this.data._physio_code || ''}" style="text-transform:uppercase;letter-spacing:1px;font-weight:600">
        <p style="font-size:0.78rem;color:#065f46;margin-top:6px">Ask your physiotherapist for their unique code. This allows them to monitor your recovery remotely.</p>
      </div>
      <div class="onboarding-actions"><button class="btn btn-secondary btn-lg" onclick="OnboardingPage.prev()">Back</button><button class="btn btn-primary btn-lg" id="ob-finish" onclick="OnboardingPage.finish()">Complete Setup</button></div>
    </div>`;
  },

  collectStep() {
    if (this.step === 1) {
      this.data.age = +document.getElementById('ob-age').value;
      this.data.gender = document.getElementById('ob-gender').value;
      this.data.weight_kg = +document.getElementById('ob-weight').value;
      this.data.height_cm = +document.getElementById('ob-height').value;
      this.data.bmi = +(this.data.weight_kg / ((this.data.height_cm / 100) ** 2)).toFixed(1);
    } else if (this.step === 2) {
      this.data.injury_type = document.getElementById('ob-injury').value;
      this.data.injury_severity = document.getElementById('ob-severity').value;
      this.data.affected_side = document.getElementById('ob-side').value;
      this.data.surgery_type = document.getElementById('ob-surgery').value;
      this.data.surgery_date = document.getElementById('ob-date').value;
      this.data.graft_type = document.getElementById('ob-graft').value;
    } else {
      this.data.comorbidities = document.getElementById('ob-comorbid').value;
      this.data.activity_before_injury = document.getElementById('ob-activity').value;
      this.data.physio_name = document.getElementById('ob-physio').value;
      this.data.surgeon_name = document.getElementById('ob-surgeon').value;
      this.data._physio_code = (document.getElementById('ob-physio-code')?.value || '').trim().toUpperCase();
    }
  },

  validateStep() {
    this.error = '';
    if (this.step === 1) {
      if (!this.data.age || this.data.age < 10 || this.data.age > 100) this.error = 'Please provide a valid age between 10 and 100.';
      else if (!this.data.weight_kg || this.data.weight_kg <= 0) this.error = 'Please provide a valid weight.';
      else if (!this.data.height_cm || this.data.height_cm <= 0) this.error = 'Please provide a valid height.';
    }
    if (this.step === 2 && !this.data.surgery_date) this.error = 'Please select your surgery date.';
    return !this.error;
  },

  next() {
    this.collectStep();
    if (!this.validateStep()) {
      this.renderStep();
      return;
    }
    this.step++;
    this.error = '';
    this.renderStep();
  },

  prev() {
    this.collectStep();
    this.step--;
    this.renderStep();
  },

  async finish() {
    this.collectStep();
    if (!this.validateStep()) {
      this.renderStep();
      return;
    }
    const btn = document.getElementById('ob-finish');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const { data: { user }, error: userErr } = await sb.auth.getUser();
      if (userErr || !user) throw new Error('Session expired. Please sign in again.');

      // Save patient profile (exclude _physio_code from DB insert)
      const profileData = { ...this.data };
      const physioCode = profileData._physio_code;
      delete profileData._physio_code;

      const { error: insertErr } = await sb.from('patient_profiles').upsert({ user_id: user.id, ...profileData });
      if (insertErr) throw insertErr;
      const { error: profileErr } = await sb.from('profiles').update({ onboarding_done: true }).eq('id', user.id);
      if (profileErr) throw profileErr;

      // Link to physio if code provided — use RPC to bypass RLS
      if (physioCode) {
        const { data: physioResults } = await sb.rpc('lookup_physio_by_code', { p_code: physioCode });
        if (physioResults && physioResults.length > 0) {
          await sb.from('physio_patients').upsert({
            physio_id: physioResults[0].id,
            patient_id: user.id,
            status: 'active',
          });
        }
      }

      App.profile.onboarding_done = true;
      App.patientProfile = profileData;
      App.showApp();
    } catch (e) {
      this.error = e.message || 'Failed to save onboarding details.';
      this.renderStep();
      const retryBtn = document.getElementById('ob-finish');
      if (retryBtn) {
        retryBtn.disabled = false;
        retryBtn.textContent = 'Complete Setup';
      }
    }
  },
};
