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

class HabitDatabase {
  constructor() {
    this.habits = [];
    this.history = {}; // Format: { 'YYYY-MM-DD': { 'habitId': { completed: bool, remark: String } } }
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: true,
      theme: 'cyberpunk',
      lastActiveDate: '',
      habitStreaks: {} // Format: { 'habitId': { current: Int, longest: Int } }
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
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
    } catch (e) {
      console.error("Error loading Habit database", e);
    }
  }

  saveHabits() {
    localStorage.setItem(DB_KEYS.HABITS, JSON.stringify(this.habits));
  }

  saveHistory() {
    localStorage.setItem(DB_KEYS.HISTORY, JSON.stringify(this.history));
  }

  saveProfile() {
    localStorage.setItem(DB_KEYS.PROFILE, JSON.stringify(this.profile));
  }

  // Get active habits
  getActiveHabits() {
    return this.habits.filter(h => h.active);
  }

  // Create Habit
  createHabit(name, emoji) {
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
    return newHabit;
  }

  // Update Habit details
  updateHabit(id, updates) {
    const index = this.habits.findIndex(h => h.id === id);
    if (index !== -1) {
      this.habits[index] = { ...this.habits[index], ...updates };
      this.saveHabits();
      return this.habits[index];
    }
    return null;
  }

  // Soft Delete Habit
  deleteHabit(id) {
    const index = this.habits.findIndex(h => h.id === id);
    if (index !== -1) {
      this.habits[index].active = false;
      this.saveHabits();
      this.updateStreaks();
      return true;
    }
    return false;
  }

  // Hard Delete Habit & all history entries
  hardDeleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this.saveHabits();

    for (const date in this.history) {
      if (this.history[date][id] !== undefined) {
        delete this.history[date][id];
      }
    }
    this.saveHistory();
    this.updateStreaks();
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
    localStorage.removeItem(DB_KEYS.HABITS);
    localStorage.removeItem(DB_KEYS.HISTORY);
    localStorage.removeItem(DB_KEYS.PROFILE);

    this.habits = [...PRESET_HABITS];
    this.history = {};
    this.profile = {
      currentStreak: 0,
      longestStreak: 0,
      soundEnabled: true,
      theme: 'cyberpunk',
      lastActiveDate: '',
      habitStreaks: {}
    };

    this.saveHabits();
    this.saveHistory();
    this.saveProfile();
  }
}

const db = new HabitDatabase();
window.db = db;
