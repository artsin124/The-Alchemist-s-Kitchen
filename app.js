/* ==========================================================================
   THE ALCHEMIST'S KITCHEN - INTERACTIVE LOGIC & WebGL ENGINE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  
  // Register GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // Initialize Elements
  const webglCanvas = document.getElementById("webgl-canvas");
  const smokeCanvas = document.getElementById("smoke-canvas");
  
  // UI Interactions Elements
  const menuToggle = document.getElementById("menu-toggle");
  const closeJournal = document.getElementById("close-journal");
  const journalSidebar = document.getElementById("journal-sidebar");
  const journalLinks = document.querySelectorAll(".journal-link");

  const cartToggle = document.getElementById("cart-toggle");
  const closeLedger = document.getElementById("close-ledger");
  const cartLedger = document.getElementById("cart-ledger");

  const audioToggle = document.getElementById("audio-toggle");
  const ambientAudio = document.getElementById("ambient-audio");

  const checkoutBtn = document.getElementById("transmute-btn");
  const checkoutModal = document.getElementById("checkout-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  
  const customCursor = document.querySelector(".custom-cursor");
  const tastingTag = document.getElementById("tasting-tag");

  // ==========================================================================
  // 1. VOLUMETRIC SMOKE ENGINE (2D Particle Simulation)
  // ==========================================================================
  
  const smokeCtx = smokeCanvas.getContext("2d");
  let smokeParticles = [];
  const particleCount = 20;

  function resizeSmokeCanvas() {
    smokeCanvas.width = window.innerWidth;
    smokeCanvas.height = window.innerHeight;
  }
  
  window.addEventListener("resize", resizeSmokeCanvas);
  resizeSmokeCanvas();

  class SmokeParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * smokeCanvas.height; // Start at random heights initially
    }

    reset() {
      this.x = Math.random() * smokeCanvas.width;
      this.y = smokeCanvas.height + Math.random() * 100;
      this.size = Math.random() * 150 + 150;
      this.speedY = -(Math.random() * 0.4 + 0.2);
      this.speedX = Math.random() * 0.3 - 0.15;
      this.opacity = Math.random() * 0.15 + 0.05;
      this.maxOpacity = this.opacity;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      
      // Fade out near the top
      if (this.y < 200) {
        this.opacity -= 0.001;
      }
      
      if (this.y < -this.size || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      const gradient = smokeCtx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size
      );
      // Faint warm candle-smoke color scheme
      gradient.addColorStop(0, `rgba(237, 184, 121, ${this.opacity})`);
      gradient.addColorStop(0.3, `rgba(42, 30, 24, ${this.opacity * 0.4})`);
      gradient.addColorStop(1, 'rgba(13, 13, 12, 0)');

      smokeCtx.beginPath();
      smokeCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      smokeCtx.fillStyle = gradient;
      smokeCtx.fill();
    }
  }

  // Populate particles
  for (let i = 0; i < particleCount; i++) {
    smokeParticles.push(new SmokeParticle());
  }

  function animateSmoke() {
    smokeCtx.clearRect(0, 0, smokeCanvas.width, smokeCanvas.height);
    smokeParticles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateSmoke);
  }
  animateSmoke();


  // ==========================================================================
  // 2. THREE.JS 3D WebGL ENGINE (Cinematic Cacao Scene)
  // ==========================================================================
  
  let scene, camera, renderer;
  let chocolateBarGroup;
  let wrapperGroup, leftFlapPivot, rightFlapPivot, topFlapPivot, bottomFlapPivot;
  let waxSealLeft, waxSealRight;
  let chocolateBlocks = [];
  let raycaster, mouse;
  let hoveredShard = null;
  let originalMaterials = new Map();

  // Tasting notes dataset corresponding to specific shards
  const tastingNotes = [
    { num: "01", title: "Volcanic Obsidian", notes: "Rich 82% Criollo dark cacao harvested from volcanic soils, boasting earthy molasses undertones." },
    { num: "02", title: "Salted Ambergris", notes: "Slightly musk-scented ocean ambergris gathered on cold sands, adding marine depth and high-contrast salinity." },
    { num: "03", title: "Lunar Orris Root", notes: "Aged Florentine iris root dust, infusing a dry violet perfume and archival leather complexity." },
    { num: "04", title: "Saffron Filaments", notes: "Crushed crimson threads of Iranian saffron, lending a honeyed, metallic warmth that glows on the finish." },
    { num: "05", title: "Solstice Lavender", notes: "Serene French lavender buds harvested at peak midnight solstice, cleansing the palate with crisp floral herbalism." },
    { num: "06", title: "Violet Sugar", notes: "Wild crystalized violet petals providing sweet crunch anomalies that contrast dark mineral dense cacao." },
    { num: "07", title: "Smoked Amber", notes: "Fossilized amber resin smoked over cedarwood chips, imparting a dark campfire aroma." },
    { num: "08", title: "Chamber Oak", notes: "Notes of barrel-aged oak tannin and dry, atmospheric library dust, grounding the synthesis." }
  ];

  function initThree() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0d0c, 0.12);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: webglCanvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Lights setup
    const ambientLight = new THREE.AmbientLight(0x191410, 0.45);
    scene.add(ambientLight);

    // Dynamic warm flame light (spots the center chocolate bar)
    const flameLight = new THREE.SpotLight(0xffaa44, 4.5, 12, Math.PI / 4, 0.6, 1.5);
    flameLight.position.set(-2, 2.5, 3.5);
    flameLight.castShadow = true;
    flameLight.shadow.mapSize.width = 1024;
    flameLight.shadow.mapSize.height = 1024;
    flameLight.shadow.bias = -0.002;
    scene.add(flameLight);

    // Rim lighting (Alchemist Gold highlight)
    const goldRimLight = new THREE.DirectionalLight(0xd4af37, 1.8);
    goldRimLight.position.set(4, -2, -1.5);
    scene.add(goldRimLight);

    // Soft candlelight fill light
    const fillLight = new THREE.PointLight(0xff7722, 1.2, 8);
    fillLight.position.set(2, 1, 2);
    scene.add(fillLight);

    // Add raycaster setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Group hierarchies
    chocolateBarGroup = new THREE.Group();
    wrapperGroup = new THREE.Group();
    scene.add(chocolateBarGroup);
    scene.add(wrapperGroup);

    // Build the objects
    createChocolateBar();
    createParchmentWrapper();
    createWaxSeal();

    // Resize listener
    window.addEventListener("resize", onWindowResize);
    
    // Mouse interaction event listener (shards hover)
    window.addEventListener("mousemove", onMouseMove);

    // Initialize the GSAP timeline triggers
    setupScrollAnimations();
    
    // Start main render loop
    animateScene();
  }

  // ==========================================================================
  // 3. GEOMETRY MODELLING (Procedural chocolate & wrappers)
  // ==========================================================================
  
  // Custom texture fallbacks (generating a beautiful high-contrast parchment procedural canvas inside JS if file isn't loaded!)
  function generateFallbackParchmentTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Base parchment tone
    ctx.fillStyle = "#1e1a17";
    ctx.fillRect(0, 0, 512, 512);

    // Add noise & cloud textures
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 1;
      ctx.fillStyle = `rgba(10, 8, 7, ${Math.random() * 0.12})`;
      ctx.fillRect(x, y, size, size);
    }

    // Add crackled gold foil veins
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
    ctx.shadowBlur = 4;

    for (let j = 0; j < 18; j++) {
      ctx.beginPath();
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.moveTo(cx, cy);
      
      for (let k = 0; k < 8; k++) {
        cx += (Math.random() * 80 - 40);
        cy += (Math.random() * 80 - 40);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // 3.1 Create Chocolate Bar
  function createChocolateBar() {
    // Chocolate Physical Material (semi-gloss rich cacao)
    const chocMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1c0f0a,
      roughness: 0.45,
      metalness: 0.08,
      clearcoat: 0.28,
      clearcoatRoughness: 0.2,
      roughnessMap: null, // Procedural noise map could be added
      flatShading: false
    });

    // Create block grid (3 columns x 5 rows)
    const cols = 3;
    const rows = 5;
    const blockWidth = 0.52;
    const blockHeight = 0.52;
    const blockDepth = 0.15;
    const gap = 0.02;

    const totalWidth = cols * blockWidth + (cols - 1) * gap;
    const totalHeight = rows * blockHeight + (rows - 1) * gap;

    const startX = -totalWidth / 2 + blockWidth / 2;
    const startY = -totalHeight / 2 + blockHeight / 2;

    let index = 0;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Individual block group to merge main box and top bevel
        const blockGroup = new THREE.Group();
        blockGroup.position.set(
          startX + c * (blockWidth + gap),
          startY + r * (blockHeight + gap),
          0
        );

        // Core base slab
        const baseGeo = new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth);
        const baseMesh = new THREE.Mesh(baseGeo, chocMaterial);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        blockGroup.add(baseMesh);

        // Chamfered top bevel
        const topGeo = new THREE.BoxGeometry(blockWidth * 0.8, blockHeight * 0.8, 0.06);
        const topMesh = new THREE.Mesh(topGeo, chocMaterial);
        topMesh.position.z = blockDepth / 2 + 0.02;
        topMesh.castShadow = true;
        blockGroup.add(topMesh);

        // Add identification indices for Raycasting hover details
        blockGroup.userData = {
          isShard: true,
          initialX: blockGroup.position.x,
          initialY: blockGroup.position.y,
          initialZ: blockGroup.position.z,
          tastingIndex: index % tastingNotes.length,
          scatterDir: new THREE.Vector3(
            (c - 1) * 1.6 + (Math.random() * 0.8 - 0.4),
            (r - 2) * 1.5 + (Math.random() * 0.8 - 0.4),
            Math.random() * 2.5 + 2.5 // Fly towards screen (Z coordinate parallax)
          ),
          rotSpeed: new THREE.Vector3(
            Math.random() * 4 - 2,
            Math.random() * 4 - 2,
            Math.random() * 4 - 2
          )
        };

        chocolateBarGroup.add(blockGroup);
        chocolateBlocks.push(blockGroup);
        index++;
      }
    }
  }

  // 3.2 Create Parchment wrapper flaps
  function createParchmentWrapper() {
    const textureLoader = new THREE.TextureLoader();
    let parchmentTex;

    try {
      parchmentTex = textureLoader.load('assets/parchment.png', (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
      }, undefined, () => {
        parchmentTex = generateFallbackParchmentTexture();
      });
    } catch (e) {
      parchmentTex = generateFallbackParchmentTexture();
    }

    // High end textured physical material for wrapper outer face
    const wrapperOuterMat = new THREE.MeshPhysicalMaterial({
      map: parchmentTex,
      roughness: 0.65,
      metalness: 0.4,
      clearcoat: 0.1,
      bumpMap: parchmentTex,
      bumpScale: 0.05,
      side: THREE.FrontSide
    });

    // Luxury alchemist bronze/gold inner face material
    const wrapperInnerMat = new THREE.MeshPhysicalMaterial({
      color: 0x33251a,
      roughness: 0.4,
      metalness: 0.8,
      side: THREE.BackSide,
      clearcoat: 0.15
    });

    // Helper function to create a double-sided flap group (Outer + Inner plates to ensure separate material definitions)
    function createFlap(w, h) {
      const flap = new THREE.Group();
      const planeGeo = new THREE.PlaneGeometry(w, h);
      
      const outerMesh = new THREE.Mesh(planeGeo, wrapperOuterMat);
      outerMesh.castShadow = true;
      outerMesh.receiveShadow = true;
      
      const innerMesh = new THREE.Mesh(planeGeo, wrapperInnerMat);
      innerMesh.rotation.y = Math.PI; // Flipped back mesh
      innerMesh.castShadow = true;
      innerMesh.receiveShadow = true;

      flap.add(outerMesh);
      flap.add(innerMesh);
      return flap;
    }

    const wWidth = 1.75;
    const wHeight = 2.85;
    const thickness = 0.08; // Sits safely behind the chocolate bar

    // Back wrap slab
    const backGeo = new THREE.BoxGeometry(wWidth, wHeight, 0.02);
    const backMesh = new THREE.Mesh(backGeo, wrapperOuterMat);
    backMesh.position.set(0, 0, -thickness);
    wrapperGroup.add(backMesh);

    // Realistic flap sizes:
    // Left & Right flaps cover slightly more than half of the width to overlap realistically.
    const sideFlapW = wWidth * 0.52;
    // Top & Bottom flaps are short margins folding over the edges.
    const topFlapH = wHeight * 0.18;

    // Hinge-anchored pivot setups with explicit layered Z-coordinates
    // Chocolate bar front is at z = 0.075 + bevel 0.02 = 0.095. 
    // We stack paper flaps from Z = 0.11 to 0.14 and place the wax seal at Z = 0.18.

    // 1. Left flap (Absolute Z closed = 0.11 -> Local relative Z = 0.19)
    leftFlapPivot = new THREE.Group();
    leftFlapPivot.position.set(-wWidth / 2, 0, -thickness);
    const leftFlap = createFlap(sideFlapW, wHeight);
    leftFlap.position.set(sideFlapW / 2, 0, 0.19);
    leftFlapPivot.add(leftFlap);
    wrapperGroup.add(leftFlapPivot);

    // 2. Right flap (Absolute Z closed = 0.12 -> Local relative Z = 0.20)
    rightFlapPivot = new THREE.Group();
    rightFlapPivot.position.set(wWidth / 2, 0, -thickness);
    const rightFlap = createFlap(sideFlapW, wHeight);
    rightFlap.position.set(-sideFlapW / 2, 0, 0.20);
    rightFlapPivot.add(rightFlap);
    wrapperGroup.add(rightFlapPivot);

    // 3. Top flap (Absolute Z closed = 0.13 -> Local relative Z = 0.21)
    topFlapPivot = new THREE.Group();
    topFlapPivot.position.set(0, wHeight / 2, -thickness);
    const topFlap = createFlap(wWidth, topFlapH);
    topFlap.position.set(0, -topFlapH / 2, 0.21);
    topFlapPivot.add(topFlap);
    wrapperGroup.add(topFlapPivot);

    // 4. Bottom flap (Absolute Z closed = 0.14 -> Local relative Z = 0.22)
    bottomFlapPivot = new THREE.Group();
    bottomFlapPivot.position.set(0, -wHeight / 2, -thickness);
    const bottomFlap = createFlap(wWidth, topFlapH);
    bottomFlap.position.set(0, topFlapH / 2, 0.22);
    bottomFlapPivot.add(bottomFlap);
    wrapperGroup.add(bottomFlapPivot);
  }

  // 3.3 Create Wax Seal
  function createWaxSeal() {
    const sealMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b1a1a, // Crimson seal
      roughness: 0.65,
      metalness: 0.15,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3
    });

    const goldStampMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37, // Gold embossed alchemy insignia
      roughness: 0.3,
      metalness: 0.9,
      clearcoat: 0.2
    });

    // Seal halves parameters
    const radius = 0.35;
    const height = 0.05;
    const segments = 32;

    // Create Left Half Wax Seal Mesh
    const sealLeftGeo = new THREE.CylinderGeometry(radius, radius, height, segments, 1, false, 0, Math.PI);
    waxSealLeft = new THREE.Mesh(sealLeftGeo, sealMat);
    waxSealLeft.rotation.x = Math.PI / 2;
    waxSealLeft.rotation.y = Math.PI / 2;
    waxSealLeft.position.set(0, 0, 0.18); // Safe overlay height
    waxSealLeft.castShadow = true;

    // Create Left Half Gold Stamp detail
    const stampLeftGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.01, segments, 1, false, 0, Math.PI);
    const stampLeft = new THREE.Mesh(stampLeftGeo, goldStampMat);
    stampLeft.position.y = height / 2 + 0.005;
    stampLeft.rotation.y = Math.PI;
    waxSealLeft.add(stampLeft);

    // Create Right Half Wax Seal Mesh
    const sealRightGeo = new THREE.CylinderGeometry(radius, radius, height, segments, 1, false, Math.PI, Math.PI);
    waxSealRight = new THREE.Mesh(sealRightGeo, sealMat);
    waxSealRight.rotation.x = Math.PI / 2;
    waxSealRight.rotation.y = Math.PI / 2;
    waxSealRight.position.set(0, 0, 0.18); // Safe overlay height
    waxSealRight.castShadow = true;

    // Create Right Half Gold Stamp detail
    const stampRightGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.01, segments, 1, false, Math.PI, Math.PI);
    const stampRight = new THREE.Mesh(stampRightGeo, goldStampMat);
    stampRight.position.y = height / 2 + 0.005;
    stampRight.rotation.y = Math.PI;
    waxSealRight.add(stampRight);

    scene.add(waxSealLeft);
    scene.add(waxSealRight);
  }

  // ==========================================================================
  // 4. SCROLL ENGINE INTERACTION (GSAP ScrollTrigger binding)
  // ==========================================================================
  
  function setupScrollAnimations() {
    // Base parallax scene rotation during scroll
    gsap.to(camera.position, {
      y: -1.2,
      z: 7.2,
      scrollTrigger: {
        trigger: "main.scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2
      }
    });

    gsap.to(chocolateBarGroup.rotation, {
      y: Math.PI * 0.15,
      x: Math.PI * 0.05,
      scrollTrigger: {
        trigger: "main.scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5
      }
    });

    gsap.to(wrapperGroup.rotation, {
      y: Math.PI * 0.15,
      x: Math.PI * 0.05,
      scrollTrigger: {
        trigger: "main.scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5
      }
    });

    // Dynamic Master Timeline for 3D Assets split & unfold
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "main.scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5
      }
    });

    // 4.1 Phase 1: Wax Seal Cracking (Timeline: 0% -> 25%)
    masterTimeline.to(waxSealLeft.position, { x: -0.9, y: 0.15, z: 0.35, duration: 2 }, 0);
    masterTimeline.to(waxSealLeft.rotation, { z: -0.6, y: Math.PI / 4, duration: 2 }, 0);
    masterTimeline.to(waxSealLeft.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 1.8 }, 0.2); // Fades out/shrinks

    masterTimeline.to(waxSealRight.position, { x: 0.9, y: -0.15, z: 0.35, duration: 2 }, 0);
    masterTimeline.to(waxSealRight.rotation, { z: 0.6, y: -Math.PI / 4, duration: 2 }, 0);
    masterTimeline.to(waxSealRight.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 1.8 }, 0.2);

    // 4.2 Phase 2: Parchment peeling/unfolding (Timeline: 20% -> 55%)
    masterTimeline.to(leftFlapPivot.rotation, { y: -Math.PI * 0.78, duration: 3.5 }, 1.5);
    masterTimeline.to(rightFlapPivot.rotation, { y: Math.PI * 0.78, duration: 3.5 }, 1.5);
    masterTimeline.to(topFlapPivot.rotation, { x: Math.PI * 0.78, duration: 3.5 }, 2);
    masterTimeline.to(bottomFlapPivot.rotation, { x: -Math.PI * 0.78, duration: 3.5 }, 2);
    
    // Scale wrapper group down and move back panel backwards to disappear cleanly
    masterTimeline.to(wrapperGroup.position, { z: -1.5, duration: 3 }, 3.5);
    masterTimeline.to(wrapperGroup.scale, { x: 0.05, y: 0.05, z: 0.05, duration: 2.8 }, 4);

    // 4.3 Phase 3: Chocolate Bar Shattering (Timeline: 50% -> 100%)
    chocolateBlocks.forEach((block) => {
      const data = block.userData;
      masterTimeline.to(block.position, {
        x: data.initialX + data.scatterDir.x,
        y: data.initialY + data.scatterDir.y,
        z: data.initialZ + data.scatterDir.z,
        duration: 4.5
      }, 3.8);

      masterTimeline.to(block.rotation, {
        x: data.rotSpeed.x,
        y: data.rotSpeed.y,
        z: data.rotSpeed.z,
        duration: 4.5
      }, 3.8);
    });
  }

  // Three.js Resize handler
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ==========================================================================
  // 5. INTERACTIVE RAYCASTING (Hover glows & tasting tags)
  // ==========================================================================
  
  function onMouseMove(event) {
    // Update custom cursor positioning
    if (customCursor) {
      customCursor.style.left = `${event.clientX}px`;
      customCursor.style.top = `${event.clientY}px`;
    }

    // Normalize coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  function handleRaycasting() {
    // Only raycast when bar has started to shatter (scrolled sufficiently)
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (scrollPercent < 0.45) {
      tastingTag.classList.remove("visible");
      resetHoveredShard();
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(chocolateBarGroup.children, true);

    if (intersects.length > 0) {
      // Find parent block group which holds the shard metadata
      let block = intersects[0].object;
      while (block.parent && block.parent !== chocolateBarGroup) {
        block = block.parent;
      }

      if (block.userData && block.userData.isShard) {
        if (hoveredShard !== block) {
          resetHoveredShard();
          hoveredShard = block;
          
          // Trigger Alchemist Gold Glowing aura on hovered shard meshes
          block.children.forEach(child => {
            if (child.isMesh) {
              // Store original material if not saved yet
              if (!originalMaterials.has(child.id)) {
                originalMaterials.set(child.id, child.material);
              }
              child.material = new THREE.MeshPhysicalMaterial({
                color: 0xd4af37, // Golden Aura
                emissive: 0xd4af37,
                emissiveIntensity: 0.65,
                roughness: 0.1,
                metalness: 0.9,
                clearcoat: 0.5
              });
            }
          });

          // Add interactive hover effects
          gsap.to(block.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.4, ease: "power2.out" });
          if (customCursor) customCursor.classList.add("hovering");

          // Display handwritten tasting tag
          const noteData = tastingNotes[block.userData.tastingIndex];
          document.getElementById("tag-num").innerText = `Formula VIII / Fragment 0${noteData.num}`;
          document.getElementById("tag-title").innerText = noteData.title;
          document.getElementById("tag-notes").innerText = noteData.notes;
          
          tastingTag.classList.add("visible");
        }

        // Project 3D coordinate to 2D screen coordinates or bind directly to cursor coordinates
        const xPos = mouse.x * (window.innerWidth / 2) + (window.innerWidth / 2);
        const yPos = -mouse.y * (window.innerHeight / 2) + (window.innerHeight / 2);
        
        tastingTag.style.left = `${xPos}px`;
        tastingTag.style.top = `${yPos}px`;
      }
    } else {
      tastingTag.classList.remove("visible");
      resetHoveredShard();
    }
  }

  function resetHoveredShard() {
    if (hoveredShard) {
      gsap.to(hoveredShard.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" });
      if (customCursor) customCursor.classList.remove("hovering");

      // Reset meshes back to original dark chocolate materials
      hoveredShard.children.forEach(child => {
        if (child.isMesh && originalMaterials.has(child.id)) {
          child.material = originalMaterials.get(child.id);
        }
      });
      hoveredShard = null;
    }
  }

  // Renderer Loop
  function animateScene() {
    requestAnimationFrame(animateScene);

    // Candle spotlights flickering intensity random noise
    scene.children.forEach(child => {
      if (child.isSpotLight && child.color.getHex() === 0xffaa44) {
        child.intensity = 4.5 + (Math.random() * 0.6 - 0.3);
      }
      if (child.isPointLight && child.color.getHex() === 0xff7722) {
        child.intensity = 1.2 + (Math.random() * 0.3 - 0.15);
      }
    });

    // Check hovered items
    handleRaycasting();

    // Constant slow float animation for shards when shattered
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (scrollPercent > 0.45) {
      const time = Date.now() * 0.001;
      chocolateBlocks.forEach((block, idx) => {
        if (block !== hoveredShard) {
          const shift = idx * 0.2;
          block.position.y += Math.sin(time + shift) * 0.0015;
          block.rotation.x += Math.cos(time + shift) * 0.0005;
          block.rotation.y += Math.sin(time + shift) * 0.0003;
        }
      });
    }

    renderer.render(scene, camera);
  }

  // Trigger loading WebGL Engine
  initThree();


  // ==========================================================================
  // 6. E-COMMERCE CART LEDGER & SIDEBAR NAVIGATION DRAWER LOGIC
  // ==========================================================================

  // Cart ledger state
  let cart = [];
  const taxExciseRate = 0.05; // 5% lunar levy

  // Sidebar Menu Toggles
  menuToggle.addEventListener("click", () => {
    journalSidebar.classList.add("open");
  });

  closeJournal.addEventListener("click", () => {
    journalSidebar.classList.remove("open");
  });

  // Navigate links smooth anchors
  journalLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetSec = document.querySelector(targetId);
      
      journalSidebar.classList.remove("open");
      
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Cart Ledger Drawer Toggles
  cartToggle.addEventListener("click", () => {
    cartLedger.classList.add("open");
  });

  closeLedger.addEventListener("click", () => {
    cartLedger.classList.remove("open");
  });

  // Sound Ambient control toggle
  audioToggle.addEventListener("click", () => {
    if (ambientAudio.paused) {
      ambientAudio.play().then(() => {
        audioToggle.classList.add("active");
        audioToggle.querySelector(".audio-text").innerText = "Chamber Singing";
      }).catch(err => {
        console.error("Audio playback error: ", err);
      });
    } else {
      ambientAudio.pause();
      audioToggle.classList.remove("active");
      audioToggle.querySelector(".audio-text").innerText = "Chamber Ambient";
    }
  });

  // Shop grid Add To Ledger buttons listeners
  document.querySelectorAll(".add-to-ledger-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const name = btn.getAttribute("data-name");
      const price = parseFloat(btn.getAttribute("data-price"));

      addToCart(id, name, price);
      
      // Visual feedback: click button effect
      btn.innerText = "Transmuted ✓";
      btn.style.borderColor = "var(--color-alchemist-gold)";
      setTimeout(() => {
        btn.innerText = "Add to Ledger";
        btn.style.borderColor = "rgba(212, 175, 55, 0.3)";
      }, 1200);
    });
  });

  function addToCart(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ id, name, price, qty: 1 });
    }
    updateLedgerUI();
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateLedgerUI();
  }

  function updateLedgerUI() {
    const ledgerItemsContainer = document.getElementById("ledger-items");
    const cartCountEl = document.getElementById("cart-count");
    
    // Clear items container
    ledgerItemsContainer.innerHTML = "";

    let totalQty = 0;
    let subtotal = 0;

    if (cart.length === 0) {
      ledgerItemsContainer.innerHTML = `<p class="empty-ledger-msg">No active syntheses recorded in ledger.</p>`;
      checkoutBtn.disabled = true;
    } else {
      cart.forEach(item => {
        totalQty += item.qty;
        subtotal += item.price * item.qty;

        // Create Item element
        const itemEl = document.createElement("div");
        itemEl.className = "ledger-item";
        itemEl.innerHTML = `
          <div class="ledger-item-info">
            <span class="ledger-item-name">${item.name}</span>
            <span class="ledger-item-qty">Quantity: ${item.qty}</span>
            <button class="ledger-item-remove" data-remove="${item.id}">Expel</button>
          </div>
          <span class="ledger-item-price">$${(item.price * item.qty).toFixed(2)}</span>
        `;
        ledgerItemsContainer.appendChild(itemEl);
      });
      checkoutBtn.disabled = false;
    }

    // Taxes and grand totals
    const tax = subtotal * taxExciseRate;
    const grandTotal = subtotal + tax;

    // Bind UI numbers
    cartCountEl.innerText = totalQty;
    document.getElementById("ledger-subtotal").innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById("ledger-tax").innerText = `$${tax.toFixed(2)}`;
    document.getElementById("ledger-total").innerText = `$${grandTotal.toFixed(2)}`;

    // Add removal listeners
    document.querySelectorAll(".ledger-item-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove");
        removeFromCart(id);
      });
    });
  }

  // Checkout Transmutation
  checkoutBtn.addEventListener("click", () => {
    checkoutModal.classList.add("open");
    cartLedger.classList.remove("open");
    
    // Reset Cart
    cart = [];
    updateLedgerUI();
  });

  // Modal dismiss buttons
  closeModalBtn.addEventListener("click", () => {
    checkoutModal.classList.remove("open");
  });
  
  closeModalBtn.addEventListener("click", () => {
    checkoutModal.classList.remove("open");
  });

});
