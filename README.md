# Aura Habit

A client-side routine tracker and streak manager built with vanilla web technologies and integrated with Supabase for real-time cloud data synchronization.

[![HTML](https://img.shields.io/badge/HTML-HTML5-orange.svg)]()
[![CSS](https://img.shields.io/badge/CSS-Vanilla-blue.svg)]()
[![JS](https://img.shields.io/badge/JS-ES6-yellow.svg)]()

## Features

- **Guest Sandbox Mode:** Isolated in-memory demo environment requiring no account.
- **Daily Checklist:** Tracker supporting completion toggles and contextual notes.
- **Habit Garden:** Procedural SVG tree drawing that dynamically grows based on completion rates.
- **Consistency Calendar:** Interactive grid heatmap displaying monthly completion statuses.
- **Weekly Matrix:** Spreadsheet overview of routine history from Monday to Sunday.
- **Cloud Sync:** Secure login and session backup powered by Supabase.
- **Theme Switching:** Client-side preference switcher supporting Dark and Light modes.

## Tech Stack

- **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Properties, Flexbox, Grid), ES6+ JavaScript
- **Backend & Database:** Supabase (Auth, Cloud Database Sync)
- **Offline Storage:** LocalStorage API

## Performance & Architecture Highlights

- ⚡ **Sub-100ms Initial Load:** The entire frontend is under 50KB transfer size. It loads, parses, and becomes interactive instantly.
- 🛠️ **Zero Build Pipeline:** Standard ES6 JavaScript runs natively in the browser. Zero npm dependencies (`node_modules`) means zero vulnerability risks, zero compile steps, and perpetual compatibility.
- 🔊 **Synthesized Web Audio:** Leverages the native **Web Audio API** to programmatically generate and play chimes on check/uncheck actions, saving bandwidth and asset storage.
- ☁️ **Edge-Ready Scalability:** Renders fully client-side. The static architecture allows it to be hosted on free CDNs (like GitHub Pages) and scale to millions of users at virtually zero cost.
- 📴 **Offline-First Resilience:** Works completely offline using local caching via the `LocalStorage API`, then auto-syncs with Supabase when online.

## Getting Started

### Live Demo
Access the live deployed application at:
👉 **[Live App URL](https://junjing02.github.io/habit-tracker-v2/)**

