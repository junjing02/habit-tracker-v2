# 🌿 Aura Habit — Routine & Streak Tracker (v2)

Aura Habit is a client-side routine tracker and streak manager built using vanilla web technologies. It provides a modular view system, guest sandbox execution, automatic offline/cloud synchronization, database-driven procedural SVG tree generation, and streak analysis.

---

## ✨ Features & Functions

* **Guest Sandbox Mode**: In-memory demo workspace isolated from local storage or cloud databases.
* **Daily Checklist**: Checklist supporting completion toggles and optional missed-reason notes.
* **Progress Ring**: Visual indicator showing daily completion percentages.
* **Habit Garden**: Procedural SVG tree drawing that dynamically grows based on weekly completion rates.
* **Consistency Calendar**: Interactive calendar view with progress badges, cell heatmaps, and hover tooltips.
* **Weekly Matrix**: Spreadsheet overview showing Mon–Sun completion records and remarks.
* **Consistency Chart**: Dynamic SVG line graph plotting consistency trends over the past 7 days.
* **Streak Leaderboard**: Renders streak values and supports tied competition rankings (🥇, 🥈, 🥉).
* **Habit Manager**: Panel to add, edit, toggle active status, and assign custom emojis to habits.
* **Supabase Integration**: Account sync, secure login, password recovery, and automated database backups.
* **Theme Switching**: client-side toggles for Cyberpunk Neon, Forest Sanctuary, Cosmic Violet, and Minimalist Light.
* **Sound Feedback**: Sound effects synthesizer built with Web Audio API for interactive clicks.

---

## 💻 Technical Architecture

* **Frontend Layout**: Semantic HTML5 markup.
* **Styling System**: CSS Variables, flexbox, and grid layouts.
* **Application Logic**: Vanilla ES6 JavaScript (DOM manipulation, procedural SVG rendering pipelines).
* **Database Backend**: Supabase integration for authentication sessions and cloud data syncing.
* **Offline Backup**: LocalStorage API storage for backup save states.

---

## 🚀 Deployment & Local Execution

No external build scripts or local runtime installations are required.

1. Clone this repository:
   ```bash
   git clone git@github.com:junjing02/habit-tracker-v2.git
   ```
2. Navigate to the project folder:
   ```bash
   cd habit-tracker-v2
   ```
3. Open `index.html` in a web browser:
   * **macOS**: `open index.html`
   * **Windows**: Double-click `index.html` or open in a browser.
   * **Linux**: `xdg-open index.html`
