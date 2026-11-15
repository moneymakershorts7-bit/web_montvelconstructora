/* ============ ESCENA 3D ============ */
(function(){
  var canvas = document.getElementById("bg3d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.matchMedia("(max-width: 767px)").matches;
  if (!window.THREE) { document.body.classList.add("no3d"); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: !mobile, alpha: true}); }
  catch (e) { document.body.classList.add("no3d"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

  var GOLD = 0xE8C877, GOLD_DK = 0xB38A32;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function smooth(t){ return t*t*(3-2*t); }
  function lmat(op,c){ return new THREE.LineBasicMaterial({color: c || GOLD, transparent: true, opacity: op}); }

  /* --- Plano arquitectónico civil: muros cortados, aberturas, cotas y ejes --- */
  var P = [], F = [], labels = [];
  function L(x1,z1,x2,z2){ P.push(x1,0,z1,x2,0,z2); }
  // Muro con aberturas. ax: 'h' (a lo largo de x, en z=c) o 'v' (a lo largo de z, en x=c).
  // ops: [desde, hasta, 'w' ventana | 'd' puerta, lado del giro (+1/-1)]
  function wall(ax,c,s,e,t,ops){
    ops = (ops||[]).slice().sort(function(a,b){ return a[0]-b[0]; });
    function q(u,v){ return ax==='h' ? [u,c+v] : [c+v,u]; }
    function ln(u1,v1,u2,v2){ var a=q(u1,v1), b=q(u2,v2); L(a[0],a[1],b[0],b[1]); }
    function fill(u1,u2){ var a=q(u1,-t/2), b=q(u2,-t/2), d=q(u2,t/2), g=q(u1,t/2);
      F.push(a[0],-0.005,a[1], b[0],-0.005,b[1], d[0],-0.005,d[1], a[0],-0.005,a[1], d[0],-0.005,d[1], g[0],-0.005,g[1]); }
    var u = s;
    ops.concat([[e,e,'end']]).forEach(function(o){
      if (o[0] > u){ ln(u,-t/2,o[0],-t/2); ln(u,t/2,o[0],t/2); fill(u,o[0]); }
      if (o[2]==='end') return;
      var a=o[0], b=o[1], w=b-a;
      ln(a,-t/2,a,t/2); ln(b,-t/2,b,t/2);
      if (o[2]==='w'){ ln(a,-t/2,b,-t/2); ln(a,0,b,0); ln(a,t/2,b,t/2); }
      else {
        var sd = o[3] || 1;
        ln(a,0,a,sd*w);
        for (var i=0;i<8;i++){
          var s1=(Math.PI/2)*(1-i/8), s2=(Math.PI/2)*(1-(i+1)/8);
          ln(a+w*Math.cos(s1), sd*w*Math.sin(s1), a+w*Math.cos(s2), sd*w*Math.sin(s2));
        }
      }
      u = b;
    });
  }
  // Cota: línea con marcas inclinadas y líneas auxiliares cortas
  function dim(ax,c,marks,from){
    function q(u,v){ return ax==='h' ? [u,c+v] : [c+v,u]; }
    function ln(u1,v1,u2,v2){ var a=q(u1,v1), b=q(u2,v2); L(a[0],a[1],b[0],b[1]); }
    ln(marks[0],0,marks[marks.length-1],0);
    marks.forEach(function(m){ ln(m,from,m,0.25); ln(m-0.15,-0.15,m+0.15,0.15); });
  }
  // Círculo de eje
  function circ(x,z,r){ for (var i=0;i<16;i++){ var s1=i/16*Math.PI*2, s2=(i+1)/16*Math.PI*2; L(x+Math.cos(s1)*r,z+Math.sin(s1)*r,x+Math.cos(s2)*r,z+Math.sin(s2)*r); } }
  function label(text,x,z,w,h,rot,font){
    var cv = document.createElement("canvas"); cv.width = 256; cv.height = Math.round(256*h/w);
    var cx = cv.getContext("2d"); cx.fillStyle = "#F3DE9F"; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.font = (font || "600 " + Math.round(cv.height*0.62) + "px Georgia, serif"); cx.fillText(text, cv.width/2, cv.height/2);
    var tx = new THREE.CanvasTexture(cv);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:tx, transparent:true, opacity:0, depthWrite:false}));
    m.rotation.x = -Math.PI/2; m.rotation.z = rot || 0; m.position.set(x,0.01,z); scene.add(m); labels.push(m);
  }

  // Muros exteriores (0.30 m) con ventanas y puerta principal
  wall('h',-4,-6,6,0.3,[[-4.5,-3,'w'],[1,2.5,'w']]);
  wall('v',6,-4,4,0.3,[[-2,-0.5,'w']]);
  wall('v',-6,-4,4,0.3,[[-1.5,0.5,'w']]);
  wall('h',4,-6,6,0.3,[[-4.5,-3,'w'],[-0.5,0.5,'d',-1],[3,4.5,'w']]);
  // Muros interiores (0.15 m) con puertas
  wall('v',-1,-3.85,0.8,0.15,[[-2.2,-1.3,'d',1]]);
  wall('h',0.8,-5.85,-1,0.15,[[-4.4,-3.5,'d',-1]]);
  wall('h',0.8,-1,5.85,0.15,[[0.4,1.3,'d',1]]);
  wall('v',2.5,0.8,3.85,0.15,[[1.8,2.7,'d',-1]]);
  // Cotas parciales y totales
  dim('h',5.3,[-6,-1,2.5,6],-0.9); dim('h',6.1,[-6,6],-0.9);
  dim('v',7.2,[-4,0.8,4],-0.9);    dim('v',8,[-4,4],-0.9);
  // Ejes estructurales: círculos con letra o número
  [-6,-1,2.5,6].forEach(function(x){ circ(x,-5.4,0.4); L(x,-5,x,-4.3); });
  [-4,0.8,4].forEach(function(z){ circ(-7.4,z,0.4); L(-7,z,-6.3,z); });
  ["A","B","C","D"].forEach(function(t,i){ label(t,[-6,-1,2.5,6][i],-5.4,0.7,0.7); });
  ["1","2","3"].forEach(function(t,i){ label(t,-7.4,[-4,0.8,4][i],0.7,0.7); });
  // Medidas y nivel de referencia
  label("12.00",0,5.85,1.9,0.5,0); label("8.00",7.75,0,1.6,0.5,Math.PI/2);
  label("+0.00",-8.6,-5.4,1.6,0.5,0);

  var plan = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(P,3)), lmat(1));
  var planCount = P.length/3;
  var fillMesh = new THREE.Mesh(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(F,3)),
    new THREE.MeshBasicMaterial({color:GOLD_DK, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false}));

  var G = [], gs = mobile ? 3 : 1.5;
  for (var gx=-9; gx<=9; gx+=gs){ G.push(gx,-0.01,-7, gx,-0.01,7); }
  for (var gz=-7; gz<=7; gz+=gs){ G.push(-9,-0.01,gz, 9,-0.01,gz); }
  var grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(G,3)), lmat(0.12,GOLD_DK));
  var gridCount = G.length/3;
  scene.add(grid, fillMesh, plan);

  /* --- Edificio abstracto en wireframe (se eleva piso por piso) --- */
  var building = new THREE.Group(); building.position.set(2.2,0,-0.2); scene.add(building);
  var dims = [[5,3],[5,3],[5,3],[4.2,2.6],[4.2,2.6],[3.4,2.4],[3.4,2.4],[2.4,1.8]];
  var FH = 0.7, floors = [];
  dims.forEach(function(d,i){
    var g = new THREE.Group(); g.position.y = i*FH;
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(d[0],FH,d[1])), lmat(0.9));
    e.position.y = FH/2; g.add(e); building.add(g); floors.push(g);
  });
  var mastGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0,0,0,0,1.6,0],3));
  var mast = new THREE.LineSegments(mastGeo, lmat(0.9)); mast.position.y = dims.length*FH; building.add(mast);

  /* --- Rack 3D que se arma pieza por pieza --- */
  var rack = new THREE.Group(); rack.position.set(40,0,0); scene.add(rack);
  var pieces = [];
  function piece(w,h,d,x,y,z,op){
    var m = lmat(op);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)), m);
    var g = new THREE.Group(); g.position.set(x,y,z); g.add(e); g.userData = {y:y, m:m, op:op};
    rack.add(g); pieces.push(g);
  }
  var RW=1.8, RD=2, RH=4.4;
  piece(RW,0.12,RD,0,0.06,0,0.95);
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(c){ piece(0.1,RH,0.1,c[0]*(RW/2-0.05),RH/2,c[1]*(RD/2-0.05),0.95); });
  piece(RW,0.12,RD,0,RH,0,0.95);
  for (var i=0;i<8;i++){ piece(RW-0.2,0.05,RD-0.2,0,0.55+i*0.5,0,0.7); }
  if (!mobile) [0,1,3,4,6].forEach(function(s){ piece(RW-0.3,0.32,RD-0.5,0,0.55+s*0.5+0.19,0,0.9); });

  /* --- Estado, scroll y ratón --- */
  var racksEl = document.getElementById("racks");
  var cur = {plan:0,bld:0,rack:0,rf:0,p:0,mx:0,my:0}, tgt = {plan:0,bld:0,rack:0,rf:0,p:0,mx:0,my:0};
  var t0 = performance.now();
  var v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), t1 = new THREE.Vector3(0,1.6,0), t2 = new THREE.Vector3(40,2.2,0);

  function readScroll(){
    var max = document.documentElement.scrollHeight - window.innerHeight;
    tgt.p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    var r = racksEl.getBoundingClientRect(), vh = window.innerHeight;
    tgt.rack = clamp((vh*0.8 - r.top) / (r.height*0.7), 0, 1);
    var c = r.top + r.height/2;
    tgt.rf = smooth(clamp(1 - Math.abs(c - vh/2) / (vh*0.9), 0, 1));
    if (reduce) { tgt.plan = 1; tgt.bld = 1; tgt.rack = 1; tgt.rf = tgt.rf > 0.5 ? 1 : 0; tgt.p = 0.25; }
  }

  function update(k){
    for (var key in cur){ cur[key] += (tgt[key] - cur[key]) * k; }
    var intro = reduce ? 1 : clamp((performance.now() - t0) / 2600, 0, 1);
    var planT = reduce ? 1 : Math.max(intro*0.45, tgt.p/0.1);
    tgt.plan = clamp(planT, 0, 1);
    tgt.bld = reduce ? 1 : clamp((tgt.p - 0.02) / 0.45, 0, 1);

    var pn = Math.floor(planCount * clamp(cur.plan,0,1)); pn -= pn % 2;
    plan.geometry.setDrawRange(0, pn);
    var gn = Math.floor(gridCount * clamp(cur.plan*2,0,1)); gn -= gn % 2;
    grid.geometry.setDrawRange(0, gn);
    fillMesh.material.opacity = 0.55 * clamp((cur.plan - 0.15) * 1.5, 0, 1);
    labels.forEach(function(l){ l.material.opacity = clamp((cur.plan - 0.7) * 3.3, 0, 1); });

    floors.forEach(function(f,i){
      var t = clamp(cur.bld*floors.length - i, 0, 1);
      f.visible = t > 0.001; f.scale.y = Math.max(t, 0.001);
    });
    mast.visible = cur.bld > 0.98;

    pieces.forEach(function(p,i){
      var t = clamp(cur.rack*pieces.length - i, 0, 1);
      p.visible = t > 0.001;
      p.position.y = p.userData.y + (1 - smooth(t)) * 2.5;
      p.userData.m.opacity = p.userData.op * t;
    });

    var a1 = -0.55 + cur.p*2.2 + cur.mx*0.18, h1 = 6.5 - cur.p*1.5 + cur.my*0.6;
    v1.set(Math.sin(a1)*15, h1, Math.cos(a1)*15);
    var a2 = 0.35 + cur.rack*0.9 + cur.mx*0.18;
    v2.set(40 + Math.sin(a2)*10, 3.6 + cur.my*0.4, Math.cos(a2)*10);
    camera.position.lerpVectors(v1, v2, cur.rf);
    var look = new THREE.Vector3().lerpVectors(t1, t2, cur.rf);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function resize(){
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) camera.setViewOffset(w, h, -w*0.2, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    readScroll();
    if (reduce) update(1);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function(){ readScroll(); if (reduce) update(1); }, {passive:true});

  if (!reduce && !mobile && window.matchMedia("(pointer: fine)").matches){
    window.addEventListener("mousemove", function(e){
      tgt.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      tgt.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, {passive:true});
  }

  resize();
  if (reduce) { update(1); return; }
  (function loop(){ update(0.07); requestAnimationFrame(loop); })();
})();
</script>
