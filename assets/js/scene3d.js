/**
 * ============================================================================
 * scene3d.js — Animación WebGL 3D para Montvel Constructora (v4.0)
 * ============================================================================
 *
 * Animación ligada al SCROLL:
 *   1. CATEDRAL (hero)  → el plano se traza, TODOS los muros se levantan y las
 *                         torres de la fachada se completan. El progreso se
 *                         mide dentro de #inicio (hero alto con contenido sticky),
 *                         así la catedral queda 100% formada al terminar el hero.
 *   2. RACK SELECTIVO   → columnas y travesaños se levantan al entrar a #racks
 *
 * Planta cruz latina (Basílica del Voto Nacional, Quito).
 * Racks selectivos estándar Ecuador (bahía 2.4 m, 5 niveles, pasillo 3.2 m).
 *
 * Requisitos: Three.js r128, canvas#bg3d, secciones #inicio y #racks.
 * ============================================================================
 */

(function () {

  var GOLD    = 0xE8C877;
  var GOLD_DK = 0xB38A32;

  // Pequeño trazo inicial por tiempo (para que la página no cargue vacía).
  // Todo lo demás depende únicamente del scroll.
  var INTRO_MS    = 2600;
  var INTRO_TRACE = 0.12;

  // Fases dentro del hero (0 → 1 de progreso de scroll)
  var PLAN_END     = 0.40;  // el plano termina de trazarse
  var WALLS_START  = 0.22;  // empiezan a subir los muros
  var WALLS_END    = 0.85;  // el último muro termina de subir
  var TOWERS_START = 0.78;  // empiezan a subir las torres

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
  // 1. CATEDRAL — PLANO CRUZ LATINA + MUROS QUE SE LEVANTAN
  // --------------------------------------------------------------------------
  var planVerts = [];
  var fillVerts = [];
  var riseList  = [];

  var WALL_H   = 1.35;
  var TRANS_H  = 1.15;
  var ARC_H    = 0.95;
  var CHAPEL_H = 0.75;

  function L(x1, z1, x2, z2) {
    planVerts.push(x1, 0, z1, x2, 0, z2);
  }

  function addRise(x1, z1, x2, z2, h, minor) {
    riseList.push({
      x1: x1, z1: z1, x2: x2, z2: z2, h: h, minor: !!minor,
      cx: (x1 + x2) / 2, cz: (z1 + z2) / 2
    });
  }

  function wall(axisDir, coord, start, end, thick, opens, height, minor) {
    opens = (opens || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    height = height || WALL_H;
    var cur = start;

    function segment(a, b) {
      if (axisDir === 'h') {
        L(a, coord - thick, b, coord - thick);
        L(a, coord + thick, b, coord + thick);
        L(a, coord - thick, a, coord + thick);
        L(b, coord - thick, b, coord + thick);
        fillVerts.push(
          a, 0, coord - thick,  b, 0, coord - thick,  a, 0, coord + thick,
          b, 0, coord - thick,  b, 0, coord + thick,  a, 0, coord + thick
        );
        addRise(a, coord, b, coord, height, minor);
      } else {
        L(coord - thick, a, coord - thick, b);
        L(coord + thick, a, coord + thick, b);
        L(coord - thick, a, coord + thick, a);
        L(coord - thick, b, coord + thick, b);
        fillVerts.push(
          coord - thick, 0, a,  coord + thick, 0, a,  coord - thick, 0, b,
          coord + thick, 0, a,  coord + thick, 0, b,  coord - thick, 0, b
        );
        addRise(coord, a, coord, b, height, minor);
      }
    }

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
          if (axisDir === 'h') {
            L(o1 + Math.cos(a1) * radius, coord + Math.sin(a1) * radius * side,
              o1 + Math.cos(a2) * radius, coord + Math.sin(a2) * radius * side);
          } else {
            L(coord + Math.sin(a1) * radius * side, o1 + Math.cos(a1) * radius,
              coord + Math.sin(a2) * radius * side, o1 + Math.cos(a2) * radius);
          }
        }
        if (axisDir === 'h') L(o1, coord, o1, coord + radius * side);
        else                 L(coord, o1, coord + radius * side, o1);
      } else if (type === 'w') {
        if (axisDir === 'h') {
          L(o1, coord - thick * 0.4, o2, coord - thick * 0.4);
          L(o1, coord + thick * 0.4, o2, coord + thick * 0.4);
        } else {
          L(coord - thick * 0.4, o1, coord - thick * 0.4, o2);
          L(coord + thick * 0.4, o1, coord + thick * 0.4, o2);
        }
      }
    });

    if (cur < end) segment(cur, end);
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

  function gridAxis(x1, z1, x2, z2) {
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

  wall('h', -3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']], WALL_H);
  wall('h',  3.2, -7.5, 6.5, T, [[-5.5, -3.5, 'w'], [-1.5, 0.5, 'w'], [2.5, 4.5, 'w']], WALL_H);
  wall('v',  6.5, -3.2, 3.2, T, [[-1.2, 1.2, 'w']], WALL_H);
  wall('v', -7.5, -5.0, -1.6, T, null, WALL_H);
  wall('v', -7.5,  1.6,  5.0, T, null, WALL_H);
  wall('v', -7.5, -1.6, 1.6, T, [[-0.9, 0.9, 'd', 1]], WALL_H);

  wall('h', -5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd', -1]], TRANS_H);
  wall('h',  5.8, -2.0, 2.0, T, [[-0.8, 0.8, 'd',  1]], TRANS_H);
  wall('v', -2.0, -5.8, -3.2, T, null, TRANS_H);
  wall('v',  2.0, -5.8, -3.2, T, null, TRANS_H);
  wall('v', -2.0,  3.2,  5.8, T, null, TRANS_H);
  wall('v',  2.0,  3.2,  5.8, T, null, TRANS_H);

  var chapelZs = [-5.0, -1.0, 3.0];
  for (var ci = 0; ci < chapelZs.length; ci++) {
    var cz = chapelZs[ci];
    wall('h', -4.6, cz - 0.9, cz + 0.9, T * 0.7, null, CHAPEL_H, true);
    wall('v', cz - 0.9, -4.6, -3.2, T * 0.7, null, CHAPEL_H, true);
    wall('v', cz + 0.9, -4.6, -3.2, T * 0.7, null, CHAPEL_H, true);
    wall('h',  4.6, cz - 0.9, cz + 0.9, T * 0.7, null, CHAPEL_H, true);
    wall('v', cz - 0.9,  3.2,  4.6, T * 0.7, null, CHAPEL_H, true);
    wall('v', cz + 0.9,  3.2,  4.6, T * 0.7, null, CHAPEL_H, true);
  }

  wall('h', -1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', 1], [0.5, 2, 'd', 1]], ARC_H, true);
  wall('h',  1.5, -6.5, 5.5, T * 0.55, [[-4, -2.5, 'd', -1], [0.5, 2, 'd', -1]], ARC_H, true);

  gridAxis(-8.5, -6.5,  8.0, -6.5);
  gridAxis(-8.5,  6.5,  8.0,  6.5);
  gridAxis(-8.5, -6.5, -8.5,  6.5);
  gridAxis( 8.0, -6.5,  8.0,  6.5);
  gridAxis( 0,   -6.5,  0,    6.5);

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

  riseList.sort(function (a, b) { return (a.cx - b.cx) || (a.cz - b.cz); });

  var wallExtrudes = [];
  riseList.forEach(function (w) {
    if (isMobile && w.minor) return;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      w.x1, w.h, w.z1,  w.x2, w.h, w.z2,
      w.x1, 0,   w.z1,  w.x1, w.h, w.z1,
      w.x2, 0,   w.z2,  w.x2, w.h, w.z2
    ], 3));
    var m = lineMat(0.0, GOLD);
    var seg = new THREE.LineSegments(g, m);
    seg.scale.y = 0.001;
    seg.visible = false;
    seg.userData.mat = m;
    planGroup.add(seg);
    wallExtrudes.push(seg);
  });

  var towers = [];
  function makeTower(x, z, w, h) {
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    var m = lineMat(0.0, GOLD);
    var body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), m);
    body.position.y = h / 2;
    g.add(body);
    var spire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.ConeGeometry(w * 0.72, h * 0.45, 4)), m);
    spire.position.y = h + h * 0.225;
    spire.rotation.y = Math.PI / 4;
    g.add(spire);
    g.scale.y = 0.001;
    g.visible = false;
    g.userData.mat = m;
    planGroup.add(g);
    towers.push(g);
  }
  makeTower(-7.0, -2.2, 1.5, 2.3);
  makeTower(-7.0,  2.2, 1.5, 2.3);

  // --------------------------------------------------------------------------
  // 2. RACK SELECTIVO
  // --------------------------------------------------------------------------
  var rackGroup = new THREE.Group();
  rackGroup.position.set(42, 0, 0);
  scene.add(rackGroup);

  var rackPieces = [];
  var RW = 2.4, RD = 1.1, RH = 4.5, BAYS = 3, LEVELS = 5, AISLE = 3.2;

  function piece(w, h, d, x, y, z, op, orderIndex) {
    var mat = lineMat(op, GOLD);
    var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    var seg = new THREE.LineSegments(geo, mat);
    var grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.add(seg);
    grp.userData = { targetY: y, mat: mat, baseOpacity: op, order: orderIndex !== undefined ? orderIndex : 0 };
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
      var bayOrder = b * 0.08;
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
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase - RD / 2 + 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx - RW / 2 + 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75, 0.0 + bayOrder);
      piece(0.18, 0.06, 0.18, bx + RW / 2 - 0.06, 0.03, zBase + RD / 2 - 0.06, 0.75, 0.0 + bayOrder);
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

  rackPieces.sort(function (a, b) { return a.userData.order - b.userData.order; });

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
  // ESTADO / SCROLL / UPDATE
  // --------------------------------------------------------------------------
  var t0 = performance.now();
  var cur = { plan: 0, walls: 0, towers: 0, hero: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };
  var tgt = { plan: 0, walls: 0, towers: 0, hero: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };

  var lookPlan = new THREE.Vector3(0, 1.2, 0);
  var lookRack = new THREE.Vector3(42, 2.2, 0);

  var heroEl  = document.getElementById('inicio');
  var racksEl = document.getElementById('racks');

  function readScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    tgt.scroll = clamp(scrollY / docH, 0, 1);

    if (heroEl) {
      var hr = heroEl.getBoundingClientRect();
      var span = hr.height - window.innerHeight;
      tgt.hero = span > 8 ? clamp(-hr.top / span, 0, 1) : 1;
    } else {
      tgt.hero = clamp(scrollY / Math.max(1, window.innerHeight * 2), 0, 1);
    }

    if (racksEl) {
      var rect = racksEl.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = clamp(1 - (rect.top - vh * 0.05) / (vh * 0.45), 0, 1);
      tgt.rack = progress;
      tgt.rackFocus = smooth(clamp((progress - 0.05) / 0.35, 0, 1));
    } else {
      tgt.rack = 0;
      tgt.rackFocus = 0;
    }
  }

  function computeTargets() {
    if (reduceMotion) {
      tgt.plan = 1; tgt.walls = 1; tgt.towers = 1; tgt.hero = 1;
      return;
    }
    var intro = clamp((performance.now() - t0) / INTRO_MS, 0, 1);
    tgt.plan   = Math.max(INTRO_TRACE * smooth(intro), clamp(tgt.hero / PLAN_END, 0, 1));
    tgt.walls  = clamp((tgt.hero - WALLS_START)  / (WALLS_END - WALLS_START), 0, 1);
    tgt.towers = clamp((tgt.hero - TOWERS_START) / (1 - TOWERS_START), 0, 1);
  }

  function update(lerpFactor) {
    computeTargets();

    for (var key in cur) {
      var d = tgt[key] - cur[key];
      cur[key] += Math.abs(d) < 0.0005 ? d : d * lerpFactor;
    }

    var pn = Math.floor(cur.plan * totalPlanVerts);
    if (pn % 2 === 1) pn -= 1;
    planMesh.geometry.setDrawRange(0, Math.max(0, pn));

    var gn = Math.floor(cur.plan * totalGridVerts);
    if (gn % 2 === 1) gn -= 1;
    gridMesh.geometry.setDrawRange(0, Math.max(0, gn));

    fillMesh.material.opacity = 0.5 * clamp((cur.plan - 0.15) * 1.5, 0, 1);

    var n = wallExtrudes.length;
    for (var wi = 0; wi < n; wi++) {
      var w = wallExtrudes[wi];
      var start = (wi / Math.max(1, n)) * 0.65;
      var t = smooth(clamp((cur.walls - start) / 0.35, 0, 1));
      w.visible = t > 0.01;
      w.scale.y = Math.max(t, 0.001);
      w.userData.mat.opacity = 0.7 * t;
    }

    for (var ti = 0; ti < towers.length; ti++) {
      var tw = towers[ti];
      var tt = smooth(clamp(cur.towers * 1.15 - ti * 0.15, 0, 1));
      tw.visible = tt > 0.01;
      tw.scale.y = Math.max(tt, 0.001);
      tw.userData.mat.opacity = 0.8 * tt;
    }

    rackPieces.forEach(function (p, idx) {
      var rt = clamp(cur.rack * (rackPieces.length * 0.28) - idx * 0.28, 0, 1);
      rt = smooth(rt);
      p.visible = rt > 0.01;
      p.scale.y = Math.max(rt, 0.001);
      p.position.y = lerp(-0.5, p.userData.targetY, rt);
      p.userData.mat.opacity = p.userData.baseOpacity * rt;
    });
    aisleLines.visible = cur.rack > 0.35;
    if (aisleLines.material) aisleLines.material.opacity = 0.25 * clamp((cur.rack - 0.35) / 0.3, 0, 1);

    var angle1  = -0.55 + cur.hero * 1.15 + cur.scroll * 0.5 + cur.mx * 0.16;
    var height1 = 7.2 - cur.hero * 1.2 + cur.my * 0.5;
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
