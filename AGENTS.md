# AGENTS.md - Developer & Agent Guidelines for web_montvelconstructora

Welcome! This document provides technical rules, architectural principles, and operational guides for AI coding agents and human engineers maintaining or extending **web_montvelconstructora**.

---

## 1. Project Overview & Architecture

**web_montvelconstructora** is a landing page for an architectural construction firm (*Montvel Constructora*) with an industrial storage racks division.

The project follows modern vanilla web engineering standards (HTML5 semantic layout, modular CSS, decoupled JavaScript modules, and a stateless PHP backend endpoint):

```text
web_montvelconstructora/
├── index.html                   # Semantic HTML5 markup, WCAG AA compliant
├── api/
│   └── enviar.php               # Backend PHP form handler (Honeypot, Turnstile, mail)
├── assets/
│   ├── css/
│   │   └── styles.css           # Design tokens, layout grids, responsive typography
│   ├── js/
│   │   ├── app.js               # Company data binding, mobile menu, globals
│   │   ├── scene3d.js           # Three.js 3D viewport (blueprints, building, racks)
│   │   └── form.js              # Real-time accessible form validation & async fetch
│   └── images/                  # Static brand assets
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI with SHA-pinned actions
├── .gitignore                   # Workspace exclusions
├── .gitleaks.toml               # Gitleaks secret-scanning baseline
├── enviar.php                   # Symlink to api/enviar.php for web server root compatibility
├── README.md                    # Project overview & deployment instructions
└── AGENTS.md                    # Instructions for autonomous AI agents and maintainers
```

---

## 2. Invariants & Rules for AI Agents

1. **Modularity Invariant**:
   - Never embed `<style>` tags or inline `<script>` bodies in `index.html`.
   - Maintain the strict separation between `app.js` (configuration & navigation), `scene3d.js` (Three.js rendering), and `form.js` (form processing).

2. **3D Animation Invariant (`scene3d.js`)**:
   - The canvas element (`#bg3d`) runs fixed in the background (`position: fixed; inset: 0; pointer-events: none`).
   - Must strictly support accessibility: when `prefers-reduced-motion` is active, animations must render static floorplans without RAF loops.
   - On mobile (`max-width: 767px`), reduce geometry density, disable antialiasing, and cap `devicePixelRatio` at `1.5` to prevent battery and GPU thermal throttling.

3. **Form & Security Invariant (`form.js` & `api/enviar.php`)**:
   - Always retain the hidden honeypot field (`name="web"`). Submissions with content in this field must be discarded silently without error.
   - Input validation must maintain proper ARIA attributes (`aria-invalid="true|false"` and linked `aria-describedby` errors).
   - Sanitize all POST inputs in PHP (`FILTER_SANITIZE_SPECIAL_CHARS`, `FILTER_VALIDATE_EMAIL`).

4. **Styling & Design System (`styles.css`)**:
   - Deep Black background (`--black: #0B0B0B`) and Off-White paper (`--paper: #F5F4F0`).
   - Gold accent gradients (`--gold-grad`) used exclusively on borders, CTA buttons, and key metrics.
   - Do not introduce arbitrary CSS utility frameworks (Tailwind, Bootstrap) unless explicitly commanded by the user.

---

## 3. How to Make Common Modifications

### Modifying Company Contact Info or Content
Edit the `COMPANY` object in `assets/js/app.js`:
```javascript
var COMPANY = {
  name: "Montvel Constructora",
  city: "Ciudad de México",
  whatsapp: "5215500000000",
  email: "contacto@montvelconstructora.com",
  years: "15",
  projects: "120",
  clients: "95"
};
```
All elements with `[data-c="property"]`, `[data-wa]`, and `[data-mail]` are populated dynamically.

### Tuning 3D Scene Speed or Positions
In `assets/js/scene3d.js`:
- **Floor count**: adjust `numFloors = 9` and floor height `fh = 0.55`.
- **Rack location & dimensions**: adjust `RW` (width), `RD` (depth), and `RH` (height) inside the rack assembly section.
- **Scroll lerp responsiveness**: change the lerp factor `0.07` in `update(0.07)`.

### Testing & Verification Command
To verify assets and test locally:
```bash
python3 -m http.server 8080 --directory /home/npirela/Proyectos/web_montvelconstructora
```
Visit `http://localhost:8080` and ensure console reports 0 errors.
