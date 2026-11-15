# web_montvelconstructora

Landing page premium e interactiva para **Montvel Constructora** (obra nueva, remodelaciones, ampliaciones) y fabricación/instalación de **Racks**.

---

## 🏗️ Arquitectura y Estructura del Proyecto

El proyecto está organizado siguiendo las mejores prácticas de ingeniería web moderna: separación limpia de responsabilidades (HTML semántico, hojas de estilo modulares, scripts desacoplados y API backend independiente).

```text
web_montvelconstructora/
├── index.html                   # Documento principal HTML5 semántico y accesible
├── api/
│   └── enviar.php               # Endpoint seguro de procesamiento de formulario
├── assets/
│   ├── css/
│   │   └── styles.css           # Estilos globales, variables CSS, layout y diseño adaptativo
│   ├── js/
│   │   ├── app.js               # Configuración empresarial, navegación y menú móvil
│   │   ├── scene3d.js           # Escena 3D Three.js (planos arquitectónicos y racks wireframe)
│   │   └── form.js              # Validación en tiempo real, accesibilidad aria y envío async
│   └── images/                  # Directorio para recursos gráficos y logotipos
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de integración continua (CI) y validación de assets
├── .gitignore                   # Exclusión de archivos temporales, logs y dependencias
├── .gitleaks.toml               # Configuración de escaneo estático de secretos
├── enviar.php                   # Symlink al endpoint api/enviar.php para compatibilidad directa
└── README.md                    # Documentación del proyecto
```

---

## ✨ Características Principales

1. **Efecto 3D de Alto Rendimiento (Three.js r128)**:
   - Wireframes dorados animados progresivamente con el scroll del usuario.
   - Plano arquitectónico dibujado dinámicamente y ensamblaje tridimensional de rack en su respectiva sección.
   - Detección de `prefers-reduced-motion` y fallback automático a modo ligero en dispositivos móviles.

2. **Formulario Accesible y Blindado**:
   - Validación reactiva accesible (`aria-invalid`, estados visuales claros).
   - Trampa Honeypot contra spam automatizado.
   - Soporte nativo para Cloudflare Turnstile anti-bot.

3. **Diseño Visual Sofisticado**:
   - Paleta sobria basada en negro profundo (`#0B0B0B`), blanco roto (`#F5F4F0`) y degradados dorados (`#C9A55C` - `#F6E3A6`).
   - Tipografía dual: *Cormorant Garamond* (encabezados editoriales) e *Inter* (cuerpo limpio).

---

## 🚀 Despliegue y Configuración

### 1. Variables de Empresa
Edite las constantes dentro de `assets/js/app.js`:
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

### 2. Configuración de Correo y Turnstile
En `api/enviar.php`:
- Ajuste `RECIPIENT_EMAIL` con el correo que recibirá las cotizaciones.
- Configure la variable de entorno `TURNSTILE_SECRET_KEY` si utiliza protección Cloudflare Turnstile.
