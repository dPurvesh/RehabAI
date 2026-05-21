// Login & Register Page
const LoginPage = {
  selectedRole: 'patient',

  render() {
    const c = document.getElementById('auth-form-container');
    c.innerHTML = `
      <div class="auth-card">
        <h2 id="auth-heading">Welcome back</h2>
        <p class="sub" id="auth-sub">Sign in to continue your recovery journey.</p>
        <div class="auth-error" id="auth-error"></div>
        <form id="auth-form">
          <div class="form-group" id="name-group" style="display:none">
            <label class="form-label">Full name</label>
            <input class="form-input" id="auth-name" placeholder="Aarav Sharma">
          </div>
          <div class="form-group" id="role-group" style="display:none">
            <label class="form-label">I am a</label>
            <div class="role-toggle" id="role-toggle">
              <button type="button" class="role-btn active" data-role="patient" onclick="LoginPage.setRole('patient',this)">
                <i data-lucide="user-round"></i> Patient
              </button>
              <button type="button" class="role-btn" data-role="physio" onclick="LoginPage.setRole('physio',this)">
                <i data-lucide="stethoscope"></i> Physiotherapist
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" id="auth-email" type="email" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="auth-password" type="password" placeholder="Enter your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="auth-submit">
            <i data-lucide="log-in"></i><span>Sign In</span>
          </button>
        </form>
        <div class="auth-toggle">
          <span id="auth-toggle-text">Don't have an account?</span>
          <a id="auth-toggle-link"> Sign Up</a>
        </div>
      </div>`;

    let isLogin = true;
    const toggle = () => {
      isLogin = !isLogin;
      document.getElementById('auth-heading').textContent = isLogin ? 'Welcome back' : 'Create your RehabAI account';
      document.getElementById('auth-sub').textContent = isLogin
        ? 'Sign in to continue your recovery journey.'
        : 'Join as a patient or physiotherapist.';
      document.getElementById('auth-submit').innerHTML = isLogin
        ? '<i data-lucide="log-in"></i><span>Sign In</span>'
        : '<i data-lucide="user-plus"></i><span>Create Account</span>';
      document.getElementById('auth-toggle-text').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
      document.getElementById('auth-toggle-link').textContent = isLogin ? ' Sign Up' : ' Sign In';
      document.getElementById('name-group').style.display = isLogin ? 'none' : 'block';
      document.getElementById('role-group').style.display = isLogin ? 'none' : 'block';
      App.refreshIcons();
    };

    document.getElementById('auth-toggle-link').onclick = (e) => {
      e.preventDefault();
      toggle();
    };

    document.getElementById('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const pass = document.getElementById('auth-password').value;
      const errEl = document.getElementById('auth-error');
      const btn = document.getElementById('auth-submit');
      btn.disabled = true;
      btn.textContent = 'Please wait...';
      errEl.style.display = 'none';

      try {
        if (isLogin) {
          const { error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
        } else {
          const name = document.getElementById('auth-name').value.trim();
          if (!name) throw { message: 'Name is required' };
          const { error } = await sb.auth.signUp({
            email,
            password: pass,
            options: { data: { full_name: name, role: LoginPage.selectedRole } }
          });
          if (error) throw error;
        }
      } catch (err) {
        const message = err?.message === 'Failed to fetch'
          ? 'Unable to connect to Supabase. Verify project URL, anon key, and internet access.'
          : (err.message || 'Something went wrong');
        errEl.textContent = message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = isLogin
          ? '<i data-lucide="log-in"></i><span>Sign In</span>'
          : '<i data-lucide="user-plus"></i><span>Create Account</span>';
        App.refreshIcons();
      }
    };

    App.refreshIcons();
  },

  setRole(role, btn) {
    this.selectedRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },
};
