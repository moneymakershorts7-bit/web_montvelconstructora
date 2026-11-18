/**
 * app.js — Datos de empresa + menú accesible
 */
var COMPANY = {
  name: "Montvel Constructora",
  city: "Quito",
  // ⚠️ REEMPLAZAR por el número real, solo dígitos con código de país.
  // Ecuador = 593 y sin el 0 inicial. Ejemplo: 593991234567
  whatsapp: "5215500000000",
  email: "contacto@montvelconstructora.com",
  years: "15",
  projects: "120",
  clients: "95"
};

(function () {
  document.querySelectorAll("[data-c]").forEach(function (el) {
    var prop = el.getAttribute("data-c");
    if (COMPANY[prop] !== undefined) el.textContent = COMPANY[prop];
  });

  // No sobrescribir un title ya optimizado para SEO; solo si es genérico
  var t = document.title || "";
  if (!t || t.indexOf("Quito") === -1) {
    document.title =
      COMPANY.name + " | Obra nueva, remodelaciones y racks en " + COMPANY.city;
  }

  // Botones / enlaces de WhatsApp
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    var msg = a.getAttribute("data-wa") || "Hola, quiero pedir un presupuesto.";
    a.href =
      "https://wa.me/" +
      COMPANY.whatsapp +
      "?text=" +
      encodeURIComponent(msg);
    if (!a.getAttribute("aria-label")) {
      a.setAttribute(
        "aria-label",
        (a.textContent || "WhatsApp").trim() + " (se abre en una ventana nueva)"
      );
    }
  });

  // Número de WhatsApp visible (+código país…)
  document.querySelectorAll("[data-wa-number]").forEach(function (el) {
    el.textContent = "+" + COMPANY.whatsapp;
  });

  // Botones / enlaces de correo (asunto opcional con data-mail="Asunto")
  document.querySelectorAll("[data-mail]").forEach(function (a) {
    var subject = a.getAttribute("data-mail");
    a.href =
      "mailto:" +
      COMPANY.email +
      (subject ? "?subject=" + encodeURIComponent(subject) : "");
  });

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  if (burger && menu) {
    function setMenuOpen(isOpen) {
      menu.classList.toggle("open", isOpen);
      burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      burger.setAttribute(
        "aria-label",
        isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"
      );
    }

    burger.addEventListener("click", function () {
      setMenuOpen(!menu.classList.contains("open"));
    });

    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setMenuOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) {
        setMenuOpen(false);
        burger.focus();
      }
    });
  }
})();
