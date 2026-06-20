/**
 * Habit Tracker v2 - Database & State Engine (db.js)
 * Manages LocalStorage, routine streaks, and individual habit streaks.
 */

const DB_KEYS = {
  HABITS: 'habit_v2d_habits',
  HISTORY: 'habit_v2d_history',
  PROFILE: 'habit_v2d_profile'
};

// Standard preset habits list with creation date set to Jan 1st, 2015 (1420070400000)
// This guarantees default habits are always available historically.
const PRESET_HABITS = [
  { id: 'h-preset-wakeup', name: 'Wake up early', emoji: '☀️', createdAt: 1420070400000, active: true },
  { id: 'h-preset-gotobed', name: 'Go to bed early', emoji: '😴', createdAt: 1420070400000, active: true },
  { id: 'h-preset-water8', name: 'Drink 8 glasses of water', emoji: '💧', createdAt: 1420070400000, active: true },
  { id: 'h-preset-shower', name: 'Shower immediately upon returning home', emoji: '🚿', createdAt: 1420070400000, active: true },
  { id: 'h-preset-read', name: 'Read', emoji: '📖', createdAt: 1420070400000, active: true },
  { id: 'h-preset-exercise30', name: 'Exercise for 30 minutes', emoji: '🏃‍♂️', createdAt: 1420070400000, active: true },
  { id: 'h-preset-meditate', name: 'Meditate', emoji: '🧘‍♂️', createdAt: 1420070400000, active: true },
  { id: 'h-preset-journal', name: 'Journal', emoji: '✍️', createdAt: 1420070400000, active: true },
  { id: 'h-preset-learnskill', name: 'Learn a new skill', emoji: '🧠', createdAt: 1420070400000, active: true },
  { id: 'h-preset-tidyroom', name: 'Tidy up the room', emoji: '🧹', createdAt: 1420070400000, active: true }
];

const getSystemDefaultTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'cyberpunk';
};

class HabitDatabase {
  constructor() {
    this.habits = [];
    this.history = {}; // Format: { 'YYYY-MM-DD': { 'habitId': { completed: bool, remark: String } } }
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: false,
      theme: getSystemDefaultTheme(),
      lastActiveDate: '',
      habitStreaks: {} // Format: { 'habitId': { current: Int, longest: Int } }
    };
    this.guestSandboxMode = false;
    this.sandboxInitialized = false;

    this.loadFromStorage();

    // Listen to Supabase Auth State changes to trigger syncing
    if (window.supabaseMgr) {
      window.supabaseMgr.onAuthStateChange((user, event) => {
        if (user) {
          this.syncWithCloud();
        } else {
          // Only clear local user data if it's an explicit sign out event
          if (event === 'SIGNED_OUT') {
            this.clearLocalUserData();
          } else {
            // Otherwise, load whatever we have in local storage
            this.loadFromStorage();
          }
          if (window.app && typeof window.app.renderAll === 'function') {
            window.app.renderAll();
          }
        }
      });
    }
  }

  loadFromStorage() {
    // If in sandbox mode, do not reload from storage, load sandbox habits instead
    if (this.guestSandboxMode) {
      this.initSandboxMode();
      return;
    }

    try {
      // 1. Habits
      const savedHabits = localStorage.getItem(DB_KEYS.HABITS);
      if (savedHabits) {
        this.habits = JSON.parse(savedHabits);
      } else {
        this.habits = [...PRESET_HABITS];
        this.saveHabits();
      }

      // 2. History
      const savedHistory = localStorage.getItem(DB_KEYS.HISTORY);
      this.history = savedHistory ? JSON.parse(savedHistory) : {};

      // 3. Profile
      const savedProfile = localStorage.getItem(DB_KEYS.PROFILE);
      if (savedProfile) {
        this.profile = { ...this.profile, ...JSON.parse(savedProfile) };
      } else {
        this.saveProfile();
      }
      if (!this.profile.habitStreaks) {
        this.profile.habitStreaks = {};
      }
    } catch (e) {
      console.error("Error loading Habit database", e);
    }
  }

  clearLocalUserData() {
    this.guestSandboxMode = false;
    this.sandboxInitialized = false;

    localStorage.removeItem(DB_KEYS.HABITS);
    localStorage.removeItem(DB_KEYS.HISTORY);
    localStorage.removeItem(DB_KEYS.PROFILE);

    this.habits = [...PRESET_HABITS];
    this.history = {};
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: false,
      theme: getSystemDefaultTheme(),
      lastActiveDate: '',
      habitStreaks: {}
    };

    this.saveHabits();
    this.saveHistory();
    this.saveProfile();
  }

  initSandboxMode() {
    this.guestSandboxMode = true;
    if (this.sandboxInitialized) return;
    this.sandboxInitialized = true;
    this.habits = [
      { id: 'h-guest-1', name: 'Habit 1', emoji: '🌱', createdAt: 1420070400000, active: true },
      { id: 'h-guest-2', name: 'Habit 2', emoji: '💧', createdAt: 1420070400000, active: true },
      { id: 'h-guest-3', name: 'Habit 3', emoji: '🏃‍♂️', createdAt: 1420070400000, active: true }
    ];
    this.history = {};
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: this.profile ? this.profile.soundEnabled : false,
      theme: this.profile ? this.profile.theme : 'cyberpunk',
      lastActiveDate: '',
      habitStreaks: {}
    };
    this.updateStreaks();
  }

  saveHabits() {
    if (this.guestSandboxMode) return;
    localStorage.setItem(DB_KEYS.HABITS, JSON.stringify(this.habits));
  }

  saveHistory() {
    if (this.guestSandboxMode) return;
    localStorage.setItem(DB_KEYS.HISTORY, JSON.stringify(this.history));
  }

  saveProfile() {
    if (this.guestSandboxMode) return;
    localStorage.setItem(DB_KEYS.PROFILE, JSON.stringify(this.profile));
    
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('profiles').upsert({
        user_id: window.supabaseMgr.currentUser.id,
        theme: this.profile.theme,
        sound_enabled: this.profile.soundEnabled,
        current_streak: this.profile.currentStreak,
        longest_streak: this.profile.longestStreak,
        last_active_date: this.profile.lastActiveDate,
        habit_streaks: this.profile.habitStreaks
      }).then(({ error }) => {
        if (error) console.error("Cloud update profile failed", error);
      });
    }
  }

  // Sync with Supabase Database
  async syncWithCloud() {
    if (this.guestSandboxMode) return;
    if (!window.supabaseMgr || !window.supabaseMgr.isAuthenticated()) return;
    const user = window.supabaseMgr.currentUser;
    const userId = user.id;

    try {
      console.log("Syncing with cloud...");
      this.notifySyncStatus("Syncing...");
      
      // 1. Fetch habits from cloud
      const { data: cloudHabits, error: habitsErr } = await window.supabaseMgr.client
        .from('habits')
        .select('*')
        .eq('user_id', userId);
        
      if (habitsErr) throw habitsErr;

      // 2. Fetch history from cloud
      const { data: cloudHistory, error: historyErr } = await window.supabaseMgr.client
        .from('history')
        .select('*')
        .eq('user_id', userId);

      if (historyErr) throw historyErr;

      // 3. Fetch profile from cloud
      const { data: cloudProfiles, error: profileErr } = await window.supabaseMgr.client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      // Merging Logic:
      // If cloud is completely empty, this is a new user account.
      // We initialize them with an empty habits list by default.
      if (!cloudHabits || cloudHabits.length === 0) {
        console.log("Cloud is empty. Initializing new user account with clean slate...");
        this.habits = [];
        this.history = {};
        this.saveHabits();
        this.saveHistory();
        
        this.notifySyncStatus("Initializing...");
        await this.uploadLocalDataToCloud(userId);
      } else {
        // Cloud has data: merge local data that is missing in cloud
        console.log("Merging local data with cloud data...");
        
        // 1. Merge habits
        const cloudHabitsMap = new Map(cloudHabits.map(h => [h.id, h]));
        const missingLocalHabits = [];
        const habitsToDeleteLocally = [];

        this.habits.forEach(h => {
          if (!cloudHabitsMap.has(h.id)) {
            // Unsynced presets or guest sandbox habits should not be uploaded/merged
            // if the cloud already has habits. They should just be ignored.
            const isPresetOrGuest = h.id.startsWith('h-preset-') || h.id.startsWith('h-guest-');
            
            if (isPresetOrGuest) {
              // Ignore preset/guest habits
            } else if (h.synced === true) {
              // This custom habit was previously synced, but is now missing from the cloud.
              // This means it was deleted on another device.
              habitsToDeleteLocally.push(h.id);
            } else {
              // This custom habit was created offline and has never been synced.
              missingLocalHabits.push(h);
            }
          }
        });

        // Delete habits locally that were deleted on another device
        if (habitsToDeleteLocally.length > 0) {
          console.log(`Deleting ${habitsToDeleteLocally.length} habits locally that were deleted from cloud...`);
          const toDeleteSet = new Set(habitsToDeleteLocally);
          this.habits = this.habits.filter(h => !toDeleteSet.has(h.id));
          
          // Also clean up history for these habits
          for (const date in this.history) {
            toDeleteSet.forEach(id => {
              if (this.history[date][id] !== undefined) {
                delete this.history[date][id];
              }
            });
          }
        }
        
        if (missingLocalHabits.length > 0) {
          console.log(`Uploading ${missingLocalHabits.length} missing local habits to cloud...`);
          const habitsToInsert = missingLocalHabits.map(h => ({
            id: h.id,
            user_id: userId,
            name: h.name,
            emoji: h.emoji,
            created_at: h.createdAt,
            active: h.active
          }));
          const { error: insertErr } = await window.supabaseMgr.client.from('habits').insert(habitsToInsert);
          if (insertErr) {
            console.error("Error uploading missing local habits:", insertErr);
          } else {
            // Add them to cloudHabits so they are included in local mapping
            missingLocalHabits.forEach(h => {
              cloudHabits.push({
                id: h.id,
                user_id: userId,
                name: h.name,
                emoji: h.emoji,
                created_at: h.createdAt,
                active: h.active
              });
            });
          }
        }

        // Save merged habits to local storage, setting synced = true
        this.habits = cloudHabits.map(h => ({
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          createdAt: Number(h.created_at),
          active: h.active,
          synced: true
        }));
        this.saveHabits();

        // 2. Merge history
        const cloudHistorySet = new Set(cloudHistory.map(item => `${item.date}_${item.habit_id}`));
        const historyToInsert = [];

        for (const dateStr in this.history) {
          const dayHabits = this.history[dateStr];
          for (const habitId in dayHabits) {
            const record = dayHabits[habitId];
            if (!cloudHistorySet.has(`${dateStr}_${habitId}`)) {
              let completed = false;
              let remark = '';
              if (record && typeof record === 'object') {
                completed = record.completed;
                remark = record.remark || '';
              } else {
                completed = Boolean(record);
              }
              historyToInsert.push({
                user_id: userId,
                date: dateStr,
                habit_id: habitId,
                completed: completed,
                remark: remark
              });
            }
          }
        }

        if (historyToInsert.length > 0) {
          console.log(`Uploading ${historyToInsert.length} missing history records to cloud...`);
          const { error: historyInsertErr } = await window.supabaseMgr.client.from('history').insert(historyToInsert);
          if (historyInsertErr) {
            console.error("Error uploading missing history records:", historyInsertErr);
          } else {
            historyToInsert.forEach(item => {
              cloudHistory.push(item);
            });
          }
        }

        // Save merged history to local storage
        this.history = {};
        cloudHistory.forEach(item => {
          const dateStr = item.date;
          // Only map history if the habit exists locally (not deleted)
          const habitExists = this.habits.some(h => h.id === item.habit_id);
          if (habitExists) {
            if (!this.history[dateStr]) this.history[dateStr] = {};
            this.history[dateStr][item.habit_id] = {
              completed: item.completed,
              remark: item.remark || ''
            };
          }
        });
        this.saveHistory();

        // Map cloud profile
        if (cloudProfiles) {
          this.profile = {
            currentStreak: cloudProfiles.current_streak,
            longestStreak: cloudProfiles.longest_streak,
            soundEnabled: cloudProfiles.sound_enabled,
            theme: cloudProfiles.theme,
            lastActiveDate: cloudProfiles.last_active_date || '',
            habitStreaks: cloudProfiles.habit_streaks || {}
          };
          this.saveProfile();
        }

        // Recalculate and update streaks locally and push to cloud
        this.updateStreaks();
      }
      
      // Notify app to re-render
      if (window.app && typeof window.app.renderAll === 'function') {
        window.app.renderAll();
      }
      
      this.notifySyncStatus("Connected");
      console.log("Cloud sync complete!");
    } catch (e) {
      this.notifySyncStatus("Sync Error");
      console.error("Cloud sync failed", e);
    }
  }

  // Upload offline data to cloud
  async uploadLocalDataToCloud(userId) {
    // 1. Upload habits
    const habitsToInsert = this.habits.map(h => ({
      id: h.id,
      user_id: userId,
      name: h.name,
      emoji: h.emoji,
      created_at: h.createdAt,
      active: h.active
    }));
    
    if (habitsToInsert.length > 0) {
      const { error } = await window.supabaseMgr.client.from('habits').insert(habitsToInsert);
      if (error) throw error;
    }

    // 2. Upload history
    const historyToInsert = [];
    for (const dateStr in this.history) {
      const dayHabits = this.history[dateStr];
      for (const habitId in dayHabits) {
        const record = dayHabits[habitId];
        let completed = false;
        let remark = '';
        if (record && typeof record === 'object') {
          completed = record.completed;
          remark = record.remark || '';
        } else {
          completed = Boolean(record);
        }
        historyToInsert.push({
          user_id: userId,
          date: dateStr,
          habit_id: habitId,
          completed: completed,
          remark: remark
        });
      }
    }

    if (historyToInsert.length > 0) {
      const { error } = await window.supabaseMgr.client.from('history').insert(historyToInsert);
      if (error) throw error;
    }

    // 3. Upload profile
    const { error: profileErr } = await window.supabaseMgr.client.from('profiles').upsert({
      user_id: userId,
      theme: this.profile.theme,
      sound_enabled: this.profile.soundEnabled,
      current_streak: this.profile.currentStreak,
      longest_streak: this.profile.longestStreak,
      last_active_date: this.profile.lastActiveDate,
      habit_streaks: this.profile.habitStreaks
    });
    
    if (profileErr) throw profileErr;
  }

  // UI helper for sync status
  notifySyncStatus(status) {
    const statusEl = document.getElementById('cloud-sync-status');
    const iconEl = document.getElementById('cloud-sync-icon');
    const footerSyncEl = document.getElementById('app-sync-status-indicator');
    if (statusEl) {
      if (status === 'Offline') {
        statusEl.textContent = 'Sign In';
      } else if (status === 'Connected') {
        let username = 'Connected';
        if (window.supabaseMgr && window.supabaseMgr.currentUser) {
          const user = window.supabaseMgr.currentUser;
          if (user.user_metadata && user.user_metadata.username) {
            username = user.user_metadata.username;
          } else if (user.email) {
            username = user.email.split('@')[0];
          }
        }
        if (username.length > 12) {
          username = username.slice(0, 10) + '..';
        }
        statusEl.textContent = username;
      } else {
        statusEl.textContent = status;
      }
    }
    if (iconEl) {
      if (status === 'Connected') {
        iconEl.textContent = '👤';
      } else if (status === 'Offline') {
        iconEl.textContent = '👤';
      } else if (status === 'Syncing...') {
        iconEl.textContent = '🔄';
      } else if (status === 'Sync Error') {
        iconEl.textContent = '🔴';
      }
    }

    // Update the app status footer indicator
    if (footerSyncEl) {
      if (status === 'Offline') {
        footerSyncEl.textContent = 'Guest Sandbox';
        footerSyncEl.style.color = 'var(--text-muted)';
        footerSyncEl.style.textShadow = 'none';
      } else if (status === 'Connected') {
        let username = '';
        if (window.supabaseMgr && window.supabaseMgr.currentUser) {
          const user = window.supabaseMgr.currentUser;
          if (user.user_metadata && user.user_metadata.username) {
            username = ' (' + user.user_metadata.username + ')';
          } else if (user.email) {
            username = ' (' + user.email.split('@')[0] + ')';
          }
        }
        footerSyncEl.textContent = 'Synced to Cloud' + username;
        footerSyncEl.style.color = 'var(--color-primary)';
        footerSyncEl.style.textShadow = '0 0 8px var(--color-primary-glow)';
      } else if (status === 'Syncing...') {
        footerSyncEl.textContent = 'Syncing...';
        footerSyncEl.style.color = 'var(--color-secondary)';
        footerSyncEl.style.textShadow = '0 0 8px var(--color-secondary-glow)';
      } else if (status === 'Sync Error') {
        footerSyncEl.textContent = 'Sync Error';
        footerSyncEl.style.color = '#ef4444';
        footerSyncEl.style.textShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
      } else {
        footerSyncEl.textContent = status;
        footerSyncEl.style.color = 'var(--color-primary)';
      }
    }
  }

  // Get active habits
  getActiveHabits() {
    return this.habits.filter(h => h.active);
  }

  // Create Habit
  createHabit(name, emoji) {
    if (this.guestSandboxMode) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const newHabit = {
      id: 'h-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name,
      emoji: emoji || '⭐',
      createdAt: today.getTime(),
      active: true
    };
    this.habits.push(newHabit);
    this.saveHabits();
    this.updateStreaks();

    // Cloud insert
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('habits').insert({
        id: newHabit.id,
        user_id: window.supabaseMgr.currentUser.id,
        name: newHabit.name,
        emoji: newHabit.emoji,
        created_at: newHabit.createdAt,
        active: newHabit.active
      }).then(({ error }) => {
        if (error) {
          console.error("Cloud insert habit failed", error);
        } else {
          newHabit.synced = true;
          this.saveHabits();
        }
      });
    }

    return newHabit;
  }

  // Update Habit details
  updateHabit(id, updates) {
    if (this.guestSandboxMode) return null;
    const index = this.habits.findIndex(h => h.id === id);
    if (index !== -1) {
      this.habits[index] = { ...this.habits[index], ...updates };
      this.saveHabits();

      // Cloud update
      if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
        window.supabaseMgr.client.from('habits').update({
          name: this.habits[index].name,
          emoji: this.habits[index].emoji,
          active: this.habits[index].active
        }).eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud update habit failed", error);
        });
      }

      return this.habits[index];
    }
    return null;
  }

  // Soft Delete Habit
  deleteHabit(id) {
    if (this.guestSandboxMode) return false;
    const index = this.habits.findIndex(h => h.id === id);
    if (index !== -1) {
      this.habits[index].active = false;
      this.saveHabits();
      this.updateStreaks();

      // Cloud update
      if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
        window.supabaseMgr.client.from('habits').update({
          active: false
        }).eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud soft-delete habit failed", error);
        });
      }

      return true;
    }
    return false;
  }

  // Hard Delete Habit & all history entries
  hardDeleteHabit(id) {
    if (this.guestSandboxMode) return;
    this.habits = this.habits.filter(h => h.id !== id);
    this.saveHabits();

    for (const date in this.history) {
      if (this.history[date][id] !== undefined) {
        delete this.history[date][id];
      }
    }
    this.saveHistory();
    this.updateStreaks();

    // Cloud hard-delete
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('history').delete().eq('habit_id', id).then(() => {
        window.supabaseMgr.client.from('habits').delete().eq('id', id).then(({ error }) => {
          if (error) console.error("Cloud hard-delete habit failed", error);
        });
      });
    }
  }

  // Set checkbox progress for a habit on a specific date
  setProgress(dateStr, habitId, completed) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return null;

    if (!this.history[dateStr]) {
      this.history[dateStr] = {};
    }

    const currentRecord = this.history[dateStr][habitId];
    let oldCompleted = false;
    let oldRemark = '';

    if (currentRecord && typeof currentRecord === 'object') {
      oldCompleted = currentRecord.completed;
      oldRemark = currentRecord.remark || '';
    } else if (currentRecord !== undefined) {
      oldCompleted = Boolean(currentRecord);
    }

    this.history[dateStr][habitId] = {
      completed: completed,
      remark: oldRemark
    };
    this.saveHistory();

    const wasCompleted = oldCompleted;
    const isCompleted = completed;

    this.updateStreaks();

    // Cloud upsert
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('history').upsert({
        user_id: window.supabaseMgr.currentUser.id,
        date: dateStr,
        habit_id: habitId,
        completed: completed,
        remark: oldRemark
      }, { onConflict: 'user_id,date,habit_id' }).then(({ error }) => {
        if (error) console.error("Cloud setProgress failed", error);
      });
    }

    return {
      statusChanged: wasCompleted !== isCompleted,
      completed: isCompleted
    };
  }

  // Set remark/description for an incomplete habit
  setRemark(dateStr, habitId, remark) {
    if (!this.history[dateStr]) {
      this.history[dateStr] = {};
    }

    const currentRecord = this.history[dateStr][habitId];
    let completed = false;

    if (currentRecord && typeof currentRecord === 'object') {
      completed = currentRecord.completed;
    } else if (currentRecord !== undefined) {
      completed = Boolean(currentRecord);
    }

    this.history[dateStr][habitId] = {
      completed: completed,
      remark: remark
    };
    this.saveHistory();

    // Cloud upsert
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('history').upsert({
        user_id: window.supabaseMgr.currentUser.id,
        date: dateStr,
        habit_id: habitId,
        completed: completed,
        remark: remark
      }, { onConflict: 'user_id,date,habit_id' }).then(({ error }) => {
        if (error) console.error("Cloud setRemark failed", error);
      });
    }
  }

  // Check if a specific date had 100% completion of active habits that existed on that day
  checkPerfectDay(dateStr) {
    const dayEnd = new Date(dateStr + "T23:59:59").getTime();
    // Only check active habits created on or before this day
    const active = this.getActiveHabits().filter(h => h.createdAt <= dayEnd);
    if (active.length === 0) return false;

    const dayRecords = this.history[dateStr] || {};
    return active.every(habit => {
      const record = dayRecords[habit.id];
      let completed = false;
      if (record && typeof record === 'object') {
        completed = record.completed;
      } else if (record !== undefined) {
        completed = Boolean(record);
      }
      return completed;
    });
  }

  // Calculate day completion rate based on habits that existed on that day
  getDayCompletionRate(dateStr) {
    const dayEnd = new Date(dateStr + "T23:59:59").getTime();
    const active = this.getActiveHabits().filter(h => h.createdAt <= dayEnd);
    if (active.length === 0) return 0;

    let completedCount = 0;
    const dayRecords = this.history[dateStr] || {};
    active.forEach(habit => {
      const record = dayRecords[habit.id];
      let completed = false;
      if (record && typeof record === 'object') {
        completed = record.completed;
      } else if (record !== undefined) {
        completed = Boolean(record);
      }
      if (completed) {
        completedCount++;
      }
    });

    return completedCount / active.length;
  }

  // Calculate streaks across historical records
  updateStreaks() {
    const todayStr = this.getFormattedDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.getFormattedDate(yesterday);

    const maxDays = 365;

    // 1. Overall Routine Streak (consecutive 100% completion days)
    let routineStreak = 0;
    const todayPerfect = this.checkPerfectDay(todayStr);
    const yesterdayPerfect = this.checkPerfectDay(yesterdayStr);

    if (todayPerfect) {
      routineStreak = 1;
    } else if (yesterdayPerfect) {
      routineStreak = 0;
    } else {
      routineStreak = 0;
    }

    let scanDate = new Date();
    if (todayPerfect) {
      scanDate.setDate(scanDate.getDate() - 1);
    } else {
      scanDate.setDate(scanDate.getDate() - 1);
    }

    for (let i = 0; i < maxDays; i++) {
      const sDateStr = this.getFormattedDate(scanDate);
      const activeHabitsOnDay = this.habits.filter(h => h.createdAt <= scanDate.getTime());
      if (activeHabitsOnDay.length === 0) break;

      const passed = this.checkPerfectDay(sDateStr);
      if (passed) {
        routineStreak++;
      } else {
        break;
      }
      scanDate.setDate(scanDate.getDate() - 1);
    }

    this.profile.currentStreak = routineStreak;
    if (routineStreak > (this.profile.longestStreak || 0)) {
      this.profile.longestStreak = routineStreak;
    }

    // 2. Individual Habit Streaks
    if (!this.profile.habitStreaks) {
      this.profile.habitStreaks = {};
    }

    this.habits.forEach(habit => {
      let habitCurrent = 0;
      
      const isHabitCompleted = (date) => {
        const dStr = this.getFormattedDate(date);
        const rec = this.history[dStr] && this.history[dStr][habit.id];
        if (rec && typeof rec === 'object') return rec.completed;
        return Boolean(rec);
      };

      const todayCompleted = isHabitCompleted(new Date());
      const yesterdayCompleted = isHabitCompleted(yesterday);

      if (todayCompleted) {
        habitCurrent = 1;
      } else if (yesterdayCompleted) {
        habitCurrent = 0;
      } else {
        habitCurrent = 0;
      }

      let scanDateH = new Date();
      if (todayCompleted) {
        scanDateH.setDate(scanDateH.getDate() - 1);
      } else {
        scanDateH.setDate(scanDateH.getDate() - 1);
      }

      for (let i = 0; i < maxDays; i++) {
        if (scanDateH.getTime() < habit.createdAt - 86400000) break;
        const passed = isHabitCompleted(scanDateH);
        if (passed) {
          habitCurrent++;
        } else {
          break;
        }
        scanDateH.setDate(scanDateH.getDate() - 1);
      }

      // Calculate longest streak in history
      let longestStreakTemp = 0;
      let tempStreak = 0;
      let checkDay = new Date(habit.createdAt);
      const endDay = new Date();
      endDay.setDate(endDay.getDate() + 1);

      while (checkDay < endDay) {
        const passed = isHabitCompleted(checkDay);
        if (passed) {
          tempStreak++;
          if (tempStreak > longestStreakTemp) longestStreakTemp = tempStreak;
        } else {
          tempStreak = 0;
        }
        checkDay.setDate(checkDay.getDate() + 1);
      }

      this.profile.habitStreaks[habit.id] = {
        current: habitCurrent,
        longest: longestStreakTemp
      };
    });

    this.profile.lastActiveDate = todayStr;
    this.saveProfile();

    // Cloud update profile
    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      window.supabaseMgr.client.from('profiles').upsert({
        user_id: window.supabaseMgr.currentUser.id,
        theme: this.profile.theme,
        sound_enabled: this.profile.soundEnabled,
        current_streak: this.profile.currentStreak,
        longest_streak: this.profile.longestStreak,
        last_active_date: this.profile.lastActiveDate,
        habit_streaks: this.profile.habitStreaks
      }).then(({ error }) => {
        if (error) console.error("Cloud update profile failed", error);
      });
    }
  }

  // Get date helper
  getFormattedDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Reset database
  resetAllData() {
    if (this.guestSandboxMode) return;
    localStorage.removeItem(DB_KEYS.HABITS);
    localStorage.removeItem(DB_KEYS.HISTORY);
    localStorage.removeItem(DB_KEYS.PROFILE);

    this.habits = [...PRESET_HABITS];
    this.history = {};
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: false,
      theme: getSystemDefaultTheme(),
      lastActiveDate: '',
      habitStreaks: {}
    };

    this.saveHabits();
    this.saveHistory();
    this.saveProfile();

    if (window.supabaseMgr && window.supabaseMgr.isAuthenticated()) {
      const userId = window.supabaseMgr.currentUser.id;
      Promise.all([
        window.supabaseMgr.client.from('history').delete().eq('user_id', userId),
        window.supabaseMgr.client.from('habits').delete().eq('user_id', userId),
        window.supabaseMgr.client.from('profiles').upsert({
          user_id: userId,
          theme: getSystemDefaultTheme(),
          sound_enabled: false,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: '',
          habit_streaks: {}
        })
      ]).then(() => {
        this.uploadLocalDataToCloud(userId);
      }).catch(err => console.error("Cloud reset failed", err));
    }
  }
}

const db = new HabitDatabase();
window.db = db;
