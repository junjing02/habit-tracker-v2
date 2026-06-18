# 🌿 Aura Habit — Routine & Streak Tracker (v2)

Aura Habit is a gorgeous, premium-styled personal routine tracker and streak manager. It features a procedurally growing virtual tree garden, interactive weekly spreadsheets, visual calendars, analytics, dynamic themes, and a sound synthesizer—all built entirely with native web technologies.

---

## ✨ Features

### 1. Focus Dashboard
* **Procedural Habit Garden**: Grow a virtual plant dynamically scaled to your weekly completion rate.
* **Daily Checklist**: Quickly toggle completion states and record context notes/reasons for missed routines.
* **Progress Ring**: Instant visual tracker of your daily completion rate.

### 2. Simplified Calendar View
* **Fraction Progress Badges**: Obvious completion indicators (`2/4`, `4/4`) displayed on today's date and past cells.
* **Smart Hiding**: Hides progress badges for future dates to keep the grid clean.
* **Interactive Tooltips**: Hover over cells to see missed habits or celebrating messages.

### 3. Weekly Matrix
* **Spreadsheet Layout**: Clear overview of your consistency across the current Mon–Sun week.
* **Read-Only List**: Focuses matrix columns exclusively on completions and remarks.

### 4. Interactive Analytics
* **Consistency Chart**: Dynamic SVG line graph representing consistency trends over the past 7 days.
* **Tied Streaks Ranking**: Streaks leaderboard supporting tied competition rankings (e.g. 🥇, 🥈, 🥉).

### 5. Habits Manager Dashboard
* **Quick Add Toolbar**: Create new habits instantly by typing and pressing Enter—no popup modals required.
* **Inline Hover Action Buttons**: Hover over any row to instantly reveal single-click edit (`✏️`) and delete (`🗑️`) triggers.
* **Clean Table Grid**: Simple, clutter-free table layout with columns for emoji icons and habit names.

### 6. Interactive Customization
* **Dynamic Themes**: Instant client-side theme switching (Cyberpunk Neon, Forest Sanctuary, Cosmic Violet, and Minimalist Light).
* **Sound Synthesizer**: Audio feedback synthesizer with check/uncheck/click tones (can be toggled off).

---

## 🛠️ Technology Stack

* **Structure**: Semantic HTML5
* **Styling**: Modern Vanilla CSS (with CSS variables, grid, flexbox layouts, and custom animations)
* **Logic**: Vanilla ES6 JavaScript (Client-side logic, procedural tree SVG generation, dynamic line graph rendering)
* **Storage**: LocalStorage API (persistent offline save state)

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
