import * as THREE from 'three';

export function createSceneApp(canvas) {
  const scene = new THREE.Scene();

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const cameraRig = new THREE.Group();
  scene.add(cameraRig);

  const camera = new THREE.PerspectiveCamera(34, sizes.width / sizes.height, 0.1, 100);
  cameraRig.add(camera);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const carStage = new THREE.Group();
  scene.add(carStage);

  const shadowPlane = createShadowPlane();
  const groundGlow = createGroundGlow();
  const floorRing = createFloorRing();

  scene.add(shadowPlane, groundGlow, floorRing);

  return {
    scene,
    sizes,
    cameraRig,
    camera,
    renderer,
    carStage,
    shadowPlane,
    groundGlow,
    floorRing,
  };
}

export function getResponsiveView(width) {
  if (width < 480) {
    return {
      radius: 8.8,
      height: 1.08,
      targetY: 0.24,
      fov: 49,
      glowScale: 0.84,
      ringScale: 0.8,
      shadowScale: 0.82,
      parallaxX: 0.1,
      parallaxY: 0.05,
      stageScale: 0.78,
    };
  }

  if (width < 640) {
    return {
      radius: 8.15,
      height: 1.15,
      targetY: 0.3,
      fov: 45,
      glowScale: 0.88,
      ringScale: 0.84,
      shadowScale: 0.85,
      parallaxX: 0.12,
      parallaxY: 0.06,
      stageScale: 0.84,
    };
  }

  if (width < 1024) {
    return {
      radius: 6.35,
      height: 1.32,
      targetY: 0.46,
      fov: 36,
      glowScale: 1,
      ringScale: 1,
      shadowScale: 1,
      parallaxX: 0.18,
      parallaxY: 0.1,
      stageScale: 0.93,
    };
  }

  return {
    radius: 5.85,
    height: 1.36,
    targetY: 0.52,
    fov: 33,
    glowScale: 1.08,
    ringScale: 1.1,
    shadowScale: 1.08,
    parallaxX: 0.24,
    parallaxY: 0.14,
    stageScale: 1,
  };
}

export function updateRendererSize(app) {
  app.sizes.width = window.innerWidth;
  app.sizes.height = window.innerHeight;

  app.camera.aspect = app.sizes.width / app.sizes.height;
  app.camera.updateProjectionMatrix();

  app.renderer.setSize(app.sizes.width, app.sizes.height);
  app.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function createGroundGlow() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xdbe6ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.47;

  return mesh;
}

function createFloorRing() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.RingGeometry(1.8, 3.4, 96), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.5;

  return mesh;
}

function createShadowPlane() {
  const texture = createShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.49;

  return mesh;
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(256, 256, 22, 256, 256, 256);

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.32)');
  gradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.08)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}
