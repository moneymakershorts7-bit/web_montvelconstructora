/**
 * form.js — Validación accesible del formulario de contacto
 * Alineado a index.html: #form-contacto, #nombre, #telefono, #email, #mensaje
 */
(function () {
  var form = document.getElementById("form-contacto");
  if (!form) return;

  var btn = form.querySelector('button[type="submit"]');
  var status = document.getElementById("form-status");
  var live = document.getElementById("form-live");

  // Crear status y live region si no existen
  if (!status) {
    status = document.createElement("div");
    status.id = "form-status";
    status.className = "form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.appendChild(status);
  }
  if (!live) {
    live = document.createElement("div");
    live.id = "form-live";
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    form.appendChild(live);
  }

  var rules = [
    {
      id: "nombre",
      test: function (v) { return v.trim().length >= 2; },
      msg: "Escribe tu nombre (mínimo 2 caracteres)."
    },
    {
      id: "telefono",
      test: function (v) {
        var digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      },
      msg: "Escribe un teléfono válido con código de país (+593…)."
    },
    {
      id: "email",
      optional: true,
      test: function (v) {
        if (!v.trim()) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      },
      msg: "Escribe un correo válido, por ejemplo nombre@correo.com."
    },
    {
      id: "mensaje",
      test: function (v) { return v.trim().length >= 10; },
      msg: "Describe tu proyecto en al menos 10 caracteres."
    }
  ];

  function ensureErrorEl(fieldId) {
    var errId = "err-" + fieldId;
    var existing = document.getElementById(errId);
    if (existing) return existing;
    var el = document.getElementById(fieldId);
    if (!el || !el.parentNode) return null;
    var span = document.createElement("span");
    span.id = errId;
    span.className = "err";
    span.setAttribute("role", "alert");
    el.parentNode.appendChild(span);
    return span;
  }

  function linkError(el, errId, shown) {
    var ids = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(function (id) { return id && id !== errId; });
    if (shown) ids.push(errId);
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  }

  function check(r) {
    var el = document.getElementById(r.id);
    if (!el) return true;
    var out = ensureErrorEl(r.id);
    var ok = r.test(el.value);
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (out) {
      out.textContent = ok ? "" : r.msg;
      linkError(el, out.id, !ok);
    }
    return ok;
  }

  function announce(msg) {
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 50);
  }

  function showStatus(type, text) {
    status.className = "form-status" + (type ? " " + type : "");
    status.textContent = text;
    status.setAttribute("role", type === "fail" ? "alert" : "status");
  }

  rules.forEach(function (r) {
    var el = document.getElementById(r.id);
    if (!el) return;
    el.setAttribute("aria-invalid", "false");
    ensureErrorEl(r.id);

    el.addEventListener("blur", function () {
      if (el.value !== "" || el.getAttribute("aria-invalid") === "true") {
        var ok = check(r);
        if (!ok) announce(r.msg);
      }
    });
    el.addEventListener("input", function () {
      if (el.getAttribute("aria-invalid") === "true") check(r);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Honeypot
    var hp = document.getElementById("website");
    if (hp && hp.value) return;

    var firstBad = null;
    rules.forEach(function (r) {
      if (!check(r) && !firstBad) firstBad = document.getElementById(r.id);
    });

    if (firstBad) {
      showStatus("fail", "Revisa los campos marcados.");
      announce("Hay errores en el formulario. Revisa los campos marcados.");
      firstBad.focus();
      return;
    }

    showStatus("", "Enviando…");
    if (btn) btn.disabled = true;

    var endpoint =
      typeof FORM_ENDPOINT !== "undefined" && FORM_ENDPOINT
        ? FORM_ENDPOINT
        : form.getAttribute("action") || "api/enviar.php";

    fetch(endpoint, { method: "POST", body: new FormData(form) })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json().catch(function () { return { ok: true }; });
      })
      .then(function () {
        showStatus("ok", "Mensaje enviado. Te responderemos pronto.");
        announce("Mensaje enviado con éxito.");
        form.reset();
        rules.forEach(function (r) {
          var el = document.getElementById(r.id);
          if (el) el.setAttribute("aria-invalid", "false");
          var err = document.getElementById("err-" + r.id);
          if (err) err.textContent = "";
        });
      })
      .catch(function () {
        showStatus(
          "fail",
          "No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos por WhatsApp."
        );
        announce("Error al enviar. Usa WhatsApp si el problema continúa.");
      })
      .then(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
