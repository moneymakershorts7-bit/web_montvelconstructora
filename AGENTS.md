# AGENTS.md — Montvel Constructora

Instrucciones para agentes de IA y desarrolladores que mantengan **web_montvelconstructora**.

**Repo:** `moneymakershorts7-bit/web_montvelconstructora`  
**Producto:** Landing de constructora en **Quito, Ecuador** · Three.js scroll · SEO local · contacto WhatsApp/email **sin formulario de envío**.  
**Stack:** HTML + CSS + JS vanilla · Three.js **r128** · GLightbox · GitHub Pages  
**Rutas:** siempre **relativas** (`assets/...`).

---

## Skills Grok (obligatorias según tarea)

Invocar **antes** de editar código:

| Tarea | Skill |
|--------|--------|
| HTML/CSS/JS cliente, a11y, SEO, CWV, scroll, dark UI | **modern-web-guidance** (FIRST) |
| Dirección visual, tipografía, layout | **design-artifact** |
| Three.js escena, cámara, renderer, loop | **threejs-fundamentals** (compatible **r128**) |
| Geometría blueprint (líneas, edges) | **threejs-geometry** |
| Animación scroll / procedural | **threejs-animation** |
| Rendimiento WebGL | **threejs-performance** |
| Pointer / cámara | **threejs-interaction** |
| Diff mínimo, sin sobre-ingeniería | **karpathy-guidelines** |
| JS legible | **js-ts-performance-readability** |

**No usar:** `chrome-extensions`, `threejs-react-three-fiber`, reintroducir formulario POST de contacto.

En el workspace Grok también existe `AGENTS.project.md` (misma prioridad que estas reglas).

---

## Arquitectura de archivos

```text
index.html                 # #inicio #servicios #racks #proceso #obras #faq #contacto
llms.txt                   # resumen Markdown del sitio para LLMs (mantener al día)
assets/css/styles.css      # tokens, hero sticky 320vh, .contact-cards, .wa flotante
assets/js/app.js           # COMPANY, data-c / data-wa / data-mail / data-wa-number, menú
assets/js/scene3d.js       # catedral + racks (scroll 0→1)
assets/vendor/three/       # three.min.js r128
assets/images/proyectos/   # p1–p6 full + thumb
```

- `form.js` / `api/enviar.php`: **deprecados** para el flujo de contacto actual. No volver a cablear el formulario en `index.html`.
- Contacto = tarjetas WhatsApp + correo + ubicación + botón flotante `.wa`.

---

## llms.txt (obligatorio mantener)

Archivo en la raíz: `llms.txt`.

- Resume el sitio en Markdown legible para LLMs (qué es, secciones, contacto, servicios).
- **Actualizar `llms.txt` en el mismo cambio** siempre que se modifique **contenido público** de la página: textos de servicios, contacto, cifras, FAQ, URLs, anclas o mensaje de negocio.
- No hace falta tocarlo por cambios solo de CSS, animación 3D o JS interno sin impacto en el mensaje al visitante.
- Opcional: `llms-full.txt` solo si se pide documentación más extensa.

---

## Invariantes

1. **Contacto sin form de envío** — solo `wa.me` y `mailto`.
2. **Ciudad:** Quito (no CDMX). Schema y copy en español (Ecuador).
3. **3D:** canvas `#bg3d` fixed, `pointer-events: none`. Catedral se **levanta** con scroll del hero; racks al entrar a `#racks`.
4. **`prefers-reduced-motion`:** sin RAF pesado / hero estático.
5. **Móvil:** menos geometría, antialias off, `devicePixelRatio` ≤ 1.5.
6. **Estilo:** `--black #0B0B0B`, `--paper #F5F4F0`, gold gradient en CTAs. Sin Tailwind/Bootstrap.
7. **a11y:** skip link, landmarks, focus-visible, menú `aria-expanded`, `lang="es-EC"`.
8. **SEO:** title/description Quito, OG, JSON-LD `GeneralContractor`.
9. **llms.txt** al día cuando cambie el contenido público (ver sección anterior).

---

## COMPANY (`assets/js/app.js`)

```js
var COMPANY = {
  name: "Montvel Constructora",
  city: "Quito",
  whatsapp: "593XXXXXXXXX", // solo dígitos, código país Ecuador
  email: "contacto@montvelconstructora.com",
  years: "15",
  projects: "120",
  clients: "95"
};
```

Selectores: `[data-c]`, `[data-wa]`, `[data-mail]`, `[data-wa-number]`.

---

## Checklist al terminar un cambio

- [ ] `node --check` en JS tocado
- [ ] Scroll hero construye catedral; racks se arman en `#racks`
- [ ] WhatsApp y mailto funcionan
- [ ] Menú móvil: Escape + aria-expanded
- [ ] Sin reintroducir formulario de contacto
- [ ] Diff quirúrgico (karpathy)
- [ ] Si cambió contenido público → actualizar `llms.txt`

---

## Test local

```bash
python3 -m http.server 8080
# abrir http://localhost:8080 — consola sin errores
```
