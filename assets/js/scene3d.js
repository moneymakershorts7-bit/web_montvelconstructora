/**
 * scene3d.js — Montvel Constructora
 * Placeholder seguro tras un push incorrecto.
 * Reemplazar por la v4.0 del adjunto (catedral sticky + racks).
 */
(function () {
  var canvas = document.getElementById('bg3d');
  if (!canvas) return;
  if (typeof window.THREE === 'undefined') {
    document.body.classList.add('no3d');
    return;
  }
  try {
    var isMobile = window.matchMedia('(max-width: 767px)').matches;
    var r = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !isMobile });
    if (!r.getContext()) throw new Error('no ctx');
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    r.setSize(window.innerWidth, window.innerHeight, false);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 8, 16);
    camera.lookAt(0, 1, 0);
    var mat = new THREE.LineBasicMaterial({ color: 0xE8C877, transparent: true, opacity: 0.55 });
    var floor = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(12, 0.05, 9)), mat);
    scene.add(floor);
    function frame() {
      r.render(scene, camera);
      requestAnimationFrame(frame);
    }
    frame();
    window.addEventListener('resize', function () {
      r.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });
  } catch (e) {
    console.warn('[scene3d]', e);
    document.body.classList.add('no3d');
  }
})();
