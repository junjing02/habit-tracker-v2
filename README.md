# 🌿 Aura Habit — Routine & Streak Tracker (v2)

Aura Habit is a client-side routine tracker and streak manager built using vanilla web technologies. It provides a modular view system, guest sandbox execution, automatic offline/cloud synchronization, database-driven procedural SVG tree generation, and streak analysis.

---

## 🛠️ Functional Specifications

### 1. Unified Landing Homepage
* **Feature Access Router**: Single page entry point routing between guest sandbox and account login/signup.
* **Feature Overview**: Highlights key features including custom view configurations.

### 2. Guest Sandbox Execution
* **Memory-Only State**: Running in sandbox mode initializes exactly 3 local habits (`Habit 1`, `Habit 2`, `Habit 3`) operating strictly in-memory.
* **Storage Isolation**: Guest updates are kept in memory and do not override existing local storage or remote cloud sync databases.
* **Auth Boundary**: Restricts custom adjustments (adding/deleting/modifying habits or syncing data) by opening the auth modal.

### 3. Focus Dashboard
* **Procedural SVG Habit Garden**: Dynamically grows and renders a virtual tree scaled to the user's weekly completion rate.
* **Routines Checklist**: Daily list checklist supporting completion toggles and optional notes/missed reason tracking.
* **Completion Analytics**: Circular progress ring reflecting overall daily completion metrics.

### 4. Interactive Consistency Calendar
* **Progress Badging**: Displays daily completion status (e.g., `2/4`, `4/4`) for past and current dates.
* **Smart Visibility**: Excludes progress badges for future dates.
* **Tooltip Metadata**: Hover tooltips show missed habits list and completion data for checked cells.
* **Heatmap Grid**: Automatically adjusts cell colors based on the daily completion percentage.

### 5. Weekly Matrix View
* **Spreadsheet Overview**: Tabular matrix presenting completion states and remarks across the current Mon–Sun week.
* **Checklist Toggles**: Allows users to check off past records directly from the weekly grid.

### 6. Data Analytics
* **Consistency Line Graph**: Procedural SVG graph plotting the consistency percentage of the past 7 days.
* **Streak Leaderboard**: Renders streak values and supports tied competition rankings (e.g., 🥇, 🥈, 🥉).

### 7. Habits Manager
* **Habit Modifiers**: Renders a form dialog to add, edit, or toggle active/inactive states of habits.
* **Custom Emojis**: Associates habits with custom emojis.

### 8. Synchronization & Preferences
* **Database Synchronizer**: Fully integrated cloud sync with Supabase for user session storage, signup, recovery, and real-time history upserts.
* **Theme System**: Dynamic switching between Neon, Forest, Cosmic, and Light theme profiles.
* **Sound Feedback**: Synthesizes custom check/uncheck/click audio signals via the Web Audio API.

---

## 💻 Technical Architecture

* **Frontend Layout**: Semantic HTML5 markup.
* **Styling System**: CSS Variables, flexbox, and grid systems.
* **Application Logic**: Vanilla ES6 JavaScript (DOM manipulation, procedural SVG render pipelines).
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
