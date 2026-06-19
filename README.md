# 🌿 Aura Habit — Routine & Streak Tracker (v2)

Aura Habit is a gorgeous, premium-styled personal routine tracker and streak manager. It features a modern Apple-style landing homepage, guest sandbox demo mode, cloud synchronization, a procedurally growing virtual tree garden, interactive weekly spreadsheets, visual calendars, analytics, dynamic themes, and a sound synthesizer—all built entirely with native web technologies.

---

## ✨ Features

### 1. Apple-Style Landing Page
* **Product Showcase**: Sleek dark hero header introducing features, dynamic product mockups, and clean CTA actions.
* **Unified Entry**: Single point of entry allowing guests to try a demo or log in/sign up directly.

### 2. Guest Sandbox Mode
* **Instant Demo**: Click "Try Demo" to jump into the focus dashboard pre-populated with exactly 3 memory-only default habits (`Habit 1`, `Habit 2`, `Habit 3`).
* **Memory Isolation**: Interactions in sandbox mode run purely in-memory and will not overwrite local storage or remote database records.
* **Intelligent Redirection**: Attempting customization or synchronization actions in sandbox mode opens the login modal.

### 3. Focus Dashboard
* **Procedural Habit Garden**: Grow a virtual plant dynamically scaled to your weekly completion rate.
* **Daily Checklist**: Quickly toggle completion states and record context notes/reasons for missed routines.
* **Progress Ring**: Instant visual tracker of your daily completion rate.

### 4. Simplified Calendar View
* **Fraction Progress Badges**: Obvious completion indicators (`2/4`, `4/4`) displayed on today's date and past cells.
* **Smart Hiding**: Hides progress badges for future dates to keep the grid clean.
* **Interactive Tooltips**: Hover over cells to see missed habits or celebrating messages.
* **Progress Heatmap**: Custom coloring based on daily completion percentages to track consistency at a glance.

### 5. Weekly Matrix
* **Spreadsheet Layout**: Clear overview of your consistency across the current Mon–Sun week.
* **Read-Only List**: Focuses matrix columns exclusively on completions and remarks.

### 6. Interactive Analytics
* **Consistency Chart**: Dynamic SVG line graph representing consistency trends over the past 7 days.
* **Tied Streaks Ranking**: Streaks leaderboard supporting tied competition rankings (e.g. 🥇, 🥈, 🥉).

### 7. Habits Manager Dashboard
* **Unified Habit Modal**: Create and edit habits with names and emojis via a single, polished dialog form.
* **Emoji Picker**: Pick from a wide selection of custom emojis or fall back to a general emoji if none is selected.

### 8. Interactive Customization & Sync
* **Secure Cloud Sync**: Native integration with Supabase for user signup, password recovery, and automatic real-time cloud data sync.
* **Dynamic Themes**: Instant client-side theme switching (Cyberpunk Neon, Forest Sanctuary, Cosmic Violet, and Minimalist Light).
* **Sound Synthesizer**: Audio feedback synthesizer with check/uncheck/click tones (can be toggled off).

---

## 🛠️ Technology Stack

* **Structure**: Semantic HTML5
* **Styling**: Modern Vanilla CSS (with CSS variables, grid, flexbox layouts, and custom animations)
* **Logic**: Vanilla ES6 JavaScript (Client-side logic, procedural tree SVG generation, dynamic line graph rendering)
* **Backend & Auth**: Supabase CDN integration (Auth session tracking, SQL database sync)
* **Storage**: LocalStorage API (persistent offline save state for logged-in sessions)

---

## 🚀 How to Run

No installations, build steps, or local servers are required!

1. Clone or download this repository:
   ```bash
   git clone git@github.com:junjing02/habit-tracker-v2.git
   ```
2. Navigate to the folder:
   ```bash
   cd habit-tracker-v2
   ```
3. Open `index.html` in your default browser:
   * **macOS**: `open index.html`
   * **Windows**: Double-click the file, or open it in Microsoft Edge/Chrome.
   * **Linux**: `xdg-open index.html`
