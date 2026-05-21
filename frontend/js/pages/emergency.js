// Emergency Contacts
const EmergencyPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="siren"></i> Safety network</div>
          <h1>Emergency Contacts</h1>
          <p>Keep physiotherapist, surgeon, family, and emergency contacts close during recovery.</p>
        </div>
        <button class="btn btn-primary" onclick="EmergencyPage.showForm()"><i data-lucide="plus"></i>Add Contact</button>
      </div>
      <div id="em-form" class="hidden card" style="margin-bottom:20px"></div>
      <div id="em-msg" style="margin-bottom:12px"></div>
      <div id="em-list"></div>`;
    App.refreshIcons();
    await this.load();
  },

  async load() {
    const { data, error } = await sb.from('emergency_contacts').select('*').eq('user_id', App.user.id).order('created_at');
    const l = document.getElementById('em-list');
    if (error) {
      l.innerHTML = `<div class="card" style="border:1px solid #ef4444;color:#ef4444;padding:16px">⚠️ Could not load contacts: ${error.message}</div>`;
      return;
    }
    if (!data || !data.length) {
      l.innerHTML = `
        <div class="card empty-state">
          <i data-lucide="phone-call"></i>
          <h3>No emergency contacts yet</h3>
          <p>Add your physiotherapist, surgeon, or trusted family contact so RehabAI can recommend who to call in case of an emergency.</p>
          <button class="btn btn-primary" onclick="EmergencyPage.showForm()" style="margin-top:16px"><i data-lucide="plus"></i>Add your first contact</button>
        </div>`;
      App.refreshIcons();
      return;
    }
    const roleColors = { physiotherapist: '#6366f1', surgeon: '#ef4444', family: '#10b981', emergency: '#f59e0b' };
    l.innerHTML = data.map((c) => {
      const rel = c.relationship || 'contact';
      const color = roleColors[rel] || '#6366f1';
      return `<div class="card contact-card" style="margin-bottom:12px; display:flex; align-items:center; gap:16px; padding:20px">
        <div style="width:52px;height:52px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:${color}">${c.name[0].toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary)">${c.name}</div>
          <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:2px"><i data-lucide="phone" style="width:13px;height:13px;vertical-align:middle"></i> ${c.phone}</div>
          <span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;background:${color}22;color:${color};text-transform:capitalize">${rel}</span>
        </div>
        <div style="display:flex;gap:8px">
          <a href="tel:${c.phone}" class="btn btn-secondary btn-sm" style="background:#10b98122;color:#10b981;border:1px solid #10b98144"><i data-lucide="phone-call"></i>Call</a>
          <button class="btn btn-danger btn-sm" onclick="EmergencyPage.del('${c.id}')"><i data-lucide="trash-2"></i>Remove</button>
        </div>
      </div>`;
    }).join('');
    App.refreshIcons();
  },

  showForm() {
    const f = document.getElementById('em-form');
    f.classList.remove('hidden');
    f.innerHTML = `
      <div style="font-weight:700;font-size:1rem;margin-bottom:16px;color:var(--text-primary)">➕ New Emergency Contact</div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input class="form-input" id="em-name" placeholder="e.g. Dr. Ramesh Sharma">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number *</label>
          <input class="form-input" id="em-phone" placeholder="e.g. +91 9876543210" type="tel">
        </div>
        <div class="form-group">
          <label class="form-label">Who are they?</label>
          <select class="form-select" id="em-rel">
            <option value="physiotherapist">Physiotherapist</option>
            <option value="surgeon">Surgeon</option>
            <option value="family">Family Member</option>
            <option value="emergency">Emergency Contact</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-secondary" onclick="document.getElementById('em-form').classList.add('hidden')">Cancel</button>
        <button class="btn btn-primary" id="em-save-btn" onclick="EmergencyPage.save()"><i data-lucide="save"></i>Save Contact</button>
      </div>`;
    App.refreshIcons();
    document.getElementById('em-name').focus();
  },

  async save() {
    const name = document.getElementById('em-name').value.trim();
    const phone = document.getElementById('em-phone').value.trim();
    const relationship = document.getElementById('em-rel').value;
    const msg = document.getElementById('em-msg');

    if (!name || !phone) {
      msg.innerHTML = `<div style="padding:10px 16px;background:#ef444422;border:1px solid #ef4444;border-radius:8px;color:#ef4444;font-size:0.9rem">⚠️ Please fill in both Name and Phone Number.</div>`;
      return;
    }

    const btn = document.getElementById('em-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Saving...';
    App.refreshIcons();

    const { error } = await sb.from('emergency_contacts').insert({
      user_id: App.user.id,
      name,
      phone,
      relationship
    });

    if (error) {
      msg.innerHTML = `<div style="padding:10px 16px;background:#ef444422;border:1px solid #ef4444;border-radius:8px;color:#ef4444;font-size:0.9rem">❌ Failed to save: ${error.message}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="save"></i>Save Contact';
      App.refreshIcons();
      return;
    }

    msg.innerHTML = `<div style="padding:10px 16px;background:#10b98122;border:1px solid #10b981;border-radius:8px;color:#10b981;font-size:0.9rem">✅ Contact saved successfully!</div>`;
    document.getElementById('em-form').classList.add('hidden');
    setTimeout(() => { msg.innerHTML = ''; }, 4000);
    await this.load();
  },

  async del(id) {
    if (confirm('Remove this contact?')) {
      const { error } = await sb.from('emergency_contacts').delete().eq('id', id);
      if (error) {
        document.getElementById('em-msg').innerHTML = `<div style="padding:10px 16px;background:#ef444422;border:1px solid #ef4444;border-radius:8px;color:#ef4444;font-size:0.9rem">❌ Could not delete: ${error.message}</div>`;
        return;
      }
      await this.load();
    }
  },
};
