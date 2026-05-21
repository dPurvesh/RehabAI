// RehabAI App - Router & Auth
const App = {
  user: null,
  profile: null,
  patientProfile: null,
  pages: {
    dashboard: DashboardPage,
    checkin: CheckinPage,
    voicecoach: VoiceCoachPage,
    rpg: RPGDashboardPage,
    meals: MealPlannerPage,
    chat: ChatPage,
    progress: ProgressPage,
    journey: JourneyPage,
    report: ReportPage,
    emergency: EmergencyPage,
    profile: ProfilePage,
    physio: PhysioDashboardPage,
  },
  currentPage: null,
  routeBound: false,

  async init() {
    sb.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        App.user = session.user;
        await App.fetchProfiles(session.user.id);
        if (App.profile?.role === 'physio' && !App.profile?.onboarding_done) {
          App.showPhysioOnboarding();
        } else if (App.profile?.role === 'physio') {
          App.showApp();
        } else if (!App.patientProfile && !App.profile?.onboarding_done) {
          App.showOnboarding();
        } else {
          App.showApp();
        }
      } else {
        App.user = null;
        App.profile = null;
        App.patientProfile = null;
        App.showAuth();
      }
    });

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      App.user = session.user;
      await App.fetchProfiles(session.user.id);
      if (App.profile?.role === 'physio' && !App.profile?.onboarding_done) {
        App.showPhysioOnboarding();
      } else if (App.profile?.role === 'physio') {
        App.showApp();
      } else if (!App.patientProfile && !App.profile?.onboarding_done) {
        App.showOnboarding();
      } else {
        App.showApp();
      }
    } else {
      App.showAuth();
    }
  },

  async fetchProfiles(userId) {
    try {
      const { data: p } = await sb.from('profiles').select('*').eq('id', userId).single();
      App.profile = p;
      if (p?.role !== 'physio') {
        const { data: pp } = await sb.from('patient_profiles').select('*').eq('user_id', userId).single();
        App.patientProfile = pp;
      }
    } catch (e) {
      console.log('Profile fetch:', e);
    }
  },

  showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    LoginPage.render();
    App.refreshIcons();
  },

  showOnboarding() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    OnboardingPage.render();
    App.refreshIcons();
  },

  showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');

    // Build sidebar based on role
    this.buildSidebar();

    const isPhysio = App.profile?.role === 'physio';

    // Hide tutorial elements for physio
    const tutBtn = document.getElementById('sidebar-tutorial');
    const fabBtn = document.getElementById('tutorial-fab');
    if (tutBtn) tutBtn.style.display = isPhysio ? 'none' : '';
    if (fabBtn) fabBtn.style.display = isPhysio ? 'none' : '';

    if (!App.routeBound) {
      window.addEventListener('hashchange', () => App.route());
      App.routeBound = true;
    }
    document.getElementById('sidebar-signout').onclick = () => App.signOut();
    if (!isPhysio && tutBtn) tutBtn.onclick = () => Tutorial.start({ manual: true });
    if (!isPhysio && fabBtn) fabBtn.onclick = () => Tutorial.start({ manual: true });

    App.route();
    if (!isPhysio && typeof Tutorial !== 'undefined') Tutorial.maybeAutoStart();
  },

  showPhysioOnboarding() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    PhysioOnboardingPage.render();
    App.refreshIcons();
  },

  buildSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    if (App.profile?.role === 'physio') {
      nav.innerHTML = `
        <a href="#physio" class="nav-item active" data-page="physio">
          <i data-lucide="layout-dashboard"></i><span class="nav-label">Dashboard</span>
        </a>
        <a href="#profile" class="nav-item" data-page="profile">
          <i data-lucide="user-round"></i><span class="nav-label">Profile</span>
        </a>`;
    } else {
      nav.innerHTML = `
        <a href="#dashboard" class="nav-item active" data-page="dashboard">
          <i data-lucide="layout-dashboard"></i><span class="nav-label">Dashboard</span>
        </a>
        <a href="#checkin" class="nav-item" data-page="checkin">
          <i data-lucide="clipboard-check"></i><span class="nav-label">Daily Check-in</span>
        </a>
        <a href="#voicecoach" class="nav-item" data-page="voicecoach">
          <i data-lucide="mic"></i><span class="nav-label">Voice Coach</span>
        </a>
        <a href="#rpg" class="nav-item" data-page="rpg">
          <i data-lucide="trophy"></i><span class="nav-label">RPG Stats</span>
        </a>
        <a href="#meals" class="nav-item" data-page="meals">
          <i data-lucide="utensils"></i><span class="nav-label">Meal Planner</span>
        </a>
        <a href="#chat" class="nav-item" data-page="chat">
          <i data-lucide="bot"></i><span class="nav-label">AI Assistant</span>
        </a>
        <a href="#progress" class="nav-item" data-page="progress">
          <i data-lucide="trending-up"></i><span class="nav-label">Progress</span>
        </a>
        <a href="#journey" class="nav-item" data-page="journey">
          <i data-lucide="map"></i><span class="nav-label">Journey</span>
        </a>
        <div class="nav-divider"></div>
        <a href="#report" class="nav-item" data-page="report">
          <i data-lucide="file-text"></i><span class="nav-label">Medical Report</span>
        </a>
        <a href="#emergency" class="nav-item" data-page="emergency">
          <i data-lucide="siren"></i><span class="nav-label">Emergency</span>
        </a>
        <a href="#profile" class="nav-item" data-page="profile">
          <i data-lucide="user-round"></i><span class="nav-label">Profile</span>
        </a>`;
    }
    App.refreshIcons();
  },

  route() {
    const isPhysio = App.profile?.role === 'physio';
    const defaultPage = isPhysio ? '#physio' : '#dashboard';
    const hash = (location.hash || defaultPage).replace('#', '');
    const page = App.pages[hash];
    if (page) {
      App.currentPage = hash;
      document.querySelectorAll('.nav-item').forEach((n) => {
        n.classList.toggle('active', n.dataset.page === hash);
      });
      // Smooth page transition
      const content = document.getElementById('page-content');
      content.style.opacity = '0';
      content.style.transform = 'translateY(12px)';
      setTimeout(() => {
        page.render();
        App.refreshIcons();
        requestAnimationFrame(() => {
          content.style.transition = 'opacity 350ms ease, transform 350ms ease';
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });
      }, 120);
    } else {
      location.hash = defaultPage;
    }
  },

  refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
    }
  },

  async signOut() {
    await sb.auth.signOut();
    App.user = null;
    App.profile = null;
    App.patientProfile = null;
    location.hash = '';
    App.showAuth();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
