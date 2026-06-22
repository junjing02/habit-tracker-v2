# Aura Habit

A client-side routine tracker and streak manager built with vanilla web technologies and integrated with Supabase for real-time cloud data synchronization.

[![HTML](https://img.shields.io/badge/HTML-HTML5-orange.svg)]()
[![CSS](https://img.shields.io/badge/CSS-Vanilla-blue.svg)]()
[![JS](https://img.shields.io/badge/JS-ES6-yellow.svg)]()

## Features

- **Guest Mode:** Fully functional local sandbox stored in the browser's `localStorage` (no account required).
- **Daily Tracker:** Simple checklist for logging habit completion with custom remark notes.
- **Habit Garden:** Dynamic SVG growth tree that visually scales based on weekly consistency rates.
- **Consistency Calendar:** Monthly grid heatmap displaying day-by-day habit completion statuses.
- **Weekly Matrix:** Spreadsheet-style matrix for tracking routines from Monday to Sunday in a tabular layout.
- **Activity Trends:** Custom interactive SVG trend chart showing 7-day completion rates with detailed hover tooltips listing missed tasks.
- **Cloud Sync:** Option to sign up/login with Supabase to back up progress and synchronize data across devices.
- **Theme & Sound Preferences:** Switch between Cyberpunk (Dark) and Minimalist (Light) themes, with toggleable synthesized completion sound effects.

## Tech Stack

- **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Properties, Flexbox, Grid), ES6+ JavaScript
- **Backend & Database:** Supabase (Auth, Cloud Database Sync)
- **Offline Storage:** LocalStorage API

## Technical Architecture

- **Zero Build Dependencies:** Written in pure vanilla HTML, CSS, and JS. Zero development or production `npm` dependencies, ensuring no vulnerability risks or build pipeline overhead.
- **Synthesized Web Audio:** Completing tasks triggers audio chimes synthesized dynamically in-memory via the browser's native **Web Audio API**, eliminating external audio asset requests.
- **Hybrid Sync Architecture:** Uses the browser's **LocalStorage API** for fast, local-first reads and writes, and backs up to **Supabase** database tables when authenticated.
- **Ultra Lightweight:** Combined frontend codebase is ~300 KB raw, loading instantly and running directly in any modern web browser without a compile step.

## Getting Started

### Live Demo
Access the live deployed application at:
**[Live App URL](https://junjing02.github.io/habit-tracker-v2/)**
