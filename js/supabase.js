/**
 * Habit Tracker v2 - Supabase Integration Module (supabase.js)
 * Manages Supabase client initialization, authentication, and configuration storage.
 */

class SupabaseManager {
  constructor() {
    // Hardcode your production Supabase URL and Anon Key here if desired.
    // If left as empty strings, the app will read them from localStorage (configured via the UI).
    this.defaultUrl = 'https://xtyadxnbnyuieugewawi.supabase.co';
    this.defaultAnonKey = 'sb_publishable_XG9x4u-j6-DcC8FdM5Hhbg_AVnUJ_g0';

    this.client = null;
    this.url = '';
    this.anonKey = '';
    this.currentUser = null;
    this.authCallbacks = [];
    this.initialSessionChecked = false;

    this.loadConfig();
    this.init();
  }

  // Load configuration from localStorage or default constants
  loadConfig() {
    this.url = localStorage.getItem('habit_v2_supabase_url') || this.defaultUrl;
    this.anonKey = localStorage.getItem('habit_v2_supabase_key') || this.defaultAnonKey;
  }

  // Save config to local storage (entered via UI)
  saveConfig(url, key) {
    if (!url || !key) return false;
    
    // Test if URL is valid
    try {
      new URL(url);
    } catch (_) {
      throw new Error("Invalid Supabase URL format.");
    }

    localStorage.setItem('habit_v2_supabase_url', url);
    localStorage.setItem('habit_v2_supabase_key', key);
    
    this.url = url;
    this.anonKey = key;
    
    return this.init(true); // Re-initialize client
  }

  // Clear config from localStorage
  clearConfig() {
    localStorage.removeItem('habit_v2_supabase_url');
    localStorage.removeItem('habit_v2_supabase_key');
    this.url = this.defaultUrl;
    this.anonKey = this.defaultAnonKey;
    this.client = null;
    this.currentUser = null;
    this.authCallbacks.forEach(cb => {
      try {
        cb(null, 'SIGNED_OUT');
      } catch (e) {
        console.error("Error in auth callback during clearConfig", e);
      }
    });
  }

  // Initialize client
  init(forceReinit = false) {
    if (this.client && !forceReinit) return true;
    if (forceReinit) {
      this.initialSessionChecked = false;
    }

    if (!this.url || !this.anonKey || this.url.includes('YOUR_') || this.anonKey.includes('YOUR_')) {
      console.warn("Supabase client not initialized: URL or Anon Key is missing/placeholder.");
      this.client = null;
      return false;
    }

    try {
      // Create Supabase client using CDN global library
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        this.client = supabase.createClient(this.url, this.anonKey);
        
        // Listen to Auth State Changes
        this.client.auth.onAuthStateChange((event, session) => {
          this.currentUser = session ? session.user : null;
          this.authCallbacks.forEach(cb => {
            try {
              cb(this.currentUser, event);
            } catch (e) {
              console.error("Error in auth callback", e);
            }
          });
        });

        // Set initial user if session exists
        this.client.auth.getSession().then(({ data }) => {
          if (data && data.session) {
            this.currentUser = data.session.user;
            this.initialSessionChecked = true;
            this.authCallbacks.forEach(cb => {
              try {
                cb(this.currentUser, 'INITIAL');
              } catch (e) {
                console.error("Error in auth callback", e);
              }
            });
          } else {
            this.currentUser = null;
            this.initialSessionChecked = true;
            this.authCallbacks.forEach(cb => {
              try {
                cb(null, 'INITIAL');
              } catch (e) {
                console.error("Error in auth callback", e);
              }
            });
          }
        }).catch(err => {
          console.error("Error checking initial session", err);
          this.currentUser = null;
          this.initialSessionChecked = true;
          this.authCallbacks.forEach(cb => {
            try {
              cb(null, 'INITIAL');
            } catch (e) {
              console.error("Error in auth callback on error", e);
            }
          });
        });

        return true;
      } else {
        console.error("Supabase CDN library is not loaded.");
        return false;
      }
    } catch (e) {
      console.error("Failed to initialize Supabase client", e);
      this.client = null;
      return false;
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Authenticate listener
  onAuthStateChange(callback) {
    this.authCallbacks.push(callback);
    // If client is not configured, trigger callback immediately with null
    if (!this.isConfigured()) {
      callback(null, 'INITIAL');
    } else if (this.initialSessionChecked) {
      // If we already resolved a user, notify immediately
      callback(this.currentUser, 'INITIAL');
    }
  }

  // Sign up a new user
  async signup(email, password) {
    if (!this.isConfigured()) throw new Error("Supabase is not configured.");
    
    const { data, error } = await this.client.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  // Log in existing user
  async login(email, password) {
    if (!this.isConfigured()) throw new Error("Supabase is not configured.");

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    
    this.currentUser = data.user;
    return data;
  }

  // Log out current user
  async logout() {
    if (!this.isConfigured()) return;
    
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
    
    this.currentUser = null;
  }

  // Send reset password email
  async resetPassword(email) {
    if (!this.isConfigured()) throw new Error("Supabase is not configured.");
    
    const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href.split('#')[0].split('?')[0]
    });
    
    if (error) throw error;
    return data;
  }

  // Update password for currently signed-in user (recovery flow)
  async updatePassword(password) {
    if (!this.isConfigured()) throw new Error("Supabase is not configured.");
    
    const { data, error } = await this.client.auth.updateUser({
      password: password
    });
    
    if (error) throw error;
    return data;
  }
}

const supabaseMgr = new SupabaseManager();
window.supabaseMgr = supabaseMgr;
