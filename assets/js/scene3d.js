/**
 * ============================================================================
 * scene3d.js — Animación WebGL 3D para Montvel Constructora (v2)
 * ============================================================================
 *
 * ESCENA CONSTRUIDA A PARTIR DE DATOS REALES:
 *
 * 1. PLANO ARQUITECTÓNICO (sección hero)
 *    Inspirado en la Basílica del Voto Nacional (Quito) — el edificio más
 *    icónico de Ecuador:
 *      • Planta de cruz latina (nave central + naves laterales + transepto)
 *      • Bases de las torres gemelas en la fachada principal
 *      • Capillas laterales indicadas como recesos
 *      • Ejes de referencia estructurales y cuadrícula técnica
 *    Se dibuja progresivamente al cargar (efecto de trazado en tiempo real).
 *
 * 2. EDIFICIO EN CONSTRUCCIÓN (scroll intermedio)
 *    Wireframe de 9 pisos que se elevan con el scroll. Los pisos superiores
 *    se retranquean (setback), evocando torres modernas ecuatorianas
 *    (IQON / The Point) y el crecimiento de una obra real.
 *
 * 3. RACK SELECTIVO PARA DEPÓSITO (sección #racks)
 *    Dimensiones basadas en racks selectivos estándar usados en Ecuador:
 *      • Bahía: ~2.4 m de ancho (2 pallets) × 1.1 m profundidad de upright
 *      • Alto total: 4.5 m / 5 niveles de carga
 *      • 2 filas back-to-back + pasillo central de ~3.2 m (reach truck)
 *      • 3 bahías por fila
 *    Los componentes se ensamblan animadamente al entrar la sección al viewport.
 *
 * ============================================================================
 * CÓMO MODIFICAR:
 *   GOLD / GOLD_DK          → colores de línea
 *   INTRO_DURATION_MS       → duración del dibujado del plano
 *   wall() / axis()         → geometría de la planta
 *   RW, RD, RH, BAYS, LEVELS→ dimensiones del rack
 *   piece()                 → añade un componente al rack
 *   factor 0.07 en loop()   → suavidad del lerp de scroll
 * ============================================================================
 * Requisitos: Three.js r128 cargado antes, canvas#bg3d, sección#racks.
 * Servir por HTTP (no file://).
 * ============================================================================
 */

(function () {

  // --------------------------------------------------------------------------
  // CONSTANTES
  // --------------------------------------------------------------------------
  var GOLD    = 0xE8C877;
  var GOLD_DK = 0xB38A32;
  var INTRO_DURATION_MS = 2800;

  // --------------------------------------------------------------------------
  // DETECCIÓN DE ENTORNO
  // --------------------------------------------------------------------------
  var canvas = document.getElementById('bg3d');
  if (!canvas) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile     = window.matchMedia('(max-width: 767px)').matches;

  if (typeof window.THREE === 'undefined') {
    console.warn('[scene3d] Three.js no disponible. Fallback CSS.');
    document.body.classList.add('no3d');
    return;
  }

  // --------------------------------------------------------------------------
  // RENDERER (intentos progresivos)
  // --------------------------------------------------------------------------
  var renderer = null;
  var rendererConfigs = [
    { canvas: canvas, antialias: !isMobile, alpha: true, powerPreference: 'default' },
    { canvas: canvas, antialias: false, alpha: true, precision: 'mediump' },
    { canvas: canvas, antialias: false, alpha: true, failIfMajorPerformanceCaveat: false }
  ];

  for (var ri = 0; ri < rendererConfigs.length; ri++) {
    try {
      var r = new THREE.WebGLRenderer(rendererConfigs[ri]);
      if (r && r.getContext()) { renderer = r; break; }
    } catch (e) {
      console.warn('[scene3d] WebGL intento ' + (ri + 1) + ' fallido:', e.message || e);
    }
  }

  if (!renderer) {
    console.warn('[scene3d] WebGL no disponible. Fallback CSS blueprint.');
    document.body.classList.add('no3d');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  // --------------------------------------------------------------------------
  // ESCENA Y CÁMARA
  // --------------------------------------------------------------------------
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // --------------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function lineMat(opacity, color) {
    return new THREE.LineBasicMaterial({
      color: color !== undefined ? color : GOLD,
      transparent: true,
      opacity: opacity
    });
  }

  // --------------------------------------------------------------------------
  // 1. PLANO ARQUITECTÓNICO — CRUZ LATINA (Basílica del Voto Nacional)
  // --------------------------------------------------------------------------
  var planVerts = [];
  var fillVerts = [];

  function L(x1, z1, x2, z2) {
    planVerts.push(x1, 0, z1, x2, 0, z2);
  }

  function wall(axis, coord, start, end, thick, opens) {
    opens = (opens || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    var cur = start;

    opens.forEach(function (o) {
      var o1 = o[0], o2 = o[1], type = o[2], side = o[3] || 1;
      if (o1 > cur) segment(cur, o1);
      cur = o2;

      if (type === 'd') {
        var radius = Math.abs(o2 - o1);
        var steps  = 8;
        for (var i = 0; i < steps; i++) {
          var a1 = (i / steps) * (Math.PI / 2);
          var a2 = ((i + 1) / steps) * (Math.PI / 2);
          if (axis === 'h') {
            L(o1 + Math.cos(a1) * radius, coord + Math.sin(a1) * radius * side,
              o1 + Math.cos(a2) * radius, coord + Math.sin(a2) * radius * side);
          } else {
            L(coord + Math.sin(a1) * radius * side, o1 + Math.cos(a1) * radius,
              coord + Math.sin(a2) * radius * side, o1 + Math.cos(a2) * radius);
          }
        }
        if (axis === 'h') L(o1, coord, o1, coord + radius * side);
        else               L(coord, o1, coord + radius * side, o1);
      } else if (type === 'w') {
        if (axis === 'h') {
          L(o1, coord - thick * 0.4, o2, coord - thick * 0.4);
          L(o1, coord + thick * 0.4, o2, coord + thick * 0.4);
        } else {
          L(coord - thick * 0.4, o1, coord - thick * 0.4, o2);
          L(coord + thick * 0.4, o1, coord + thick * 0.4, o2);
        }
      }
    });

    if (cur < end) segment(cur, end);

    function segment(a, b) {
      if (axis === 'h') {
        L(a, coord - thick, b, coord - thick);
        L(a, coord + thick, b, coord + thick);
        L(a, coord - thick, a, coord + thick);
        L(b, coord - thick, b, coord + thick);
        fillVerts.push(
          a, 0, coord - thick,  b, 0, coord - thick,  a, 0, coord + thick,
          b, 0, coord - thick,  b, 0, coord + thick,  a, 0, coord + thick
        );
      } else {
        L(coord - thick, a, coord - thick, b);
        L(coord + thick, a, coord + thick, b);
        L(coord - thick, a, coord + thick, a);
        L(coord - thick, b, coord + thick, b);
        fillVerts.push(
          coord - thick, a, coord + thick, a, coord - thick, b,
          coord + thick, a, coord + thick, b, coord - thick, b
        );
      }
    }
  }

  function circle(x, z, radius) {
    var steps = 16;
    for (var i = 0; i < steps; i++) {
      var a1 = (i / steps) * Math.PI * 2;
      var a2 = ((i + 1) / steps) * Math.PI * 2;
      L(x + Math.cos(a1) * radius, z + Math.sin(a1) * radius,
        x + Math.cos(a2) * radius, z + Math.sin(a2) * radius);
    }
  }

  function axis(x1, z1, x2, z2) {
    var dashLen = 0.4, gapLen = 0.2;
    var totalLen = Math.hypot(x2 - x1, z2 - z1);
    var dx = (x2 - x1) / totalLen, dz = (z2 - z1) / totalLen;
    var d = 0;
    while (d < totalLen) {
      var seg = Math.min(dashLen, totalLen - d);
      L(x1 + dx * d, z1 + dz * d, x1 + dx * (d + seg), z1 + dz * (d + seg));
      d += dashLen + gapLen;
    }
    circle(x1 - dx * 0.5, z1 - dz * 0.5, 0.28);
    circle(x2 + dx * 0.5, z2 + dz * 0.5, 0.28);
  }

  // --- Planta cruz latina simplificada (Basílica) ---
  // Nave longitudinal (eje X), transepto (eje Z), torres en fachada oeste.
  var T = 0.13; // mitad del espesor de muro

  // Nave central + laterales (largo ~14, ancho ~9)
  // Muro sur de la nave
  wall('h', -3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']]);
  // Muro norte de la nave
  wall('h',  3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']]);
  // Ábside / cabecera (este)
  wall('v',  6.5, -3.2, 3.2, T, [[-1.2, 1.2, 'w']]);
  // Fachada principal (oeste) con bases de torres gemelas
  wall('v', -7.5, -5.0, -1.6, T); // base torre sur
  wall('v', -7.5,  1.6,  5.0, T); // base torre norte
  // Puerta principal entre torres
  wall('v', -7.5, -1.6, 1.6, T, [[-0.9, 0.9, 'd', 1]]);

  // Transepto (brazos de la cruz)
  wall('h', -5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd', -1]]); // brazo sur
  wall('h',  5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd',  1]]); // brazo norte
  wall('v', -2.0, -5.8, -3.2, T);
  wall('v',  2.0, -5.8, -3.2, T);
  wall('v', -2.0,  3.2,  5.8, T);
  wall('v',  2.0,  3.2,  5.8, T);

  // Capillas laterales (recesos) — 3 por lado
  var chapelZs = [-5.0, -1.0, 3.0];
  for (var ci = 0; ci < chapelZs.length; ci++) {
    var cz = chapelZs[ci];
    // Sur
    wall('h', -4.6, cz - 0.9, cz + 0.9, T * 0.7);
    wall('v', cz - 0.9, -4.6, -3.2, T * 0.7);
    wall('v', cz + 0.9, -4.6, -3.2, T * 0.7);
    // Norte
    wall('h',  4.6, cz - 0.9, cz + 0.9, T * 0.7);
    wall('v', cz - 0.9,  3.2,  4.6, T * 0.7);
    wall('v', cz + 0.9,  3.2,  4.6, T * 0.7);
  }

  // Divisiones de naves laterales (arquerías indicadas por muros bajos)
  wall('h', -1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', 1], [0.5, 2, 'd', 1]]);
  wall('h',  1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', -1], [0.5, 2, 'd', -1]]);

  // Ejes de referencia estructurales
  axis(-8.5, -6.5,  8.0, -6.5); // Eje A
  axis(-8.5,  6.5,  8.0,  6.5); // Eje B
  axis(-8.5, -6.5, -8.5,  6.5); // Eje 1
  axis( 8.0, -6.5,  8.0,  6.5); // Eje 2
  axis( 0,   -6.5,  0,    6.5); // Eje central de la nave

  // Geometría del plano
  var planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planVerts, 3));
  var planMesh = new THREE.LineSegments(planGeo, lineMat(0.9, GOLD));
  scene.add(planMesh);
  var totalPlanVerts = planVerts.length / 3;

  // Cuadrícula de referencia
  var gridVerts = [], gs = 1.25;
  for (var gx = -10; gx <= 10; gx += gs) { gridVerts.push(gx, -0.01, -8, gx, -0.01, 8); }
  for (var gz = -8; gz <= 8; gz += gs) { gridVerts.push(-10, -0.01, gz, 10, -0.01, gz); }
  var gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
  var gridMesh = new THREE.LineSegments(gridGeo, lineMat(0.16, GOLD_DK));
  scene.add(gridMesh);
  var totalGridVerts = gridVerts.length / 3;

  // Relleno de muros
  var fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fillVerts, 3));
  var fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
    color: 0x1A1408,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  }));
  scene.add(fillMesh);

  // --------------------------------------------------------------------------
  // 2. EDIFICIO EN CONSTRUCCIÓN (wireframe que crece con el scroll)
  // --------------------------------------------------------------------------
  var building = new THREE.Group();
  scene.add(building);
  var floorGroups = [];
  var NUM_FLOORS = 10;
  var FLOOR_H = 0.52;

  for (var fi = 0; fi < NUM_FLOORS; fi++) {
    // Setback progresivo en los pisos altos (inspirado en torres modernas)
    var setback = fi > 6 ? (fi - 6) * 0.85 : 0;
    var fw = 12.0 - setback;
    var fd = 8.8  - setback * 0.7;
    var floorGroup = new THREE.Group();
    floorGroup.position.y = fi * FLOOR_H + 0.01;

    var edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(fw, FLOOR_H, fd));
    var edgeMat = lineMat(0.42 + fi * 0.035, fi % 2 === 0 ? GOLD : GOLD_DK);
    floorGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));

    if (!isMobile) {
      for (var kx = -fw / 2 + 1.2; kx < fw / 2; kx += 1.7) {
        var colGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(kx, 0, -fd / 2),
          new THREE.Vector3(kx, FLOOR_H, -fd / 2)
        ]);
        floorGroup.add(new THREE.Line(colGeo, lineMat(0.22, GOLD_DK)));
      }
    }

    building.add(floorGroup);
    floorGroups.push(floorGroup);
  }

  // Mástil / antena en la cima
  var mastGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H, 0),
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H + 1.9, 0)
  ]);
  var mast = new THREE.Line(mastGeo, lineMat(0.9, GOLD));
  building.add(mast);

  // --------------------------------------------------------------------------
  // 3. RACK SELECTIVO PARA DEPÓSITO (2 filas back-to-back + pasillo)
  // --------------------------------------------------------------------------
  // Dimensiones reales aproximadas (escala visual):
  //   Ancho de bahía (2 pallets) ≈ 2.4 m
  //   Profundidad upright ≈ 1.1 m
  //   Alto total ≈ 4.5 m / 5 niveles
  //   Pasillo central ≈ 3.2 m (reach truck)
  // --------------------------------------------------------------------------
  var rackGroup = new THREE.Group();
  rackGroup.position.set(42, 0, 0);
  scene.add(rackGroup);

  var rackPieces = [];
  var RW = 2.4;     // ancho de una bahía
  var RD = 1.1;     // profundidad de upright
  var RH = 4.5;     // alto total
  var BAYS = 3;     // bahías por fila
  var LEVELS = 5;   // niveles de carga
  var AISLE = 3.2;  // ancho del pasillo central

  function piece(w, h, d, x, y, z, op) {
    var mat = lineMat(op, GOLD);
    var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    var seg = new THREE.LineSegments(geo, mat);
    var grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.add(seg);
    grp.userData = { targetY: y, mat: mat, baseOpacity: op };
    rackGroup.add(grp);
    rackPieces.push(grp);
  }

  // Construir dos filas de racks enfrentadas (back-to-back)
  // Fila 1: z negativo, Fila 2: z positivo, pasillo en el medio
  function buildRow(zBase, side) {
    var totalWidth = BAYS * RW;
    var startX = -totalWidth / 2 + RW / 2;

    for (var b = 0; b < BAYS; b++) {
      var bx = startX + b * RW;

      // Columnas verticales (4 por bahía: 2 front + 2 rear)
      var colW = 0.08, colD = 0.08;
      var colPositions = [
        [bx - RW / 2 + 0.06, zBase - RD / 2 + 0.06],
        [bx + RW / 2 - 0.06, zBase - RD / 2 + 0.06],
        [bx - RW / 2 + 0.06, zBase + RD / 2 - 0.06],
        [bx + RW / 2 - 0.06, zBase + RD / 2 - 0.06]
      ];
      for (var c = 0; c < colPositions.length; c++) {
        piece(colW, RH, colD, colPositions[c][0], RH / 2, colPositions[c][1], 0.85);
      }

      // Travesaños / beams en cada nivel
      for (var lv = 0; lv < LEVELS; lv++) {
        var ly = 0.35 + lv * ((RH - 0.5) / (LEVELS - 1));
        // Beam frontal y posterior
        piece(RW - 0.12, 0.06, 0.05, bx, ly, zBase - RD / 2 + 0.04, 0.7);
        piece(RW - 0.12, 0.06, 0.05, bx, ly, zBase + RD / 2 - 0.04, 0.7);
        // Cross beams (laterales)
        piece(0.05, 0.05, RD - 0.1, bx - RW / 2 + 0.08, ly, zBase, 0.55);
        piece(0.05, 0.05, RD - 0.1, bx + RW / 2 - 0.08, ly, zBase, 0.55);
      }

      // Base / footplates
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75);
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75);

      // Pallets simbólicos en algunos niveles (opcional, solo desktop)
      if (!isMobile && b % 2 === 0) {
        for (var pl = 1; pl < LEVELS; pl += 2) {
          var ply = 0.35 + pl * ((RH - 0.5) / (LEVELS - 1)) + 0.12;
          piece(1.0, 0.15, 0.9, bx - 0.55, ply, zBase, 0.35);
          piece(1.0, 0.15, 0.9, bx + 0.55, ply, zBase, 0.35);
        }
      }
    }
  }

  // Fila sur (z negativo) y fila norte (z positivo)
  buildRow(-(AISLE / 2 + RD / 2), -1);
  buildRow( (AISLE / 2 + RD / 2),  1);

  // Líneas de pasillo / floor marks
  var aisleMat = lineMat(0.25, GOLD_DK);
  var aisleGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BAYS * RW / 2 - 0.5, 0.02, -AISLE / 2 + 0.15),
    new THREE.Vector3( BAYS * RW / 2 + 0.5, 0.02, -AISLE / 2 + 0.15),
    new THREE.Vector3(-BAYS * RW / 2 - 0.5, 0.02,  AISLE / 2 - 0.15),
    new THREE.Vector3( BAYS * RW / 2 + 0.5, 0.02,  AISLE / 2 - 0.15)
  ]);
  var aisleLines = new THREE.LineSegments(aisleGeo, aisleMat);
  rackGroup.add(aisleLines);

  // --------------------------------------------------------------------------
  // ESTADO DE ANIMACIÓN
  // --------------------------------------------------------------------------
  var t0 = performance.now();
  var cur = { plan: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };
  var tgt = { plan: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };

  var lookPlan = new THREE.Vector3(0, 1.5, 0);
  var lookRack = new THREE.Vector3(42, 2.2, 0);

  // --------------------------------------------------------------------------
  // LECTURA DE SCROLL
  // --------------------------------------------------------------------------
  function readScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    tgt.scroll = clamp(scrollY / docH, 0, 1);

    // Detectar sección #racks para enfocar la cámara y ensamblar el rack
    var racksEl = document.getElementById('racks');
    if (racksEl) {
      var rect = racksEl.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 cuando la sección está debajo, 1 cuando está centrada o arriba
      var progress = clamp(1 - (rect.top - vh * 0.15) / (vh * 0.7), 0, 1);
      tgt.rack = progress;
      tgt.rackFocus = smooth(clamp((progress - 0.15) / 0.6, 0, 1));
    }
  }

  // --------------------------------------------------------------------------
  // UPDATE (lerp + render)
  // --------------------------------------------------------------------------
  function update(lerpFactor) {
    for (var key in cur) {
      cur[key] += (tgt[key] - cur[key]) * lerpFactor;
    }

    // Plano: intro + scroll inicial
    var elapsed = reduceMotion ? 1 : clamp((performance.now() - t0) / INTRO_DURATION_MS, 0, 1);
    var planProgress = reduceMotion ? 1 : Math.max(elapsed * 0.5, tgt.scroll / 0.12);
    tgt.plan = clamp(planProgress, 0, 1);
    tgt.bld  = reduceMotion ? 1 : clamp((tgt.scroll - 0.03) / 0.42, 0, 1);

    // Dibujado progresivo del plano
    var pn = Math.floor(totalPlanVerts * clamp(cur.plan, 0, 1));
    pn -= pn % 2;
    planMesh.geometry.setDrawRange(0, pn);

    var gn = Math.floor(totalGridVerts * clamp(cur.plan * 1.8, 0, 1));
    gn -= gn % 2;
    gridMesh.geometry.setDrawRange(0, gn);

    fillMesh.material.opacity = 0.5 * clamp((cur.plan - 0.12) * 1.6, 0, 1);

    // Edificio: pisos crecen
    floorGroups.forEach(function (fg, idx) {
      var t = clamp(cur.bld * floorGroups.length - idx, 0, 1);
      fg.visible = t > 0.001;
      fg.scale.y = Math.max(t, 0.001);
    });
    mast.visible = cur.bld > 0.97;

    // Rack: piezas caen en su sitio
    rackPieces.forEach(function (p, idx) {
      var t = clamp(cur.rack * rackPieces.length - idx, 0, 1);
      p.visible = t > 0.001;
      p.position.y = p.userData.targetY + (1 - smooth(t)) * 2.8;
      p.userData.mat.opacity = p.userData.baseOpacity * t;
    });

    // Cámara: órbita alrededor del plano → transición al rack
    var angle1  = -0.55 + cur.scroll * 2.0 + cur.mx * 0.16;
    var height1 = 7.2 - cur.scroll * 1.8 + cur.my * 0.5;
    var camPos1 = new THREE.Vector3(
      Math.sin(angle1) * 16,
      height1,
      Math.cos(angle1) * 16
    );

    var angle2  = 0.35 + cur.mx * 0.12;
    var height2 = 5.5 + cur.my * 0.35;
    var camPos2 = new THREE.Vector3(
      42 + Math.sin(angle2) * 11,
      height2,
      Math.cos(angle2) * 11
    );

    camera.position.lerpVectors(camPos1, camPos2, cur.rackFocus);
    var lookTarget = new THREE.Vector3().lerpVectors(lookPlan, lookRack, cur.rackFocus);
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------------------------
  // RESIZE
  // --------------------------------------------------------------------------
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) {
      camera.setViewOffset(w, h, -w * 0.1, 0, w, h);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    readScroll();
    if (reduceMotion) update(1);
  }

  // --------------------------------------------------------------------------
  // EVENTOS
  // --------------------------------------------------------------------------
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', function () {
    readScroll();
    if (reduceMotion) update(1);
  }, { passive: true });

  if (!reduceMotion && !isMobile && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      tgt.mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      tgt.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // ARRANQUE
  // --------------------------------------------------------------------------
  onResize();

  if (reduceMotion) {
    update(1);
    return;
  }

  (function loop() {
    update(0.07);
    requestAnimationFrame(loop);
  })();

})();
