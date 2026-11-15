/**
 * ============================================================================
 * scene3d.js — Animación WebGL 3D para Montvel Constructora
 * ============================================================================
 *
 * DESCRIPCIÓN GENERAL:
 * Este archivo controla la escena Three.js que se anima al hacer scroll.
 * Contiene dos objetos 3D principales que se revelan progresivamente:
 *
 *   1. PLANO ARQUITECTÓNICO (sección hero / inicio)
 *      Un plano técnico en vista cenital con muros, puertas, ventanas,
 *      ejes de referencia y cuadrícula. Se dibuja progresivamente al cargar.
 *      Inspirado en la documentación técnica real de obras ecuatorianas.
 *
 *   2. RACK INDUSTRIAL 3D (sección #racks)
 *      Estantería metálica de rack selectivo a escala real:
 *      - 3 bahías de rack, cada una: 1.8m ancho × 2.0m prof × 4.4m alto
 *      - 5 niveles de estantes por bahía (separación ~0.75m)
 *      - Columnas verticales, travesaños y base
 *      Los componentes se ensamblan animadamente al entrar la sección
 *      al viewport (controlado por scroll).
 *
 * ============================================================================
 * CÓMO MODIFICAR LA ESCENA (para desarrolladores humanos e IA):
 * ============================================================================
 *
 *  CAMBIAR COLORES:
 *    Modifica las constantes GOLD y GOLD_DK al inicio del IIFE.
 *    Formato: 0xRRGGBB (hexadecimal).
 *
 *  CAMBIAR EL PLANO ARQUITECTÓNICO:
 *    La función wall(eje, coordFija, inicio, fin, grosor, [aperturas]) dibuja
 *    un muro con doble línea (simulando grosor). Parámetros:
 *      - eje:       "h" (horizontal/X) o "v" (vertical/Z)
 *      - coordFija: coordenada fija en el eje perpendicular
 *      - inicio/fin: rango del muro en el eje principal
 *      - grosor:    mitad del espesor del muro (valor visual)
 *      - aperturas: array de [posInicio, posFin, tipo, lado]
 *                   tipo "d" = puerta (arco), tipo "w" = ventana (doble línea)
 *
 *  CAMBIAR EL RACK:
 *    Modifica las constantes RW (ancho), RD (profundidad), RH (alto), BAYS
 *    (número de bahías), SHELVES (número de estantes por bahía).
 *    La función piece(w, h, d, x, y, z, opacity) añade un componente al rack.
 *
 *  CAMBIAR VELOCIDAD DE ANIMACIÓN:
 *    - Intro (plano aparece): constante INTRO_DURATION_MS
 *    - Suavidad de scroll/lerp: el factor 0.07 en loop()
 *    - Ensamblado del rack: controlado por tgt.rack (0–1 según scroll)
 *
 *  CAMBIAR CÁMARA:
 *    - t1: punto lookAt para la vista del plano (edificio)
 *    - t2: punto lookAt para la vista del rack
 *    La cámara interpola linealmente entre v1 (posición plano) y v2 (rack).
 *
 * ============================================================================
 * REQUISITOS TÉCNICOS:
 *   - Three.js r128 debe estar cargado ANTES que este script.
 *   - El canvas debe tener id="bg3d" en el HTML.
 *   - La sección de racks debe tener id="racks".
 *   - Servir desde HTTP (localhost o GitHub Pages), NO desde file://.
 *     WebGL falla en file:// por restricciones de seguridad del navegador.
 *
 * ============================================================================
 * DATOS REALES DE REFERENCIA (Ecuador):
 *   Edificio más alto:  Torre Maxximus, Guayaquil — 184m / 50+ pisos
 *   Icono arquitectónico: Torre The Point, Guayaquil — 136.5m (diseño espiral)
 *   Icono contemporáneo: IQON, Quito — 131m (BIG Architects, bosque vertical)
 *   Rack selectivo estándar: 1.8m ancho × 2.0m prof × 4.4m alto, aisle 3–3.5m
 *   Normativa estructural: NEC-SE-DS (sísmica), ACI 318 (hormigón armado)
 *
 * ============================================================================
 */

(function () {

  // --------------------------------------------------------------------------
  // CONSTANTES DE CONFIGURACIÓN — modifica aquí para cambiar apariencia global
  // --------------------------------------------------------------------------
  var GOLD    = 0xE8C877; // Dorado brillante: muros, elementos principales
  var GOLD_DK = 0xB38A32; // Dorado oscuro: cuadrícula, detalles secundarios
  var INTRO_DURATION_MS = 2600; // ms que tarda el plano en dibujarse al cargar

  // --------------------------------------------------------------------------
  // DETECCIÓN DE ENTORNO Y CAPACIDADES
  // --------------------------------------------------------------------------
  var canvas = document.getElementById('bg3d');
  if (!canvas) return; // Sin canvas, nada que hacer

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile     = window.matchMedia('(max-width: 767px)').matches;

  // Three.js debe estar ya cargado (index.html garantiza el orden correcto)
  if (typeof window.THREE === 'undefined') {
    console.warn('[scene3d] Three.js no está disponible. Activando fallback CSS.');
    document.body.classList.add('no3d');
    return;
  }

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN PROGRESIVA DEL RENDERER WEBGL
  // Intentamos 3 configuraciones distintas, de más exigente a más tolerante.
  // Si ninguna funciona (GPU deshabilitada, sandbox estricto), activamos
  // el fallback CSS (clase "no3d") sin romper la página.
  // --------------------------------------------------------------------------
  var renderer = null;

  var rendererConfigs = [
    // Intento 1: configuración óptima con antialiasing
    { canvas: canvas, antialias: !isMobile, alpha: true, powerPreference: 'default' },
    // Intento 2: sin antialiasing, precisión media
    { canvas: canvas, antialias: false, alpha: true, precision: 'mediump' },
    // Intento 3: mínimo absoluto, acepta cualquier GPU
    { canvas: canvas, antialias: false, alpha: true, failIfMajorPerformanceCaveat: false }
  ];

  for (var ri = 0; ri < rendererConfigs.length; ri++) {
    try {
      var r = new THREE.WebGLRenderer(rendererConfigs[ri]);
      if (r && r.getContext()) {
        renderer = r;
        break; // Éxito: salir del bucle
      }
    } catch (e) {
      console.warn('[scene3d] WebGL intento ' + (ri + 1) + ' fallido:', e.message || e);
    }
  }

  if (!renderer) {
    // Ningún contexto WebGL pudo crearse. Activar fallback CSS.
    // La clase "no3d" en body activa el fondo blueprint definido en styles.css.
    console.warn('[scene3d] WebGL no disponible. Usando fallback CSS blueprint.');
    document.body.classList.add('no3d');
    return;
  }

  // Resolución del canvas: cap en 2x para desktop, 1.5x para móvil
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  // --------------------------------------------------------------------------
  // ESCENA Y CÁMARA
  // --------------------------------------------------------------------------
  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(
    40,  // FOV en grados
    1,   // Aspect ratio (se actualiza en resize())
    0.1, // Near plane
    200  // Far plane
  );

  // --------------------------------------------------------------------------
  // UTILIDADES MATEMÁTICAS
  // --------------------------------------------------------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); } // Cubic ease in-out
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Crea un material de línea básico con color y opacidad dados */
  function lineMat(opacity, color) {
    return new THREE.LineBasicMaterial({
      color: color !== undefined ? color : GOLD,
      transparent: true,
      opacity: opacity
    });
  }

  // --------------------------------------------------------------------------
  // SECCIÓN 1: PLANO ARQUITECTÓNICO TÉCNICO
  // --------------------------------------------------------------------------
  // Acumula los vértices del plano lineal (P) y el relleno de muros (F)
  var planVerts  = [];
  var fillVerts  = [];

  /**
   * Añade un segmento de línea al plano.
   * Coordenadas en el plano XZ (Y=0 = suelo).
   */
  function L(x1, z1, x2, z2) {
    planVerts.push(x1, 0, z1, x2, 0, z2);
  }

  /**
   * Dibuja un muro con doble línea (simulando grosor estructural).
   * Incluye soporte para aperturas de puertas (arco) y ventanas (doble línea).
   *
   * @param {string} axis    "h" = muro horizontal (corre en X), "v" = vertical (corre en Z)
   * @param {number} coord   Coordenada fija del eje perpendicular
   * @param {number} start   Inicio del muro en el eje principal
   * @param {number} end     Fin del muro en el eje principal
   * @param {number} thick   Mitad del grosor visual del muro
   * @param {Array}  opens   Aperturas: [[posInicio, posFin, "d"|"w", lado?], ...]
   */
  function wall(axis, coord, start, end, thick, opens) {
    opens = (opens || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    var cur = start;

    opens.forEach(function (o) {
      var o1 = o[0], o2 = o[1], type = o[2], side = o[3] || 1;
      if (o1 > cur) segment(cur, o1); // Muro sólido antes de la apertura
      cur = o2;

      if (type === 'd') {
        // PUERTA: arco de cuarto de círculo que indica el barrido
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
        // Línea de hoja de puerta
        if (axis === 'h') L(o1, coord, o1, coord + radius * side);
        else               L(coord, o1, coord + radius * side, o1);

      } else if (type === 'w') {
        // VENTANA: doble línea paralela representando el vano con cristal
        if (axis === 'h') {
          L(o1, coord - thick * 0.4, o2, coord - thick * 0.4);
          L(o1, coord + thick * 0.4, o2, coord + thick * 0.4);
        } else {
          L(coord - thick * 0.4, o1, coord - thick * 0.4, o2);
          L(coord + thick * 0.4, o1, coord + thick * 0.4, o2);
        }
      }
    });

    if (cur < end) segment(cur, end); // Muro sólido después de la última apertura

    /** Dibuja un segmento sólido del muro (doble línea + relleno opaco) */
    function segment(a, b) {
      if (axis === 'h') {
        L(a, coord - thick, b, coord - thick);
        L(a, coord + thick, b, coord + thick);
        L(a, coord - thick, a, coord + thick);
        L(b, coord - thick, b, coord + thick);
        // Triángulos de relleno para dar masa visual al muro
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

  /**
   * Dibuja un círculo en XZ (para los remates de ejes de referencia).
   */
  function circle(x, z, radius) {
    var steps = 16;
    for (var i = 0; i < steps; i++) {
      var a1 = (i / steps) * Math.PI * 2;
      var a2 = ((i + 1) / steps) * Math.PI * 2;
      L(x + Math.cos(a1) * radius, z + Math.sin(a1) * radius,
        x + Math.cos(a2) * radius, z + Math.sin(a2) * radius);
    }
  }

  /**
   * Dibuja un eje de referencia técnico (línea de trazos con círculos en extremos).
   * En planos arquitectónicos reales, los ejes identifican alineaciones
   * de columnas y muros estructurales.
   */
  function axis(x1, z1, x2, z2) {
    var dashLen = 0.4, gapLen = 0.2;
    var totalLen = Math.hypot(x2 - x1, z2 - z1);
    var dx = (x2 - x1) / totalLen, dz = (z2 - z1) / totalLen;
    var d = 0;
    while (d < totalLen) {
      var seg = Math.min(dashLen, totalLen - d);
      L(x1 + dx * d,       z1 + dz * d,
        x1 + dx * (d + seg), z1 + dz * (d + seg));
      d += dashLen + gapLen;
    }
    // Círculos de remate en los extremos del eje
    circle(x1 - dx * 0.5, z1 - dz * 0.5, 0.28);
    circle(x2 + dx * 0.5, z2 + dz * 0.5, 0.28);
  }

  // ------------------------------------------------------------------
  // DEFINICIÓN DEL PLANO ARQUITECTÓNICO
  // Planta típica: espacio principal con zonas delimitadas.
  // T = grosor de muro (valor real ≈ 0.15m para muros interiores).
  // ------------------------------------------------------------------
  var T = 0.12; // Mitad del grosor visual (muro exterior ~0.24 unidades)

  // Muros exteriores (perímetro del edificio)
  wall('h', -4.5, -6,  6, T,  [[-3.5, -1.5, 'w'], [1.5, 3.5, 'w']]);
  wall('h',  4.5, -6,  6, T,  [[-4.5, -2.5, 'w'], [0, 1.4, 'd', 1], [3, 5, 'w']]);
  wall('v', -6,  -4.5, 4.5, T, [[-3, -1, 'w'], [1, 3, 'w']]);
  wall('v',  6,  -4.5, 4.5, T, [[-3.5, -1.5, 'w'], [1.5, 3.5, 'w']]);

  // Muros interiores (divisiones de ambientes)
  wall('v', -1, -4.5, 1.5, T * 0.8, [[-2, -0.8, 'd', -1]]); // Pasillo central
  wall('h',  1.5, -6, 2,   T * 0.8, [[-4.5, -3.3, 'd', 1]]); // Separación lateral
  wall('v',  2,  -1, 4.5,  T * 0.8, [[1, 2.2, 'd', 1]]);      // Zona posterior

  // Ejes de referencia estructural (nomenclatura A-B, 1-2)
  // En planos reales estos ejes marcan las líneas de columnas
  axis(-6, -5.5,  6, -5.5); // Eje A
  axis(-6,  5.5,  6,  5.5); // Eje B
  axis(-7, -4.5, -7,  4.5); // Eje 1
  axis( 7, -4.5,  7,  4.5); // Eje 2

  // Construir la geometría Three.js del plano lineal
  var planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planVerts, 3));
  var planMesh = new THREE.LineSegments(planGeo, lineMat(0.9, GOLD));
  scene.add(planMesh);
  var totalPlanVerts = planVerts.length / 3; // Para el drawRange progresivo

  // Cuadrícula de referencia del suelo (apagada, sutil)
  var gridVerts = [], gs = 1.2;
  for (var gx = -9; gx <= 9; gx += gs) { gridVerts.push(gx, -0.01, -7, gx, -0.01, 7); }
  for (var gz = -7; gz <= 7; gz += gs) { gridVerts.push(-9, -0.01, gz, 9, -0.01, gz); }
  var gridGeo  = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
  var gridMesh = new THREE.LineSegments(gridGeo, lineMat(0.18, GOLD_DK));
  scene.add(gridMesh);
  var totalGridVerts = gridVerts.length / 3;

  // Relleno de muros (malla semi-opaca para dar masa visual)
  var fillGeo  = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fillVerts, 3));
  var fillMesh = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
    color: 0x1A1408,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  }));
  scene.add(fillMesh);

  // --------------------------------------------------------------------------
  // SECCIÓN 2: EDIFICIO ABSTRACTO (wireframe que se eleva con el scroll)
  // Representa esquemáticamente el crecimiento de un edificio en construcción.
  // Inspirado en la silueta de los edificios de Montvel.
  // --------------------------------------------------------------------------
  var building   = new THREE.Group();
  scene.add(building);
  var floorGroups = [];
  var NUM_FLOORS  = 9;
  var FLOOR_H     = 0.55; // Altura de cada piso (escala visual)

  for (var fi = 0; fi < NUM_FLOORS; fi++) {
    // Los pisos superiores (fi > 5) se van estrechando (efecto de retranqueo)
    var fw = 11.6 - (fi > 5 ? (fi - 5) * 1.1 : 0);
    var fd = 8.6  - (fi > 5 ? (fi - 5) * 0.9 : 0);
    var floorGroup = new THREE.Group();
    floorGroup.position.y = fi * FLOOR_H + 0.01;

    // Caja del piso en wireframe
    var edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(fw, FLOOR_H, fd));
    var edgeMat = lineMat(0.45 + fi * 0.04, fi % 2 === 0 ? GOLD : GOLD_DK);
    floorGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // Columnas verticales (sólo en desktop para no sobrecargar móvil)
    if (!isMobile) {
      for (var kx = -fw / 2 + 1; kx < fw / 2; kx += 1.6) {
        var colGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(kx, 0,      -fd / 2),
          new THREE.Vector3(kx, FLOOR_H, -fd / 2)
        ]);
        floorGroup.add(new THREE.Line(colGeo, lineMat(0.25, GOLD_DK)));
      }
    }

    building.add(floorGroup);
    floorGroups.push(floorGroup);
  }

  // Mástil o antena en la cima del edificio
  var mastGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H,       0),
    new THREE.Vector3(0, NUM_FLOORS * FLOOR_H + 1.8, 0)
  ]);
  var mast = new THREE.Line(mastGeo, lineMat(0.9, GOLD));
  building.add(mast);

  // --------------------------------------------------------------------------
  // SECCIÓN 3: RACK INDUSTRIAL 3D (selectivo, 3 bahías)
  //
  // Dimensiones basadas en rack selectivo estándar ecuatoriano:
  //   RW = 1.8m ancho por bahía
  //   RD = 2.0m profundidad
  //   RH = 4.4m alto total
  //   BAYS = 3 bahías en fila (total ~6m de largo)
  //   SHELVES = 5 niveles de carga por bahía
  //
  // La estructura se posiciona en X=40 y la cámara transiciona hacia allá
  // cuando el usuario scrollea hasta la sección #racks.
  // --------------------------------------------------------------------------
  var rackGroup = new THREE.Group();
  rackGroup.position.set(40, 0, 0); // Separado del plano para la transición de cámara
  scene.add(rackGroup);

  var rackPieces = []; // Todos los componentes del rack para animarlos
  var RW     = 1.8;    // Ancho de una bahía (metros en escala)
  var RD     = 2.0;    // Profundidad del rack
  var RH     = 4.4;    // Alto total del rack
  var BAYS   = 3;      // Número de bahías en fila
  var SHELVES = 5;     // Niveles de carga por bahía

  /**
   * Añade un componente rectangular al rack.
   * Los componentes caen desde arriba al ensamblarse (animación de y).
   *
   * @param {number} w, h, d  Dimensiones (ancho, alto, prof)
   * @param {number} x, y, z  Posición local dentro del rackGroup
   * @param {number} op       Opacidad final del componente
   */
  function piece(w, h, d, x, y, z, op) {
    var mat = lineMat(op, GOLD);
    var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    var seg = new THREE.LineSegments(geo, mat);
    var grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.add(seg);
    // Guardamos la posición Y final y la opacidad para la animación
    grp.userData = { targetY: y, mat: mat, baseOpacity: op };
    rackGroup.add(grp);
    rackPieces.push(grp);
  }

  // Construir 3 bahías de rack en fila, separadas por RW
  for (var bay = 0; bay < BAYS; bay++) {
    var bx = (bay - (BAYS - 1) / 2) * (RW + 0.05); // X centrado

    // BASE del rack (plataforma inferior)
    piece(RW, 0.10, RD, bx, 0.05, 0, 0.95);

    // CUATRO COLUMNAS VERTICALES por bahía
    var colOffsets = [
      [-RW / 2 + 0.05, -RD / 2 + 0.05],
      [ RW / 2 - 0.05, -RD / 2 + 0.05],
      [ RW / 2 - 0.05,  RD / 2 - 0.05],
      [-RW / 2 + 0.05,  RD / 2 - 0.05]
    ];
    colOffsets.forEach(function (co) {
      piece(0.08, RH, 0.08, bx + co[0], RH / 2, co[1], 0.95);
    });

    // TRAVESAÑOS HORIZONTALES frontales y traseros (arriostramiento)
    for (var level = 0; level <= SHELVES; level++) {
      var ty = (level / SHELVES) * RH;
      // Travesaño frontal
      piece(RW - 0.1, 0.06, 0.06, bx, ty, -RD / 2 + 0.03, 0.80);
      // Travesaño trasero
      piece(RW - 0.1, 0.06, 0.06, bx, ty,  RD / 2 - 0.03, 0.80);
    }

    // ESTANTES / BANDEJAS de carga (planos horizontales internos)
    // Los primeros SHELVES niveles tienen bandeja; el último es el techo
    for (var sh = 1; sh <= SHELVES; sh++) {
      var sy = (sh / SHELVES) * RH * 0.9 + 0.1;
      piece(RW - 0.15, 0.04, RD - 0.15, bx, sy, 0, 0.75);
    }

    // CAJAS/PALLETS en estantes alternos (decorativo, representa carga)
    if (!isMobile) {
      [1, 3, 5].forEach(function (shIdx) {
        var py = (shIdx / SHELVES) * RH * 0.9 + 0.1 + 0.12;
        piece(RW - 0.3, 0.28, RD - 0.4, bx, py, 0, 0.88);
      });
    }
  }

  // VIGA SUPERIOR LONGITUDINAL que une las 3 bahías (riostra de cabeza)
  var totalWidth = BAYS * (RW + 0.05) - 0.05;
  piece(totalWidth, 0.10, 0.10, 0, RH, -RD / 2 + 0.03, 0.70);
  piece(totalWidth, 0.10, 0.10, 0, RH,  RD / 2 - 0.03, 0.70);

  // --------------------------------------------------------------------------
  // ESTADO DE ANIMACIÓN Y SCROLL
  // cur = valores actuales (interpolados suavemente)
  // tgt = valores objetivo (leídos del estado real de scroll)
  // --------------------------------------------------------------------------
  var cur = { plan: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };
  var tgt = { plan: 0, bld: 0, rack: 0, rackFocus: 0, scroll: 0, mx: 0, my: 0 };

  var t0       = performance.now(); // Timestamp de inicio para la animación de intro
  var racksEl  = document.getElementById('racks'); // Sección del DOM para detectar scroll

  // Puntos de lookAt de la cámara
  var lookPlan = new THREE.Vector3(0, 1.6, 0);   // Mira al centro del plano
  var lookRack = new THREE.Vector3(40, 2.2, 0);  // Mira al centro del rack

  /**
   * Lee el estado actual del scroll y actualiza los valores objetivo (tgt).
   * Se llama en cada evento "scroll" y en resize.
   */
  function readScroll() {
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    tgt.scroll = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;

    if (racksEl) {
      var rect = racksEl.getBoundingClientRect();
      var vh   = window.innerHeight;
      // rack: 0 cuando la sección está fuera, 1 cuando está bien visible
      tgt.rack = clamp((vh * 0.8 - rect.top) / (rect.height * 0.7), 0, 1);
      // rackFocus: cuánto centra la cámara en el rack (máximo cuando centrado)
      var centerY = rect.top + rect.height / 2;
      tgt.rackFocus = smooth(clamp(1 - Math.abs(centerY - vh / 2) / (vh * 0.9), 0, 1));
    }

    // Con prefers-reduced-motion: saltar directamente al estado final
    if (reduceMotion) {
      tgt.plan = 1; tgt.bld = 1; tgt.rack = 1;
      tgt.rackFocus = tgt.rackFocus > 0.5 ? 1 : 0;
      tgt.scroll = 0.25;
    }
  }

  /**
   * Actualiza la escena completa para un frame.
   * @param {number} lerpFactor Factor de interpolación (0–1). 0.07 = suave
   */
  function update(lerpFactor) {
    // Interpolar todos los valores hacia su objetivo
    for (var key in cur) {
      cur[key] += (tgt[key] - cur[key]) * lerpFactor;
    }

    // ---- Timing del plano (intro al cargar + scroll inicial) ----
    var elapsed = reduceMotion ? 1 : clamp((performance.now() - t0) / INTRO_DURATION_MS, 0, 1);
    var planProgress = reduceMotion ? 1 : Math.max(elapsed * 0.45, tgt.scroll / 0.1);
    tgt.plan = clamp(planProgress, 0, 1);
    tgt.bld  = reduceMotion ? 1 : clamp((tgt.scroll - 0.02) / 0.45, 0, 1);

    // ---- Dibujado progresivo del plano (setDrawRange) ----
    // Revela el plano línea a línea para efecto de "trazado en tiempo real"
    var pn = Math.floor(totalPlanVerts * clamp(cur.plan, 0, 1));
    pn -= pn % 2; // Siempre pares (cada línea son 2 vértices)
    planMesh.geometry.setDrawRange(0, pn);

    var gn = Math.floor(totalGridVerts * clamp(cur.plan * 2, 0, 1));
    gn -= gn % 2;
    gridMesh.geometry.setDrawRange(0, gn);

    // Relleno de muros: aparece después de que el contorno esté dibujado
    fillMesh.material.opacity = 0.55 * clamp((cur.plan - 0.15) * 1.5, 0, 1);

    // ---- Edificio: pisos se elevan con el scroll ----
    floorGroups.forEach(function (fg, idx) {
      var t = clamp(cur.bld * floorGroups.length - idx, 0, 1);
      fg.visible = t > 0.001;
      fg.scale.y = Math.max(t, 0.001); // Escala vertical para efecto de crecimiento
    });
    mast.visible = cur.bld > 0.98; // La antena aparece cuando el edificio está completo

    // ---- Rack: componentes caen en su posición al entrar la sección ----
    rackPieces.forEach(function (p, idx) {
      var t = clamp(cur.rack * rackPieces.length - idx, 0, 1);
      p.visible = t > 0.001;
      // La pieza cae desde arriba (desplazamiento Y negativo cuando t=0)
      p.position.y = p.userData.targetY + (1 - smooth(t)) * 2.5;
      p.userData.mat.opacity = p.userData.baseOpacity * t;
    });

    // ---- Movimiento de cámara: orbita alrededor del plano/edificio ----
    var angle1  = -0.55 + cur.scroll * 2.2 + cur.mx * 0.18;
    var height1 = 6.5 - cur.scroll * 1.5 + cur.my * 0.6;
    var camPos1 = new THREE.Vector3(
      Math.sin(angle1) * 15,
      height1,
      Math.cos(angle1) * 15
    );

    // ---- Cámara alternativa: orbita alrededor del rack ----
    var angle2  = 0.35 + cur.rack * 0.9 + cur.mx * 0.18;
    var camPos2 = new THREE.Vector3(
      40 + Math.sin(angle2) * 10,
      3.6 + cur.my * 0.4,
      Math.cos(angle2) * 10
    );

    // Transición suave entre las dos posiciones de cámara según el foco
    camera.position.lerpVectors(camPos1, camPos2, cur.rackFocus);
    var lookTarget = new THREE.Vector3().lerpVectors(lookPlan, lookRack, cur.rackFocus);
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
  }

  // --------------------------------------------------------------------------
  // RESIZE RESPONSIVE
  // Recalcula el tamaño del canvas y el aspect ratio de la cámara.
  // --------------------------------------------------------------------------
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // En pantallas anchas, desplazar el centro de proyección para dejar
    // espacio visual al texto que se superpone sobre el canvas
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

  // Paralaje de ratón (sólo en desktop con puntero preciso para no afectar táctil)
  if (!reduceMotion && !isMobile && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      tgt.mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      tgt.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // ARRANQUE
  // --------------------------------------------------------------------------
  onResize(); // Inicializar dimensiones

  if (reduceMotion) {
    // Sin animación: renderizar el estado final directamente
    update(1);
    return;
  }

  // Bucle de renderizado continuo a 60 FPS
  // requestAnimationFrame delega al navegador para sincronizar con el refresh rate
  (function loop() {
    update(0.07); // 0.07 = factor de lerp suave (~7% de acercamiento por frame)
    requestAnimationFrame(loop);
  })();

})(); // Fin del IIFE — todo queda encapsulado, sin contaminar el scope global
