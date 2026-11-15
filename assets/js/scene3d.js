/**
 * ============================================================================
 * ESCENA 3D Y ANIMACIÓN REACTIVA AL SCROLL (scene3d.js)
 * Proyecto: web_montvelconstructora
 * ============================================================================
 * Genera en un canvas WebGL fijo (#bg3d):
 * 1. Plano arquitectónico civil con cuadrícula, muros, aberturas y cotas.
 * 2. Estructura de edificio abstracto que se eleva conforme se avanza el scroll.
 * 3. En la sección #racks, una estantería industrial 3D metálica armada por piezas.
 * 4. Control de rendimiento: max pixel ratio, fallback a CSS grid si no hay WebGL,
 *    y respeto total de prefers-reduced-motion.
 */

(function(){
  var canvas = document.getElementById("bg3d");
  if (!canvas) return;

  // Detección de accesibilidad: Si el usuario prefiere movimiento reducido
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Detección de dispositivos móviles para ajustar fidelidad gráfica
  var mobile = window.matchMedia("(max-width: 767px)").matches;

  // Fallback si Three.js no cargó
  if (!window.THREE) {
    document.body.classList.add("no3d");
    return;
  }

  // Inicialización del renderizador WebGL
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (e) {
    document.body.classList.add("no3d");
    return;
  }

  // Limitar pixel ratio para evitar consumo excesivo de GPU en pantallas Retina
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

  // Paleta de colores arquitectónicos
  var GOLD = 0xE8C877;       // Dorado brillante para aristas y líneas activas
  var GOLD_DK = 0xB38A32;    // Dorado oscuro para ejes y cotas de fondo

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // Funciones auxiliares matemáticas
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function smooth(t){ return t * t * (3 - 2 * t); }
  function lmat(op, c){
    return new THREE.LineBasicMaterial({
      color: c || GOLD,
      transparent: true,
      opacity: op
    });
  }

  // ==========================================================================
  // 1. CONSTRUCCIÓN DEL PLANO ARQUITECTÓNICO (LineSegments)
  // ==========================================================================
  var P = [];        // Vértices del plano
  var F = [];        // Vértices del relleno sutil
  var labels = [];   // Marcadores/ejes

  function L(x1, z1, x2, z2){
    P.push(x1, 0, z1, x2, 0, z2);
  }

  // Generador de muros con aberturas (ventanas y puertas)
  function wall(ax, c, s, e, t, ops){
    ops = (ops || []).slice().sort(function(a, b){ return a[0] - b[0]; });
    var cur = s;
    ops.forEach(function(o){
      var o1 = o[0], o2 = o[1], type = o[2], side = o[3] || 1;
      if (o1 > cur) {
        seg(cur, o1);
      }
      cur = o2;
      // Apertura de puerta con arco abatible
      if (type === "d") {
        var r = Math.abs(o2 - o1);
        if (ax === "h") {
          for (var i = 0; i < 8; i++) {
            var a1 = (i / 8) * (Math.PI / 2), a2 = ((i + 1) / 8) * (Math.PI / 2);
            L(o1 + Math.cos(a1) * r, c + Math.sin(a1) * r * side, o1 + Math.cos(a2) * r, c + Math.sin(a2) * r * side);
          }
          L(o1, c, o1, c + r * side);
        } else {
          for (var i = 0; i < 8; i++) {
            var a1 = (i / 8) * (Math.PI / 2), a2 = ((i + 1) / 8) * (Math.PI / 2);
            L(c + Math.sin(a1) * r * side, o1 + Math.cos(a1) * r, c + Math.sin(a2) * r * side, o1 + Math.cos(a2) * r);
          }
          L(c, o1, c + r * side, o1);
        }
      } else if (type === "w") {
        // Ventana técnica: doble línea
        if (ax === "h") {
          L(o1, c - t * 0.4, o2, c - t * 0.4);
          L(o1, c + t * 0.4, o2, c + t * 0.4);
        } else {
          L(c - t * 0.4, o1, c - t * 0.4, o2);
          L(c + t * 0.4, o1, c + t * 0.4, o2);
        }
      }
    });
    if (cur < e) seg(cur, e);

    function seg(a, b){
      if (ax === "h") {
        L(a, c - t, b, c - t);
        L(a, c + t, b, c + t);
        L(a, c - t, a, c + t);
        L(b, c - t, b, c + t);
        F.push(a, 0, c - t, b, 0, c - t, a, 0, c + t, b, 0, c - t, b, 0, c + t, a, 0, c + t);
      } else {
        L(c - t, a, c - t, b);
        L(c + t, a, c + t, b);
        L(c - t, a, c + t, a);
        L(c - t, b, c + t, b);
        F.push(c - t, a, c + t, a, c - t, b, c + t, a, c + t, b, c - t, b);
      }
    }
  }

  function circ(x, z, r){
    for (var i = 0; i < 16; i++){
      var s1 = i / 16 * Math.PI * 2, s2 = (i + 1) / 16 * Math.PI * 2;
      L(x + Math.cos(s1) * r, z + Math.sin(s1) * r, x + Math.cos(s2) * r, z + Math.sin(s2) * r);
    }
  }

  function axis(x1, z1, x2, z2, txt){
    var dash = 0.4, gap = 0.2, len = Math.hypot(x2 - x1, z2 - z1);
    var dx = (x2 - x1) / len, dz = (z2 - z1) / len, d = 0;
    while (d < len){
      var segLen = Math.min(dash, len - d);
      L(x1 + dx * d, z1 + dz * d, x1 + dx * (d + segLen), z1 + dz * (d + segLen));
      d += dash + gap;
    }
    circ(x1 - dx * 0.5, z1 - dz * 0.5, 0.28);
    circ(x2 + dx * 0.5, z2 + dz * 0.5, 0.28);
  }

  // Trazado de muros exteriores e interiores
  var T = 0.12;
  wall("h", -4.5, -6, 6, T, [[-3.5, -1.5, "w"], [1.5, 3.5, "w"]]);
  wall("h",  4.5, -6, 6, T, [[-4.5, -2.5, "w"], [0, 1.4, "d", 1], [3, 5, "w"]]);
  wall("v", -6, -4.5, 4.5, T, [[-3, -1, "w"], [1, 3, "w"]]);
  wall("v",  6, -4.5, 4.5, T, [[-3.5, -1.5, "w"], [1.5, 3.5, "w"]]);
  wall("v", -1, -4.5, 1.5, T * 0.8, [[-2, -0.8, "d", -1]]);
  wall("h",  1.5, -6, 2,   T * 0.8, [[-4.5, -3.3, "d", 1]]);
  wall("v",  2,   -1, 4.5, T * 0.8, [[1, 2.2, "d", 1]]);

  axis(-6, -5.5,  6, -5.5, "A");
  axis(-6,  5.5,  6,  5.5, "B");
  axis(-7, -4.5, -7,  4.5, "1");
  axis( 7, -4.5,  7,  4.5, "2");

  // Geometría del plano arquitectónico
  var planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  var planMat = lmat(0.9, GOLD);
  var plan = new THREE.LineSegments(planGeo, planMat);
  scene.add(plan);
  var planCount = P.length / 3;

  // Cuadrícula sutil del suelo
  var G = [], gs = 1.2;
  for (var gx = -9; gx <= 9; gx += gs) { G.push(gx, -0.01, -7, gx, -0.01, 7); }
  for (var gz = -7; gz <= 7; gz += gs) { G.push(-9, -0.01, gz, 9, -0.01, gz); }
  var gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(G, 3));
  var gridMat = lmat(0.18, GOLD_DK);
  var grid = new THREE.LineSegments(gridGeo, gridMat);
  scene.add(grid);
  var gridCount = G.length / 3;

  // Relleno sutil para dar volumen a muros
  var fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute("position", new THREE.Float32BufferAttribute(F, 3));
  var fillMat = new THREE.MeshBasicMaterial({
    color: 0x1A1408,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  var fillMesh = new THREE.Mesh(fillGeo, fillMat);
  scene.add(fillMesh);

  // ==========================================================================
  // 2. EDIFICIO ABSTRACTO EN WIREFRAME
  // ==========================================================================
  var bld = new THREE.Group();
  scene.add(bld);
  var floors = [], numFloors = 9, fh = 0.55;

  for (var i = 0; i < numFloors; i++){
    var w = 11.6 - (i > 5 ? (i - 5) * 1.1 : 0);
    var d = 8.6  - (i > 5 ? (i - 5) * 0.9 : 0);
    var fg = new THREE.Group();
    fg.position.y = i * fh + 0.01;
    var eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, fh, d));
    var em = lmat(0.45 + i * 0.04, i % 2 === 0 ? GOLD : GOLD_DK);
    fg.add(new THREE.LineSegments(eg, em));

    if (!mobile){
      for (var k = -w / 2 + 1; k < w / 2; k += 1.6){
        var colG = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(k, 0, -d / 2),
          new THREE.Vector3(k, fh, -d / 2)
        ]);
        fg.add(new THREE.Line(colG, lmat(0.25, GOLD_DK)));
      }
    }
    bld.add(fg);
    floors.push(fg);
  }

  // Mástil arquitectónico superior
  var mastGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, numFloors * fh, 0),
    new THREE.Vector3(0, numFloors * fh + 1.8, 0)
  ]);
  var mast = new THREE.Line(mastGeo, lmat(0.9, GOLD));
  bld.add(mast);

  // ==========================================================================
  // 3. ESTRUCTURA 3D DE RACK INDUSTRIAL (Sección #racks)
  // ==========================================================================
  var rack = new THREE.Group();
  rack.position.set(40, 0, 0); // Desplazado en el eje X para enfocar con la cámara
  scene.add(rack);

  var pieces = [];
  function piece(w, h, d, x, y, z, op){
    var m = lmat(op, GOLD);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
    var g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(e);
    g.userData = { y: y, m: m, op: op };
    rack.add(g);
    pieces.push(g);
  }

  var RW = 1.8, RD = 2.0, RH = 4.4;
  // Base del rack
  piece(RW, 0.12, RD, 0, 0.06, 0, 0.95);
  // Columnas verticales
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function(c){
    piece(0.1, RH, 0.1, c[0] * (RW / 2 - 0.05), RH / 2, c[1] * (RD / 2 - 0.05), 0.95);
  });
  // Techo del rack
  piece(RW, 0.12, RD, 0, RH, 0, 0.95);
  // Bandejas / Estantes interiores
  for (var i = 0; i < 8; i++){
    piece(RW - 0.2, 0.05, RD - 0.2, 0, 0.55 + i * 0.5, 0, 0.7);
  }
  // Cajas o servidores en estantes
  if (!mobile){
    [0, 1, 3, 4, 6].forEach(function(s){
      piece(RW - 0.3, 0.32, RD - 0.5, 0, 0.55 + s * 0.5 + 0.19, 0, 0.9);
    });
  }

  // ==========================================================================
  // 4. ANIMACIÓN Y VINCULACIÓN AL SCROLL Y RATÓN
  // ==========================================================================
  var racksEl = document.getElementById("racks");
  var cur = { plan: 0, bld: 0, rack: 0, rf: 0, p: 0, mx: 0, my: 0 };
  var tgt = { plan: 0, bld: 0, rack: 0, rf: 0, p: 0, mx: 0, my: 0 };
  var t0 = performance.now();
  var v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  var t1 = new THREE.Vector3(0, 1.6, 0), t2 = new THREE.Vector3(40, 2.2, 0);

  function readScroll(){
    var max = document.documentElement.scrollHeight - window.innerHeight;
    tgt.p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;

    if (racksEl) {
      var r = racksEl.getBoundingClientRect(), vh = window.innerHeight;
      tgt.rack = clamp((vh * 0.8 - r.top) / (r.height * 0.7), 0, 1);
      var c = r.top + r.height / 2;
      tgt.rf = smooth(clamp(1 - Math.abs(c - vh / 2) / (vh * 0.9), 0, 1));
    }

    if (reduce) {
      tgt.plan = 1; tgt.bld = 1; tgt.rack = 1; tgt.rf = tgt.rf > 0.5 ? 1 : 0; tgt.p = 0.25;
    }
  }

  function update(k){
    // Interpolación suave (LERP) para evitar saltos bruscos
    for (var key in cur){
      cur[key] += (tgt[key] - cur[key]) * k;
    }

    var intro = reduce ? 1 : clamp((performance.now() - t0) / 2600, 0, 1);
    var planT = reduce ? 1 : Math.max(intro * 0.45, tgt.p / 0.1);
    tgt.plan = clamp(planT, 0, 1);
    tgt.bld = reduce ? 1 : clamp((tgt.p - 0.02) / 0.45, 0, 1);

    // Dibujado progresivo de líneas del plano
    var pn = Math.floor(planCount * clamp(cur.plan, 0, 1));
    pn -= pn % 2;
    plan.geometry.setDrawRange(0, pn);

    var gn = Math.floor(gridCount * clamp(cur.plan * 2, 0, 1));
    gn -= gn % 2;
    grid.geometry.setDrawRange(0, gn);

    fillMesh.material.opacity = 0.55 * clamp((cur.plan - 0.15) * 1.5, 0, 1);

    // Elevación de pisos del edificio
    floors.forEach(function(f, i){
      var t = clamp(cur.bld * floors.length - i, 0, 1);
      f.visible = t > 0.001;
      f.scale.y = Math.max(t, 0.001);
    });
    mast.visible = cur.bld > 0.98;

    // Ensamblado vertical de componentes del rack
    pieces.forEach(function(p, i){
      var t = clamp(cur.rack * pieces.length - i, 0, 1);
      p.visible = t > 0.001;
      p.position.y = p.userData.y + (1 - smooth(t)) * 2.5;
      p.userData.m.opacity = p.userData.op * t;
    });

    // Movimiento cinemático de la cámara
    var a1 = -0.55 + cur.p * 2.2 + cur.mx * 0.18;
    var h1 = 6.5 - cur.p * 1.5 + cur.my * 0.6;
    v1.set(Math.sin(a1) * 15, h1, Math.cos(a1) * 15);

    var a2 = 0.35 + cur.rack * 0.9 + cur.mx * 0.18;
    v2.set(40 + Math.sin(a2) * 10, 3.6 + cur.my * 0.4, Math.cos(a2) * 10);

    // Transición suave entre edificio y rack
    camera.position.lerpVectors(v1, v2, cur.rf);
    var look = new THREE.Vector3().lerpVectors(t1, t2, cur.rf);
    camera.lookAt(look);

    renderer.render(scene, camera);
  }

  // Redimensionamiento responsive
  function resize(){
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) {
      camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    readScroll();
    if (reduce) update(1);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function(){
    readScroll();
    if (reduce) update(1);
  }, { passive: true });

  // Paralaje de ratón (sólo en desktop con puntero preciso)
  if (!reduce && !mobile && window.matchMedia("(pointer: fine)").matches){
    window.addEventListener("mousemove", function(e){
      tgt.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      tgt.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  resize();
  if (reduce) {
    update(1);
    return;
  }

  // Bucle de renderizado continuo a 60 FPS
  (function loop(){
    update(0.07);
    requestAnimationFrame(loop);
  })();
})();
