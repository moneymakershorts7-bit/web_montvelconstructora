/* ============ FORMULARIO ============ */
(function(){
  var form = document.getElementById("form"), status = document.getElementById("status"), btn = document.getElementById("send");

  // Widget anti-bots (Cloudflare Turnstile). Se activa si TURNSTILE_SITE_KEY tiene valor.
  if (TURNSTILE_SITE_KEY) {
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.defer = true;
    s.onload = function(){ window.turnstile.render("#antibot", {sitekey: TURNSTILE_SITE_KEY}); };
    document.head.appendChild(s);
  }

  var rules = [
    {id:"f-nombre", err:"e-nombre", test:function(v){ return v.trim().length >= 2; }, msg:"Escribe tu nombre."},
    {id:"f-tel", err:"e-tel", test:function(v){ var d = v.replace(/\D/g,""); return d.length >= 7 && d.length <= 15 && /^[\d\s()+\-.]+$/.test(v); }, msg:"Escribe un teléfono válido, solo con números."},
    {id:"f-correo", err:"e-correo", test:function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }, msg:"Escribe un correo válido, por ejemplo nombre@correo.com."},
    {id:"f-servicio", err:"e-servicio", test:function(v){ return v !== ""; }, msg:"Elige un tipo de servicio."},
    {id:"f-msg", err:"e-msg", test:function(v){ return v.trim().length >= 10; }, msg:"Cuéntanos tu proyecto en al menos 10 caracteres."}
  ];

  function check(r){
    var el = document.getElementById(r.id), out = document.getElementById(r.err), ok = r.test(el.value);
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    out.textContent = ok ? "" : r.msg;
    return ok;
  }
  rules.forEach(function(r){
    var el = document.getElementById(r.id);
    el.addEventListener("blur", function(){ if (el.value !== "" || el.getAttribute("aria-invalid") === "true") check(r); });
    el.addEventListener("input", function(){ if (el.getAttribute("aria-invalid") === "true") check(r); });
  });

  function show(type, text){ status.className = type; status.textContent = text; status.setAttribute("role", type === "fail" ? "alert" : "status"); }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var firstBad = null;
    rules.forEach(function(r){ if (!check(r) && !firstBad) firstBad = document.getElementById(r.id); });
    if (firstBad) { show("fail", "Revisa los campos marcados."); firstBad.focus(); return; }

    show("", "Enviando…"); btn.disabled = true;
    var fd = new FormData(form);
    fetch(FORM_ENDPOINT, {method:"POST", body: fd})
      .then(function(res){ if (!res.ok) throw new Error("http " + res.status); return res; })
      .then(function(){
        show("ok", "Mensaje enviado. Te responderemos pronto.");
        form.reset();
        if (window.turnstile) { try { window.turnstile.reset(); } catch(err){} }
      })
      .catch(function(){
        show("fail", "No pudimos enviar el mensaje. Inténtalo de nuevo o escríbenos por WhatsApp.");
      })
      .then(function(){ btn.disabled = false; });
  });
})();
