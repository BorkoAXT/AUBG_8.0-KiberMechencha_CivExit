// ============================================================
  //  game.js  –  Survival Encyclopedia  |  Scenario 1: Earthquake
  //  Environment: HackAUBG Hackathon – Sports Hall, AUBG  (5× scale)
  // ============================================================

  (function () {
    "use strict";

    const canvas = document.getElementById("game-canvas");
    if (!canvas) return;

    // ── Renderer ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.80;   // toned down

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ab4c8);
    scene.fog = new THREE.Fog(0x9fc4d4, 60, 200);

    const camera = new THREE.PerspectiveCamera(
      72,
      canvas.clientWidth / canvas.clientHeight,
      0.05,
      300
    );
    camera.rotation.order = "YXZ";
    camera.position.set(0, 1.7, 0);
    camera.rotation.y = Math.PI; // face into the hall

    // ── Scale constant – XZ positions/sizes ×5 ──────────────────
    const S = 5;

    // ── Game state ──────────────────────────────────────────────
    const STATE = { CALM: 0, QUAKE: 1, DONE: 2 };
    let gameState = STATE.CALM;
    let calmTimer = 0;
    let quakeTimer = 0;
    const CALM_DURATION = 30;
    const QUAKE_DURATION = 25;

    let panic = 50;
    let health = 100;
    let isHiding = false;
    let debrisCooldown = 0;
    let shakeIntensity = 0;
    const cameraBase = new THREE.Vector3();

    // ── Crouch ──────────────────────────────────────────────────
    const EYE_STAND = 1.7;
    const EYE_CROUCH = 0.75;
    let isCrouching = false;
    let currentEyeY = EYE_STAND;

    // Safe zones – one per table, all XZ ×S
    const safeZones = [
      { center: new THREE.Vector3(-4*S, 0,  3*S), radius: 1.1*S },
      { center: new THREE.Vector3(-7*S, 0,  3*S), radius: 1.1*S },
      { center: new THREE.Vector3(-1*S, 0,  3*S), radius: 1.1*S },
      { center: new THREE.Vector3(-4*S, 0,  7*S), radius: 1.1*S },
      { center: new THREE.Vector3(-7*S, 0,  7*S), radius: 1.1*S },
      { center: new THREE.Vector3( 2*S, 0,  5*S), radius: 1.1*S },
      { center: new THREE.Vector3( 5*S, 0,  5*S), radius: 1.1*S },
      { center: new THREE.Vector3( 7*S, 0,  3*S), radius: 1.1*S },
      { center: new THREE.Vector3(-5*S, 0, 11*S), radius: 1.1*S },
      { center: new THREE.Vector3(-2*S, 0, 11*S), radius: 1.1*S },
      { center: new THREE.Vector3( 1*S, 0, 11*S), radius: 1.1*S },
      { center: new THREE.Vector3( 4*S, 0, 12*S), radius: 1.1*S },
      { center: new THREE.Vector3( 6*S, 0, 11*S), radius: 1.1*S },
      { center: new THREE.Vector3(-6*S, 0, 16*S), radius: 1.1*S },
      { center: new THREE.Vector3(-3*S, 0, 16*S), radius: 1.1*S },
      { center: new THREE.Vector3( 0*S, 0, 16*S), radius: 1.1*S },
      { center: new THREE.Vector3( 4*S, 0, 17*S), radius: 1.1*S },
      { center: new THREE.Vector3( 7*S, 0, 17*S), radius: 1.1*S },
      { center: new THREE.Vector3(-8*S, 0, 10*S), radius: 1.1*S },
      { center: new THREE.Vector3( 8*S, 0,  8*S), radius: 1.1*S },
    ];

    const debrisPool = [];
    const activeDebris = [];

    // ── Materials ───────────────────────────────────────────────
    const M = {
      floor:        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.98, metalness: 0.0 }),
      ceiling:      new THREE.MeshStandardMaterial({ color: 0xd0ccc4, roughness: 0.9,  metalness: 0.0 }),
      wall:         new THREE.MeshStandardMaterial({ color: 0xc8c0b4, roughness: 0.92, metalness: 0.0 }),
      wallOrange:   new THREE.MeshStandardMaterial({ color: 0xc2511a, roughness: 0.9,  metalness: 0.0 }),
      column:       new THREE.MeshStandardMaterial({ color: 0x4a5040, roughness: 0.85, metalness: 0.0 }),
      windowFrame:  new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.7,  metalness: 0.1 }),
      windowGlass:  new THREE.MeshLambertMaterial({ color: 0x88c0d0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      windowSill:   new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.8,  metalness: 0.0 }),
      tableLeg:     new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6,  metalness: 0.4 }),
      foldTable:    new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.75, metalness: 0.0 }),
      chair:        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9,  metalness: 0.1 }),
      chairRed:     new THREE.MeshLambertMaterial({ color: 0xb82020 }),
      laptop:       new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.4,  metalness: 0.6 }),
      screen:       new THREE.MeshBasicMaterial({ color: 0x4488ff }),
      whiteboard:   new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.85, metalness: 0.0 }),
      whiteboardFr: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6,  metalness: 0.3 }),
      bannerBlue:   new THREE.MeshLambertMaterial({ color: 0x1a3a8a }),
      bannerRed:    new THREE.MeshLambertMaterial({ color: 0xaa1a1a }),
      bannerTeal:   new THREE.MeshLambertMaterial({ color: 0x0a6a6a }),
      bannerGray:   new THREE.MeshLambertMaterial({ color: 0x555566 }),
      backboard:    new THREE.MeshStandardMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.7 }),
      rim:          new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5,  metalness: 0.5 }),
      pole:         new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5,  metalness: 0.6 }),
      safe:         new THREE.MeshLambertMaterial({ color: 0x22c55e, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      plaster:      new THREE.MeshLambertMaterial({ color: 0xd4cfc6 }),
      concrete:     new THREE.MeshLambertMaterial({ color: 0x888880 }),
      debris:       new THREE.MeshLambertMaterial({ color: 0x665544 }),
      water:        new THREE.MeshStandardMaterial({ color: 0x2288cc, transparent: true, opacity: 0.8, metalness: 0.2 }),
      mcdonalds:    new THREE.MeshLambertMaterial({ color: 0xffcc00 }),
      mcdonaldsRed: new THREE.MeshLambertMaterial({ color: 0xcc0000 }),
      balloon:      new THREE.MeshLambertMaterial({ color: 0xf5c518 }),
      balloonRed:   new THREE.MeshLambertMaterial({ color: 0xee2222 }),
      balloonGreen: new THREE.MeshLambertMaterial({ color: 0x22bb44 }),
      black:        new THREE.MeshLambertMaterial({ color: 0x111111 }),
      netMat:       new THREE.MeshLambertMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 }),
    };

    // ── Lights ──────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.45);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff8e8, 0x334422, 0.55);
    scene.add(hemiLight);

    // Spread ceiling lights across the 5× hall
    const ceilPositions = [
      [    0, 7.5,  5*S],
      [    0, 7.5, 15*S],
      [-5*S,  7.5,  8*S],
      [ 5*S,  7.5,  8*S],
      [-5*S,  7.5, 18*S],
      [ 5*S,  7.5, 18*S],
    ];
    const ceilLights = ceilPositions.map(([cx, cy, cz], i) => {
      const pl = new THREE.PointLight(0xfff8e8, i < 2 ? 2.0 : 1.6, 80);
      pl.position.set(cx, cy, cz);
      if (i < 2) {
        pl.castShadow = true;
        pl.shadow.mapSize.width = 512;
        pl.shadow.mapSize.height = 512;
        pl.shadow.bias = -0.002;
      }
      scene.add(pl);
      return pl;
    });
    const ceilLight1 = ceilLights[0];
    const ceilLight3 = ceilLights[1];

    const windowGlow = new THREE.DirectionalLight(0xc8e8ff, 0.75);
    windowGlow.position.set(15*S, 6, 5*S);
    scene.add(windowGlow);

    const windowGlow2 = new THREE.DirectionalLight(0xd0eaff, 0.5);
    windowGlow2.position.set(15*S, 5, 15*S);
    scene.add(windowGlow2);

    const fillRight = new THREE.PointLight(0xffd8a0, 0.35, 60);
    fillRight.position.set(-8*S, 4, 5*S);
    scene.add(fillRight);

    // ── Geometry helpers ─────────────────────────────────────────
    const colliders = [];
    function addCollider(px, pz, hw, hd, crouchPassable = false) {
      colliders.push({ minX: px-hw, maxX: px+hw, minZ: pz-hd, maxZ: pz+hd, crouchPassable });
    }

    function b(w, h, d, mat, px, py, pz, rx, ry, rz) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(px, py, pz);
      if (rx || ry || rz) mesh.rotation.set(rx||0, ry||0, rz||0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }

    // ─────────────────────────────────────────────────────────────
    //  HALL  110m × 140m × 9m
    // ─────────────────────────────────────────────────────────────
    const HW = 22*S, HH = 9, HD = 28*S;
    const hx = 0, hz = HD/2 - 2*S;

    b(HW, 0.12, HD, M.floor,   hx, -0.06, hz);
    b(HW, 0.25, HD, M.ceiling, hx, HH+0.12, hz);

    b(HW, HH, 0.2, M.wall, hx, HH/2, HD-2*S);
    b(HW, HH, 0.2, M.wall, hx, HH/2, -2*S);
    b(0.2, 3.5, HD, M.wallOrange, -11*S, 1.75, hz);
    b(0.2, 5.5, HD, M.wall,       -11*S, 6.25, hz);
    b(0.2, 3.5, HD, M.wallOrange,  11*S, 1.75, hz);
    b(0.2, 5.5, HD, M.wall,        11*S, 5.75, hz);
    b(0.15, 2.0, HD*0.6, M.windowGlass, 11*S, 7.5, hz);

    addCollider(-11*S, hz, 0.2, HD/2);
    addCollider( 11*S, hz, 0.2, HD/2);
    addCollider(hx, -2*S,     HW/2, 0.2);
    addCollider(hx, HD-2*S,   HW/2, 0.2);

    // Windows – left wall
    for (let wz = 0; wz < HD; wz += 6*S) {
      b(0.22, 3.2, 3.8*S, M.windowFrame, -11*S, 5.9, wz);
      b(0.12, 2.9, 3.4*S, M.windowGlass, -11*S, 5.9, wz);
      b(0.25, 0.18, 4.0*S, M.windowSill, -11*S, 4.45, wz);
    }

    // Clerestory windows – back wall
    for (let wx = -8*S; wx <= 8*S; wx += 4*S) {
      b(3.5*S, 2.5, 0.18, M.windowFrame, wx, 7.2, HD-2.1*S);
      b(3.0*S, 2.1, 0.1,  M.windowGlass, wx, 7.2, HD-2.1*S);
    }

    // Columns
    [[-9*S,5*S],[-9*S,13*S],[-9*S,21*S],[9*S,5*S],[9*S,13*S],[9*S,21*S]].forEach(([cx,cz])=>{
      b(0.6*S, HH, 0.6*S, M.column, cx, HH/2, cz);
      addCollider(cx, cz, 0.35*S, 0.35*S);
    });

    // Basketball hoops
    b(0.2,6,0.2, M.pole,      0,3,   HD-2.5*S);
    b(1.8*S,1.2,0.08,M.backboard,0,6.5,HD-2.4*S);
    b(1.4*S,0.06,0.06,M.rim,    0,5.75,HD-2.8*S);
    b(1.3*S,0.5,0.04,M.netMat,  0,5.5, HD-2.8*S);
    b(0.2,6,0.2, M.pole,      0,3,  -1.5*S);
    b(1.8*S,1.2,0.08,M.backboard,0,6.5,-1.4*S);
    b(1.4*S,0.06,0.06,M.rim,    0,5.75,-1.8*S);

    // Banners
    [
      {x:-8*S, mat:M.bannerBlue}, {x:-5*S, mat:M.bannerRed},
      {x:-2*S, mat:M.bannerTeal}, {x: 1*S, mat:M.bannerGray},
      {x: 4*S, mat:M.bannerBlue}, {x: 7*S, mat:M.bannerRed},
    ].forEach(bn=>{
      b(0.1,2.5,0.1,   M.tableLeg, bn.x, 1.25, HD-3.5*S);
      b(0.8*S,2.0,0.05, bn.mat,    bn.x, 1.5,  HD-3.4*S);
      addCollider(bn.x, HD-3.5*S, 0.45*S, 0.15*S);
    });

    // HACKAUBG overhead banner
    b(5*S,   1.2, 0.06, M.bannerBlue,  0, 7.8, 8*S);
    b(4.6*S, 0.8, 0.07, M.whiteboard,  0, 7.8, 7.96*S);

    // ── Hackathon tables ────────────────────────────────────────
    function hackTable(x, z, rot=0) {
      const grp = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.4*S,0.06,0.9*S), M.foldTable);
      top.position.set(0,1.03,0); top.castShadow=true; top.receiveShadow=true;
      grp.add(top);
      [[-1.0*S,-0.35*S],[-1.0*S,0.35*S],[1.0*S,-0.35*S],[1.0*S,0.35*S]].forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.05*S,1.0,0.05*S),M.tableLeg);
        leg.position.set(lx,0.5,lz); grp.add(leg);
      });
      grp.position.set(x,0,z); grp.rotation.y=rot; scene.add(grp);
      addCollider(x,z,1.3*S,0.55*S,true);
    }

    [[-4*S,3*S],[-7*S,3*S],[-1*S,3*S],
     [-4*S,7*S],[-7*S,7*S],
     [2*S,5*S],[5*S,5*S],[7*S,3*S],
     [-5*S,11*S],[-2*S,11*S],[1*S,11*S],
     [4*S,12*S],[6*S,11*S],
     [-6*S,16*S],[-3*S,16*S],[0*S,16*S],
     [4*S,17*S],[7*S,17*S],
    ].forEach(([tx,tz])=>hackTable(tx,tz));
    hackTable(-8*S,10*S,0.3);
    hackTable( 8*S, 8*S,-0.2);

    // ── Laptops ─────────────────────────────────────────────────
    function laptop(x,y,z){
      const base=new THREE.Mesh(new THREE.BoxGeometry(0.38*S,0.025,0.26*S),M.laptop);
      base.position.set(x,y,z); scene.add(base);
      const scr=new THREE.Mesh(new THREE.BoxGeometry(0.36*S,0.22,0.012),M.screen);
      scr.position.set(x,y+0.13,z-0.1*S); scr.rotation.x=-0.35; scene.add(scr);
    }
    [[-4*S,1.06,3*S],[-7*S,1.06,3*S],[-1*S,1.06,3*S],
     [2*S,1.06,5*S],[5*S,1.06,5*S],
     [-5*S,1.06,11*S],[4*S,1.06,12*S],
     [-6*S,1.06,16*S],[0*S,1.06,16*S]
    ].forEach(([x,y,z])=>laptop(x,y,z));

    // ── Chairs ──────────────────────────────────────────────────
    function chair(x,z,rot=0){
      const grp=new THREE.Group();
      const seat=new THREE.Mesh(new THREE.BoxGeometry(0.42*S,0.06,0.42*S),M.chair);
      seat.position.set(0,0.47,0); grp.add(seat);
      const back=new THREE.Mesh(new THREE.BoxGeometry(0.42*S,0.4,0.04),M.chair);
      back.position.set(0,0.7,0.19*S); grp.add(back);
      [[-0.17*S,-0.17*S],[-0.17*S,0.17*S],[0.17*S,-0.17*S],[0.17*S,0.17*S]].forEach(([lx,lz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.04*S,0.44,0.04*S),M.tableLeg);
        leg.position.set(lx,0.22,lz); grp.add(leg);
      });
      grp.position.set(x,0,z); grp.rotation.y=rot; scene.add(grp);
    }
    [[-4*S,4.2*S],[-7*S,4.2*S],[-1*S,4.2*S],[-4*S,1.8*S],[-7*S,1.8*S],
     [2*S,6.2*S],[5*S,6.2*S],[7*S,4.2*S],
     [-5*S,12*S],[4*S,13*S],[-6*S,17*S],[0*S,17*S]
    ].forEach(([cx,cz])=>chair(cx,cz));

    // ── Couches ─────────────────────────────────────────────────
    function couch(x,z){
      const grp=new THREE.Group();
      const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8*S,0.45,0.85*S),M.chairRed);
      seat.position.set(0,0.225,0); grp.add(seat);
      const bk=new THREE.Mesh(new THREE.BoxGeometry(1.8*S,0.65,0.12),M.chairRed);
      bk.position.set(0,0.55,0.37*S); grp.add(bk);
      grp.position.set(x,0,z); scene.add(grp);
      addCollider(x,z,0.95*S,0.5*S);
    }
    couch(9*S,10*S); couch(9*S,11.8*S); couch(9*S,13.6*S);

    // Water bottles
    for(let wi=0;wi<6;wi++){
      b(0.08*S,0.28,0.08*S,M.water,
        8*S+(wi%3)*0.2*S, 0.14,
        10*S+Math.floor(wi/3)*0.3*S);
    }

    // ── Whiteboards ─────────────────────────────────────────────
    function whiteboard(x,z,rot=0){
      const grp=new THREE.Group();
      const face=new THREE.Mesh(new THREE.BoxGeometry(1.4*S,1.0,0.04),M.whiteboard);
      face.position.set(0,1.3,0); grp.add(face);
      const fr=new THREE.Mesh(new THREE.BoxGeometry(1.5*S,1.1,0.06),M.whiteboardFr);
      fr.position.set(0,1.3,-0.01); grp.add(fr);
      const l1=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.1,0.04),M.tableLeg);
      l1.position.set(-0.55*S,0.55,0.35*S); l1.rotation.x=-0.3; grp.add(l1);
      const l2=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.1,0.04),M.tableLeg);
      l2.position.set(0.55*S,0.55,0.35*S); l2.rotation.x=-0.3; grp.add(l2);
      const l3=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.0,0.04),M.tableLeg);
      l3.position.set(0,0.5,-0.3*S); l3.rotation.x=0.25; grp.add(l3);
      grp.position.set(x,0,z); grp.rotation.y=rot; scene.add(grp);
      addCollider(x,z,0.8*S,0.5*S);
    }
    whiteboard(-2*S, 5*S,0.1);
    whiteboard(1.5*S,8*S,-0.2);
    whiteboard(-3*S,13*S,0.15);
    whiteboard( 3*S, 9*S);

    // ── McDonald's ───────────────────────────────────────────────
    b(2.0*S,0.9,0.8*S,M.mcdonaldsRed,7*S,0.45,1.5*S);
    b(0.12*S,0.7,0.12*S,M.mcdonalds, 6.6*S,1.35,1.1*S);
    b(0.12*S,0.7,0.12*S,M.mcdonalds, 7.4*S,1.35,1.1*S);
    b(0.5*S,0.12,0.12,  M.mcdonalds, 6.8*S,1.7, 1.1*S);
    b(0.5*S,0.12,0.12,  M.mcdonalds, 7.2*S,1.7, 1.1*S);
    addCollider(7*S,1.5*S,1.1*S,0.5*S);

    // ── Balloons ────────────────────────────────────────────────
    function balloon(x,y,z,mat){
      const s=new THREE.Mesh(new THREE.SphereGeometry(0.18*S,8,8),mat);
      s.position.set(x,y,z); s.castShadow=true; scene.add(s);
      const str=new THREE.Mesh(new THREE.BoxGeometry(0.01,0.4*S,0.01),M.black);
      str.position.set(x,y-0.38*S,z); scene.add(str);
    }
    [[-9*S,2.8,0,   M.balloon],    [-9*S,2.8,4*S,  M.balloonRed],
     [-9*S,2.8,8*S, M.balloonGreen],[-9*S,2.8,12*S, M.balloon],
     [-9*S,2.8,16*S,M.balloonRed],  [9*S, 2.8,2*S,  M.balloonGreen],
     [9*S, 2.8,6*S, M.balloon],    [9*S, 2.8,10*S, M.balloonRed],
     [9*S, 2.8,16*S,M.balloonGreen],
    ].forEach(([bx,by,bz,bm])=>balloon(bx,by,bz,bm));

    // ── Ping pong table ─────────────────────────────────────────
    b(1.4*S,0.05,2.6*S,M.bannerTeal,8.5*S,0.77,16*S);
    b(0.04*S,0.72,0.04*S,M.tableLeg,8.0*S,0.36,14.8*S);
    b(0.04*S,0.72,0.04*S,M.tableLeg,9.0*S,0.36,14.8*S);
    b(0.04*S,0.72,0.04*S,M.tableLeg,8.0*S,0.36,17.2*S);
    b(0.04*S,0.72,0.04*S,M.tableLeg,9.0*S,0.36,17.2*S);
    b(1.4*S,0.16,0.03,M.netMat,8.5*S,0.88,16*S);
    addCollider(8.5*S,16*S,0.75*S,1.35*S);

    // ── Safe zone visualisers ───────────────────────────────────
    const safeViz = safeZones.map(sz=>{
      const geo=new THREE.CircleGeometry(sz.radius,32);
      const mesh=new THREE.Mesh(geo,M.safe.clone());
      mesh.rotation.x=-Math.PI/2;
      mesh.position.set(sz.center.x,0.015,sz.center.z);
      mesh.visible=false; scene.add(mesh); return mesh;
    });

    const safeZoneMeshes = safeZones.map(sz=>{
      const grp=new THREE.Group();
      const cone=new THREE.Mesh(
        new THREE.ConeGeometry(0.18*S,0.5*S,6),
        new THREE.MeshBasicMaterial({color:0x4ade80})
      );
      cone.rotation.x=Math.PI; cone.position.y=0; grp.add(cone);
      const ring=new THREE.Mesh(
        new THREE.TorusGeometry(0.22*S,0.03*S,6,16),
        new THREE.MeshBasicMaterial({color:0x22ff66})
      );
      ring.position.y=0.3*S; grp.add(ring);
      grp.position.set(sz.center.x,1.75,sz.center.z);
      grp.visible=false; scene.add(grp); return grp;
    });

    // ── Debris pool ─────────────────────────────────────────────
    const debrisMats=[M.plaster,M.concrete,M.debris];
    for(let i=0;i<80;i++){
      const s=0.07+Math.random()*0.25;
      const geo=Math.random()<0.55
        ?new THREE.BoxGeometry(s,s*0.55,s*0.85)
        :new THREE.DodecahedronGeometry(s*0.6,0);
      const mesh=new THREE.Mesh(geo,debrisMats[Math.floor(Math.random()*3)]);
      mesh.castShadow=true; mesh.visible=false;
      mesh._vy=0; mesh._fallen=false;
      scene.add(mesh); debrisPool.push(mesh);
    }

    // ── Controls ────────────────────────────────────────────────
    const euler=new THREE.Euler(0,0,0,"YXZ");
    let isLocked=false;
    const PITCH_MAX=Math.PI/2.2;

    canvas.addEventListener("click",()=>{ if(gameState!==STATE.DONE) canvas.requestPointerLock(); });

    document.addEventListener("pointerlockchange",()=>{
      isLocked=document.pointerLockElement===canvas;
      const hint=document.getElementById("game-hint");
      if(hint) hint.style.display=(isLocked||gameState===STATE.DONE)?"none":"flex";
    });

    document.addEventListener("mousemove",e=>{
      if(!isLocked) return;
      euler.setFromQuaternion(camera.quaternion);
      euler.y-=e.movementX*0.004;
      euler.x-=e.movementY*0.004;
      euler.x=Math.max(-PITCH_MAX,Math.min(PITCH_MAX,euler.x));
      camera.quaternion.setFromEuler(euler);
    });

    const keys={};
    document.addEventListener("keydown",e=>{
      keys[e.code]=true;
      if(e.code==="KeyC"){
        if(isCrouching){
          const p=camera.position;
          const under=safeZones.some(sz=>{
            const dx=p.x-sz.center.x, dz=p.z-sz.center.z;
            return Math.sqrt(dx*dx+dz*dz)<sz.radius;
          });
          if(!under) isCrouching=false;
        } else { isCrouching=true; }
      }
    });
    document.addEventListener("keyup",e=>{ keys[e.code]=false; });

    // ── Movement ─────────────────────────────────────────────────
    const SPEED=12;
    const P_RAD=0.3;
    const fwd=new THREE.Vector3(), rgt=new THREE.Vector3(), mdir=new THREE.Vector3();

    function resolveColliders(px,pz){
      for(const c of colliders){
        if(c.crouchPassable&&isCrouching) continue;
        const nearX=Math.max(c.minX,Math.min(c.maxX,px));
        const nearZ=Math.max(c.minZ,Math.min(c.maxZ,pz));
        const dx=px-nearX, dz=pz-nearZ;
        const dist=Math.sqrt(dx*dx+dz*dz);
        if(dist<P_RAD&&dist>0){
          const push=(P_RAD-dist)/dist; px+=dx*push; pz+=dz*push;
        } else if(dist===0){
          const overX=P_RAD-Math.abs(px-(c.minX+c.maxX)*0.5);
          const overZ=P_RAD-Math.abs(pz-(c.minZ+c.maxZ)*0.5);
          if(overX<overZ) px+=(px<(c.minX+c.maxX)*0.5?-overX:overX);
          else             pz+=(pz<(c.minZ+c.maxZ)*0.5?-overZ:overZ);
        }
      }
      return {px,pz};
    }

    function updateMovement(dt){
      const targetEye=isCrouching?EYE_CROUCH:EYE_STAND;
      currentEyeY+=(targetEye-currentEyeY)*Math.min(1,dt*12);
      const crouchMul=isCrouching?0.5:1.0;
      const spd=(gameState===STATE.QUAKE?SPEED*0.6:SPEED)*crouchMul*dt;

      camera.getWorldDirection(fwd); fwd.y=0; fwd.normalize();
      rgt.crossVectors(fwd,camera.up).normalize();
      mdir.set(0,0,0);
      if(keys["KeyW"]||keys["ArrowUp"])    mdir.add(fwd);
      if(keys["KeyS"]||keys["ArrowDown"])  mdir.sub(fwd);
      if(keys["KeyA"]||keys["ArrowLeft"])  mdir.sub(rgt);
      if(keys["KeyD"]||keys["ArrowRight"]) mdir.add(rgt);

      if(mdir.lengthSq()>0){
        mdir.normalize().multiplyScalar(spd);
        let nx=camera.position.x+mdir.x, nz=camera.position.z;
        const rx=resolveColliders(nx,nz); nx=rx.px; nz=rx.pz;
        nz+=mdir.z;
        const rz=resolveColliders(nx,nz); nx=rz.px; nz=rz.pz;
        camera.position.x=Math.max(-10.5*S,Math.min(10.5*S,nx));
        camera.position.z=Math.max(-1.7*S, Math.min(HD-2.5*S,nz));
      }
      camera.position.y=currentEyeY;
    }

    function checkSafeZone(){
      const p=camera.position;
      return safeZones.some(sz=>{
        const dx=p.x-sz.center.x, dz=p.z-sz.center.z;
        return Math.sqrt(dx*dx+dz*dz)<sz.radius&&isCrouching;
      });
    }

    // ── Debris ──────────────────────────────────────────────────
    function spawnDebris(){
      const chunk=debrisPool.find(d=>!d.visible&&d._fallen===false);
      if(!chunk) return;
      chunk.position.set(
        (Math.random()-0.5)*(HW-2),
        HH-0.2,
        -1*S+Math.random()*(HD-2*S)
      );
      chunk._vy=0; chunk._fallen=false; chunk.visible=true;
      chunk.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6);
      activeDebris.push(chunk);
    }

    function updateDebris(dt){
      for(let i=activeDebris.length-1;i>=0;i--){
        const d=activeDebris[i];
        if(d._fallen) continue;
        d._vy-=9.8*dt; d.position.y+=d._vy*dt;
        d.rotation.x+=1.5*dt; d.rotation.z+=1.0*dt;
        if(!isHiding){
          const dx=d.position.x-camera.position.x;
          const dz=d.position.z-camera.position.z;
          if(Math.sqrt(dx*dx+dz*dz)<0.65&&d.position.y<2.2&&d.position.y>0.5){
            health=Math.max(0,health-14); panic=Math.min(100,panic+10);
            d._fallen=true; d.position.y=0.1;
            flashScreen("rgba(220,30,30,0.4)",350);
          }
        }
        if(d.position.y<=0.1){ d.position.y=0.1; d._fallen=true; }
      }
    }

    function flashScreen(color,duration){
      const wrapper=canvas.parentElement;
      const fl=document.createElement("div");
      fl.style.cssText=`position:absolute;inset:0;background:${color};pointer-events:none;z-index:60;transition:opacity ${duration}ms ease;`;
      wrapper.appendChild(fl);
      requestAnimationFrame(()=>{ fl.style.opacity="0"; });
      setTimeout(()=>fl.remove(),duration+50);
    }

    // ── HUD ──────────────────────────────────────────────────────
    let panicFill,healthFill,timerEl,statusEl,safeEl,outcomeEl;

    function buildHUD(){
      const wrapper=canvas.parentElement;
      if(getComputedStyle(wrapper).position==="static") wrapper.style.position="relative";

      const hint=document.createElement("div");
      hint.id="game-hint";
      hint.innerHTML=`
        <div class="gh-title">🏫 HACKAUBG — EARTHQUAKE SCENARIO</div>
        <div class="gh-sub">Click anywhere to enter</div>
        <div class="gh-keys">
          <span>WASD</span> Move &nbsp;·&nbsp;
          <span>Mouse</span> Look &nbsp;·&nbsp;
          <span>C</span> Crouch &nbsp;·&nbsp;
          <span>Esc</span> Exit
        </div>
        <div class="gh-warn">⚠ You're at HackAUBG. An earthquake will strike in 30 seconds. Find a sturdy table!</div>
      `;
      wrapper.appendChild(hint);

      const cross=document.createElement("div");
      cross.id="game-crosshair";
      cross.innerHTML=`<svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="8" stroke="rgba(255,255,255,.75)" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="22" stroke="rgba(255,255,255,.75)" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="12" x2="8" y2="12" stroke="rgba(255,255,255,.75)" stroke-width="1.5" stroke-linecap="round"/><line x1="16" y1="12" x2="22" y2="12" stroke="rgba(255,255,255,.75)" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="rgba(255,255,255,.6)"/></svg>`;
      cross.style.display="none"; wrapper.appendChild(cross);

      document.addEventListener("pointerlockchange",()=>{
        cross.style.display=document.pointerLockElement===canvas?"block":"none";
      });

      const pw=document.createElement("div");
      pw.id="panic-wrap";
      pw.innerHTML=`<div id="panic-label">PANIC</div><div id="panic-bar"><div id="panic-fill"></div></div>`;
      wrapper.appendChild(pw); panicFill=document.getElementById("panic-fill");

      const hw=document.createElement("div");
      hw.id="health-wrap";
      hw.innerHTML=`<div id="health-label">HEALTH</div><div id="health-bar"><div id="health-fill"></div></div>`;
      wrapper.appendChild(hw); healthFill=document.getElementById("health-fill");

      timerEl=document.createElement("div"); timerEl.id="game-timer"; wrapper.appendChild(timerEl);

      statusEl=document.createElement("div"); statusEl.id="game-status";
      statusEl.textContent="Explore the hackathon hall. Something feels off...";
      wrapper.appendChild(statusEl);

      safeEl=document.createElement("div"); safeEl.id="safe-label";
      safeEl.textContent="✓ SAFE — STAY HERE"; safeEl.style.display="none";
      wrapper.appendChild(safeEl);

      const crouchEl=document.createElement("div"); crouchEl.id="crouch-indicator";
      crouchEl.textContent="▼ CROUCHING"; crouchEl.style.display="none";
      wrapper.appendChild(crouchEl);

      outcomeEl=document.createElement("div"); outcomeEl.id="outcome-screen";
      outcomeEl.style.display="none"; wrapper.appendChild(outcomeEl);
    }

    function updateHUD(){
      if(!panicFill) return;
      const p=panic/100;
      panicFill.style.width=panic+"%";
      panicFill.style.background=`rgb(${Math.round(p*210)},${Math.round((1-p)*170+20)},20)`;
      const h=health/100;
      healthFill.style.width=health+"%";
      healthFill.style.background=`rgb(${Math.round((1-h)*210)},${Math.round(h*170+20)},20)`;
      safeEl.style.display=(gameState===STATE.QUAKE&&isHiding)?"block":"none";
      const crouchEl=document.getElementById("crouch-indicator");
      if(crouchEl) crouchEl.style.display=isCrouching?"block":"none";

      if(gameState===STATE.CALM){
        const rem=Math.ceil(CALM_DURATION-calmTimer);
        timerEl.textContent="";
        statusEl.textContent=rem>15
          ?"Explore the hackathon hall. Something feels off..."
          :"⚠ The floor is trembling... brace yourself.";
        statusEl.style.color=rem>15?"#d1c9bb":"#fbbf24";
      }
      if(gameState===STATE.QUAKE){
        timerEl.textContent=`QUAKE: ${Math.ceil(QUAKE_DURATION-quakeTimer)}s`;
        const pos=camera.position;
        const nearAny=safeZones.some(sz=>
          Math.sqrt(Math.pow(pos.x-sz.center.x,2)+Math.pow(pos.z-sz.center.z,2))<sz.radius
        );
        if(isHiding){
          statusEl.textContent="✓ Stay hidden! Wait for it to pass...";
          statusEl.style.color="#4ade80";
        } else if(nearAny&&!isCrouching){
          statusEl.textContent="⬇ CROUCH [C] to get underneath the table!";
          statusEl.style.color="#fbbf24";
        } else {
          statusEl.textContent="⚠ GET UNDER A TABLE — NOW!";
          statusEl.style.color="#f87171";
        }
      }
    }

    function showOutcome(){
      gameState=STATE.DONE; document.exitPointerLock();
      const hint=document.getElementById("game-hint");
      if(hint) hint.style.display="none";
      let title,body,panicResult,accent;
      if(health<=0){
        title="YOU DIDN'T SURVIVE";
        body="Panic overwhelmed you. Falling debris struck before you found cover.";
        panicResult="Panic: CRITICAL — 100%"; accent="#ef4444";
      } else if(panic>=75){
        title="SURVIVED — HIGH PANIC";
        body="You made it out, but barely. Next time: get under a heavy hackathon table immediately.";
        panicResult=`Panic: HIGH — ${Math.round(panic)}%`; accent="#f97316";
      } else if(panic>=40){
        title="SURVIVED";
        body="Good instincts. You found cover and rode it out.";
        panicResult=`Panic: MODERATE — ${Math.round(panic)}%`; accent="#facc15";
      } else {
        title="SURVIVED — CALM & SAFE";
        body="Excellent. You reacted immediately and sheltered correctly.";
        panicResult=`Panic: LOW — ${Math.round(panic)}%`; accent="#4ade80";
      }
      outcomeEl.style.display="flex";
      outcomeEl.innerHTML=`
        <div class="outcome-box">
          <div class="outcome-badge" style="background:${accent}22;border-color:${accent}55">SCENARIO COMPLETE</div>
          <div class="outcome-title" style="color:${accent}">${title}</div>
          <div class="outcome-body">${body}</div>
          <div class="outcome-stats">
            <div class="outcome-stat" style="color:${accent}">${panicResult}</div>
            <div class="outcome-stat">Health remaining: <strong>${Math.max(0,Math.round(health))}%</strong></div>
          </div>
          <button class="outcome-btn" onclick="location.reload()">↩ Try Again</button>
        </div>
      `;
    }

    buildHUD();

    window.addEventListener("resize",()=>{
      renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
      camera.aspect=canvas.clientWidth/canvas.clientHeight;
      camera.updateProjectionMatrix();
    });

    let lastTime=performance.now();

    function animate(now){
      requestAnimationFrame(animate);
      if(gameState===STATE.DONE){ renderer.render(scene,camera); return; }

      const dt=Math.min((now-lastTime)/1000,0.05);
      lastTime=now;
      const t=now*0.001;

      updateMovement(dt);

      if(gameState===STATE.CALM){
        calmTimer+=dt;
        panic+=(48-panic)*0.5*dt;
        if(calmTimer>CALM_DURATION-8){
          const strength=(calmTimer-(CALM_DURATION-8))/8;
          camera.position.x+=(Math.random()-0.5)*0.004*strength;
          camera.position.z+=(Math.random()-0.5)*0.004*strength;
        }
        if(calmTimer>=CALM_DURATION){
          gameState=STATE.QUAKE;
          safeViz.forEach(v=>v.visible=true);
          safeZoneMeshes.forEach(v=>v.visible=true);
          flashScreen("rgba(255,200,40,0.55)",500);
        }
      }

      if(gameState===STATE.QUAKE){
        quakeTimer+=dt;
        const progress=quakeTimer/QUAKE_DURATION;
        const ramp=Math.min(1,quakeTimer/3);
        const ease=progress>0.8?1-(progress-0.8)/0.2:1;
        shakeIntensity=0.14*ramp*ease;

        cameraBase.copy(camera.position);
        camera.position.x+=(Math.random()-0.5)*shakeIntensity*2.2;
        camera.position.y=currentEyeY+(Math.random()-0.5)*shakeIntensity*0.8;
        camera.position.z+=(Math.random()-0.5)*shakeIntensity*2.2;
        camera.rotation.z=(Math.random()-0.5)*shakeIntensity*0.6;

        isHiding=checkSafeZone();
        if(isHiding){
          panic=Math.max(0,panic-20*dt);
        } else {
          panic=Math.min(100,panic+25*dt);
          health=Math.max(0,health-5*dt);
          if(Math.random()<0.08) flashScreen("rgba(220,30,30,0.15)",100);
        }

        debrisCooldown-=dt;
        if(debrisCooldown<=0){
          const rate=Math.max(0.12,0.5-quakeTimer*0.015);
          debrisCooldown=rate;
          spawnDebris();
          if(quakeTimer>5)  spawnDebris();
          if(quakeTimer>15) spawnDebris();
        }
        updateDebris(dt);

        const flicker1=2.0+Math.sin(t*24)*0.28*ramp+Math.sin(t*57)*0.12*ramp
          -(Math.random()<0.06*ramp?0.7:0);
        const flicker2=1.6+Math.sin(t*20+0.7)*0.22*ramp+Math.sin(t*43+1.2)*0.10*ramp
          -(Math.random()<0.04*ramp?0.6:0);
        ceilLight1.intensity=Math.max(0.4,flicker1);
        ceilLight3.intensity=Math.max(0.35,flicker2);

        safeViz.forEach(v=>{ v.material.opacity=isHiding?0.35:0.18+Math.sin(t*3)*0.08; });
        safeZoneMeshes.forEach(v=>{ v.position.y=1.75+Math.sin(t*2)*0.12; });

        if(health<=0||quakeTimer>=QUAKE_DURATION){ showOutcome(); return; }

        renderer.render(scene,camera);
        camera.position.copy(cameraBase);
        camera.position.y=currentEyeY;
        camera.rotation.z=0;
        updateHUD();
        return;
      }

      updateHUD();
      renderer.render(scene,camera);
    }

    requestAnimationFrame(animate);
  })();