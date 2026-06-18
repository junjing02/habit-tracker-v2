/**
 * Habit Tracker v2 - Central Application Coordinator (app.js)
 * Orchestrates rendering, page views, habit tree growth, custom charts, Web Audio sounds, canvas confetti, remark modals, and calendar grids.
 */

// Sound Manager Instance
class SoundEffectManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
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

    this.initElements();
    this.initEvents();
    this.initSupabase();
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
    this.managerTableBody = document.getElementById('manager-table-body');
    this.btnManagerAddHabit = document.getElementById('btn-manager-add-habit');

    // Calendar Navigator labels
    this.calMonthYearLabel = document.getElementById('cal-month-year-label');
    this.calendarDaysGrid = document.getElementById('calendar-days-grid');
  }

  initEvents() {
    // 1. Navigation Tab Switching
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
        this.sound.playClick();
      });
    });

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
    soundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      window.db.profile.soundEnabled = this.sound.enabled;
      window.db.saveProfile();
      
      const soundIcon = soundBtn.querySelector('i');
      if (this.sound.enabled) {
        soundIcon.textContent = '🔊';
        this.sound.playCheck();
      } else {
        soundIcon.textContent = '🔇';
      }
    });

    const themeSelect = document.getElementById('theme-selector');
    themeSelect.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      document.body.setAttribute('data-theme', selectedTheme);
      window.db.profile.theme = selectedTheme;
      window.db.saveProfile();
      this.sound.playClick();
    });

    // Load initial configurations
    this.sound.enabled = window.db.profile.soundEnabled;
    soundBtn.querySelector('i').textContent = this.sound.enabled ? '🔊' : '🔇';
    themeSelect.value = window.db.profile.theme;
    document.body.setAttribute('data-theme', window.db.profile.theme);

    // 4. Modal Triggers (Redirects click to switch to Manage Habits tab)
    document.getElementById('btn-add-habit').addEventListener('click', () => this.openManagerModal());
    const footerBtn = document.getElementById('btn-add-habit-footer');
    if (footerBtn) footerBtn.addEventListener('click', () => this.openManagerModal());
    this.btnManagerAddHabit.addEventListener('click', () => this.openHabitModal());

    const quickAddInput = document.getElementById('quick-add-name');
    const quickAddBtn = document.getElementById('btn-quick-add-submit');
    if (quickAddInput && quickAddBtn) {
      const handleQuickAdd = () => {
        const name = quickAddInput.value.trim();
        if (!name) return;
        
        const presetEmojis = ['💧', '🏃‍♂️', '📖', '🧘‍♂️', '😴', '🍎', '💻', '🎨', '✍️', '🚶‍♂️', '🌱', '🧹', '🔋', '🧠', '🏋️‍♂️', '🥛', '☀️', '🍵', '🚴', '🥑'];
        const randomEmoji = presetEmojis[Math.floor(Math.random() * presetEmojis.length)];
        
        window.db.createHabit(name, randomEmoji);
        quickAddInput.value = '';
        this.render();
        this.sound.playCheck();
      };
      
      quickAddBtn.addEventListener('click', handleQuickAdd);
      quickAddInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleQuickAdd();
        }
      });
    }

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

  // View Swapper
  switchView(viewName) {
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
    const profile = window.db.profile;
    this.streakVal.textContent = `${profile.currentStreak || 0} Days`;

    // Overall Progress Ring
    const dateStr = window.db.getFormattedDate(this.currentDate);
    const dayRate = window.db.getDayCompletionRate(dateStr);
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
    const dayRecords = dayRecords => dayRecords = window.db.history[dateStr] || {};
    const dayRecordsData = window.db.history[dateStr] || {};
    activeHabits.forEach(h => {
      const rec = dayRecordsData[h.id];
      const completed = rec && typeof rec === 'object' ? rec.completed : Boolean(rec);
      if (completed) {
        completedCount++;
      }
    });

    this.overallProgressDesc.textContent = `${completedCount} of ${activeHabits.length} habits completed`;
    
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    this.dateLabel.textContent = this.currentDate.toLocaleDateString('en-US', options);
  }

  // Dashboard Checklist
  renderDashboard() {
    const dateStr = window.db.getFormattedDate(this.currentDate);
    const dayRecords = window.db.history[dateStr] || {};
    
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
            <span>⚙️</span> Manage Habits
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

      // 1. Remark/Note button
      if (!isCompleted && !isFutureDate) {
        const noteBtn = document.createElement('button');
        noteBtn.className = `btn-note-action ${remarkText ? 'active-note' : ''}`;
        noteBtn.innerHTML = remarkText ? '📝' : '➕';
        noteBtn.title = remarkText ? 'Edit missed reason' : 'Add reason why missed';
        
        noteBtn.addEventListener('click', () => {
          this.openRemarkModal(habit.id, dateStr);
        });

        if (remarkText) {
          noteBtn.addEventListener('mouseenter', (e) => {
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
        }

        action.appendChild(noteBtn);
      } else if (isCompleted && remarkText) {
        const noteBtn = document.createElement('div');
        noteBtn.className = 'btn-note-action active-note';
        noteBtn.style.cursor = 'default';
        noteBtn.innerHTML = '📝';
        
        noteBtn.addEventListener('mouseenter', (e) => {
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
            No habits tracked. Click "Manage Habits" below.
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
            } else if (!isCompleted) {
              noteContent = '➕';
              classVal += ' empty-note-hover';
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

      // Habits circular progress badge
      let progressRingHtml = '';
      if (totalCount > 0 && cellDateStr <= todayStr) {
        let badgeColorClass = 'badge-zero';
        if (rate === 100) {
          badgeColorClass = 'badge-perfect';
        } else if (rate > 0) {
          badgeColorClass = 'badge-partial';
        }
        progressRingHtml = `<span class="calendar-day-badge ${badgeColorClass}">${completedCount}/${totalCount}</span>`;
      }

      cell.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="calendar-day-num">${d}</span>
          ${progressRingHtml}
        </div>
      `;

      // Hover tooltip: only shows the percentage and the missed habits (for current date and past only)
      if (totalCount > 0 && cellDateStr <= todayStr) {
        cell.addEventListener('mouseenter', (e) => {
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
      let tableHtml = `
        <table class="consistency-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Rank</th>
              <th>Habit</th>
              <th style="width: 90px; text-align: right;">Streak</th>
            </tr>
          </thead>
          <tbody>
      `;

      let currentRank = 1;
      let lastStreak = -1;

      activeHabits.forEach((habit, index) => {
        const streaks = window.db.profile.habitStreaks[habit.id] || { current: 0 };
        const currentStreakVal = streaks.current;

        if (index > 0 && currentStreakVal < lastStreak) {
          currentRank = index + 1;
        }
        lastStreak = currentStreakVal;
        const rank = currentRank;
        
        let rankBadge = `${rank}`;
        if (rank === 1) rankBadge = '🥇';
        else if (rank === 2) rankBadge = '🥈';
        else if (rank === 3) rankBadge = '🥉';

        tableHtml += `
          <tr>
            <td class="text-center" style="font-weight: 800; font-size: 1rem; color: var(--color-primary); text-align: center;">${rankBadge}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.25rem;">${habit.emoji}</span>
                <span style="font-weight: 700; color: var(--text-main);">${habit.name}</span>
              </div>
            </td>
            <td style="text-align: right; font-weight: 800; color: var(--color-primary); font-family: var(--font-title); font-size: 1rem;">
              🔥 ${streaks.current}
            </td>
          </tr>
        `;
      });

      tableHtml += `
          </tbody>
        </table>
      `;
      statsList.innerHTML = tableHtml;
    }

    this.renderActivityLineChart();
  }

  // Habits Manager Renderer
  // Habits Manager Renderer
  renderHabitsManager() {
    this.managerTableBody.innerHTML = '';
    const activeHabits = window.db.getActiveHabits();

    if (activeHabits.length === 0) {
      this.managerTableBody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state" style="padding: 20px; text-align: center;">
              <span class="empty-state-icon" style="font-size: 2rem; display: block; margin-bottom: 8px;">📭</span>
              <p class="empty-state-desc" style="color: var(--text-muted); margin: 0;">No habits configured yet.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    activeHabits.forEach(habit => {
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';

      row.innerHTML = `
        <td class="manager-emoji-cell" style="width: 60px; text-align: center;">
          <div class="manager-emoji-wrapper">${habit.emoji}</div>
        </td>
        <td>
          <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${habit.name}</span>
        </td>
        <td style="width: 100px; text-align: right; padding-right: 16px;">
          <div class="row-actions" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="row-action-btn edit-btn" title="Edit details" data-id="${habit.id}" style="background: none; border: none; cursor: pointer; padding: 4px; font-size: 0.9rem;">✏️</button>
            <button class="row-action-btn delete-btn" title="Delete habit" data-id="${habit.id}" style="background: none; border: none; cursor: pointer; padding: 4px; font-size: 0.9rem;">🗑️</button>
          </div>
        </td>
      `;

      // Allow clicking the row to open the edit modal (extremely friendly and intuitive)
      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-action-btn')) {
          return; // Don't trigger when clicking actions
        }
        this.openHabitModal(habit.id);
      });

      // Wire up inline action buttons
      row.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openHabitModal(habit.id);
      });
      row.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteConfirmModal(habit.id);
      });

      this.managerTableBody.appendChild(row);
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
        <circle cx="${x}" cy="${y}" r="5" fill="var(--color-primary)" stroke="var(--bg-color)" stroke-width="2" style="cursor: pointer; filter: drop-shadow(0 0 4px var(--color-primary-glow))" class="chart-point" data-idx="${idx}" data-rate="${rate}" />
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
        
        ${nodes}
        ${labelsHtml}
      </svg>
    `;

    container.innerHTML = svgHtml;

    container.querySelectorAll('.chart-point').forEach(pt => {
      pt.addEventListener('mouseenter', (e) => {
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
    const emoji = this.habitEmojiInput.value;

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
    const btnSignupSubmit = document.getElementById('btn-signup-submit');
    const loggedInProfile = document.getElementById('logged-in-profile');
    const loggedInEmail = document.getElementById('logged-in-email');
    const btnSyncNow = document.getElementById('btn-sync-now');
    const btnLogout = document.getElementById('btn-logout');
    const authStatusMessage = document.getElementById('auth-status-message');
    const authSectionTitle = document.getElementById('auth-section-title');
    const authUserSection = document.getElementById('auth-user-section');

    const updateAuthUI = (user) => {
      const isConfigured = window.supabaseMgr && window.supabaseMgr.isConfigured();
      if (!isConfigured) {
        authUserSection.style.opacity = '0.5';
        authUserSection.style.pointerEvents = 'none';
        authSectionTitle.textContent = '2. Account Login (Setup Needed)';
        loginForm.style.display = 'flex';
        loggedInProfile.style.display = 'none';
        window.db.notifySyncStatus('Offline');
        return;
      }

      authUserSection.style.opacity = '1';
      authUserSection.style.pointerEvents = 'auto';
      authSectionTitle.textContent = '2. Account Login';

      if (user) {
        loginForm.style.display = 'none';
        loggedInProfile.style.display = 'flex';
        loggedInEmail.textContent = user.email;
        window.db.notifySyncStatus('Connected');
      } else {
        loginForm.style.display = 'flex';
        loggedInProfile.style.display = 'none';
        window.db.notifySyncStatus('Offline');
      }
    };

    // Load Saved Config to Inputs
    if (window.supabaseMgr) {
      supabaseUrlInput.value = window.supabaseMgr.url || '';
      supabaseKeyInput.value = window.supabaseMgr.anonKey ? '••••••••••••••••' : '';

      window.supabaseMgr.onAuthStateChange((user) => {
        updateAuthUI(user);
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
          authStatusMessage.textContent = `❌ Login Error: ${err.message}`;
          authStatusMessage.style.color = 'var(--color-danger)';
        }
      });
    }

    // Sign Up Submit
    if (btnSignupSubmit) {
      btnSignupSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;
        
        if (!email || !password || password.length < 6) {
          authStatusMessage.textContent = '❌ Valid Email and Password (min 6 chars) required to sign up.';
          authStatusMessage.style.color = 'var(--color-danger)';
          return;
        }

        authStatusMessage.textContent = 'Signing up...';
        authStatusMessage.style.color = 'var(--text-muted)';

        try {
          await window.supabaseMgr.signup(email, password);
          authStatusMessage.textContent = '✅ Check email for confirmation link!';
          authStatusMessage.style.color = 'var(--color-primary)';
          authEmailInput.value = '';
          authPasswordInput.value = '';
        } catch (err) {
          authStatusMessage.textContent = `❌ Signup Error: ${err.message}`;
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
