/**
 * ============================================================================
 * GESTIÓN Y VALIDACIÓN DEL FORMULARIO DE CONTACTO (form.js)
 * Proyecto: web_montvelconstructora
 * ============================================================================
 * Este archivo gestiona la validación accesible en tiempo real, estados de carga,
 * trampa honeypot y envío asíncrono vía Fetch API.
 */

(function(){
  // Elementos principales del DOM
  var form = document.getElementById("form");
  var status = document.getElementById("status");
  var btn = document.getElementById("send");

  if (!form || !status || !btn) return;

  // ==========================================================================
  // 1. INTEGRACIÓN OPCIONAL CON CLOUDFLARE TURNSTILE (Anti-Bots)
  // ==========================================================================
  // Si se define TURNSTILE_SITE_KEY en app.js, se inyecta el script oficial de Cloudflare
  if (typeof TURNSTILE_SITE_KEY !== "undefined" && TURNSTILE_SITE_KEY) {
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = function(){
      if (window.turnstile) {
        window.turnstile.render("#antibot", { sitekey: TURNSTILE_SITE_KEY });
      }
    };
    document.head.appendChild(s);
  }

  // ==========================================================================
  // 2. REGLAS DE VALIDACIÓN POR CAMPO
  // ==========================================================================
  // Cada regla define: id del input, id del mensaje de error, función de prueba y mensaje.
  var rules = [
    {
      id: "f-nombre",
      err: "e-nombre",
      test: function(v){ return v.trim().length >= 2; },
      msg: "Escribe tu nombre."
    },
    {
      id: "f-tel",
      err: "e-tel",
      test: function(v){
        var digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+\-.]+$/.test(v);
      },
      msg: "Escribe un teléfono válido, solo con números."
    },
    {
      id: "f-correo",
      err: "e-correo",
      test: function(v){
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      },
      msg: "Escribe un correo válido, por ejemplo nombre@correo.com."
    },
    {
      id: "f-servicio",
      err: "e-servicio",
      test: function(v){ return v !== ""; },
      msg: "Elige un tipo de servicio."
    },
    {
      id: "f-msg",
      err: "e-msg",
      test: function(v){ return v.trim().length >= 10; },
      msg: "Cuéntanos tu proyecto en al menos 10 caracteres."
    }
  ];

  // ==========================================================================
  // 3. VERIFICACIÓN Y ACCESIBILIDAD ARIA
  // ==========================================================================
  function check(r){
    var el = document.getElementById(r.id);
    var out = document.getElementById(r.err);
    if (!el || !out) return true;

    var ok = r.test(el.value);
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    out.textContent = ok ? "" : r.msg;
    return ok;
  }

  // Vincular eventos blur e input para feedback inmediato y no intrusivo
  rules.forEach(function(r){
    var el = document.getElementById(r.id);
    if (!el) return;

    el.addEventListener("blur", function(){
      if (el.value !== "" || el.getAttribute("aria-invalid") === "true") {
        check(r);
      }
    });

    el.addEventListener("input", function(){
      if (el.getAttribute("aria-invalid") === "true") {
        check(r);
      }
    });
  });

  // Mostrar mensaje de estado accesible (role="status" o role="alert")
  function show(type, text){
    status.className = type;
    status.textContent = text;
    status.setAttribute("role", type === "fail" ? "alert" : "status");
  }

  // ==========================================================================
  // 4. ENVÍO ASÍNCRONO DEL FORMULARIO
  // ==========================================================================
  form.addEventListener("submit", function(e){
    e.preventDefault();

    // Validar todos los campos antes de enviar
    var firstBad = null;
    rules.forEach(function(r){
      if (!check(r) && !firstBad) {
        firstBad = document.getElementById(r.id);
      }
    });

    // Si hay errores, detener y enfocar el primer campo inválido
    if (firstBad) {
      show("fail", "Revisa los campos marcados.");
      firstBad.focus();
      return;
    }

    // Indicar estado de envío y bloquear botón para evitar duplicados
    show("", "Enviando…");
    btn.disabled = true;

    var endpoint = (typeof FORM_ENDPOINT !== "undefined" && FORM_ENDPOINT) ? FORM_ENDPOINT : "enviar.php";
    var fd = new FormData(form);

    fetch(endpoint, {
      method: "POST",
      body: fd
    })
    .then(function(res){
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json().catch(function(){ return { ok: true }; });
    })
    .then(function(){
      show("ok", "Mensaje enviado con éxito. Te responderemos pronto.");
      form.reset();
      // Reiniciar widget de Turnstile si está activo
      if (window.turnstile) {
        try { window.turnstile.reset(); } catch(err){}
      }
    })
    .catch(function(){
      show("fail", "No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.");
    })
    .then(function(){
      btn.disabled = false;
    });
  });
})();
