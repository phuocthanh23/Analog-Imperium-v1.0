// sidepanel.js — Analog Imperium v1.0
// Analog Terminal UI fused with Imperium of Man THREE.js 3D sigil

(function () {
  'use strict';

  // ── CONSTANTS ──
  const MAX_LINES = 200;
  const EVENT_DECAY_INTERVAL = 200;

  // ── STATE ──
  let typingBuffer = '';
  let currentSnippet = '';
  let totalEvents = 0;
  let eventIntensity = 0;
  let lines = [];
  let wpmTimestamps = [];
  let logo3d = null; // handle returned by initLogo3D()
  let dna    = null; // handle returned by initDNA()

  // ── PYTHON CODE POOL ──
  const PYTHON_POOL = [
    `def fib(n):\n    a,b=0,1\n    for _ in range(n):a,b=b,a+b\n    return a`,
    `def is_prime(n):\n    return n>1 and all(n%i for i in range(2,int(n**.5)+1))`,
    `palindrome=lambda s:(t:=''.join(c for c in s.lower() if c.isalnum())) == t[::-1]`,
    `def two_sum(nums,t):\n    s={}\n    for i,n in enumerate(nums):\n        if t-n in s:return[s[t-n],i]\n        s[n]=i`,
    `def binary_search(a,t):\n    lo,hi=0,len(a)-1\n    while lo<=hi:\n        m=(lo+hi)//2\n        if a[m]==t:return m\n        lo,hi=(m+1,hi)if a[m]<t else(lo,m-1)\n    return -1`,
    `quicksort=lambda a:[]if not a else quicksort([x for x in a[1:]if x<=a[0]])+[a[0]]+quicksort([x for x in a[1:]if x>a[0]])`,
    `def flatten(l):\n    return[x for i in l for x in(flatten(i)if isinstance(i,list)else[i])]`,
    `from collections import Counter\nword_freq=lambda t:Counter(t.lower().split()).most_common(5)`,
    `def bfs(g,s):\n    seen,q=[s],[s]\n    for v in q:q+=[u for u in g.get(v,[])if u not in seen or seen.append(u)]\n    return seen`,
    `caesar=lambda s,k:''.join(chr((ord(c)-65+k)%26+65)if c.isupper()else chr((ord(c)-97+k)%26+97)if c.islower()else c for c in s)`,
    `from itertools import groupby\nrle=lambda s:''.join(f'{c}{len(list(g))}'for c,g in groupby(s))`,
    `transpose=lambda m:[list(r)for r in zip(*m)]`,
    `def memoize(fn):\n    c={}\n    return lambda *a:c.setdefault(a,fn(*a))`,
    `import json\nsafe_load=lambda p:json.load(open(p))if __import__('os').path.exists(p)else{}`,
    `fizzbuzz=lambda n:[print('FizzBuzz'if i%15==0 else'Fizz'if i%3==0 else'Buzz'if i%5==0 else i)for i in range(1,n+1)]`,
    `def unique(lst):\n    seen=set()\n    return[x for x in lst if not(x in seen or seen.add(x))]`,
    `chunk=lambda l,n:[l[i:i+n]for i in range(0,len(l),n)]`,
    `def deep_get(d,*keys,default=None):\n    for k in keys:d=d.get(k,{})if isinstance(d,dict)else default\n    return d or default`,
    `import re\nemails=lambda t:re.findall(r'[\\w.+-]+@[\\w-]+\\.[\\w.]+',t)`,
    `def clamp(v,lo,hi):return max(lo,min(hi,v))`,
    `debounce=lambda fn,t:(__import__('threading').Timer(t,fn)).start`,
    `def rotate(matrix):\n    n=len(matrix)\n    for i in range(n):\n        for j in range(i+1,n):matrix[i][j],matrix[j][i]=matrix[j][i],matrix[i][j]\n    for row in matrix:row.reverse()`,
  ];

  function randomPython() {
    return PYTHON_POOL[Math.floor(Math.random() * PYTHON_POOL.length)];
  }

  // ── EVENT CONFIG ──
  const EVENT_CFG = {
    CLICK:   { pre: '[CLK]', cls: 'bright' },
    DBLCLICK:{ pre: '[DBL]', cls: 'bright' },
    RCLICK:  { pre: '[RCL]', cls: '' },
    KEY:     { pre: '[KEY]', cls: 'bright' },
    TYP:     { pre: '[TYP]', cls: '' },
    PY:      { pre: '[PY] ', cls: 'bright' },
    SELECT:  { pre: '[SEL]', cls: '' },
    DRAG:    { pre: '[DRG]', cls: 'bright' },
    DRAGEND: { pre: '[DRE]', cls: 'dim' },
    DROP:    { pre: '[DRP]', cls: 'bright' },
    SCROLL:  { pre: '[SCR]', cls: 'dim' },
    WHEEL:   { pre: '[WHL]', cls: 'dim' },
    FOCUS:   { pre: '[FOC]', cls: '' },
    BLUR:    { pre: '[BLR]', cls: 'dim' },
    COPY:    { pre: '[CPY]', cls: 'bright' },
    PASTE:   { pre: '[PST]', cls: 'bright' },
    CUT:     { pre: '[CUT]', cls: 'bright' },
    SUBMIT:  { pre: '[SUB]', cls: 'bright' },
  };

  // ── DOM REFS ──
  const terminalLines  = document.querySelector('.cp-terminal-lines');
  const inputTextEl    = document.querySelector('.cp-input-text');
  const statusBarFill  = document.querySelector('.cp-status-bar-fill');
  const eventCounter   = document.querySelector('.cp-event-counter');
  const dnaContainer   = document.getElementById('dna-container');
  const globeCanvas    = document.querySelector('.cp-globe-canvas');
  const globeTimeEl    = document.querySelector('.cp-globe-time');
  const globeCoordsEl  = document.querySelector('.cp-globe-coords');
  const globeCountryEl = document.querySelector('.cp-globe-country');

  // ── PORT (auto-reconnects when service worker terminates) ──
  function connectPort() {
    const port = chrome.runtime.connect({ name: 'sidepanel' });

    port.onMessage.addListener(function (msg) {
      if (msg.type === 'keystroke') {
        handleKeystroke(msg.key);
      } else if (msg.type === 'pageEvent') {
        handlePageEvent(msg.eventType, msg.detail);
      }
    });

    port.onDisconnect.addListener(function () {
      setTimeout(connectPort, 100);
    });
  }

  connectPort();

  // ── UPDATE CURRENT INPUT DISPLAY ──
  function updateCurrentInput() {
    if (inputTextEl) inputTextEl.textContent = currentSnippet;
  }

  // ── HANDLE KEYSTROKE ──
  function handleKeystroke(key) {
    if (key === 'Backspace') {
      typingBuffer = typingBuffer.slice(0, -1);
      currentSnippet = typingBuffer.length > 0 ? randomPython() : '';
    } else {
      wpmTimestamps.push(Date.now());
      typingBuffer += key;
      currentSnippet = randomPython();
      bumpIntensity();
    }
    updateCurrentInput();
  }

  // ── HANDLE PAGE EVENT ──
  function handlePageEvent(eventType, detail) {
    if (eventType === 'KEY' && detail === 'Enter') {
      if (typingBuffer.length > 0) {
        addEventLine('PY', currentSnippet);
        typingBuffer = '';
        currentSnippet = '';
        updateCurrentInput();
        bumpIntensity();
      }
    }
  }

  // ── ADD EVENT LINE ──
  function addEventLine(eventType, detail) {
    totalEvents++;
    if (eventCounter) eventCounter.textContent = totalEvents;

    const cfg = EVENT_CFG[eventType] || { pre: '[' + eventType.slice(0, 3).toUpperCase() + ']', cls: '' };
    const text = cfg.pre + ' ' + detail;

    lines.push({ text: text, cls: cfg.cls, etype: eventType });
    if (lines.length > MAX_LINES) lines.shift();

    renderLines();
  }

  // ── RENDER LINES ──
  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderLines() {
    if (!terminalLines) return;
    const html = lines.map(function (l) {
      const clsCls = l.cls ? ' cp-line--' + l.cls : '';
      return '<div class="cp-line' + clsCls + '" data-etype="' + escHtml(l.etype) + '">' +
        escHtml(l.text) +
        '</div>';
    }).join('');
    terminalLines.innerHTML = html;
    terminalLines.scrollTop = terminalLines.scrollHeight;
  }

  // ── BUMP INTENSITY ──
  function bumpIntensity() {
    eventIntensity = Math.min(eventIntensity + 1, 10);
  }

  // ── INTENSITY DECAY ──
  // Drives 3D logo rotation speed and DNA animation speed
  setInterval(function () {
    if (eventIntensity > 0) {
      eventIntensity = Math.max(0, eventIntensity - 0.3);
    }
    if (statusBarFill) {
      statusBarFill.style.width = ((eventIntensity / 10) * 100) + '%';
    }
    if (logo3d) {
      logo3d.setSpeed(0.6 + eventIntensity * 0.15);
    }
    if (dna) {
      dna.setSpeed(0.6 + eventIntensity * 0.15);
    }
  }, EVENT_DECAY_INTERVAL);

  // ── SIGNUM 3D — Imperium logo with THREE.js ──
  // Returns { setSpeed(s) } so intensity decay can drive rotation speed.
  // Speed arg maps Analog Terminal's 0.6–2.1 range → rotation rate.
  // glbPath: relative path to the GLB file (defaults to 'logo.glb')
  function initLogo3D(glbPath) {
    glbPath = glbPath || 'logo.glb';
    const container = document.getElementById('logo-container');
    if (!container) return { setSpeed: function () {} };

    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
      return { setSpeed: function () {} };
    }

    const W = container.clientWidth  || 120;
    const H = container.clientHeight || 100;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x021b15, 1); // matches .cp-module background
    container.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(0, 0, 7);

    // Green lighting matching Imperium aesthetic
    scene.add(new THREE.AmbientLight(0x00ff66, 0.3));
    const pl1 = new THREE.PointLight(0x00ff66, 1, 20);
    pl1.position.set(2, 2, 3);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x00ff44, 1, 20);
    pl2.position.set(-2, -1, 2);
    scene.add(pl2);

    // Rotation speed driven by typing intensity
    // At idle (speed=0.6): ~0.007 rad/frame  |  At peak (speed=2.1): ~0.022 rad/frame
    let rotSpeed = 0.007;

    const loader = new THREE.GLTFLoader();
    loader.load(
      chrome.runtime.getURL(glbPath),
      function (gltf) {
        const root = gltf.scene;

        // Centre and fit model to 3 units
        const box    = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const scale  = 5.04 / Math.max(size.x, size.y, size.z);
        root.position.sub(center.multiplyScalar(scale));
        root.scale.setScalar(scale);

        // Collect meshes before traversal-with-mutation
        const meshes = [];
        root.traverse(function (child) { if (child.isMesh) meshes.push(child); });

        meshes.forEach(function (child) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x003311,
            emissive: 0x00aa44,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
          });

          // Inner glow layer
          const glow1 = new THREE.Mesh(
            child.geometry,
            new THREE.MeshBasicMaterial({
              color: 0x00ff44, transparent: true, opacity: 0.02,
              side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
            })
          );
          glow1.scale.setScalar(1.01);
          child.add(glow1);

          // Outer glow layer
          const glow2 = new THREE.Mesh(
            child.geometry,
            new THREE.MeshBasicMaterial({
              color: 0x00ff44, transparent: true, opacity: 0.04,
              side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
            })
          );
          glow2.scale.setScalar(1.02);
          child.add(glow2);
        });

        scene.add(root);

        // Dismiss preloading screen, then reveal modules top-to-bottom
        const loadEl = document.getElementById('ai-loading');
        if (loadEl) {
          loadEl.classList.add('hidden');
          revealModulesSequentially();
        }

        // Animation loop — Y-axis rotation + emissive breathing pulse
        let pulse = 0;
        function animate() {
          requestAnimationFrame(animate);
          pulse += 0.02;
          root.rotation.y += rotSpeed;
          root.traverse(function (child) {
            if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = 0.3 + Math.sin(pulse) * 0.15;
            }
          });
          renderer.render(scene, camera);
        }
        animate();
      },
      undefined,
      function (err) {
        console.error('GLB load error:', err);
        const loadEl = document.getElementById('ai-loading');
        if (loadEl) {
          loadEl.innerHTML = '<span style="color:#ff4444;font-size:10px;padding:12px;text-align:center;">GLB LOAD ERROR</span>';
          loadEl.style.opacity = '1';
          loadEl.style.pointerEvents = 'none';
        }
      }
    );

    // Keep renderer sized to the module container
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w && h) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }).observe(container);
    }

    return {
      // speed: 0.6 (idle) … 2.1 (max). Map linearly to rotation rate.
      setSpeed: function (s) {
        rotSpeed = 0.003 + s * 0.006;
      },
    };
  }

  // ── GENE-SEED 3D DNA ──
  function initDNA() {
    if (!dnaContainer) return { setSpeed: function () {} };
    if (typeof THREE === 'undefined') return { setSpeed: function () {} };

    const W = dnaContainer.clientWidth  || 120;
    const H = dnaContainer.clientHeight || 100;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x021b15, 1);
    dnaContainer.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(0, 0, 9);

    // Dynamically fit the helix inside the canvas regardless of size/aspect ratio.
    // Uses literal helix dimensions (HELIX_H=5.5, HELIX_R=1.1) so this is safe
    // to call before those consts are declared further below.
    function fitDNA(w, h) {
      if (!w || !h) return;
      const aspect = w / h;
      const camZ   = camera.position.z;
      const halfH  = (5.5 / 2) * 1.22;  // HELIX_H / 2 + 22% padding
      const halfW  = 1.1 * 1.65;         // HELIX_R + 65% padding (rotation sweep)
      const fovV   = 2 * Math.atan(halfH / camZ) * (180 / Math.PI);
      const fovH   = 2 * Math.atan(halfW / (camZ * aspect)) * (180 / Math.PI);
      camera.fov   = Math.max(fovV, fovH);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    fitDNA(W, H);

    scene.add(new THREE.AmbientLight(0x00ff66, 0.35));
    const pl1 = new THREE.PointLight(0xffd580, 1, 50);
    pl1.position.set(3, 4, 5);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x00cc33, 1, 25);
    pl2.position.set(-3, -2, 3);
    scene.add(pl2);

    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);

    const STEPS       = 48;
    const TURNS       = 2.5;
    const HELIX_R     = 1.1;
    const HELIX_H     = 5.5;

    const matA = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff66, emissiveIntensity: 1,transparent: true, opacity: 0.4  });
    const matB = new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00ff66, emissiveIntensity: 1, transparent: true, opacity: 0.75  });
    const matC = new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x003311, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 });
    const sphereGeo = new THREE.SphereGeometry(0.13, 10, 10);

    // Build strands + base-pair connectors
    const posA = [], posB = [];
    for (let i = 0; i <= STEPS; i++) {
      const t     = i / STEPS;
      const angle = t * Math.PI * 2 * TURNS;
      const y     = (t - 0.5) * HELIX_H;
      posA.push(new THREE.Vector3(Math.cos(angle) * HELIX_R, y, Math.sin(angle) * HELIX_R));
      posB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * HELIX_R, y, Math.sin(angle + Math.PI) * HELIX_R));
    }

    // Strand spheres
    posA.forEach(function (p) { const m = new THREE.Mesh(sphereGeo, matA); m.position.copy(p); dnaGroup.add(m); });
    posB.forEach(function (p) { const m = new THREE.Mesh(sphereGeo, matB); m.position.copy(p); dnaGroup.add(m); });

    // Backbone tubes (cylinder between consecutive spheres on each strand)
    function addBackbone(pts, mat) {
      for (let i = 0; i < pts.length - 1; i++) {
        const dir = pts[i + 1].clone().sub(pts[i]);
        const len = dir.length();
        const mid = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5);
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 6), mat);
        cyl.position.copy(mid);
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        dnaGroup.add(cyl);
      }
    }
    addBackbone(posA, matA);
    addBackbone(posB, matB);

    // Base-pair connectors every 4 steps
    for (let i = 0; i <= STEPS; i += 4) {
      const a = posA[i], b = posB[i];
      const dir = b.clone().sub(a);
      const len = dir.length();
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), matC);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      dnaGroup.add(cyl);
    }

    let rotSpeed = 0.008;
    let pulse    = 0;

    function animate() {
      requestAnimationFrame(animate);
      pulse += 0.02;
      dnaGroup.rotation.y += rotSpeed;
      const ei = 0.4 + Math.sin(pulse) * 0.15;
      matA.emissiveIntensity = ei;
      matB.emissiveIntensity = ei * 0.75;
      renderer.render(scene, camera);
    }
    animate();

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        fitDNA(dnaContainer.clientWidth, dnaContainer.clientHeight);
      }).observe(dnaContainer);
    }

    return { setSpeed: function (s) { rotSpeed = 0.003 + s * 0.006; } };
  }

  // ── HOLOGRAM PLANET SYSTEM (6 worlds, selectable) ──
  function initGlobe() {
    if (!globeCanvas) return;

    // ── Planet palette definitions ──
    // r=primary, s/sm/sd=sphere gradient stops, land/line=continent, grid/scan=grid+sweep,
    // rim0/rim1/rimLine=edge glow, ring0/ring1=equatorial rings, polar/polLine=ice caps
    var PLANETS = [
      { name:'TERRA',      terrain:'earth',    moon:false,
        r:[200,120,55],  s:[65,32,12],  sm:[38,18,7],   sd:[14,7,3],
        ocean:[28,18,8],    land:[115,55,22],  line:[200,120,55],
        polar:[205,175,140],polLine:[218,190,158],
        grid:[190,110,48],  scan:[210,130,65],
        rim0:[170,90,35],   rim1:[200,120,55], rimLine:[215,132,65],
        ring0:[190,108,48], ring1:[165,88,32] },

      { name:'CADIA',      terrain:'earth',    moon:false,
        r:[65,165,225],  s:[12,45,85],  sm:[7,28,55],   sd:[3,12,28],
        ocean:[10,45,95],   land:[38,105,45],  line:[75,195,120],
        polar:[218,235,250],polLine:[230,243,255],
        grid:[52,155,215],  scan:[68,178,238],
        rim0:[42,132,198],  rim1:[65,165,225], rimLine:[82,188,245],
        ring0:[55,155,215], ring1:[40,132,198] },

      { name:'FENRIS',     terrain:'craters',  moon:true,  moonRgb:[180,195,215],
        r:[95,135,168],  s:[22,32,48],  sm:[13,20,30],  sd:[5,8,13],
        ocean:[15,22,35],   land:[55,75,95],   line:[105,148,178],
        polar:[198,215,232],polLine:[212,228,242],
        grid:[85,122,152],  scan:[100,142,175],
        rim0:[65,100,130],  rim1:[95,135,168], rimLine:[112,152,185],
        ring0:[85,125,158], ring1:[65,100,130] },

      { name:'CATACHAN',   terrain:'alien',    moon:false,
        r:[28,175,42],   s:[5,42,10],   sm:[3,26,6],    sd:[1,11,3],
        ocean:[4,32,12],    land:[18,105,28],  line:[38,205,58],
        polar:[175,228,188],polLine:[195,240,208],
        grid:[22,162,38],   scan:[32,188,52],
        rim0:[14,140,28],   rim1:[28,175,42],  rimLine:[38,198,56],
        ring0:[22,158,36],  ring1:[14,135,26] },

      { name:'CALTH',      terrain:'earth',    moon:false,
        r:[195,95,128],  s:[48,18,28],  sm:[28,10,16],  sd:[11,4,7],
        ocean:[33,13,20],   land:[125,52,76],  line:[205,110,142],
        polar:[228,192,208],polLine:[238,208,222],
        grid:[185,88,118],  scan:[200,105,135],
        rim0:[162,68,98],   rim1:[195,95,128], rimLine:[210,110,142],
        ring0:[185,88,118], ring1:[160,68,98] },

      { name:'NECROMUNDA', terrain:'volcanic', moon:false,
        r:[218,185,75],  s:[52,42,10],  sm:[32,26,6],   sd:[13,10,3],
        ocean:[35,28,8],    land:[128,105,28], line:[218,185,75],
        polar:[238,222,168],polLine:[245,232,182],
        grid:[205,172,62],  scan:[222,192,82],
        rim0:[182,152,48],  rim1:[218,185,75], rimLine:[228,198,85],
        ring0:[208,172,62], ring1:[185,150,48] },
    ];

    // Earth continent outlines
    var EARTH = [
      [[72,-100],[70,-80],[60,-65],[47,-53],[25,-78],[18,-87],[20,-105],[32,-117],[48,-124],[60,-137],[72,-140],[72,-100]],
      [[12,-72],[5,-52],[0,-50],[-5,-35],[-15,-39],[-23,-44],[-33,-70],[-55,-68],[-55,-72],[-17,-75],[5,-77],[12,-72]],
      [[70,28],[60,30],[50,30],[42,28],[43,18],[44,8],[43,3],[44,-2],[48,-5],[58,-5],[60,5],[70,20],[70,28]],
      [[37,10],[30,32],[22,38],[12,44],[0,42],[-10,40],[-35,26],[-35,18],[-25,14],[0,-17],[15,-17],[25,-15],[37,10]],
      [[70,140],[70,100],[60,60],[45,38],[30,55],[25,58],[12,44],[8,78],[1,104],[10,110],[20,122],[35,140],[70,140]],
      [[-15,130],[-14,136],[-16,142],[-28,154],[-38,148],[-38,140],[-32,116],[-22,114],[-15,130]],
      [[84,-40],[84,-18],[72,-18],[65,-38],[65,-54],[72,-54],[84,-40]],
      [[45,141],[38,141],[31,130],[33,130],[40,135],[45,141]],
    ];

    // Alien continent outlines (Verdania)
    var ALIEN = [
      [[50,-160],[62,-140],[65,-110],[50,-80],[30,-70],[10,-90],[0,-130],[-20,-150],[-35,-135],[-20,-110],[-5,-85],[22,-70],[45,-90],[50,-160]],
      [[55,70],[65,100],[60,140],[44,160],[22,170],[4,150],[-16,130],[-36,115],[-46,90],[-24,65],[10,55],[38,60],[55,70]],
      [[-5,-40],[6,-15],[20,0],[26,-20],[15,-46],[-5,-40]],
      [[68,150],[73,-175],[76,-140],[68,120],[68,150]],
      [[-55,-65],[-50,-35],[-60,-10],[-70,-40],[-65,-70],[-55,-65]],
      [[20,10],[32,30],[26,55],[10,60],[0,45],[-5,20],[10,5],[20,10]],
    ];

    // Crater positions [lat, lon, size] for Violum
    var CRATERS = [
      [20,30,0.9],[45,-50,0.7],[60,120,0.6],[10,-110,0.85],[-30,60,0.9],
      [0,180,0.5],[-50,-30,0.75],[70,-70,0.8],[35,90,0.6],[-20,-140,0.9],
      [55,-10,0.5],[-42,100,0.8],[15,150,0.7],[-62,50,0.6],[30,-80,0.55],
      [-10,25,0.65],[40,-130,0.8],[-25,170,0.5],[5,-65,0.9],[50,45,0.7],
    ];

    // Settlement hotspots per planet: [lat, lon, relativeSize 0-1]
    // Drawn as pulsing glow blobs on the globe surface
    var SETTLEMENTS = [
      // 0 TERRA — Segmentum Solar: Europe, E.Asia, N.America, S.Asia, Russia, S.America, Africa
      [[51, 10,0.90],[35,108,1.00],[40,-95,0.80],[22,78,0.85],[55,37,0.65],[-8,-52,0.50],[5,22,0.45]],
      // 1 CADIA — Cadian Gate fortresses: pylons and defence lines across Cadia Secundus
      [[53,22,1.00],[47,15,0.90],[55,30,0.85],[48,8,0.80],[40,25,0.70],[60,18,0.65],[35,12,0.60]],
      // 2 FENRIS — Space Wolves: The Fang + scattered holds across Asaheim and the Sea of Russ
      [[65,-20,0.85],[70,80,0.75],[-60,45,0.70],[50,160,0.65],[75,-100,0.80],[30,-60,0.55]],
      // 3 CATACHAN — Jungle outposts: scattered survival camps across the death world
      [[-8,125,0.75],[5,-35,0.85],[-15,68,0.70],[18,-110,0.65],[-25,-75,0.80],[10,40,0.60]],
      // 4 CALTH — Ultramar cities: civilised world before the Word Bearers assault
      [[30,22,0.85],[10,-18,0.90],[-5,55,0.80],[40,-35,0.75],[22,78,0.85],[-20,30,0.70]],
      // 5 NECROMUNDA — Hive cities: Hive Primus, Hive Secundus, Hive Orlock, Temenos, Arcos
      [[35,28,1.00],[28,35,0.95],[42,22,0.90],[25,42,0.85],[38,15,0.80],[45,30,0.75],[20,50,0.70]],
    ];

    var rot = 0;
    var moonAngle = 0;
    var uLat = 0, uLon = 0, hasLoc = false;
    var scanY = -1.15;
    var currentPlanet = 0;

    // ── Drag-to-rotate state ──
    var isDragging  = false;
    var dragStartX  = 0;
    var dragLastX   = 0;
    var dragVelocity = 0;  // momentum after release

    globeCanvas.addEventListener('mousedown', function (e) {
      isDragging  = true;
      dragStartX  = e.clientX;
      dragLastX   = e.clientX;
      dragVelocity = 0;
      globeCanvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragLastX;
      // Scale drag pixels → radians; canvas width maps to ~2π
      var sensitivity = (2 * Math.PI) / (globeCanvas.offsetWidth || 200);
      rot += dx * sensitivity;
      dragVelocity = dx * sensitivity;
      dragLastX = e.clientX;
    });

    window.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      globeCanvas.style.cursor = 'grab';
    });

    // Touch support
    globeCanvas.addEventListener('touchstart', function (e) {
      isDragging  = true;
      dragLastX   = e.touches[0].clientX;
      dragVelocity = 0;
    }, { passive: true });

    globeCanvas.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      var dx = e.touches[0].clientX - dragLastX;
      var sensitivity = (2 * Math.PI) / (globeCanvas.offsetWidth || 200);
      rot += dx * sensitivity;
      dragVelocity = dx * sensitivity;
      dragLastX = e.touches[0].clientX;
    }, { passive: true });

    globeCanvas.addEventListener('touchend', function () {
      isDragging = false;
    });

    globeCanvas.style.cursor = 'grab';

    function resize() {
      globeCanvas.width  = globeCanvas.offsetWidth;
      globeCanvas.height = globeCanvas.offsetHeight;
    }
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(resize).observe(globeCanvas);
    }

    // 3-D projection with Y-axis rotation
    function proj(lat, lon) {
      const la = lat * Math.PI / 180;
      const lo = lon * Math.PI / 180;
      const x  =  Math.cos(la) * Math.sin(lo);
      const y  = -Math.sin(la);
      const z  =  Math.cos(la) * Math.cos(lo);
      return {
        x:  x * Math.cos(rot) + z * Math.sin(rot),
        y,
        z: -x * Math.sin(rot) + z * Math.cos(rot),
      };
    }

    // ── Planet button event listeners ──
    function applyPlanetLabel(pl) {
      var labelEl = document.getElementById('cp-planet-label');
      if (!labelEl) return;
      labelEl.textContent      = pl.name;
      labelEl.style.color      = '';
      labelEl.style.textShadow = '';
    }
    applyPlanetLabel(PLANETS[0]); // init label

    document.querySelectorAll('.cp-planet-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.cp-planet-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPlanet = parseInt(btn.dataset.planet, 10);
        applyPlanetLabel(PLANETS[currentPlanet]);
      });
    });

    // Draw a continent polygon (parameterized colors)
    function drawContinent(ctx, cx, cy, r, pts, landRgb, lineRgb) {
      var pp = pts.map(function(p) {
        var q = proj(p[0], p[1]);
        return { x: q.x, y: q.y, z: q.z, sx: cx + q.x * r, sy: cy + q.y * r };
      });
      ctx.beginPath();
      pp.forEach(function(p, i) {
        if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + landRgb[0] + ',' + landRgb[1] + ',' + landRgb[2] + ',0.75)';
      ctx.fill();
      for (var i = 0; i < pp.length - 1; i++) {
        var a = pp[i], b = pp[i + 1];
        if (a.z > 0 && b.z > 0) {
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.strokeStyle = 'rgba(' + lineRgb[0] + ',' + lineRgb[1] + ',' + lineRgb[2] + ',0.75)';
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }

    // Draw grid segments with rgb color
    function gridSegs(ctx, cx, cy, r, pts, baseAlpha, rgb) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        if (a.z < 0 && b.z < 0) continue;
        var depth = (a.z + b.z) / 2;
        var alpha = depth > 0 ? baseAlpha : baseAlpha * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + a.x * r, cy + a.y * r);
        ctx.lineTo(cx + b.x * r, cy + b.y * r);
        ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // ── Terrain renderers ──
    function drawTerrain(ctx, cx, cy, r, pl) {
      var t = pl.terrain;
      if (t === 'earth') {
        EARTH.forEach(function(pts) { drawContinent(ctx, cx, cy, r, pts, pl.land, pl.line); });
      } else if (t === 'alien') {
        ALIEN.forEach(function(pts) { drawContinent(ctx, cx, cy, r, pts, pl.land, pl.line); });
      } else if (t === 'banded') {
        // Horizontal colour bands (gas-giant style)
        var bands = [-80,-60,-40,-20,0,20,40,60,80];
        for (var bi = 0; bi < bands.length - 1; bi++) {
          var lat0 = bands[bi], lat1 = bands[bi + 1];
          var bpts0 = [], bpts1 = [];
          for (var lo = 0; lo <= 360; lo += 4) {
            bpts0.push(proj(lat0, lo));
            bpts1.push(proj(lat1, lo));
          }
          ctx.beginPath();
          bpts0.forEach(function(p, i) {
            if (i === 0) ctx.moveTo(cx + p.x * r, cy + p.y * r);
            else ctx.lineTo(cx + p.x * r, cy + p.y * r);
          });
          for (var k = bpts1.length - 1; k >= 0; k--) {
            ctx.lineTo(cx + bpts1[k].x * r, cy + bpts1[k].y * r);
          }
          ctx.closePath();
          var bAlpha = (bi % 2 === 0) ? 0.60 : 0.30;
          ctx.fillStyle = 'rgba(' + pl.land[0] + ',' + pl.land[1] + ',' + pl.land[2] + ',' + bAlpha + ')';
          ctx.fill();
        }
        // Band edge lines
        bands.forEach(function(lat) {
          var lpts = [];
          for (var lo = 0; lo <= 360; lo += 3) lpts.push(proj(lat, lo));
          gridSegs(ctx, cx, cy, r, lpts, 0.35, pl.line);
        });
      } else if (t === 'craters') {
        CRATERS.forEach(function(c) {
          var cp = proj(c[0], c[1]);
          if (cp.z < -0.1) return;
          var cr = r * 0.055 * c[2];
          var px = cx + cp.x * r, py = cy + cp.y * r;
          var depthA = Math.max(0.1, cp.z);
          // Outer ring
          ctx.beginPath();
          ctx.arc(px, py, cr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(' + pl.line[0] + ',' + pl.line[1] + ',' + pl.line[2] + ',' + (depthA * 0.55) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Inner fill
          ctx.beginPath();
          ctx.arc(px, py, cr * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + pl.land[0] + ',' + pl.land[1] + ',' + pl.land[2] + ',' + (depthA * 0.4) + ')';
          ctx.fill();
          // Center dot
          ctx.beginPath();
          ctx.arc(px, py, cr * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + pl.line[0] + ',' + pl.line[1] + ',' + pl.line[2] + ',' + (depthA * 0.7) + ')';
          ctx.fill();
        });
      } else if (t === 'volcanic') {
        // Lava-crack network: pre-computed static paths [startLat, startLon, [dlat,dlon steps...], lineWidth]
        var VCRACKS = [
          [20,30,   [[-12,22],[6,-8],[14,18],[-10,10],[8,-14]], 1.0],
          [20,30,   [[14,-18],[-6,10],[-12,-20],[10,-8],[-8,16]], 0.8],
          [45,-60,  [[-16,24],[8,-12],[18,20],[-12,14],[10,-18]], 0.9],
          [45,-60,  [[18,-20],[-8,12],[-14,-22],[12,-10],[-10,18]], 1.1],
          [-30,120, [[-14,20],[6,-10],[12,16],[-8,8],[6,-12]], 0.9],
          [-30,120, [[10,-22],[-4,8],[-10,-18],[8,-6],[-6,14]], 0.7],
          [60,-10,  [[-10,18],[4,-8],[8,12],[-6,6],[4,-10]], 0.8],
          [60,-10,  [[8,-16],[-4,6],[-8,-14],[6,-4],[-4,10]], 1.0],
          [-50,80,  [[-12,22],[6,-8],[14,18],[-10,10],[8,-14]], 0.9],
          [5,180,   [[14,-18],[-6,10],[-12,-20],[10,-8],[-8,16]], 0.8],
          [-15,-90, [[-16,24],[8,-12],[18,20],[-12,14],[10,-18]], 1.1],
          [35,50,   [[18,-20],[-8,12],[-14,-22],[12,-10],[-10,18]], 0.9],
          [20,30,   [[-6,-20],[4,12],[10,-16],[-8,8],[6,-10]], 0.7],
          [45,-60,  [[8,18],[-4,-10],[-8,14],[6,-6],[-4,8]], 0.8],
          [-30,120, [[16,-24],[-8,12],[14,22],[-10,-14],[8,18]], 1.0],
          [60,-10,  [[-8,16],[4,-6],[8,12],[-6,4],[-4,-10]], 0.7],
        ];
        var hotspots = [[20,30],[45,-60],[-30,120],[60,-10],[-50,80],[5,180],[-15,-90],[35,50]];
        VCRACKS.forEach(function(vc) {
          var lat = vc[0], lon = vc[1];
          var steps = vc[2];
          var lw = vc[3];
          var sp = proj(lat, lon);
          ctx.beginPath();
          ctx.moveTo(cx + sp.x * r, cy + sp.y * r);
          steps.forEach(function(dl) {
            lat += dl[0]; lon += dl[1];
            var np = proj(lat, lon);
            if (np.z > -0.2) ctx.lineTo(cx + np.x * r, cy + np.y * r);
          });
          var depth0 = sp.z;
          var crackalpha = Math.max(0, depth0) * 0.55 + 0.1;
          ctx.strokeStyle = 'rgba(' + pl.line[0] + ',' + pl.line[1] + ',' + pl.line[2] + ',' + crackalpha + ')';
          ctx.lineWidth = lw;
          ctx.stroke();
        });
        // Glow dots at hotspot centers
        hotspots.forEach(function(hs) {
          var hp = proj(hs[0], hs[1]);
          if (hp.z < 0) return;
          var hx = cx + hp.x * r, hy = cy + hp.y * r;
          var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.08);
          hg.addColorStop(0, 'rgba(' + pl.line[0] + ',' + pl.line[1] + ',' + pl.line[2] + ',0.45)');
          hg.addColorStop(1, 'rgba(' + pl.land[0] + ',' + pl.land[1] + ',' + pl.land[2] + ',0)');
          ctx.beginPath();
          ctx.arc(hx, hy, r * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = hg;
          ctx.fill();
        });
      } else if (t === 'crystal') {
        // Geometric hexagonal mesh
        var hexCentres = [
          [30,60],[30,-60],[30,180],[-30,0],[-30,120],[-30,-120],
          [60,0],[60,90],[60,-90],[-60,30],[-60,-30],[-60,150],
          [0,45],[0,-45],[0,135],[0,-135],[0,0]
        ];
        hexCentres.forEach(function(hc) {
          var sides = 6;
          var scale = 0.13;
          ctx.beginPath();
          var started = false;
          for (var si = 0; si <= sides; si++) {
            var angle = (si / sides) * Math.PI * 2;
            var hlat = hc[0] + Math.cos(angle) * 14;
            var hlon = hc[1] + Math.sin(angle) * 22;
            var hp = proj(hlat, hlon);
            if (!started) { ctx.moveTo(cx + hp.x * r, cy + hp.y * r); started = true; }
            else ctx.lineTo(cx + hp.x * r, cy + hp.y * r);
          }
          ctx.closePath();
          var cp2 = proj(hc[0], hc[1]);
          var calpha = Math.max(0, cp2.z);
          ctx.fillStyle = 'rgba(' + pl.land[0] + ',' + pl.land[1] + ',' + pl.land[2] + ',' + (calpha * 0.25) + ')';
          ctx.fill();
          ctx.strokeStyle = 'rgba(' + pl.line[0] + ',' + pl.line[1] + ',' + pl.line[2] + ',' + (calpha * 0.55) + ')';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        });
      }
    }

    // ── Moon renderer ──
    function drawMoon(ctx, cx, cy, r, pl, behind) {
      var orbitRx = r * 1.55;
      var orbitRy = r * 0.38;
      var mx = cx + Math.cos(moonAngle) * orbitRx;
      var my = cy + Math.sin(moonAngle) * orbitRy;
      var mDepth = Math.sin(moonAngle); // >0 = front, <0 = behind
      var isBehind = mDepth < 0;
      if (isBehind !== behind) return;

      var mr = r * 0.16;
      var mRgb = pl.moonRgb || [200, 200, 220];

      // Atmosphere
      var mAtmo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 1.5);
      mAtmo.addColorStop(0, 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',0.0)');
      mAtmo.addColorStop(0.5, 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',0.12)');
      mAtmo.addColorStop(1, 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',0)');
      ctx.beginPath();
      ctx.arc(mx, my, mr * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = mAtmo;
      ctx.fill();

      // Moon body
      var mSphere = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.05, mx, my, mr);
      var dimFactor = isBehind ? 0.4 : 1.0;
      mSphere.addColorStop(0, 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',' + (0.85 * dimFactor) + ')');
      mSphere.addColorStop(0.6, 'rgba(' + Math.floor(mRgb[0] * 0.5) + ',' + Math.floor(mRgb[1] * 0.5) + ',' + Math.floor(mRgb[2] * 0.5) + ',' + (0.9 * dimFactor) + ')');
      mSphere.addColorStop(1, 'rgba(' + Math.floor(mRgb[0] * 0.2) + ',' + Math.floor(mRgb[1] * 0.2) + ',' + Math.floor(mRgb[2] * 0.2) + ',' + (0.95 * dimFactor) + ')');
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fillStyle = mSphere;
      ctx.fill();

      // Moon rim
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',' + (0.45 * dimFactor) + ')';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Small craters on moon
      [[0.3, 0.2, 0.22], [-0.3, -0.15, 0.18], [0.1, -0.35, 0.14]].forEach(function(mc) {
        var mcx = mx + mc[0] * mr, mcy = my + mc[1] * mr, mcr = mc[2] * mr;
        ctx.beginPath();
        ctx.arc(mcx, mcy, mcr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + mRgb[0] + ',' + mRgb[1] + ',' + mRgb[2] + ',' + (0.25 * dimFactor) + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    }

    // Draw pulsing settlement glows for the active planet
    // Must be called inside ctx.save()/clip() so dots stay within the sphere
    function drawPopulation(ctx, cx, cy, r, pl, now) {
      var pts = SETTLEMENTS[currentPlanet];
      pts.forEach(function(s) {
        var p = proj(s[0], s[1]);
        if (p.z < 0.02) return; // skip back-facing points
        var px = cx + p.x * r, py = cy + p.y * r;
        var depth = p.z;
        var size  = s[2];
        // Unique slow pulse per settlement (different phase per lat/lon)
        var pulse = 0.70 + 0.30 * Math.sin(now * 0.0009 + s[0] * 0.15 + s[1] * 0.07);

        // Soft outer glow
        var glowR = r * 0.092 * size;
        var glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        glow.addColorStop(0,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',' + (depth * 0.42 * pulse) + ')');
        glow.addColorStop(0.35,'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',' + (depth * 0.16 * pulse) + ')');
        glow.addColorStop(1,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0)');
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Bright core dot
        var dotR = r * 0.016 * size * pulse;
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',' + (depth * 0.92) + ')';
        ctx.shadowColor = 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.85)';
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    function drawGlobe() {
      var ctx = globeCanvas.getContext('2d');
      var W = globeCanvas.width, H = globeCanvas.height;
      if (!W || !H) { requestAnimationFrame(drawGlobe); return; }

      var pl = PLANETS[currentPlanet];
      var cx = W / 2, cy = H / 2;
      var r  = Math.min(W, H) * 0.40;
      var now = Date.now();

      ctx.clearRect(0, 0, W, H);

      // ── Projector beam below globe ──
      var projSrcX = cx;
      var projSrcY = H - 4;
      var beamW    = r * 0.18;
      var beamTopW = r * 1.05;
      var beamTop  = cy + r * 1.02;
      // Cone fill
      ctx.beginPath();
      ctx.moveTo(projSrcX - beamW / 2, projSrcY);
      ctx.lineTo(projSrcX + beamW / 2, projSrcY);
      ctx.lineTo(cx + beamTopW / 2, beamTop);
      ctx.lineTo(cx - beamTopW / 2, beamTop);
      ctx.closePath();
      var beamGrad = ctx.createLinearGradient(cx, projSrcY, cx, beamTop);
      beamGrad.addColorStop(0,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.22)');
      beamGrad.addColorStop(0.6, 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.06)');
      beamGrad.addColorStop(1,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.0)');
      ctx.fillStyle = beamGrad;
      ctx.fill();
      // Cone edge lines
      ctx.beginPath();
      ctx.moveTo(projSrcX, projSrcY);
      ctx.lineTo(cx - beamTopW / 2, beamTop);
      ctx.moveTo(projSrcX, projSrcY);
      ctx.lineTo(cx + beamTopW / 2, beamTop);
      ctx.strokeStyle = 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.28)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Projector source lens glow
      var lensGlow = ctx.createRadialGradient(projSrcX, projSrcY, 0, projSrcX, projSrcY, 10);
      lensGlow.addColorStop(0,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.9)');
      lensGlow.addColorStop(0.4, 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.35)');
      lensGlow.addColorStop(1,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0)');
      ctx.beginPath();
      ctx.arc(projSrcX, projSrcY, 10, 0, Math.PI * 2);
      ctx.fillStyle = lensGlow;
      ctx.fill();
      // Lens rings
      [3, 6].forEach(function(lr) {
        ctx.beginPath();
        ctx.arc(projSrcX, projSrcY, lr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.6)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // ── Moon (behind pass) ──
      if (pl.moon) drawMoon(ctx, cx, cy, r, pl, true);

      // ── Atmosphere halo ──
      var atmo = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 1.45);
      atmo.addColorStop(0,   'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.0)');
      atmo.addColorStop(0.35,'rgba(' + pl.r[0] + ',' + pl.r[1] + ',' + pl.r[2] + ',0.45)');
      atmo.addColorStop(1,   'rgba(' + pl.sd[0] + ',' + pl.sd[1] + ',' + pl.sd[2] + ',0.0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = atmo;
      ctx.fill();

      // ── Sphere base fill ──
      var sphere = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
      sphere.addColorStop(0,   'rgba(' + pl.s[0]  + ',' + pl.s[1]  + ',' + pl.s[2]  + ',0.95)');
      sphere.addColorStop(0.6, 'rgba(' + pl.sm[0] + ',' + pl.sm[1] + ',' + pl.sm[2] + ',0.97)');
      sphere.addColorStop(1,   'rgba(' + pl.sd[0] + ',' + pl.sd[1] + ',' + pl.sd[2] + ',0.99)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphere;
      ctx.fill();

      // ── Sphere clip (everything inside sphere) ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Ocean tint
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + pl.ocean[0] + ',' + pl.ocean[1] + ',' + pl.ocean[2] + ',0.65)';
      ctx.fill();

      // Terrain
      drawTerrain(ctx, cx, cy, r, pl);

      // Polar ice caps (earth + alien terrain only)
      if (pl.terrain === 'earth' || pl.terrain === 'alien' || pl.terrain === 'banded') {
        ['N', 'S'].forEach(function(pole) {
          var capLat = pole === 'N' ? 72 : -72;
          ctx.beginPath();
          var started = false;
          for (var lo = 0; lo <= 362; lo += 4) {
            var p = proj(capLat, lo);
            if (!started) { ctx.moveTo(cx + p.x * r, cy + p.y * r); started = true; }
            else ctx.lineTo(cx + p.x * r, cy + p.y * r);
          }
          ctx.closePath();
          ctx.fillStyle   = 'rgba(' + pl.polar[0] + ',' + pl.polar[1] + ',' + pl.polar[2] + ',0.55)';
          ctx.strokeStyle = 'rgba(' + pl.polLine[0] + ',' + pl.polLine[1] + ',' + pl.polLine[2] + ',0.80)';
          ctx.lineWidth = 0.6;
          ctx.fill();
          ctx.stroke();
        });
      }

      // Lat/lon grid
      for (var lat = -60; lat <= 60; lat += 30) {
        var gpts = [];
        for (var lo = 0; lo <= 360; lo += 4) gpts.push(proj(lat, lo));
        gridSegs(ctx, cx, cy, r, gpts, 0.35, pl.grid);
      }
      var eqPts = [];
      for (var elo = 0; elo <= 360; elo += 3) eqPts.push(proj(0, elo));
      gridSegs(ctx, cx, cy, r, eqPts, 0.65, pl.grid);
      for (var mlon = 0; mlon < 360; mlon += 30) {
        var mPts = [];
        for (var mla = -90; mla <= 90; mla += 4) mPts.push(proj(mla, mlon));
        gridSegs(ctx, cx, cy, r, mPts, 0.28, pl.grid);
      }

      // ── Settlement population glows ──
      drawPopulation(ctx, cx, cy, r, pl, now);

      // CRT scanlines inside sphere
      for (var sy2 = -r; sy2 < r; sy2 += 3) {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy + sy2);
        ctx.lineTo(cx + r, cy + sy2);
        ctx.strokeStyle = 'rgba(0,0,0,0.09)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Scan-pulse sweep
      scanY += 0.008;
      if (scanY > 1.15) scanY = -1.15;
      var pulseY = cy + scanY * r;
      var pulse  = ctx.createLinearGradient(0, pulseY - 6, 0, pulseY + 6);
      pulse.addColorStop(0,   'rgba(' + pl.scan[0] + ',' + pl.scan[1] + ',' + pl.scan[2] + ',0)');
      pulse.addColorStop(0.5, 'rgba(' + pl.scan[0] + ',' + pl.scan[1] + ',' + pl.scan[2] + ',0.40)');
      pulse.addColorStop(1,   'rgba(' + pl.scan[0] + ',' + pl.scan[1] + ',' + pl.scan[2] + ',0)');
      ctx.fillStyle = pulse;
      ctx.fillRect(cx - r, pulseY - 6, r * 2, 12);

      // Hologram flicker
      ctx.globalAlpha = 0.88 + Math.sin(now * 0.0031) * 0.07 + (Math.random() < 0.04 ? -0.06 : 0);

      ctx.restore(); // end sphere clip
      ctx.globalAlpha = 1;

      // ── Rim glow ──
      var rim = ctx.createRadialGradient(cx, cy, r * 0.90, cx, cy, r * 1.03);
      rim.addColorStop(0, 'rgba(' + pl.rim0[0] + ',' + pl.rim0[1] + ',' + pl.rim0[2] + ',0.0)');
      rim.addColorStop(1, 'rgba(' + pl.rim1[0] + ',' + pl.rim1[1] + ',' + pl.rim1[2] + ',0.75)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.03, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + pl.rimLine[0] + ',' + pl.rimLine[1] + ',' + pl.rimLine[2] + ',0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── Equatorial rings ──
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.10, r * 0.10, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + pl.ring0[0] + ',' + pl.ring0[1] + ',' + pl.ring0[2] + ',0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.17, r * 0.07, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + pl.ring1[0] + ',' + pl.ring1[1] + ',' + pl.ring1[2] + ',0.10)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── Moon (front pass) ──
      if (pl.moon) drawMoon(ctx, cx, cy, r, pl, false);

      // ── User location pin (only on TERRA) ──
      if (hasLoc && currentPlanet === 0) {
        var lp = proj(uLat, uLon);
        if (lp.z > 0.05) {
          var lx = cx + lp.x * r, ly = cy + lp.y * r;
          var lpulse = 1 + 0.45 * Math.sin(now / 380);
          ctx.beginPath();
          ctx.arc(lx, ly, 5 * lpulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,220,0,0.5)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(lx, ly, 2, 0, Math.PI * 2);
          ctx.fillStyle   = '#ffd200';
          ctx.shadowColor = '#ffd200';
          ctx.shadowBlur  = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      if (isDragging) {
        // No auto-rotation while user is dragging
      } else if (Math.abs(dragVelocity) > 0.0001) {
        // Momentum: apply remaining velocity then decay
        rot += dragVelocity;
        dragVelocity *= 0.92;
      } else {
        // Normal auto-rotation
        rot += 0.005;
      }
      moonAngle += 0.012;
      requestAnimationFrame(drawGlobe);
    }

    requestAnimationFrame(drawGlobe);

    function tick() {
      if (globeTimeEl) globeTimeEl.textContent = new Date().toLocaleTimeString();
    }
    tick();
    setInterval(tick, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        uLat = pos.coords.latitude;
        uLon = pos.coords.longitude;
        hasLoc = true;

        var latStr = Math.abs(uLat).toFixed(2) + '\u00b0' + (uLat >= 0 ? 'N' : 'S');
        var lonStr = Math.abs(uLon).toFixed(2) + '\u00b0' + (uLon >= 0 ? 'E' : 'W');
        if (globeCoordsEl) globeCoordsEl.textContent = latStr + ' ' + lonStr;

        fetch('https://nominatim.openstreetmap.org/reverse?lat=' + uLat + '&lon=' + uLon + '&format=json')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var country = (d.address && d.address.country) || '---';
            if (globeCountryEl) globeCountryEl.textContent = country.toUpperCase();
          })
          .catch(function () {
            if (globeCountryEl) globeCountryEl.textContent = '---';
          });
      }, function () {
        if (globeCoordsEl) globeCoordsEl.textContent = 'ACCESS DENIED';
        if (globeCountryEl) globeCountryEl.textContent = '';
      });
    } else {
      if (globeCoordsEl) globeCoordsEl.textContent = 'UNAVAILABLE';
    }
  }

  // ── BOOT SEQUENCE ──
  function boot() {
    const bootLines = [
      { t: 'ANALOG IMPERIUM v1.0 // SECTOR-9',   etype: 'KEY' },
      { t: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', etype: 'BLUR' },
      { t: 'BOOT: kernel        [OK]', etype: 'KEY' },
      { t: 'BOOT: net.stack     [OK]', etype: 'KEY' },
      { t: 'BOOT: cipher.mod    [OK]', etype: 'KEY' },
      { t: 'BOOT: side_panel    [OK]', etype: 'KEY' },
      { t: 'BOOT: event.tap     [OK]', etype: 'KEY' },
      { t: 'BOOT: signum.3d     [OK]', etype: 'KEY' },
      { t: 'BOOT: ' + new Date().toISOString(), etype: 'SELECT' },
      { t: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', etype: 'BLUR' },
      { t: 'FOR THE EMPEROR // awaiting events...', etype: 'FOCUS' },
    ];

    let i = 0;

    const SIGNUM_MODELS = {
      'imperium': { glb: 'logo.glb',                            label: 'AVE·IMPERATOR' },
      'bolter':   { glb: '3d_objects/40k_bolter.glb',           label: 'BOLT·GUN·PRIME' },
      'templars': { glb: '3d_objects/black_templars_cross.glb',  label: 'DEUS·VULT' },
    };

    function showNext() {
      if (i >= bootLines.length) {
        // Boot complete — read chosen signum model then start 3D logo, DNA helix, and globe
        chrome.storage.sync.get('signumModel', function (data) {
          const modelKey = data.signumModel || 'imperium';
          const model    = SIGNUM_MODELS[modelKey] || SIGNUM_MODELS['imperium'];
          // Update the label beneath the Signum module
          const labelEl  = document.getElementById('cp-signum-label');
          if (labelEl) labelEl.textContent = model.label;
          logo3d = initLogo3D(model.glb);
          dna    = initDNA();
          initGlobe();
        });
        return;
      }
      const entry = bootLines[i];
      i++;

      const cfg = EVENT_CFG[entry.etype] || { pre: '', cls: '' };
      lines.push({ text: entry.t, cls: cfg.cls, etype: entry.etype });
      if (lines.length > MAX_LINES) lines.shift();
      renderLines();

      setTimeout(showNext, 100);
    }

    showNext();
  }

  // ── OPEN CODEX BUTTON ──
  const incognitoBtn = document.getElementById('cp-incognito-btn');

  if (incognitoBtn) {
    incognitoBtn.addEventListener('click', function () {
      chrome.storage.sync.get('codexUrl', function (data) {
        const raw  = (data.codexUrl || '').trim();
        const opts = {};
        if (raw) {
          opts.url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
        }
        chrome.tabs.create(opts);
      });
    });
  }

  // ── GENE-SEED SPEED TEST (ISP-aware, Ookla protocol) ──
  const dlSpeedEl   = document.getElementById('cp-dl-speed');
  const ulSpeedEl   = document.getElementById('cp-ul-speed');
  const speedNodeEl = document.getElementById('cp-speed-node');
  const geneTestBtn = document.getElementById('cp-genequality-btn');
  let   speedTesting = false;

  // Haversine distance between two lat/lon points (km)
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Measure round-trip latency to a speedtest server base URL (ms)
  async function pingServer(baseUrl) {
    const url = baseUrl + '/latency.txt?x=' + Date.now();
    const t0 = performance.now();
    try {
      await fetch(url, { cache: 'no-store' });
      return performance.now() - t0;
    } catch (e) {
      return Infinity;
    }
  }

  async function runGeneTest() {
    if (speedTesting) return;
    speedTesting = true;
    if (geneTestBtn)  { geneTestBtn.disabled = true; geneTestBtn.textContent = 'SCANNING ISP...'; }
    if (dlSpeedEl)    dlSpeedEl.textContent = '--';
    if (ulSpeedEl)    ulSpeedEl.textContent = '--';
    if (speedNodeEl)  speedNodeEl.textContent = '';

    try {
      // ── 1. Detect ISP + user coordinates ──
      const ipInfo = await fetch('http://ip-api.com/json?fields=isp,org,lat,lon', { cache: 'no-store' })
        .then(r => r.json()).catch(() => null);

      const userIsp = ipInfo ? (ipInfo.isp || ipInfo.org || '') : '';
      const userLat = ipInfo ? parseFloat(ipInfo.lat) : 0;
      const userLon = ipInfo ? parseFloat(ipInfo.lon) : 0;
      const ispKey  = userIsp.toLowerCase().split(' ')[0]; // e.g. "viettel"

      if (speedNodeEl) speedNodeEl.textContent = (userIsp.toUpperCase().substring(0, 18)) || 'LOCATING...';
      if (geneTestBtn) geneTestBtn.textContent = 'LOCATING SERVER...';

      // ── 2. Fetch nearby servers from Ookla ──
      const servers = await fetch(
        'https://www.speedtest.net/api/js/servers?engine=js&limit=10',
        { cache: 'no-store' }
      ).then(r => r.json()).catch(() => []);

      if (!Array.isArray(servers) || servers.length === 0) throw new Error('No servers returned');

      // ── 3. Sort by distance from user ──
      const ranked = servers
        .map(s => ({ ...s, _km: haversine(userLat, userLon, parseFloat(s.lat), parseFloat(s.lon)) }))
        .sort((a, b) => a._km - b._km);

      // ── 4. Among top 5, prefer ISP-matching server ──
      const top5     = ranked.slice(0, 5);
      const ispMatch = ispKey ? top5.find(s => s.sponsor && s.sponsor.toLowerCase().includes(ispKey)) : null;

      // ── 5. Ping top candidates, pick lowest latency ──
      if (geneTestBtn) geneTestBtn.textContent = 'PINGING NODES...';
      const pool = ispMatch
        ? [ispMatch, ...top5.filter(s => s !== ispMatch).slice(0, 2)]
        : top5.slice(0, 3);

      const results = await Promise.all(pool.map(async s => {
        const base = s.url.replace('/upload.php', '');
        return { s, ms: await pingServer(base) };
      }));
      results.sort((a, b) => a.ms - b.ms);
      const best = results[0].s;

      // Show server label (★ if ISP-matched)
      const tag = (ispMatch && best === ispMatch ? '\u2605 ' : '');
      const label = tag + (best.sponsor || best.name || 'UNKNOWN').toUpperCase().substring(0, 18);
      if (speedNodeEl) speedNodeEl.textContent = label;

      // ── 6. Build test URLs (use server's native protocol) ──
      const baseUrl = best.url.replace('/upload.php', '');
      const dlUrl   = baseUrl + '/random4000x4000.jpg?x=' + Date.now() + '.0';
      const ulUrl   = best.url;

      // ── 7. Download test — stream and update live ──
      if (geneTestBtn) geneTestBtn.textContent = 'GENE-SCREENING...';
      const dlStart = performance.now();
      const dlResp  = await fetch(dlUrl, { cache: 'no-store' });
      const reader  = dlResp.body.getReader();
      let dlTotal   = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        dlTotal += value.length;
        const t = (performance.now() - dlStart) / 1000;
        if (t > 0.3 && dlSpeedEl) dlSpeedEl.textContent = ((dlTotal * 8) / t / 1e6).toFixed(1);
      }
      const dlFinal = (dlTotal * 8) / ((performance.now() - dlStart) / 1000) / 1e6;
      if (dlSpeedEl) dlSpeedEl.textContent = dlFinal.toFixed(1);

      // ── 8. Upload test — POST 3 MB ──
      if (geneTestBtn) geneTestBtn.textContent = 'GENE-TITHE UPLINK...';
      const ulData  = new Uint8Array(3000000);
      const ulStart = performance.now();
      await fetch(ulUrl, { method: 'POST', body: ulData, cache: 'no-store' });
      const ulFinal = (ulData.length * 8) / ((performance.now() - ulStart) / 1000) / 1e6;
      if (ulSpeedEl) ulSpeedEl.textContent = ulFinal.toFixed(1);

    } catch (err) {
      if (dlSpeedEl)   dlSpeedEl.textContent  = 'ERR';
      if (ulSpeedEl)   ulSpeedEl.textContent  = 'ERR';
      if (speedNodeEl) speedNodeEl.textContent = 'SIGNAL LOST';
    }

    speedTesting = false;
    if (geneTestBtn) { geneTestBtn.disabled = false; geneTestBtn.textContent = 'ANALYZE'; }
  }

  if (geneTestBtn) geneTestBtn.addEventListener('click', runGeneTest);

  // ── MODULE SEQUENTIAL REVEAL ──
  // Called once the preloader fades. Modules reveal top-to-bottom, each
  // showing an "initializing..." overlay for 500 ms before content appears.
  function revealModulesSequentially() {
    var schedule = [
      { ids: ['mod-globe'],            delay: 0    },
      { ids: ['mod-dna', 'mod-logo'],  delay: 600  },
      { ids: ['mod-terminal'],         delay: 1200 },
    ];
    schedule.forEach(function (entry) {
      setTimeout(function () {
        entry.ids.forEach(function (id) {
          var mod     = document.getElementById(id);
          var overlay = mod && mod.querySelector('.mod-init-overlay');
          if (!overlay) return;
          setTimeout(function () {
            overlay.classList.add('fading');
            setTimeout(function () { overlay.remove(); }, 400);
          }, 500);
        });
      }, entry.delay);
    });
  }

  // Guard against double-boot
  let booted = false;
  function safeBoot() {
    if (booted) return;
    booted = true;
    boot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeBoot);
  } else {
    safeBoot();
  }

})();
