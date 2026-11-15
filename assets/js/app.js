/* ============ DATOS QUE DEBES CAMBIAR ============ */
var COMPANY = {
  name: "[NOMBRE DE LA CONSTRUCTORA]",   // Nombre de la empresa
  city: "[CIUDAD]",                      // Ciudad o zona
  whatsapp: "[NÚMERO]",                  // Formato internacional sin +, ej. 521234567890
  email: "[CORREO]",                     // Correo de contacto
  years: "15",                           // Años de experiencia
  projects: "120",                       // Proyectos terminados
  clients: "95"                          // Clientes atendidos
};
var TURNSTILE_SITE_KEY = "";             // Site key de Cloudflare Turnstile (vacío = sin widget)
var FORM_ENDPOINT = "enviar.php";        // Archivo PHP que recibe el formulario
/* ================================================= */

(function(){
  // Rellenar datos de la empresa
  document.querySelectorAll("[data-c]").forEach(function(el){ el.textContent = COMPANY[el.getAttribute("data-c")]; });
  document.title = COMPANY.name + ": obra nueva, remodelaciones y racks";
  document.querySelectorAll("[data-wa]").forEach(function(a){
    a.href = "https://wa.me/" + COMPANY.whatsapp + "?text=" + encodeURIComponent(a.getAttribute("data-wa"));
  });
  document.querySelectorAll("[data-mail]").forEach(function(a){ a.href = "mailto:" + COMPANY.email; });
  document.getElementById("year").textContent = new Date().getFullYear();

  // Menú móvil
  var burger = document.querySelector(".burger"), menu = document.getElementById("menu");
  burger.addEventListener("click", function(){
    var open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  menu.addEventListener("click", function(e){
    if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded","false"); }
  });
})();
</script>
