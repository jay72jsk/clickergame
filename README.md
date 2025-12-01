# Color Clicker — Simple Clicker Simulator

What this is
- A small web-based clicker game with click upgrades, auto-click upgrades, and a rebirth/prestige mechanic that permanently multiplies your click power.
- Saves progress to localStorage automatically.

Features
- Click the big colorful button to earn score.
- Buy "Power" upgrades to increase base per-click value.
- Buy "Auto-Clicker" upgrades to gain passive clicks per second.
- Rebirth (Prestige) when you reach the requirement: resets score and upgrades but permanently doubles your multiplier.
- Responsive and colorful UI.

How to run
1. Place the files (index.html, style.css, script.js) in a folder.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Play!

Files
- index.html — main UI
- style.css — styles and colorful theme
- script.js — game logic and persistence
- README.md — this file

Notes & tuning
- Rebirth requirement and multiplier logic is simple and can be tuned in `script.js`.
- To change persistence key or reset programmatically, adjust `SAVE_KEY` or call `resetSave()`.

Enjoy! If you'd like:
- extra upgrade types,
- better balancing,
- animations or sound effects,
- a save import/export,
I can add those next.
