/**
 * ============================================================================
 * CONFIGURACIÓN GLOBAL Y CONTROL DE INTERFAZ (app.js)
 * Proyecto: web_montvelconstructora
 * ============================================================================
 * Este archivo centraliza los datos de la empresa y la interactividad básica
 * del menú de navegación.
 */

// ============================================================================
// 1. DATOS DE LA EMPRESA (Modifica estos valores para personalizar el sitio)
// ============================================================================
var COMPANY = {
  name: "Montvel Constructora",          // Nombre de la empresa (se refleja en títulos y pie)
  city: "Quito",                         // Ciudad o región operativa
  whatsapp: "5215500000000",             // Número de WhatsApp (código de país sin signo +)
  email: "contacto@montvelconstructora.com", // Correo electrónico de atención al cliente
  years: "15",                           // Años de experiencia en el sector
  projects: "120",                       // Cantidad de proyectos completados
  clients: "95"                          // Cantidad de clientes satisfechos
};

// ============================================================================
// 2. CONFIGURACIÓN DE FORMULARIO Y SEGURIDAD
// ============================================================================
// Llave de sitio de Cloudflare Turnstile (dejar en blanco "" para desactivar)
var TURNSTILE_SITE_KEY = "";

// Endpoint PHP que procesa el formulario de contacto
var FORM_ENDPOINT = "enviar.php";

// ============================================================================
// 3. INICIALIZACIÓN Y BINDING REACTIVO AL DOM
// ============================================================================
(function(){
  // Sustituir automáticamente los elementos marcados con [data-c="propiedad"]
  document.querySelectorAll("[data-c]").forEach(function(el){
    var prop = el.getAttribute("data-c");
    if (COMPANY[prop] !== undefined) {
      el.textContent = COMPANY[prop];
    }
  });

  // Título dinámico del documento
  document.title = COMPANY.name + ": obra nueva, remodelaciones y racks";

  // Enlaces directos a WhatsApp con texto preconfigurado
  document.querySelectorAll("[data-wa]").forEach(function(a){
    var msg = a.getAttribute("data-wa") || "Hola, quiero pedir un presupuesto.";
    a.href = "https://wa.me/" + COMPANY.whatsapp + "?text=" + encodeURIComponent(msg);
  });

  // Enlaces de correo electrónico
  document.querySelectorAll("[data-mail]").forEach(function(a){
    a.href = "mailto:" + COMPANY.email;
  });

  // Año dinámico en el pie de página
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ==========================================================================
  // 4. CONTROL DEL MENÚ DE NAVEGACIÓN MÓVIL (Hamburguesa)
  // ==========================================================================
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  if (burger && menu) {
    // Abrir / cerrar al presionar el botón de menú
    burger.addEventListener("click", function(){
      var isOpen = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Cerrar el menú automáticamente al hacer clic en cualquier enlace
    menu.addEventListener("click", function(e){
      if (e.target.tagName === "A") {
        menu.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }
})();
