/**
 * ============================================================================
 * scene3d.js — Animación WebGL 3D para Montvel Constructora (v3.1 — catedral más larga)
 * ============================================================================
 *
 * Animación ligada al SCROLL:
 *   1. PLANO (hero)     → se traza y las paredes se levantan (más lento)
 *   2. EDIFICIO         → los pisos se construyen de abajo hacia arriba (más lento)
 *   3. RACK SELECTIVO   → columnas y travesaños se levantan rápido al entrar a #racks
 *
 * Inspiración:
 *   - Planta cruz latina (Basílica del Voto Nacional, Quito)
 *   - Racks selectivos estándar Ecuador (bahía 2.4 m, 5 niveles, pasillo 3.2 m)
 *
 * Requisitos: Three.js r128, canvas#bg3d, sección#racks. Servir por HTTP.
 * ============================================================================
 */

(function () {

  var GOLD    = 0xE8C877;
  var GOLD_DK = 0xB38A32;
  var INTRO_DURATION_MS = 4200;

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
  // RENDERER
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

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

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
  // 1. PLANO ARQUITECTÓNICO — CRUZ LATINA
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

  var T = 0.13;

  wall('h', -3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']]);
  wall('h',  3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']]);
  wall('v',  6.5, -3.2, 3.2, T, [[-1.2, 1.2, 'w']]);
  wall('v', -7.5, -5.0, -1.6, T);
  wall('v', -7.5,  1.6,  5.0, T);
  wall('v', -7.5, -1.6, 1.6, T, [[-0.9, 0.9, 'd', 1]]);

  wall('h', -5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd', -1]]);
  wall('h',  5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd',  1]]);
  wall('v', -2.0, -5.8, -3.2, T);
  wall('v',  2.0, -5.8, -3.2, T);
  wall('v', -2.0,  3.2,  5.8, T);
  wall('v',  2.0,  3.2,  5.8, T);

  var chapelZs = [-5.0, -1.0, 3.0];
  for (var ci = 0; ci < chapelZs.length; ci++) {
    var cz = chapelZs[ci];
    wall('h', -4.6, cz - 0.9, cz + 0.9, T * 0.7);
    wall('v', cz - 0.9, -4.6, -3.2, T * 0.7);
    wall('v', cz + 0.9, -4.6, -3.2, T * 0.7);
    wall('h',  4.6, cz - 0.9, cz + 0.9, T * 0.7);
    wall('v', cz - 0.9,  3.2,  4.6, T * 0.7);
    wall('v', cz + 0.9,  3.2,  4.6, T * 0.7);
  }

  wall('h', -1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', 1], [0.5, 2, 'd', 1]]);
  wall('h',  1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', -1], [0.5, 2, 'd', -1]]);

  axis(-8.5, -6.5,  8.0, -6.5);
  axis(-8.5,  6.5,  8.0,  6.5);
  axis(-8.5, -6.5, -8.5,  6.5);
  axis( 8.0, -6.5,  8.0,  6.5);
  axis( 0,   -6.5,  0,    6.5);

  // Grupo del plano: se traza y luego "se levanta" (scale Y)
  var planGroup = new THREE.Group();
  scene.add(planGroup);

  var planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planVerts, 3));
  var planMesh = new THREE.LineSegments(planGeo, lineMat(0.9, GOLD));
  planGroup.add(planMesh);
  var totalPlanVerts = planVerts.length / 3;

  var gridVerts = [], gs = 1.25;
  for (var gx = -10; gx <= 10; gx += gs) { gridVerts.push(gx, -0.01, -8, gx, -0.01, 8); }
  for (var gz = -8; gz <= 8; gz += gs) { gridVerts.push(-10, -0.01, gz, 10, -0.01, gz); }
  var gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
  var gridMesh = new THREE.LineSegments(gridGeo, lineMat(0.16, GOLD_DK));
  planGroup.add(gridMesh);
  var totalGridVerts = gridVerts.length / 3;

  var fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fillVerts, 3));
  var fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
    color: 0x1A1408,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  }));
  planGroup.add(fillMesh);

  // Muros verticales 3D (paredes que se levantan con el scroll)
  var wallExtrudes = [];
  var WALL_H = 1.35;

  function makeRisingWall(x1, z1, x2, z2, height) {
    var pts = [
      new THREE.Vector3(x1, 0, z1),
      new THREE.Vector3(x2, 0, z2),
      new THREE.Vector3(x2, height, z2),
      new THREE.Vector3(x1, height, z1),
      new THREE.Vector3(x1, 0, z1)
    ];
    var g = new THREE.BufferGeometry().setFromPoints(pts);
    var m = lineMat(0.55, GOLD);
    var line = new THREE.Line(g, m);
    // También verticales en los extremos
    var v1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x1, height, z1)
    ]);
    var v2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x2, 0, z2), new THREE.Vector3(x2, height, z2)
    ]);
    var grp = new THREE.Group();
    grp.add(line);
    grp.add(new THREE.Line(v1, m));
    grp.add(new THREE.Line(v2, m));
    grp.scale.y = 0.001;
    planGroup.add(grp);
    wallExtrudes.push(grp);
  }

  // Contorno principal de la cruz latina como paredes que se levantan
  makeRisingWall(-7.5, -3.2,  6.5, -3.2, WALL_H);
  makeRisingWall(-7.5,  3.2,  6.5,  3.2, WALL_H);
  makeRisingWall(-7.5, -3.2, -7.5,  3.2, WALL_H);
  makeRisingWall( 6.5, -3.2,  6.5,  3.2, WALL_H);
  // Transepto
  makeRisingWall(-2.0, -5.8,  2.0, -5.8, WALL_H * 0.85);
  makeRisingWall(-2.0,  5.8,  2.0,  5.8, WALL_H * 0.85);
  makeRisingWall(-2.0, -5.8, -2.0, -3.2, WALL_H * 0.85);
  makeRisingWall( 2.0, -5.8,  2.0, -3.2, WALL_H * 0.85);
  makeRisingWall(-2.0,  3.2, -2.0,  5.8, WALL_H * 0.85);
  makeRisingWall( 2.0,  3.2,  2.0,  5.8, WALL_H * 0.85);

  // --------------------------------------------------------------------------
  // 2. EDIFICIO — pisos que se levantan de abajo hacia arriba
  // --------------------------------------------------------------------------
  var building = new THREE.Group();
  scene.add(building);
  var floorGroups = [];
  var NUM_FLOORS = 10;
  var FLOOR_H = 0.52;

  for (var fi = 0; fi < NUM_FLOORS; fi++) {
    var setback = fi > 6 ? (fi - 6) * 0.85 : 0;
    var fw = 12.0 - setback;
    var fd = 8.8  - setback * 0.7;
    var floorGroup = new THREE.Group();
    // Guardamos la Y final; al inicio están bajo tierra
    floorGroup.userData.targetY = fi * FLOOR_H + 0.01;
    floorGroup.position.y = -2.5; // empiezan hundidos
    floorGroup.scale.set(1, 0.001, 1);

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

  var mastGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H, 0),
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H + 1.9, 0)
  ]);
  var mast = new THREE.Line(mastGeo, lineMat(0.9, GOLD));
  mast.visible = false;
  building.add(mast);

  // --------------------------------------------------------------------------
  // 3. RACK SELECTIVO — se construye de abajo hacia arriba
  // --------------------------------------------------------------------------
  var rackGroup = new THREE.Group();
  rackGroup.position.set(42, 0, 0);
  scene.add(rackGroup);

  var rackPieces = [];
  var RW = 2.4;
  var RD = 1.1;
  var RH = 4.5;
  var BAYS = 3;
  var LEVELS = 5;
  var AISLE = 3.2;

  // orderIndex controla el orden de construcción (menor = primero)
  function piece(w, h, d, x, y, z, op, orderIndex) {
    var mat = lineMat(op, GOLD);
    var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    var seg = new THREE.LineSegments(geo, mat);
    var grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.add(seg);
    grp.userData = {
      targetY: y,
      mat: mat,
      baseOpacity: op,
      order: orderIndex !== undefined ? orderIndex : 0
    };
    // Empiezan hundidos bajo el suelo
    grp.position.y = -0.4;
    grp.scale.y = 0.001;
    rackGroup.add(grp);
    rackPieces.push(grp);
  }

  function buildRow(zBase) {
    var totalWidth = BAYS * RW;
    var startX = -totalWidth / 2 + RW / 2;

    for (var b = 0; b < BAYS; b++) {
      var bx = startX + b * RW;
      var bayOrder = b * 0.08; // ligero desfase entre bahías

      // Columnas primero (order bajo)
      var colW = 0.08, colD = 0.08;
      var colPositions = [
        [bx - RW / 2 + 0.06, zBase - RD / 2 + 0.06],
        [bx + RW / 2 - 0.06, zBase - RD / 2 + 0.06],
        [bx - RW / 2 + 0.06, zBase + RD / 2 - 0.06],
        [bx + RW / 2 - 0.06, zBase + RD / 2 - 0.06]
      ];
      for (var c = 0; c < colPositions.length; c++) {
        piece(colW, RH, colD, colPositions[c][0], RH / 2, colPositions[c][1], 0.85, 0.05 + bayOrder);
      }

      // Footplates
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75, 0.0 + bayOrder);

      // Travesaños por nivel (de abajo hacia arriba)
      for (var lv = 0; lv < LEVELS; lv++) {
        var ly = 0.35 + lv * ((RH - 0.5) / (LEVELS - 1));
        var levelOrder = 0.15 + (lv / LEVELS) * 0.7 + bayOrder;
        piece(RW - 0.12, 0.06, 0.05, bx, ly, zBase - RD / 2 + 0.04, 0.7, levelOrder);
        piece(RW - 0.12, 0.06, 0.05, bx, ly, zBase + RD / 2 - 0.04, 0.7, levelOrder);
        piece(0.05, 0.05, RD - 0.1, bx - RW / 2 + 0.08, ly, zBase, 0.55, levelOrder);
        piece(0.05, 0.05, RD - 0.1, bx + RW / 2 - 0.08, ly, zBase, 0.55, levelOrder);
      }

      if (!isMobile && b % 2 === 0) {
        for (var pl = 1; pl < LEVELS; pl += 2) {
          var ply = 0.35 + pl * ((RH - 0.5) / (LEVELS - 1)) + 0.12;
          var palletOrder = 0.2 + (pl / LEVELS) * 0.7 + bayOrder;
          piece(1.0, 0.15, 0.9, bx - 0.55, ply, zBase, 0.35, palletOrder);
          piece(1.0, 0.15, 0.9, bx + 0.55, ply, zBase, 0.35, palletOrder);
        }
      }
    }
  }

  buildRow(-(AISLE / 2 + RD / 2));
  buildRow( (AISLE / 2 + RD / 2));

  // Ordenar piezas por order para construcción secuencial
  rackPieces.sort(function (a, b) {
    return a.userData.order - b.userData.order;
  });

  var aisleMat = lineMat(0.25, GOLD_DK);
  var aisleGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-BAYS * RW / 2 - 0.5, 0.02, -AISLE / 2 + 0.15),
    new THREE.Vector3( BAYS * RW / 2 + 0.5, 0.02, -AISLE / 2 + 0.15),
    new THREE.Vector3(-BAYS * RW / 2 - 0.5, 0.02,  AISLE / 2 - 0.15),
    new THREE.Vector3( BAYS * RW / 2 + 0.5, 0.02,  AISLE / 2 - 0.15)
  ]);
  var aisleLines = new THREE.LineSegments(aisleGeo, aisleMat);
  aisleLines.visible = false;
  rackGroup.add(aisleLines);

  // --------------------------------------------------------------------------
  // ESTADO
  // --------------------------------------------------------------------------
  var t0 = performance.now();
  var cur = { plan: 0, walls: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };
  var tgt = { plan: 0, walls: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };

  var lookPlan = new THREE.Vector3(0, 1.2, 0);
  var lookRack = new THREE.Vector3(42, 2.2, 0);

  // --------------------------------------------------------------------------
  // SCROLL → targets
  // --------------------------------------------------------------------------
  function readScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    tgt.scroll = clamp(scrollY / docH, 0, 1);

    // Plano + edificio ocupan más scroll; rack se arma rápido al entrar a #racks
    var racksEl = document.getElementById('racks');
    if (racksEl) {
      var rect = racksEl.getBoundingClientRect();
      var vh = window.innerHeight;
      // Rango más corto → el rack termina de armarse más rápido
      var progress = clamp(1 - (rect.top - vh * 0.05) / (vh * 0.45), 0, 1);
      tgt.rack = progress;
      tgt.rackFocus = smooth(clamp((progress - 0.05) / 0.35, 0, 1));
    } else {
      tgt.rack = 0;
      tgt.rackFocus = 0;
    }
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------
  function update(lerpFactor) {
    for (var key in cur) {
      cur[key] += (tgt[key] - cur[key]) * lerpFactor;
    }

    var elapsed = reduceMotion ? 1 : clamp((performance.now() - t0) / INTRO_DURATION_MS, 0, 1);

    // —— PLANO / CATEDRAL: más lento (más % de scroll) ——
    var planDraw = reduceMotion ? 1 : Math.max(elapsed, clamp(tgt.scroll / 0.28, 0, 1));
    tgt.plan = planDraw;
    tgt.walls = reduceMotion ? 1 : clamp((tgt.scroll - 0.04) / 0.32, 0, 1);

    var pn = Math.floor(cur.plan * totalPlanVerts);
    if (pn % 2 === 1) pn -= 1;
    planMesh.geometry.setDrawRange(0, Math.max(0, pn));

    var gn = Math.floor(cur.plan * totalGridVerts);
    if (gn % 2 === 1) gn -= 1;
    gridMesh.geometry.setDrawRange(0, Math.max(0, gn));

    fillMesh.material.opacity = 0.5 * clamp((cur.plan - 0.15) * 1.5, 0, 1);

    // Paredes 3D se levantan (scale.y 0 → 1)
    wallExtrudes.forEach(function (w, idx) {
      var t = clamp(cur.walls * wallExtrudes.length - idx * 0.7, 0, 1);
      t = smooth(t);
      w.scale.y = Math.max(t, 0.001);
      w.visible = t > 0.01;
      w.children.forEach(function (ch) {
        if (ch.material) ch.material.opacity = 0.55 * t;
      });
    });

    // —— EDIFICIO: más lento (hasta ~66% del scroll de la página) ——
    tgt.bld = reduceMotion ? 1 : clamp((tgt.scroll - 0.08) / 0.58, 0, 1);

    floorGroups.forEach(function (fg, idx) {
      var t = clamp(cur.bld * (floorGroups.length + 0.5) - idx, 0, 1);
      t = smooth(t);
      fg.visible = t > 0.01;
      fg.scale.y = Math.max(t, 0.001);
      fg.position.y = lerp(-2.2, fg.userData.targetY, t);
    });
    mast.visible = cur.bld > 0.96;
    if (mast.material) mast.material.opacity = clamp((cur.bld - 0.96) / 0.04, 0, 1);

    // —— RACK: más rápido (factor 0.28) ——
    rackPieces.forEach(function (p, idx) {
      var t = clamp(cur.rack * (rackPieces.length * 0.28) - idx * 0.28, 0, 1);
      t = smooth(t);
      p.visible = t > 0.01;
      p.scale.y = Math.max(t, 0.001);
      p.position.y = lerp(-0.5, p.userData.targetY, t);
      p.userData.mat.opacity = p.userData.baseOpacity * t;
    });
    aisleLines.visible = cur.rack > 0.35;
    if (aisleLines.material) aisleLines.material.opacity = 0.25 * clamp((cur.rack - 0.35) / 0.3, 0, 1);

    // —— CÁMARA ——
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
  // RESIZE / EVENTOS / LOOP
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

  onResize();

  if (reduceMotion) {
    update(1);
    return;
  }

  (function loop() {
    update(0.08);
    requestAnimationFrame(loop);
  })();

})();
