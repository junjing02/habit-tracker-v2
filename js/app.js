/**
 * Habit Tracker v2 - Central Application Coordinator (app.js)
 * Orchestrates rendering, page views, habit tree growth, custom charts, Web Audio sounds, canvas confetti, remark modals, and calendar grids.
 */

// Sound Manager Instance
class SoundEffectManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  
  playTone(freq, type, duration, delay = 0) {
    if (!this.enabled) return;
    this.init();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.error("Audio synth error", e);
      }
    }, delay * 1000);
  }
  
  playCheck() {
    this.playTone(523.25, 'sine', 0.12, 0); // C5
    this.playTone(659.25, 'sine', 0.18, 0.04); // E5
  }
  
  playUncheck() {
    this.playTone(392.00, 'sine', 0.10, 0); // G4
    this.playTone(329.63, 'sine', 0.15, 0.04); // E4
  }
  
  playClick() {
    this.playTone(600, 'sine', 0.03, 0);
  }
}

// Confetti System for Celebration
class ConfettiManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.active = false;
    this.looping = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst() {
    this.particles = [];
    this.active = true;
    
    const colors = ['#f43f5e', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: 0,
        y: window.innerHeight * 0.8,
        vx: Math.random() * 12 + 6,
        vy: -Math.random() * 20 - 5,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: window.innerWidth,
        y: window.innerHeight * 0.8,
        vx: -Math.random() * 12 - 6,
        vy: -Math.random() * 20 - 5,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1
      });
    }

    if (!this.looping) {
      this.loop();
    }
  }

  loop() {
    this.looping = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    let alive = false;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.vx *= 0.97;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.01;

      if (p.opacity > 0 && p.y < window.innerHeight + 50) {
        alive = true;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        this.ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.looping = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Global UI Coordinator
class AppController {
  constructor() {
    this.currentDate = new Date();
    this.currentView = 'dashboard';
    this.sound = new SoundEffectManager();
    this.confetti = null;
    this.activeContextMenuId = null;
    this.tooltipTimeout = null;
    this.guestSandboxMode = false;

    this.initElements();
    this.initEvents();
    this.initSupabase();
    this.initRouter();
  }

  initElements() {
    this.canvas = document.getElementById('confetti-canvas');
    this.confetti = new ConfettiManager(this.canvas);

    // Dynamic label bindings
    this.dateLabel = document.getElementById('date-display-label');
    this.streakVal = document.getElementById('streak-val');
    this.overallProgressPct = document.getElementById('overall-progress-pct');
    this.overallProgressBar = document.getElementById('overall-progress-bar');
    this.overallProgressDesc = document.getElementById('overall-progress-desc');
    
    // View panels
    this.dashboardView = document.getElementById('dashboard-view');
    this.matrixView = document.getElementById('matrix-view');
    this.calendarView = document.getElementById('calendar-view');
    this.analyticsView = document.getElementById('analytics-view');
    
    // Checklists & grids
    this.todayHabitsList = document.getElementById('today-habits-list');
    this.matrixTable = document.getElementById('habit-matrix');
    
    // Modals
    this.habitModal = document.getElementById('habit-modal');
    this.confirmDeleteModal = document.getElementById('confirm-delete-modal');
    this.remarkModal = document.getElementById('remark-modal');
    
    // Form inputs
    this.habitForm = document.getElementById('habit-form');
    this.habitIdInput = document.getElementById('modal-habit-id');
    this.habitNameInput = document.getElementById('habit-name-input');
    this.habitEmojiInput = document.getElementById('modal-habit-emoji');
    this.recoveryForm = document.getElementById('recovery-form');
    this.recoveryPasswordInput = document.getElementById('recovery-password-input');

    // Remark inputs
    this.remarkHabitTitle = document.getElementById('remark-habit-title');
    this.remarkDateLabel = document.getElementById('remark-date-label');
    this.remarkInput = document.getElementById('habit-remark-input');
    this.modalRemarkHabitId = document.getElementById('modal-remark-habit-id');
    this.modalRemarkDate = document.getElementById('modal-remark-date');
    this.btnSaveRemark = document.getElementById('btn-save-remark');
    
    // Tooltip & Context menu
    this.tooltip = document.getElementById('tooltip-element');
    this.contextMenu = document.getElementById('habit-context-menu');

    // Habits Manager panel bindings
    this.managerTableBody = document.getElementById('manager-habits-list');
    this.btnManagerAddHabit = document.getElementById('btn-manager-add-habit');

    // Calendar Navigator labels
    this.calMonthYearLabel = document.getElementById('cal-month-year-label');
    this.calendarDaysGrid = document.getElementById('calendar-days-grid');
  }

  initEvents() {
    // Landing Page Event Listeners
    const landingBtnTry = document.getElementById('landing-btn-try');
    const landingBtnLogin = document.getElementById('landing-btn-login');
    const landingBtnNavLogin = document.getElementById('landing-btn-nav-login');
    const authModal = document.getElementById('auth-modal');
    const authStatusMessage = document.getElementById('auth-status-message');

    if (landingBtnTry) {
      landingBtnTry.addEventListener('click', () => {
        this.sound.playClick();
        window.location.hash = '#demo';
      });
    }

    const openAuthModal = () => {
      if (authModal) {
        authStatusMessage.textContent = '';
        authModal.classList.add('open');
      }
      this.sound.playClick();
    };

    if (landingBtnLogin) {
      landingBtnLogin.addEventListener('click', openAuthModal);
    }
    if (landingBtnNavLogin) {
      landingBtnNavLogin.addEventListener('click', openAuthModal);
    }

    // Heading Brand Logo Click Routing
    const brandLogoBtn = document.getElementById('brand-logo-btn');
    if (brandLogoBtn) {
      brandLogoBtn.addEventListener('click', () => {
        let isLoggedIn = false;
        try {
          if (window.supabaseMgr && typeof window.supabaseMgr.isAuthenticated === 'function') {
            isLoggedIn = window.supabaseMgr.isAuthenticated();
          }
        } catch (err) {
          console.error("Auth check failed", err);
        }

        if (this.sound && typeof this.sound.playClick === 'function') {
          this.sound.playClick();
        }

        if (isLoggedIn) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (window.location.hash === '#dashboard') {
            this.handleRouting();
          } else {
            window.location.hash = '#dashboard';
          }
        } else {
          if (window.location.hash === '#landing') {
            this.handleRouting();
          } else {
            window.location.hash = '#landing';
          }
        }
      });
    }

    const landingLogoBtn = document.getElementById('landing-logo-btn');
    if (landingLogoBtn) {
      landingLogoBtn.addEventListener('click', () => {
        if (this.sound && typeof this.sound.playClick === 'function') {
          this.sound.playClick();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.location.hash === '#landing') {
          this.handleRouting();
        } else {
          window.location.hash = '#landing';
        }
      });
    }

    // 0. Capturing event listener to prompt login when guest clicks anything interactive
    document.addEventListener('click', (e) => {
      // Safe check for Supabase Auth state
      let isLoggedIn = false;
      try {
        if (window.supabaseMgr && typeof window.supabaseMgr.isAuthenticated === 'function') {
          isLoggedIn = window.supabaseMgr.isAuthenticated();
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }

      if (isLoggedIn) {
        return;
      }

      // If we are in Sandbox Mode, allow checklist toggles and view switching, but restrict customizations
      if (this.guestSandboxMode) {
        const target = e.target;
        const isRestricted = target.closest(
          '#btn-add-habit, #btn-manager-add-habit, #cloud-sync-pill, .dropdown-item, .matrix-note-indicator, .habit-menu-btn, .today-habit-menu-btn'
        );
        if (isRestricted) {
          e.stopPropagation();
          e.preventDefault();
          if (authModal) {
            authModal.classList.add('open');
            if (authStatusMessage) {
              authStatusMessage.textContent = '☁️ Please log in or sign up to customize habits and sync data.';
              authStatusMessage.style.color = 'var(--text-main)';
            }
          }
          this.sound.playClick();
        }
        return; // Allow the click to proceed
      }

      const target = e.target;
      const isInteractive = target.closest(
        'button, input, select, textarea, a, [role="button"], .calendar-day-cell, .matrix-note-indicator, .habit-name-cell, .chart-point, #cloud-sync-pill'
      );
      
      const isInsideAuthModal = target.closest('#auth-modal');
      const isInsideLandingPage = target.closest('#landing-page');

      if (isInteractive && !isInsideAuthModal && !isInsideLandingPage) {
        e.stopPropagation();
        e.preventDefault();

        // Open auth modal
        if (authModal) {
          authModal.classList.add('open');
          if (authStatusMessage) {
            authStatusMessage.textContent = '☁️ Please log in or sign up to start tracking your habits.';
            authStatusMessage.style.color = 'var(--text-main)';
          }
        }
        
        this.sound.playClick();
      }
    }, true); // Capture phase!

    // 1. Navigation Tab Switching
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
        this.sound.playClick();

        // Close mobile sidebar if tab was clicked inside it
        if (e.currentTarget.closest('.sidebar-drawer')) {
          const drawer = document.getElementById('sidebar-drawer');
          const overlay = document.getElementById('drawer-overlay');
          if (drawer) drawer.classList.remove('open');
          if (overlay) overlay.classList.remove('open');
        }
      });
    });

    // Mobile Sidebar Drawer Actions
    const btnOpenSidebar = document.getElementById('btn-open-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const sidebarDrawer = document.getElementById('sidebar-drawer');

    if (btnOpenSidebar && sidebarDrawer && drawerOverlay) {
      btnOpenSidebar.addEventListener('click', () => {
        sidebarDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        if (this.sound && typeof this.sound.playClick === 'function') {
          this.sound.playClick();
        }
      });
    }

    const closeSidebar = () => {
      if (sidebarDrawer) sidebarDrawer.classList.remove('open');
      if (drawerOverlay) drawerOverlay.classList.remove('open');
      if (this.sound && typeof this.sound.playClick === 'function') {
        this.sound.playClick();
      }
    };

    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener('click', closeSidebar);
    }
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', closeSidebar);
    }

    // 2. Date Navigation
    document.getElementById('btn-date-prev').addEventListener('click', () => {
      this.currentDate.setDate(this.currentDate.getDate() - 1);
      this.render();
      this.sound.playClick();
    });
    document.getElementById('btn-date-next').addEventListener('click', () => {
      this.currentDate.setDate(this.currentDate.getDate() + 1);
      this.render();
      this.sound.playClick();
    });
    document.getElementById('btn-date-today').addEventListener('click', () => {
      this.currentDate = new Date();
      this.render();
      this.sound.playClick();
    });

    // Calendar Month Navigations
    document.getElementById('btn-cal-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
      this.sound.playClick();
    });
    document.getElementById('btn-cal-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
      this.sound.playClick();
    });

    // 3. Sound Toggle & Theme Toggle
    const soundBtn = document.getElementById('btn-toggle-sound');
    const drawerSoundBtn = document.getElementById('drawer-btn-toggle-sound');

    const updateSoundUI = () => {
      const iconText = this.sound.enabled ? '🔊' : '🔇';
      if (soundBtn) {
        const soundIcon = soundBtn.querySelector('i');
        if (soundIcon) soundIcon.textContent = iconText;
      }
      if (drawerSoundBtn) {
        const drawerSoundIcon = drawerSoundBtn.querySelector('i');
        if (drawerSoundIcon) drawerSoundIcon.textContent = iconText;
      }
    };

    const toggleSound = () => {
      this.sound.enabled = !this.sound.enabled;
      window.db.profile.soundEnabled = this.sound.enabled;
      window.db.saveProfile();
      updateSoundUI();
      if (this.sound.enabled && typeof this.sound.playCheck === 'function') {
        this.sound.playCheck();
      }
    };

    if (soundBtn) {
      soundBtn.addEventListener('click', toggleSound);
    }
    if (drawerSoundBtn) {
      drawerSoundBtn.addEventListener('click', toggleSound);
    }

    const themeSelect = document.getElementById('theme-selector');
    const landingThemeSelect = document.getElementById('landing-theme-selector');
    const drawerThemeSelect = document.getElementById('drawer-theme-selector');

    const changeTheme = (selectedTheme) => {
      document.body.setAttribute('data-theme', selectedTheme);
      window.db.profile.theme = selectedTheme;
      window.db.saveProfile();
      
      // Sync dropdown values
      if (themeSelect) themeSelect.value = selectedTheme;
      if (landingThemeSelect) landingThemeSelect.value = selectedTheme;
      if (drawerThemeSelect) drawerThemeSelect.value = selectedTheme;
      
      if (this.sound && typeof this.sound.playClick === 'function') {
        this.sound.playClick();
      }
    };

    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        changeTheme(e.target.value);
      });
    }

    if (landingThemeSelect) {
      landingThemeSelect.addEventListener('change', (e) => {
        changeTheme(e.target.value);
      });
    }

    if (drawerThemeSelect) {
      drawerThemeSelect.addEventListener('change', (e) => {
        changeTheme(e.target.value);
      });
    }

    // Load initial configurations
    this.sound.enabled = window.db.profile.soundEnabled;
    updateSoundUI();
    
    // Normalize saved theme to either dark (cyberpunk) or light
    let initialTheme = window.db.profile.theme;
    if (initialTheme !== 'light') {
      initialTheme = 'cyberpunk';
    }
    window.db.profile.theme = initialTheme;
    if (themeSelect) themeSelect.value = initialTheme;
    if (landingThemeSelect) landingThemeSelect.value = initialTheme;
    if (drawerThemeSelect) drawerThemeSelect.value = initialTheme;
    document.body.setAttribute('data-theme', initialTheme);

    // 4. Modal Triggers (Redirects click to switch to Manage Habits tab)
    document.getElementById('btn-add-habit').addEventListener('click', () => this.openManagerModal());
    const footerBtn = document.getElementById('btn-add-habit-footer');
    if (footerBtn) footerBtn.addEventListener('click', () => this.openManagerModal());
    this.btnManagerAddHabit.addEventListener('click', () => this.openHabitModal());


    const calTodayBtn = document.getElementById('btn-cal-today');
    if (calTodayBtn) {
      calTodayBtn.addEventListener('click', () => {
        this.currentDate = new Date();
        this.render();
        this.sound.playClick();
      });
    }

    const matrixPrevBtn = document.getElementById('btn-matrix-prev');
    if (matrixPrevBtn) {
      matrixPrevBtn.addEventListener('click', () => {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        this.render();
        this.sound.playClick();
      });
    }

    const matrixNextBtn = document.getElementById('btn-matrix-next');
    if (matrixNextBtn) {
      matrixNextBtn.addEventListener('click', () => {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        this.render();
        this.sound.playClick();
      });
    }

    const matrixTodayBtn = document.getElementById('btn-matrix-today');
    if (matrixTodayBtn) {
      matrixTodayBtn.addEventListener('click', () => {
        this.currentDate = new Date();
        this.render();
        this.sound.playClick();
      });
    }

    // 5. Close Modals
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('open');
          this.sound.playClick();
        }
      });
    });

    // 6. Form Submissions
    this.habitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveHabitForm();
    });

    // 7. Preset Emoji Clicking
    document.querySelectorAll('.emoji-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        this.habitEmojiInput.value = e.currentTarget.dataset.emoji;
      });
    });

    // 8. Save Remark Submit
    this.btnSaveRemark.addEventListener('click', () => {
      const hId = this.modalRemarkHabitId.value;
      const dateStr = this.modalRemarkDate.value;
      const remarkText = this.remarkInput.value.trim();
      
      window.db.setRemark(dateStr, hId, remarkText);
      this.remarkModal.classList.remove('open');
      this.render();
      this.sound.playCheck();
    });

    // 9. Document Close Click handlers
    document.addEventListener('click', (e) => {
      if (this.contextMenu.style.display === 'block' && !e.target.closest('#habit-context-menu') && !e.target.closest('.habit-name-cell')) {
        this.contextMenu.style.display = 'none';
        this.activeContextMenuId = null;
      }
    });

    // Context menu actions
    document.getElementById('menu-edit-habit').addEventListener('click', () => {
      if (this.activeContextMenuId) {
        this.openHabitModal(this.activeContextMenuId);
      }
      this.contextMenu.style.display = 'none';
    });

    document.getElementById('menu-delete-habit').addEventListener('click', () => {
      if (this.activeContextMenuId) {
        this.openDeleteConfirmModal(this.activeContextMenuId);
      }
      this.contextMenu.style.display = 'none';
    });
  }

  // Routing initialization
  initRouter() {
    window.addEventListener('hashchange', () => {
      this.handleRouting();
    });
    // Trigger initially
    this.handleRouting();
  }

  handleRouting() {
    const hash = window.location.hash || '#landing';
    const isLoggedIn = window.supabaseMgr && window.supabaseMgr.isAuthenticated();

    if (isLoggedIn) {
      // If logged in, #landing or #demo hashes automatically redirect to dashboard
      if (hash === '#landing' || hash === '#demo' || hash.startsWith('#demo-')) {
        window.location.hash = '#dashboard';
        return;
      }
      this.guestSandboxMode = false;
      window.db.guestSandboxMode = false;
      window.db.sandboxInitialized = false; // Reset sandbox state
      const targetView = hash.replace('#', '');
      if (['dashboard', 'matrix', 'calendar', 'analytics'].includes(targetView)) {
        this.switchView(targetView, false);
      } else {
        window.location.hash = '#dashboard';
      }
    } else {
      // If logged out
      if (hash === '#demo') {
        if (!this.guestSandboxMode) {
          window.db.sandboxInitialized = false; // Force re-initialization ONLY when entering from outside
        }
        this.guestSandboxMode = true;
        window.db.initSandboxMode();
        
        const landingEl = document.getElementById('landing-page');
        const appContainerEl = document.querySelector('.app-container');
        if (landingEl) landingEl.classList.add('hidden-view');
        if (appContainerEl) appContainerEl.classList.remove('hidden-view');
        this.switchView('dashboard', false);
      } else if (hash.startsWith('#demo-')) {
        this.guestSandboxMode = true;
        window.db.initSandboxMode(); // Will load cleanly without wiping memory since sandboxInitialized is true
        
        const landingEl = document.getElementById('landing-page');
        const appContainerEl = document.querySelector('.app-container');
        if (landingEl) landingEl.classList.add('hidden-view');
        if (appContainerEl) appContainerEl.classList.remove('hidden-view');

        const subView = hash.replace('#demo-', '');
        if (['dashboard', 'matrix', 'calendar', 'analytics'].includes(subView)) {
          this.switchView(subView, false);
        } else {
          this.switchView('dashboard', false);
        }
      } else {
        // Show landing page
        this.guestSandboxMode = false;
        window.db.guestSandboxMode = false;
        window.db.sandboxInitialized = false; // Reset sandbox state
        
        const landingEl = document.getElementById('landing-page');
        const appContainerEl = document.querySelector('.app-container');
        if (landingEl) landingEl.classList.remove('hidden-view');
        if (appContainerEl) appContainerEl.classList.add('hidden-view');
        
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('open');
      }
    }
  }

  // View Swapper
  switchView(viewName, updateHash = true) {
    this.currentView = viewName;
    
    document.querySelectorAll('.view-tab').forEach(tab => {
      if (tab.dataset.view === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.dashboardView.style.display = viewName === 'dashboard' ? 'grid' : 'none';
    this.matrixView.style.display = viewName === 'matrix' ? 'block' : 'none';
    this.calendarView.style.display = viewName === 'calendar' ? 'block' : 'none';
    this.analyticsView.style.display = viewName === 'analytics' ? 'flex' : 'none';

    this.render();

    if (updateHash) {
      if (this.guestSandboxMode) {
        window.location.hash = `#demo-${viewName}`;
      } else {
        window.location.hash = `#${viewName}`;
      }
    }
  }

  // Render Engine
  render() {
    this.renderHeader();
    
    if (this.currentView === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentView === 'matrix') {
      this.renderMatrix();
    } else if (this.currentView === 'calendar') {
      this.renderCalendar();
    } else if (this.currentView === 'analytics') {
      this.renderAnalytics();
    }

    // Always keep manager list updated
    this.renderHabitsManager();
  }

  renderHeader() {
    const isAuthenticated = (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) || this.guestSandboxMode;
    const profile = window.db.profile;
    this.streakVal.textContent = `${isAuthenticated ? (profile.currentStreak || 0) : 0} Days`;

    // Overall Progress Ring
    const dateStr = window.db.getFormattedDate(this.currentDate);
    const dayRate = isAuthenticated ? window.db.getDayCompletionRate(dateStr) : 0;
    const completedPct = Math.round(dayRate * 100);

    this.overallProgressPct.textContent = `${completedPct}%`;
    
    const circle = this.overallProgressBar;
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const offset = circumference - (dayRate * circumference);
    circle.style.strokeDashoffset = offset;

    const dayEnd = new Date(dateStr + "T23:59:59").getTime();
    const activeHabits = window.db.getActiveHabits().filter(h => h.createdAt <= dayEnd);
    let completedCount = 0;
    if (isAuthenticated) {
      const dayRecordsData = window.db.history[dateStr] || {};
      activeHabits.forEach(h => {
        const rec = dayRecordsData[h.id];
        const completed = rec && typeof rec === 'object' ? rec.completed : Boolean(rec);
        if (completed) {
          completedCount++;
        }
      });
    }

    this.overallProgressDesc.textContent = `${completedCount} of ${activeHabits.length} habits completed`;
    
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    this.dateLabel.textContent = this.currentDate.toLocaleDateString('en-US', options);
  }

  // Dashboard Checklist
  renderDashboard() {
    const isAuthenticated = (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) || this.guestSandboxMode;
    const dateStr = window.db.getFormattedDate(this.currentDate);
    const dayRecords = isAuthenticated ? (window.db.history[dateStr] || {}) : {};
    
    // Filter active habits that existed on the selected date
    const targetDateEnd = new Date(dateStr + "T23:59:59").getTime();
    const activeHabits = window.db.getActiveHabits().filter(h => h.createdAt <= targetDateEnd);

    // Check if target date is in the future
    const todayStr = window.db.getFormattedDate(new Date());
    const isFutureDate = dateStr > todayStr;

    this.todayHabitsList.innerHTML = '';

    if (activeHabits.length === 0) {
      this.todayHabitsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h4 class="empty-state-title">No Habits Tracked For This Date</h4>
          <p class="empty-state-desc">Configure habits on the Dashboard tab to start tracking.</p>
          <button class="btn-primary" id="btn-add-habit-today">
            <span>⚙️</span> Habit settings
          </button>
        </div>
      `;
      const newBtn = document.getElementById('btn-add-habit-today');
      if (newBtn) newBtn.addEventListener('click', () => this.openManagerModal());
      
      this.renderHabitTree(0);
      return;
    }

    activeHabits.forEach(habit => {
      const record = dayRecords[habit.id];
      let isCompleted = false;
      let remarkText = '';

      if (record && typeof record === 'object') {
        isCompleted = record.completed;
        remarkText = record.remark || '';
      } else if (record !== undefined) {
        isCompleted = Boolean(record);
      }

      const card = document.createElement('div');
      card.className = `today-habit-card`;
      if (isFutureDate) {
        card.style.opacity = '0.5';
      }

      const meta = document.createElement('div');
      meta.className = 'habit-meta';
      meta.innerHTML = `
        <div class="habit-emoji-wrapper">${habit.emoji}</div>
        <div class="habit-details">
          <span class="habit-card-name">${habit.name}</span>
        </div>
      `;
      card.appendChild(meta);

      const action = document.createElement('div');
      action.className = 'habit-action-area';

      // 1. Remark/Note button (only visible if there is an existing note)
      if (!isCompleted && !isFutureDate && remarkText) {
        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn-note-action active-note';
        noteBtn.innerHTML = '📝';
        noteBtn.title = 'Edit missed reason';
        
        noteBtn.addEventListener('click', () => {
          this.openRemarkModal(habit.id, dateStr);
        });

        noteBtn.addEventListener('mouseenter', (e) => {
          if (window.innerWidth <= 600) return;
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          const target = e.currentTarget;
          this.tooltipTimeout = setTimeout(() => {
            const rect = target.getBoundingClientRect();
            this.showTooltip(`Note: "${remarkText}"`, rect.left + rect.width / 2, rect.top - 6);
          }, 400);
        });
        noteBtn.addEventListener('mouseleave', () => {
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          this.hideTooltip();
        });

        action.appendChild(noteBtn);
      } else if (isCompleted && remarkText) {
        const noteBtn = document.createElement('div');
        noteBtn.className = 'btn-note-action active-note';
        noteBtn.style.cursor = 'default';
        noteBtn.innerHTML = '📝';
        
        noteBtn.addEventListener('mouseenter', (e) => {
          if (window.innerWidth <= 600) return;
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          const target = e.currentTarget;
          this.tooltipTimeout = setTimeout(() => {
            const rect = target.getBoundingClientRect();
            this.showTooltip(`Note: "${remarkText}"`, rect.left + rect.width / 2, rect.top - 6);
          }, 400);
        });
        noteBtn.addEventListener('mouseleave', () => {
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          this.hideTooltip();
        });
        action.appendChild(noteBtn);
      }

      // 2. Checkbox
      const chk = document.createElement('button');
      chk.className = `checkbox-check ${isCompleted ? 'checked' : ''}`;
      
      if (isFutureDate) {
        chk.style.cursor = 'not-allowed';
        chk.style.opacity = '0.5';
      } else {
        chk.addEventListener('click', () => {
          this.updateProgress(habit.id, !isCompleted);
        });
      }

      action.appendChild(chk);
      card.appendChild(action);
      this.todayHabitsList.appendChild(card);
    });

    const weeklyRate = this.calculateWeeklyCompletionRate();
    this.renderHabitTree(weeklyRate);
  }

  // Weekly Matrix Spreadsheet
  renderMatrix() {
    const activeHabits = window.db.getActiveHabits();
    
    // Mon-Sun of current week
    const startOfWeek = new Date(this.currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
    startOfWeek.setDate(diff);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d);
    }

    const todayStr = window.db.getFormattedDate(new Date());

    let endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const weekLabel = document.getElementById('matrix-week-label');
    if (weekLabel) {
      weekLabel.textContent = `${startStr} - ${endStr}`;
    }

    let theadHtml = `
      <tr>
        <th style="width: 320px; text-align: left;">Habit</th>
        ${weekDates.map(d => {
          const isToday = window.db.getFormattedDate(d) === todayStr;
          let cls = isToday ? 'class="today-header text-center" style="width: 75px;"' : 'class="text-center" style="width: 75px;"';

          return `<th ${cls}>
            ${d.toLocaleDateString('en-US', { weekday: 'short' })}<br>
            <span style="font-size: 0.75rem; font-weight: 500; opacity: 0.8">${d.getDate()}</span>
          </th>`;
        }).join('')}
        <th class="text-center" style="width: 90px;">Progress</th>
      </tr>
    `;

    let tbodyHtml = '';
    if (activeHabits.length === 0) {
      tbodyHtml = `
        <tr>
          <td colspan="9" class="text-center" style="padding: 40px; color: var(--text-muted);">
            No habits tracked. Click "Habit settings" below.
          </td>
        </tr>
      `;
    } else {
      activeHabits.forEach(habit => {
        let rowHtml = `
          <tr>
            <td>
              <div class="habit-name-cell" data-id="${habit.id}">
                <span>${habit.emoji}</span>
                <span class="habit-name-text" style="font-weight: 700;">${habit.name}</span>
              </div>
            </td>
        `;

        let completedDaysCount = 0;
        let trackedDaysCount = 0;

        weekDates.forEach(d => {
          const dateStr = window.db.getFormattedDate(d);
          const isFuture = dateStr > todayStr;
          const cellDateEnd = new Date(dateStr + "T23:59:59").getTime();
          const isExisted = habit.createdAt <= cellDateEnd;

          const record = window.db.history[dateStr] && window.db.history[dateStr][habit.id];
          let isCompleted = false;
          let remarkText = '';

          if (record && typeof record === 'object') {
            isCompleted = record.completed;
            remarkText = record.remark || '';
          } else if (record !== undefined) {
            isCompleted = Boolean(record);
          }
          
          if (isExisted) {
            trackedDaysCount++;
            if (isCompleted) completedDaysCount++;
          }

          let cellInner = '';
          if (!isExisted) {
            // Habit did not exist yet (Renders blank dash taking identical spacing)
            cellInner = `
              <div class="matrix-cell-content">
                <span style="color: var(--text-muted); opacity: 0.25; font-weight: 700;">—</span>
                <span class="matrix-note-indicator" style="visibility: hidden;">📝</span>
              </div>
            `;
            rowHtml += `<td class="future-cell" style="text-align: center;">${cellInner}</td>`;
          } else if (isFuture) {
            cellInner = `
              <div class="matrix-cell-content">
                <button class="matrix-checkbox" disabled></button>
                <span class="matrix-note-indicator" style="visibility: hidden;">📝</span>
              </div>
            `;
            rowHtml += `<td class="future-cell">${cellInner}</td>`;
          } else {
            let noteContent = '📝';
            let visibilityVal = 'hidden';
            let classVal = 'matrix-note-indicator';

            if (remarkText) {
              visibilityVal = 'visible';
            }

            cellInner = `
              <div class="matrix-cell-content">
                <button class="matrix-checkbox ${isCompleted ? 'checked' : ''}" data-date="${dateStr}" data-id="${habit.id}"></button>
                <span class="${classVal}" style="visibility: ${visibilityVal}" data-id="${habit.id}" data-date="${dateStr}" data-remark="${remarkText || ''}">${noteContent}</span>
              </div>
            `;
            rowHtml += `<td>${cellInner}</td>`;
          }
        });

        const progressPct = trackedDaysCount > 0 ? Math.round((completedDaysCount / trackedDaysCount) * 100) : 0;

        rowHtml += `
          <td>
            <div style="display: flex; flex-direction: column; align-items: center;">
              <span style="font-weight: 700; font-size: 0.8rem;">${progressPct}%</span>
              <div class="row-progress-bar-container" style="height: 4px;">
                <div class="row-progress-bar-fill" style="width: ${progressPct}%;"></div>
              </div>
            </div>
          </td>
        </tr>`;

        tbodyHtml += rowHtml;
      });
    }

    this.matrixTable.querySelector('thead').innerHTML = theadHtml;
    this.matrixTable.querySelector('tbody').innerHTML = tbodyHtml;

    this.matrixTable.querySelectorAll('.matrix-checkbox').forEach(chk => {
      if (!chk.hasAttribute('disabled')) {
        chk.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          const date = e.currentTarget.dataset.date;
          const isCompleted = e.currentTarget.classList.contains('checked');
          this.updateProgress(id, !isCompleted, date);
        });
      }
    });

    this.matrixTable.querySelectorAll('.matrix-note-indicator').forEach(ind => {
      ind.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const date = e.currentTarget.dataset.date;
        this.openRemarkModal(id, date);
      });

      const remark = ind.dataset.remark;
      if (remark) {
        ind.addEventListener('mouseenter', (e) => {
          if (window.innerWidth <= 600) return;
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          const target = e.currentTarget;
          this.tooltipTimeout = setTimeout(() => {
            const rect = target.getBoundingClientRect();
            this.showTooltip(`Note: "${remark}"`, rect.left + rect.width / 2, rect.top - 6);
          }, 400);
        });
        ind.addEventListener('mouseleave', () => {
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          this.hideTooltip();
        });
      }
    });

    // Habit names in matrix are read-only
  }

  // Calendar View Month Renderer
  renderCalendar() {
    const grid = this.calendarDaysGrid;
    grid.innerHTML = '';

    const label = this.calMonthYearLabel;
    const month = this.currentDate.getMonth();
    const year = this.currentDate.getFullYear();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    label.textContent = `${monthNames[month]} ${year}`;

    // Get first day of current month
    const firstDay = new Date(year, month, 1);
    let startDayIdx = firstDay.getDay() - 1; // Mon-Sun index (0-6)
    if (startDayIdx < 0) startDayIdx = 6;    // Sunday index adjustment

    // Total days in month & previous month
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Fill preceding days of previous month
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="calendar-day-num">${prevMonthDays - i}</span>`;
      grid.appendChild(cell);
    }

    const todayStr = window.db.getFormattedDate(new Date());

    // Fill current month days
    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const cellDateStr = window.db.getFormattedDate(cellDate);
      
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (cellDateStr === todayStr) {
        cell.classList.add('today-cell');
      }

      // Check completions on that day
      const dayEnd = new Date(cellDateStr + "T23:59:59").getTime();
      const habitsOnDay = window.db.getActiveHabits().filter(h => h.createdAt <= dayEnd);
      
      let completedCount = 0;
      let totalCount = habitsOnDay.length;
      
      const dayRecords = window.db.history[cellDateStr] || {};
      
      habitsOnDay.forEach(h => {
        const rec = dayRecords[h.id];
        const completed = rec && typeof rec === 'object' ? rec.completed : Boolean(rec);
        if (completed) completedCount++;
      });

      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Add cell progress coloring class based on 5 different tiers
      if (totalCount > 0 && cellDateStr <= todayStr) {
        if (rate > 80) {
          cell.classList.add('cell-lvl-5');
        } else if (rate > 60) {
          cell.classList.add('cell-lvl-4');
        } else if (rate > 40) {
          cell.classList.add('cell-lvl-3');
        } else if (rate > 20) {
          cell.classList.add('cell-lvl-2');
        } else {
          cell.classList.add('cell-lvl-1');
        }
      }

      // Habits circular mini progress ring status indicator
      let progressRingHtml = '';
      if (totalCount > 0 && cellDateStr <= todayStr) {
        let lvlClass = 'ring-lvl-1';
        if (rate > 80) {
          lvlClass = 'ring-lvl-5';
        } else if (rate > 60) {
          lvlClass = 'ring-lvl-4';
        } else if (rate > 40) {
          lvlClass = 'ring-lvl-3';
        } else if (rate > 20) {
          lvlClass = 'ring-lvl-2';
        }

        const circ = 50.27;
        const offset = circ - (rate / 100 * circ);
        
        // Show a mini checkmark inside the progress ring when all habits are completed
        const checkmarkHtml = (completedCount === totalCount)
          ? `<path class="ring-checkmark" d="M6.5 10 L9 12.5 L13.5 7.5" transform="rotate(90 10 10)"></path>`
          : '';

        progressRingHtml = `
          <svg class="calendar-progress-ring ${lvlClass}" width="20" height="20" viewBox="0 0 20 20" title="${completedCount}/${totalCount} completed">
            <circle class="ring-bg" cx="10" cy="10" r="8"></circle>
            <circle class="ring-bar" cx="10" cy="10" r="8" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
            ${checkmarkHtml}
          </svg>
        `;
      }

      const todayTag = cellDateStr === todayStr ? `<span class="calendar-today-tag">Today</span>` : '';
      cell.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="calendar-day-num">${d}</span>
            ${todayTag}
          </div>
          ${progressRingHtml}
        </div>
      `;

      // Hover tooltip: only shows the percentage and the missed habits (for current date and past only)
      if (totalCount > 0 && cellDateStr <= todayStr) {
        cell.addEventListener('mouseenter', (e) => {
          if (window.innerWidth <= 600) return;
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          const target = e.currentTarget;
          this.tooltipTimeout = setTimeout(() => {
            const failedTasks = [];
            habitsOnDay.forEach(h => {
              const rec = dayRecords[h.id];
              const completed = rec && typeof rec === 'object' ? rec.completed : Boolean(rec);
              if (!completed) {
                failedTasks.push(`${h.emoji} ${h.name}`);
              }
            });

            let tooltipHtml = `<strong>${rate}% Completed</strong>`;
            if (failedTasks.length > 0) {
              tooltipHtml += `<br><span style="color:#f43f5e; font-weight:700;">Missed:</span><br>${failedTasks.join('<br>')}`;
            } else {
              tooltipHtml += `<br><span style="color:#10b981; font-weight:700;">Perfect Day! ✨</span>`;
            }

            const rect = target.getBoundingClientRect();
            this.showTooltip(tooltipHtml, rect.left + rect.width / 2, rect.top - 6);
          }, 400);
        });

        cell.addEventListener('mouseleave', () => {
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          this.hideTooltip();
        });
      }

      // Cell redirects date context to Checklist Focus view
      cell.addEventListener('click', () => {
        this.currentDate = cellDate;
        this.switchView('dashboard');
        this.sound.playClick();
      });

      grid.appendChild(cell);
    }

    // Fill remaining days of next month
    const cellsRendered = startDayIdx + totalDays;
    const remainingCells = (7 - (cellsRendered % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="calendar-day-num">${i}</span>`;
      grid.appendChild(cell);
    }
  }

  // Analytics View
  renderAnalytics() {
    const statsList = document.getElementById('analytics-category-list');
    statsList.innerHTML = '';

    const activeHabits = window.db.getActiveHabits().sort((a, b) => {
      const streakA = (window.db.profile.habitStreaks[a.id] || { current: 0 }).current;
      const streakB = (window.db.profile.habitStreaks[b.id] || { current: 0 }).current;
      return streakB - streakA;
    });

    if (activeHabits.length === 0) {
      statsList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem; text-align: center; display: block; padding: 20px;">No habit streaks to display.</span>`;
    } else {
      // Group habits by their streak value
      const groups = [];
      let currentGroup = null;

      activeHabits.forEach(habit => {
        const streaks = window.db.profile.habitStreaks[habit.id] || { current: 0 };
        const currentStreakVal = streaks.current;

        if (!currentGroup || currentGroup.streak !== currentStreakVal) {
          currentGroup = {
            streak: currentStreakVal,
            habits: []
          };
          groups.push(currentGroup);
        }
        currentGroup.habits.push(habit);
      });

      let listHtml = `<div class="rankings-container" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">`;

      groups.forEach((group, groupIdx) => {
        const rank = groupIdx + 1;
        let rankBadge = `${rank}`;
        if (rank === 1) rankBadge = '🥇';
        else if (rank === 2) rankBadge = '🥈';
        else if (rank === 3) rankBadge = '🥉';

        listHtml += `
          <div class="rank-group" style="background: var(--overlay-bg-container); border: 1px solid var(--panel-border); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
            <div class="rank-group-header" style="background: var(--overlay-bg-th); padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--panel-border);">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.9rem; color: var(--text-main);">
                <span style="font-size: 1.25rem;">${rankBadge}</span>
                <span>Rank ${rank}</span>
              </div>
              <div style="font-weight: 800; color: var(--color-primary); font-family: var(--font-title); font-size: 0.9rem; display: flex; align-items: center; gap: 4px;">
                🔥 ${group.streak} Day${group.streak === 1 ? '' : 's'}
              </div>
            </div>
            <div class="rank-group-items" style="display: flex; flex-direction: column; padding: 4px 0;">
        `;

        group.habits.forEach((habit, idx) => {
          const itemBorder = idx < group.habits.length - 1 ? `border-bottom: 1px solid rgba(128, 128, 128, 0.08);` : '';
          listHtml += `
            <div class="rank-habit-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 0.9rem; ${itemBorder}">
              <span style="font-size: 1.25rem; min-width: 24px; text-align: center; display: inline-flex; align-items: center; justify-content: center;">${habit.emoji}</span>
              <span style="font-weight: 600; color: var(--text-main);">${habit.name}</span>
            </div>
          `;
        });

        listHtml += `
            </div>
          </div>
        `;
      });

      listHtml += `</div>`;
      statsList.innerHTML = listHtml;
    }

    this.renderActivityLineChart();
  }

  // Habits Manager Renderer
  renderHabitsManager() {
    this.managerTableBody.innerHTML = '';
    const activeHabits = window.db.getActiveHabits();

    if (activeHabits.length === 0) {
      this.managerTableBody.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px; text-align: center; border: 1px dashed var(--panel-border); border-radius: 12px; margin-top: 10px; width: 100%; box-sizing: border-box;">
          <span class="empty-state-icon" style="font-size: 2.5rem; display: block; margin-bottom: 12px; filter: grayscale(0.5);">📭</span>
          <p class="empty-state-desc" style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">No habits configured yet.</p>
        </div>
      `;
      return;
    }

    activeHabits.forEach(habit => {
      const card = document.createElement('div');
      card.className = 'habit-manager-card';
      card.style.cursor = 'pointer';

      card.innerHTML = `
        <div class="habit-manager-card-left">
          <div class="habit-manager-card-emoji">${habit.emoji}</div>
          <span class="habit-manager-card-name">${habit.name}</span>
        </div>
        <div class="habit-manager-card-actions">
          <button class="card-action-btn edit-btn" title="Edit details" data-id="${habit.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="action-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="card-action-btn delete-btn" title="Delete habit" data-id="${habit.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="action-icon"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      `;

      // Allow clicking the card to open the edit modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-action-btn')) {
          return; // Don't trigger when clicking actions
        }
        this.openHabitModal(habit.id);
      });

      // Wire up inline action buttons
      card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openHabitModal(habit.id);
      });
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteConfirmModal(habit.id);
      });

      this.managerTableBody.appendChild(card);
    });
  }

  // Trend line chart SVG vector generator with failed task hovers
  renderActivityLineChart() {
    const container = document.getElementById('line-chart-viewport');
    container.innerHTML = '';

    const chartDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartDates.push(d);
    }

    const rates = chartDates.map(d => {
      const str = window.db.getFormattedDate(d);
      return window.db.getDayCompletionRate(str);
    });

    const padding = 30;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 200;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    let points = [];
    let labelsHtml = '';

    rates.forEach((rate, idx) => {
      const x = padding + (idx * (chartWidth / 6));
      const y = padding + chartHeight - (rate * chartHeight);
      points.push(`${x},${y}`);

      const dateLabel = chartDates[idx].toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      labelsHtml += `<text x="${x}" y="${height - 8}" fill="var(--text-muted)" font-size="9" text-anchor="middle" font-family="var(--font-body)">${dateLabel}</text>`;
    });

    const gridLines = `
      <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--panel-border)" stroke-width="1" />
      <line x1="${padding}" y1="${padding + chartHeight/2}" x2="${width - padding}" y2="${padding + chartHeight/2}" stroke="var(--panel-border)" stroke-width="1" />
      <line x1="${padding}" y1="${padding + chartHeight}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="var(--panel-border)" stroke-width="1" />
      
      <text x="${padding - 6}" y="${padding + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end" font-family="var(--font-body)">100%</text>
      <text x="${padding - 6}" y="${padding + chartHeight/2 + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end" font-family="var(--font-body)">50%</text>
      <text x="${padding - 6}" y="${padding + chartHeight + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end" font-family="var(--font-body)">0%</text>
    `;

    const nodes = rates.map((rate, idx) => {
      const x = padding + (idx * (chartWidth / 6));
      const y = padding + chartHeight - (rate * chartHeight);
      return `
        <!-- Aesthetic visible node dot -->
        <circle cx="${x}" cy="${y}" r="5" fill="var(--color-primary)" stroke="var(--bg-color)" stroke-width="2" pointer-events="none" style="filter: drop-shadow(0 0 4px var(--color-primary-glow))" />
        <!-- Invisible larger hit target area for easy hover/tap on top -->
        <circle cx="${x}" cy="${y}" r="18" fill="none" pointer-events="all" style="cursor: pointer;" class="chart-point" data-idx="${idx}" data-rate="${rate}" />
      `;
    }).join('');

    const svgHtml = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        
        ${gridLines}
        
        <path d="M ${padding},${padding + chartHeight} L ${points.join(' L ')} L ${width - padding},${padding + chartHeight} Z" fill="url(#chart-area-grad)" />
        <polyline points="${points.join(' ')}" fill="none" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        
        ${labelsHtml}
        ${nodes}
      </svg>
    `;

    container.innerHTML = svgHtml;

    container.querySelectorAll('.chart-point').forEach(pt => {
      pt.addEventListener('mouseenter', (e) => {
        if (window.innerWidth <= 600) return;
        if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        const target = e.currentTarget;
        this.tooltipTimeout = setTimeout(() => {
          const idx = parseInt(target.dataset.idx);
          const rate = parseFloat(target.dataset.rate);
          
          const dateObj = chartDates[idx];
          const dateStr = window.db.getFormattedDate(dateObj);
          
          const dayEnd = new Date(dateStr + "T23:59:59").getTime();
          const habitsOnDay = window.db.getActiveHabits().filter(h => h.createdAt <= dayEnd);
          
          const failedTasks = [];
          const dayRecords = window.db.history[dateStr] || {};
          
          habitsOnDay.forEach(h => {
            const rec = dayRecords[h.id];
            const completed = rec && typeof rec === 'object' ? rec.completed : Boolean(rec);
            if (!completed) {
              const remarkText = (rec && typeof rec === 'object') ? (rec.remark || '') : '';
              failedTasks.push(`• ${h.emoji} ${h.name}${remarkText ? ' <i>(' + remarkText + ')</i>' : ''}`);
            }
          });

          let tooltipHtml = `<strong>${Math.round(rate * 100)}% Done</strong>`;
          if (failedTasks.length > 0) {
            tooltipHtml += `<br><span style="color:#f43f5e; font-weight:700;">Missed (${failedTasks.length}):</span><br>${failedTasks.join('<br>')}`;
          } else if (habitsOnDay.length > 0) {
            tooltipHtml += `<br><span style="color:#10b981; font-weight:700;">Perfect Day! ✨</span>`;
          } else {
            tooltipHtml += `<br><span style="color:var(--text-muted);">No habits tracked.</span>`;
          }

          const rect = target.getBoundingClientRect();
          this.showTooltip(tooltipHtml, rect.left + rect.width / 2, rect.top - 8);
        }, 400);
      });
      pt.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const dateObj = chartDates[idx];
        this.currentDate = dateObj;
        this.switchView('dashboard');
        this.sound.playClick();
      });
      pt.addEventListener('mouseleave', () => {
        if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        this.hideTooltip();
      });
    });
  }

  // Draw Habit Growth Tree inside SVG
  renderHabitTree(completionRate) {
    const treeDiv = document.getElementById('garden-tree-container');
    treeDiv.innerHTML = '';

    let stage = 0;
    if (completionRate > 0.90) stage = 5; 
    else if (completionRate > 0.70) stage = 4; 
    else if (completionRate > 0.50) stage = 3; 
    else if (completionRate > 0.30) stage = 2; 
    else if (completionRate > 0.10) stage = 1; 
    
    const descText = document.getElementById('garden-status-description');
    const fillBar = document.getElementById('garden-completion-fill');
    
    fillBar.style.width = `${Math.round(completionRate * 100)}%`;

    const stageDescriptions = [
      "Your garden is quiet. A tiny seed lies in wait. (0-10% weekly average)",
      "A delicate green sprout emerges from the soil! (11-30%)",
      "Your sapling is growing taller, sprouting small twigs! (31-50%)",
      "A healthy, branching tree is taking root! (51-70%)",
      "Beautiful pink flower blossoms have opened across your tree! (71-90%)",
      "A legendary Golden Fruit Tree! Routines peak wellness achieved! (91-100%)"
    ];
    descText.textContent = stageDescriptions[stage];

    let potSvg = `
      <path d="M 60 170 L 140 170 L 130 195 L 70 195 Z" class="pot-container" />
      <ellipse cx="100" cy="170" rx="40" ry="6" class="pot-soil" />
    `;

    let plantContent = '';
    const leafFills = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'];

    if (stage === 0) {
      plantContent = `
        <circle cx="100" cy="164" r="5" class="seed-element" />
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
      `;
    } else if (stage === 1) {
      plantContent = `
        <path d="M 100 170 Q 98 150 95 135" stroke="#10b981" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 95 135 Q 83 128 88 122 Q 97 130 95 135" fill="${leafFills[0]}" class="tree-leaf" />
        <path d="M 95 135 Q 107 130 102 124 Q 95 128 95 135" fill="${leafFills[1]}" class="tree-leaf" />
      `;
    } else if (stage === 2) {
      plantContent = `
        <path d="M 100 170 Q 98 135 103 115" class="trunk-branch" stroke-width="5" />
        <path d="M 100 145 Q 88 138 84 130" stroke="#6e4e37" stroke-width="3" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 101 133 Q 112 128 116 120" stroke="#6e4e37" stroke-width="3" stroke-linecap="round" fill="none" class="tree-branch" />
        <circle cx="103" cy="115" r="7" fill="${leafFills[0]}" class="tree-leaf" />
        <circle cx="84" cy="130" r="6" fill="${leafFills[1]}" class="tree-leaf" />
        <circle cx="116" cy="120" r="6" fill="${leafFills[2]}" class="tree-leaf" />
        <circle cx="94" cy="138" r="5" fill="${leafFills[3]}" class="tree-leaf" />
      `;
    } else if (stage === 3) {
      plantContent = `
        <path d="M 100 170 Q 97 125 103 95" class="trunk-branch" stroke-width="6" />
        <path d="M 99 140 Q 82 125 78 110" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 101 125 Q 118 115 122 100" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 102 108 Q 90 98 88 88" stroke="#6e4e37" stroke-width="3" stroke-linecap="round" fill="none" class="tree-branch" />
        <circle cx="103" cy="95" r="8" fill="${leafFills[0]}" class="tree-leaf" />
        <circle cx="78" cy="110" r="7" fill="${leafFills[1]}" class="tree-leaf" />
        <circle cx="122" cy="100" r="7" fill="${leafFills[2]}" class="tree-leaf" />
        <circle cx="88" cy="88" r="6" fill="${leafFills[3]}" class="tree-leaf" />
        <circle cx="91" cy="118" r="6" fill="${leafFills[4]}" class="tree-leaf" />
        <circle cx="111" cy="112" r="6" fill="${leafFills[0]}" class="tree-leaf" />
      `;
    } else if (stage === 4) {
      plantContent = `
        <path d="M 100 170 Q 97 120 103 85" class="trunk-branch" stroke-width="7" />
        <path d="M 99 135 Q 75 120 70 100" stroke="#6e4e37" stroke-width="5" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 101 120 Q 125 110 128 92" stroke="#6e4e37" stroke-width="5" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 102 98 Q 85 85 82 72" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 102 92 Q 115 80 118 68" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <circle cx="103" cy="85" r="9" fill="${leafFills[0]}" class="tree-leaf" />
        <circle cx="70" cy="100" r="8" fill="${leafFills[1]}" class="tree-leaf" />
        <circle cx="128" cy="92" r="8" fill="${leafFills[2]}" class="tree-leaf" />
        <circle cx="82" cy="72" r="8" fill="${leafFills[3]}" class="tree-leaf" />
        <circle cx="118" cy="68" r="8" fill="${leafFills[4]}" class="tree-leaf" />
        
        <g class="tree-flower" transform="translate(68,96) scale(0.8)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        <g class="tree-flower" transform="translate(126,88) scale(0.8)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        <g class="tree-flower" transform="translate(98,80) scale(0.9)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        <g class="tree-flower" transform="translate(85,68) scale(0.7)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
      `;
    } else {
      // Stage 5: Golden Fruit Tree
      plantContent = `
        <path d="M 100 170 Q 97 120 103 85" class="trunk-branch" stroke="#6e4e37" stroke-width="8" />
        <path d="M 99 135 Q 72 115 68 95" stroke="#6e4e37" stroke-width="5" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 101 120 Q 128 105 130 85" stroke="#6e4e37" stroke-width="5" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 102 98 Q 82 82 78 65" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        <path d="M 102 92 Q 118 78 120 62" stroke="#6e4e37" stroke-width="4" stroke-linecap="round" fill="none" class="tree-branch" />
        
        <circle cx="103" cy="85" r="10" fill="${leafFills[0]}" class="tree-leaf" />
        <circle cx="68" cy="95" r="9" fill="${leafFills[1]}" class="tree-leaf" />
        <circle cx="130" cy="85" r="9" fill="${leafFills[2]}" class="tree-leaf" />
        <circle cx="78" cy="65" r="8" fill="${leafFills[3]}" class="tree-leaf" />
        <circle cx="120" cy="62" r="8" fill="${leafFills[4]}" class="tree-leaf" />
        
        <g class="tree-flower" transform="translate(68,90) scale(0.8)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        <g class="tree-flower" transform="translate(130,80) scale(0.8)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        <g class="tree-flower" transform="translate(98,80) scale(0.9)"><circle cx="0" cy="0" r="4"/><circle cx="-5" cy="0" r="3"/><circle cx="5" cy="0" r="3"/><circle cx="0" cy="-5" r="3"/><circle cx="0" cy="5" r="3"/></g>
        
        <circle cx="103" cy="70" r="7" class="tree-fruit-item tree-fruit" />
        <circle cx="75" cy="82" r="6" class="tree-fruit-item tree-fruit" />
        <circle cx="122" cy="72" r="6" class="tree-fruit-item tree-fruit" />
      `;
    }

    const svgHtml = `
      <svg id="habit-tree-svg" width="100%" height="100%" viewBox="0 0 200 200">
        ${potSvg}
        ${plantContent}
      </svg>
    `;

    treeDiv.innerHTML = svgHtml;
  }

  calculateWeeklyCompletionRate() {
    if (window.supabaseMgr && !window.supabaseMgr.isAuthenticated()) {
      return 0;
    }
    let ratesSum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentDate);
      d.setDate(d.getDate() - i);
      const str = window.db.getFormattedDate(d);
      ratesSum += window.db.getDayCompletionRate(str);
    }
    return ratesSum / 7;
  }

  // Update completions check
  updateProgress(habitId, completed, optionalDateStr = null) {
    const targetDate = optionalDateStr || window.db.getFormattedDate(this.currentDate);
    const todayStr = window.db.getFormattedDate(new Date());
    
    if (targetDate > todayStr) {
      alert("You cannot edit habit logs for future dates.");
      return;
    }

    const result = window.db.setProgress(targetDate, habitId, completed);

    if (result) {
      if (result.completed) {
        this.sound.playCheck();
      } else {
        this.sound.playUncheck();
      }

      if (window.db.checkPerfectDay(targetDate)) {
        this.confetti.burst();
      }

      this.render();
    }
  }

  // Dialog Controls
  openHabitModal(editId = null) {
    this.habitForm.reset();
    document.querySelectorAll('.emoji-option').forEach(o => o.classList.remove('selected'));
    
    if (editId) {
      const habit = window.db.habits.find(h => h.id === editId);
      if (!habit) return;

      document.getElementById('habit-modal-title').textContent = 'Edit Habit';
      this.habitIdInput.value = habit.id;
      this.habitNameInput.value = habit.name;
      this.habitEmojiInput.value = habit.emoji;
      
      const opt = document.querySelector(`.emoji-option[data-emoji="${habit.emoji}"]`);
      if (opt) opt.classList.add('selected');
    } else {
      document.getElementById('habit-modal-title').textContent = 'Add New Habit';
      this.habitIdInput.value = '';
      this.habitEmojiInput.value = '💧';
      const opt = document.querySelector('.emoji-option[data-emoji="💧"]');
      if (opt) opt.classList.add('selected');
    }

    this.habitModal.classList.add('open');
    this.sound.playClick();
  }

  saveHabitForm() {
    const id = this.habitIdInput.value;
    const name = this.habitNameInput.value.trim();
    const emoji = this.habitEmojiInput.value || '⭐';
 
    if (id) {
       window.db.updateHabit(id, { name, emoji });
    } else {
       window.db.createHabit(name, emoji);
    }

    const managerModal = document.getElementById('manager-modal');
    const isManagerOpen = managerModal && managerModal.classList.contains('open');
    if (isManagerOpen) {
      this.habitModal.classList.remove('open');
    } else {
      this.closeAllModals();
    }

    this.render();
    this.sound.playCheck();
  }

  openDeleteConfirmModal(habitId) {
    const habit = window.db.habits.find(h => h.id === habitId);
    if (!habit) return;

    document.getElementById('delete-habit-name').textContent = habit.name;
    
    const confirmBtn = document.getElementById('btn-confirm-delete');
    confirmBtn.onclick = (e) => {
      window.db.hardDeleteHabit(habitId);
      
      const managerModal = document.getElementById('manager-modal');
      const isManagerOpen = managerModal && managerModal.classList.contains('open');
      if (isManagerOpen) {
        this.confirmDeleteModal.classList.remove('open');
      } else {
        this.closeAllModals();
      }

      this.render();
      this.sound.playUncheck();
    };

    this.confirmDeleteModal.classList.add('open');
    this.sound.playClick();
  }

  openRemarkModal(habitId, dateStr) {
    const habit = window.db.habits.find(h => h.id === habitId);
    if (!habit) return;

    this.remarkHabitTitle.innerHTML = `<span style="margin-right:6px;">${habit.emoji}</span> ${habit.name}`;
    
    const dateObj = new Date(dateStr + "T00:00:00");
    const dateLabelStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    this.remarkDateLabel.textContent = `for ${dateLabelStr}`;
    
    const record = window.db.history[dateStr] && window.db.history[dateStr][habitId];
    const existingRemark = (record && typeof record === 'object') ? (record.remark || '') : '';
    
    this.remarkInput.value = existingRemark;
    this.modalRemarkHabitId.value = habitId;
    this.modalRemarkDate.value = dateStr;

    this.remarkModal.classList.add('open');
    this.sound.playClick();
  }

  closeAllModals() {
    this.habitModal.classList.remove('open');
    this.confirmDeleteModal.classList.remove('open');
    this.remarkModal.classList.remove('open');
    const managerModal = document.getElementById('manager-modal');
    if (managerModal) managerModal.classList.remove('open');
  }

  openManagerModal() {
    this.renderHabitsManager();
    const managerModal = document.getElementById('manager-modal');
    if (managerModal) managerModal.classList.add('open');
    this.sound.playClick();
  }

  triggerResetData() {
    if (confirm("Are you sure you want to reset all habit records? This will delete all custom habits, histories, and streaks!")) {
      window.db.resetAllData();
      this.render();
      this.sound.playUncheck();
    }
  }

  // Column Menu Context Panel Positioning
  openContextMenu(habitId, x, y) {
    this.activeContextMenuId = habitId;
    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.style.display = 'block';
    this.sound.playClick();
  }

  showTooltip(text, x, y) {
    this.tooltip.innerHTML = text;
    this.tooltip.style.left = `${x - this.tooltip.clientWidth / 2}px`;
    this.tooltip.style.top = `${y - this.tooltip.clientHeight - 4}px`;
    this.tooltip.style.opacity = 1;
  }

  hideTooltip() {
    this.tooltip.style.opacity = 0;
  }

  renderAll() {
    this.render();
  }

  initSupabase() {
    // Elements
    const authModal = document.getElementById('auth-modal');
    const cloudSyncPill = document.getElementById('cloud-sync-pill');
    const btnSaveConfig = document.getElementById('btn-save-supabase-config');
    const supabaseUrlInput = document.getElementById('supabase-url-input');
    const supabaseKeyInput = document.getElementById('supabase-key-input');
    const loginForm = document.getElementById('login-form');
    const authEmailInput = document.getElementById('auth-email-input');
    const authPasswordInput = document.getElementById('auth-password-input');
    
    // Split Signup Form Elements
    const signupForm = document.getElementById('signup-form');
    const signupUsernameInput = document.getElementById('signup-username-input');
    const signupEmailInput = document.getElementById('signup-email-input');
    const signupPasswordInput = document.getElementById('signup-password-input');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password-input');
    const btnToggleSignupPassword = document.getElementById('btn-toggle-signup-password');
    const btnToggleSignupConfirmPassword = document.getElementById('btn-toggle-signup-confirm-password');
    const linkShowSignup = document.getElementById('link-show-signup');
    const linkShowLogin = document.getElementById('link-show-login');

    const loggedInProfile = document.getElementById('logged-in-profile');
    const loggedInEmail = document.getElementById('logged-in-email');
    const btnSyncNow = document.getElementById('btn-sync-now');
    const btnLogout = document.getElementById('btn-logout');
    const authStatusMessage = document.getElementById('auth-status-message');
    const authSectionTitle = document.getElementById('auth-section-title');
    const authUserSection = document.getElementById('auth-user-section');

    // Hide connection settings if defaults are hardcoded in code
    const configSection = document.getElementById('auth-config-section');
    if (configSection && window.supabaseMgr && window.supabaseMgr.defaultUrl && window.supabaseMgr.defaultAnonKey) {
      configSection.style.display = 'none';
      if (authSectionTitle) {
        authSectionTitle.textContent = 'Account Login';
      }
    }

    const blocker = document.getElementById('interaction-blocker');

    const updateAuthUI = (user, event) => {
      // Hide the global app loader
      const loaderEl = document.getElementById('app-loader');
      if (loaderEl) {
        loaderEl.classList.add('hidden-view');
      }

      const isConfigured = window.supabaseMgr && window.supabaseMgr.isConfigured();
      if (!isConfigured) {
        authUserSection.style.opacity = '0.5';
        authUserSection.style.pointerEvents = 'none';
        authSectionTitle.textContent = 'Account Login (Setup Needed)';
        loginForm.style.display = 'flex';
        if (signupForm) signupForm.style.display = 'none';
        if (this.recoveryForm) {
          this.recoveryForm.style.display = 'none';
        }
        loggedInProfile.style.display = 'none';
        window.db.notifySyncStatus('Offline');
        
        // Show landing page and hide app-container
        const landingEl = document.getElementById('landing-page');
        const appContainerEl = document.querySelector('.app-container');
        if (landingEl) landingEl.classList.remove('hidden-view');
        if (appContainerEl) appContainerEl.classList.add('hidden-view');
        return;
      }
 
      authUserSection.style.opacity = '1';
      authUserSection.style.pointerEvents = 'auto';

      if (event === 'PASSWORD_RECOVERY') {
        authSectionTitle.textContent = 'Reset Your Password';
        loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
        loggedInProfile.style.display = 'none';
        if (this.recoveryForm) {
          this.recoveryForm.style.display = 'flex';
        }
        
        // Auto-open modal so they can type password immediately
        if (authModal) {
          authModal.classList.add('open');
        }
        authStatusMessage.textContent = 'Please enter your new password below.';
        authStatusMessage.style.color = 'var(--text-main)';
        return;
      }
 
      authSectionTitle.textContent = 'Account Login';
      if (this.recoveryForm) {
        this.recoveryForm.style.display = 'none';
      }
 
      if (user) {
        // Logged In: de-activate sandbox mode
        this.guestSandboxMode = false;
        window.db.guestSandboxMode = false;
        window.db.sandboxInitialized = false;

        // Force database to load real user data from LocalStorage and run cloud sync
        window.db.loadFromStorage();
        window.db.syncWithCloud();

        loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
        loggedInProfile.style.display = 'flex';
        
        // Show username or email in profile section
        const displayName = (user.user_metadata && user.user_metadata.username) ? user.user_metadata.username : user.email;
        loggedInEmail.textContent = displayName;
        
        window.db.notifySyncStatus('Connected');
        
        // Hide landing page, show app container
        const landingEl = document.getElementById('landing-page');
        const appContainerEl = document.querySelector('.app-container');
        if (landingEl) landingEl.classList.add('hidden-view');
        if (appContainerEl) appContainerEl.classList.remove('hidden-view');

        // Close auth modal automatically on successful login/update
        if (event && event !== 'INITIAL' && event !== 'PASSWORD_RECOVERY') {
          if (authModal) {
            authModal.classList.remove('open');
          }
        }

        // Refresh UI immediately to reflect user's actual data
        this.renderAll();
      } else {
        // Logged Out
        loginForm.style.display = 'flex';
        if (signupForm) signupForm.style.display = 'none';
        loggedInProfile.style.display = 'none';
        
        if (this.guestSandboxMode) {
          // Sandbox Mode: keep showing app container
          window.db.notifySyncStatus('Offline');
          const landingEl = document.getElementById('landing-page');
          const appContainerEl = document.querySelector('.app-container');
          if (landingEl) landingEl.classList.add('hidden-view');
          if (appContainerEl) appContainerEl.classList.remove('hidden-view');
          this.renderAll();
        } else {
          // Normal Logged Out state: show landing page
          window.db.notifySyncStatus('Offline');
          const landingEl = document.getElementById('landing-page');
          const appContainerEl = document.querySelector('.app-container');
          if (landingEl) landingEl.classList.remove('hidden-view');
          if (appContainerEl) appContainerEl.classList.add('hidden-view');
          if (authModal) {
            authModal.classList.remove('open');
          }
        }
      }
    };

    // Load Saved Config to Inputs
    if (window.supabaseMgr) {
      supabaseUrlInput.value = window.supabaseMgr.url || '';
      supabaseKeyInput.value = window.supabaseMgr.anonKey ? '••••••••••••••••' : '';
 
      window.supabaseMgr.onAuthStateChange((user, event) => {
        updateAuthUI(user, event);
      });
    }

    // Password visibility toggle listeners
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    if (btnTogglePassword) {
      btnTogglePassword.addEventListener('click', () => {
        const type = authPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        authPasswordInput.setAttribute('type', type);
        btnTogglePassword.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    const btnToggleRecoveryPassword = document.getElementById('btn-toggle-recovery-password');
    if (btnToggleRecoveryPassword) {
      btnToggleRecoveryPassword.addEventListener('click', () => {
        const type = this.recoveryPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.recoveryPasswordInput.setAttribute('type', type);
        btnToggleRecoveryPassword.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    // Click Blocker to open login modal
    if (blocker) {
      blocker.addEventListener('click', () => {
        authStatusMessage.textContent = '';
        authModal.classList.add('open');
        this.sound.playClick();
      });
    }

    // Click Cloud Pill to open modal
    if (cloudSyncPill) {
      cloudSyncPill.addEventListener('click', () => {
        authStatusMessage.textContent = '';
        authModal.classList.add('open');
        this.sound.playClick();
      });
    }

    // Save Supabase config
    if (btnSaveConfig) {
      btnSaveConfig.addEventListener('click', async () => {
        const url = supabaseUrlInput.value.trim();
        let key = supabaseKeyInput.value.trim();

        if (!url) {
          authStatusMessage.textContent = '❌ Please enter a valid URL.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        // If key is masked, load the existing key from manager
        if (key === '••••••••••••••••') {
          key = localStorage.getItem('habit_v2_supabase_key') || window.supabaseMgr.defaultAnonKey;
        }

        try {
          const success = window.supabaseMgr.saveConfig(url, key);
          if (success) {
            authStatusMessage.textContent = '✅ Connection Settings Saved!';
            authStatusMessage.style.color = 'var(--color-primary)';
            updateAuthUI(window.supabaseMgr.currentUser);
            // Trigger sync
            if (window.supabaseMgr.isAuthenticated()) {
              window.db.syncWithCloud();
            }
          } else {
            authStatusMessage.textContent = '❌ Failed to initialize Supabase. Check key/URL.';
            authStatusMessage.style.color = 'var(--color-danger)';
          }
        } catch (err) {
          authStatusMessage.textContent = `❌ Error: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Forgot Password Click
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    if (btnForgotPassword) {
      btnForgotPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value.trim();
        if (!email) {
          authStatusMessage.textContent = '❌ Please enter your email address first.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        authStatusMessage.textContent = 'Sending reset link...';
        authStatusMessage.style.color = 'var(--text-muted)';

        try {
          await window.supabaseMgr.resetPassword(email);
          authStatusMessage.textContent = '✅ Password reset email sent!';
          authStatusMessage.style.color = 'var(--color-primary)';
        } catch (err) {
          authStatusMessage.textContent = `❌ Error: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Form Toggle Listeners
    if (linkShowSignup) {
      linkShowSignup.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'flex';
        authStatusMessage.textContent = '';
      });
    }

    if (linkShowLogin) {
      linkShowLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (signupForm) signupForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'flex';
        authStatusMessage.textContent = '';
      });
    }

    // Password visibility toggle listeners for signup
    if (btnToggleSignupPassword) {
      btnToggleSignupPassword.addEventListener('click', () => {
        const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupPasswordInput.setAttribute('type', type);
        btnToggleSignupPassword.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    if (btnToggleSignupConfirmPassword) {
      btnToggleSignupConfirmPassword.addEventListener('click', () => {
        const type = signupConfirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupConfirmPasswordInput.setAttribute('type', type);
        btnToggleSignupConfirmPassword.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    // Login Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;
        authStatusMessage.textContent = 'Logging in...';
        authStatusMessage.style.color = 'var(--text-muted)';

        try {
          await window.supabaseMgr.login(email, password);
          authStatusMessage.textContent = '✅ Logged in successfully!';
          authStatusMessage.style.color = 'var(--color-primary)';
          authEmailInput.value = '';
          authPasswordInput.value = '';
        } catch (err) {
          let friendlyError = err.message;
          if (err.message && err.message.toLowerCase().includes('invalid login credentials')) {
            friendlyError = 'No account found matching these credentials, or incorrect password.';
          }
          authStatusMessage.textContent = `❌ Login Error: ${friendlyError}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Sign Up Submit
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = signupUsernameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;
        
        if (!username) {
          authStatusMessage.textContent = '❌ Username is required.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        if (password.length < 6) {
          authStatusMessage.textContent = '❌ Password must be at least 6 characters.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        if (password !== confirmPassword) {
          authStatusMessage.textContent = '❌ Passwords do not match.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        authStatusMessage.textContent = 'Signing up...';
        authStatusMessage.style.color = 'var(--text-muted)';

        try {
          const data = await window.supabaseMgr.signup(email, password, username);
          if (data && data.user && data.user.identities && data.user.identities.length === 0) {
            throw new Error("An account with this email address already exists.");
          }
          authStatusMessage.textContent = '✅ Account created! Please check your email for the confirmation link.';
          authStatusMessage.style.color = 'var(--color-primary)';
          signupUsernameInput.value = '';
          signupEmailInput.value = '';
          signupPasswordInput.value = '';
          signupConfirmPasswordInput.value = '';
        } catch (err) {
          authStatusMessage.textContent = `❌ Signup Error: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Recovery Form Submit
    if (this.recoveryForm) {
      this.recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = this.recoveryPasswordInput.value;
        if (!newPassword || newPassword.length < 6) {
          authStatusMessage.textContent = '❌ Password must be at least 6 characters.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        authStatusMessage.textContent = 'Updating password...';
        authStatusMessage.style.color = 'var(--text-muted)';

        try {
          await window.supabaseMgr.updatePassword(newPassword);
          authStatusMessage.textContent = '✅ Password updated successfully!';
          authStatusMessage.style.color = 'var(--color-primary)';
          this.recoveryPasswordInput.value = '';
          
          // Clear URL hash to prevent re-triggering PASSWORD_RECOVERY on refresh
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
          }

          // Delay for 1.5 seconds, then close modal and restore UI state
          setTimeout(() => {
            if (authModal) {
              authModal.classList.remove('open');
            }
            updateAuthUI(window.supabaseMgr.currentUser, 'SIGNED_IN');
          }, 1500);

        } catch (err) {
          authStatusMessage.textContent = `❌ Update Error: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Logout
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        authStatusMessage.textContent = 'Logging out...';
        authStatusMessage.style.color = 'var(--text-muted)';
        try {
          this.guestSandboxMode = false;
          window.db.guestSandboxMode = false;
          await window.supabaseMgr.logout();
          authStatusMessage.textContent = 'Logged out.';
          authStatusMessage.style.color = 'var(--text-muted)';
        } catch (err) {
          authStatusMessage.textContent = `Error logging out: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Manual Sync Now
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        authStatusMessage.textContent = 'Syncing...';
        authStatusMessage.style.color = 'var(--text-muted)';
        await window.db.syncWithCloud();
        authStatusMessage.textContent = '✅ Synchronization complete!';
        authStatusMessage.style.color = 'var(--color-primary)';
      });
    }
  }
}

// Start Application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.render();
});
