// Journey Milestones
const JourneyPage = {
  async render() {
    const el = document.getElementById('page-content');
    el.innerHTML = `
      <div class="page-header rich">
        <div>
          <div class="header-eyebrow"><i data-lucide="trophy"></i> Recovery milestones</div>
          <h1>Recovery Journey</h1>
          <p>Capture meaningful wins, clinical milestones, and personal goals throughout rehab.</p>
        </div>
        <button class="btn btn-primary" onclick="JourneyPage.showForm()" id="j-add-btn"><i data-lucide="plus"></i>Log Milestone</button>
      </div>
      <div id="j-form" class="hidden card" style="margin-bottom:20px"></div>
      <div class="timeline" id="j-timeline"></div>`;
    App.refreshIcons();
    await this.load();
  },

  async load() {
    const { data } = await sb.from('recovery_journey').select('*').eq('user_id', App.user.id).order('milestone_date', { ascending: false });
    const t = document.getElementById('j-timeline');
    if (!data || !data.length) {
      t.innerHTML = '<div class="card empty-state"><i data-lucide="trophy"></i><h3>No milestones yet</h3><p>Start with a small win: lower pain, better sleep, more steps, or a completed physio session.</p></div>';
      App.refreshIcons();
      return;
    }
    const typeIcons = {
      physical: { icon: 'dumbbell', color: '#6366f1', bg: '#eef2ff' },
      clinical: { icon: 'stethoscope', color: '#10b981', bg: '#ecfdf5' },
      personal: { icon: 'target', color: '#f59e0b', bg: '#fffbeb' },
      default:  { icon: 'star', color: '#8b5cf6', bg: '#f5f3ff' }
    };

    t.innerHTML = data.map((m, index) => {
      const typeStr = (m.milestone_type || 'physical').toLowerCase();
      const style = typeIcons[typeStr] || typeIcons.default;
      const isLast = index === data.length - 1;
      
      return `
      <div style="position:relative; padding-left:40px; margin-bottom:24px;">
        ${!isLast ? `<div style="position:absolute; left:11px; top:36px; bottom:-36px; width:2px; background: linear-gradient(to bottom, ${style.color}66, transparent); z-index:0"></div>` : ''}
        
        <div style="position:absolute; left:0; top:8px; width:24px; height:24px; border-radius:50%; background:${style.color}; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 0 0 4px ${style.bg}; z-index:1">
          <i data-lucide="${style.icon}" style="width:12px; height:12px;"></i>
        </div>
        
        <div class="card" style="padding:20px; position:relative; border-left: 4px solid ${style.color}; transition: transform 0.2s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="font-size:12px; color:var(--ink-soft); font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
              ${new Date(m.milestone_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
            <span style="font-size:10px; font-weight:800; text-transform:uppercase; background:${style.bg}; color:${style.color}; padding:4px 10px; border-radius:12px;">
              ${typeStr}
            </span>
          </div>
          <div style="font-size:18px; font-weight:800; color:var(--ink); margin-bottom: ${m.description ? '8px' : '0'};">
            ${m.title}
          </div>
          ${m.description ? `<p style="color:var(--ink-soft); font-size:14px; line-height:1.5;">${m.description}</p>` : ''}
        </div>
      </div>
    `}).join('');
    App.refreshIcons();
  },

  showForm() {
    const f = document.getElementById('j-form');
    f.classList.remove('hidden');
    f.innerHTML = `<div class="form-row">
        <div class="form-group"><label class="form-label">Milestone Title</label><input class="form-input" id="j-title" placeholder="Walked without crutches"></div>
        <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="j-type"><option value="achievement">Achievement</option><option value="clinical_milestone">Clinical Milestone</option><option value="personal_goal">Personal Goal</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="j-desc" placeholder="What changed today?"></textarea></div>
      <div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="document.getElementById('j-form').classList.add('hidden')">Cancel</button><button class="btn btn-primary" onclick="JourneyPage.save()"><i data-lucide="save"></i>Save</button></div>`;
    App.refreshIcons();
  },

  async save() {
    const title = document.getElementById('j-title').value.trim();
    if (!title) {
      alert('Please enter a title for your milestone.');
      return;
    }
    const btn = document.querySelector('#j-form .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const { error } = await sb.from('recovery_journey').insert({
      user_id: App.user.id,
      title,
      description: document.getElementById('j-desc').value,
      milestone_type: document.getElementById('j-type').value,
      milestone_date: (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })(),
    });

    if (error) {
      alert(`Failed to save milestone: ${error.message}`);
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i>Save'; App.refreshIcons(); }
      return;
    }
    document.getElementById('j-form').classList.add('hidden');
    await this.load();
  },
};
