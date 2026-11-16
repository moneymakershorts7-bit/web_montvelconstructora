/**
 * app.js — Datos de empresa + menú accesible
 */
var COMPANY = {
  name: "Montvel Constructora",
  city: "Quito",
  whatsapp: "5215500000000",
  email: "contacto@montvelconstructora.com",
  years: "15",
  projects: "120",
  clients: "95"
};

var TURNSTILE_SITE_KEY = "";
var FORM_ENDPOINT = "api/enviar.php";

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

  document.querySelectorAll("[data-mail]").forEach(function (a) {
    a.href = "mailto:" + COMPANY.email;
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
