import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_CONFIGS = [
  {
    id: 'lamborghini',
    label: 'Lamborghini Aventador SVJ',
    path: '/models/lamborghini.glb',
    targetSize: 3.15,
    introOffset: {
      x: 0,
      z: 0,
      rotationY: 0,
      scale: 1,
    },
    exitOffset: {
      x: -0.95,
      z: 0.36,
      rotationY: 0.18,
      scale: 0.92,
    },
  },
  {
    id: 'mercedes',
    label: 'Mercedes-AMG GT3',
    path: '/models/mercedes.glb',
    targetSize: 3.35,
    introOffset: {
      x: 0.9,
      z: -0.35,
      rotationY: Math.PI - 0.18,
      scale: 0.92,
    },
    exitOffset: {
      x: 0,
      z: 0,
      rotationY: Math.PI,
      scale: 1,
    },
  },
];

export async function loadShowcaseCars({ parent, onProgress }) {
  const progressById = new Map(MODEL_CONFIGS.map((config) => [config.id, 0]));
  const updateCombinedProgress = () => {
    const totalProgress = Array.from(progressById.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    onProgress?.(totalProgress / MODEL_CONFIGS.length);
  };

  const entries = await Promise.all(
    MODEL_CONFIGS.map((config) =>
      loadSingleModel({
        parent,
        config,
        onProgress: (value) => {
          progressById.set(config.id, value);
          updateCombinedProgress();
        },
      })
    )
  );

  const showcase = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  updateShowcaseState(showcase, 0);

  return {
    showcase,
    usingFallback: entries.some((entry) => entry.usingFallback),
  };
}

export function updateShowcaseState(showcase, blendValue) {
  const blend = THREE.MathUtils.clamp(blendValue, 0, 1);
  const lamborghiniVisibility = 1 - blend;
  const mercedesVisibility = blend;

  if (showcase.lamborghini) {
    applyEntryState(showcase.lamborghini, lamborghiniVisibility, blend, false);
  }

  if (showcase.mercedes) {
    applyEntryState(showcase.mercedes, mercedesVisibility, blend, true);
  }
}

async function loadSingleModel({ parent, config, onProgress }) {
  const loader = new GLTFLoader();
  const container = new THREE.Group();
  container.name = `${config.id}-container`;
  parent.add(container);

  const root = await new Promise((resolve) => {
    loader.load(
      config.path,
      (gltf) => {
        const imported = gltf.scene || gltf.scenes[0];

        if (!imported || shouldUseProceduralFallback(imported)) {
          const fallbackCar = createProceduralCar();
          centerAndScaleModel(fallbackCar, config.targetSize);
          resolve({ root: fallbackCar, usingFallback: true });
          return;
        }

        improveImportedModel(imported);
        autoOrientModel(imported);
        centerAndScaleModel(imported, config.targetSize);
        resolve({ root: imported, usingFallback: false });
      },
      (event) => {
        if (!event.total) {
          onProgress?.(0.4);
          return;
        }

        onProgress?.(event.loaded / event.total);
      },
      (error) => {
        console.error(`Error loading ${config.label}:`, error);
        const fallbackCar = createProceduralCar();
        centerAndScaleModel(fallbackCar, config.targetSize);
        resolve({ root: fallbackCar, usingFallback: true });
      }
    );
  });

  container.add(root.root);

  return {
    id: config.id,
    label: config.label,
    container,
    root: root.root,
    config,
    usingFallback: root.usingFallback,
    materials: collectMaterialStates(root.root),
  };
}

function applyEntryState(entry, visibility, blend, isIncoming) {
  entry.container.visible = visibility > 0.001;

  const { introOffset, exitOffset } = entry.config;

  entry.container.position.x = THREE.MathUtils.lerp(introOffset.x, exitOffset.x, blend);
  entry.container.position.z = THREE.MathUtils.lerp(introOffset.z, exitOffset.z, blend);
  entry.container.rotation.y = THREE.MathUtils.lerp(
    introOffset.rotationY,
    exitOffset.rotationY,
    blend
  );

  const nextScale = THREE.MathUtils.lerp(introOffset.scale, exitOffset.scale, blend);
  entry.container.scale.setScalar(nextScale);

  setEntryVisibility(entry, visibility, isIncoming);
}

function setEntryVisibility(entry, visibility, isIncoming) {
  entry.materials.forEach(({ material, opacity, transparent, depthWrite }) => {
    if (visibility >= 0.999) {
      material.opacity = opacity;
      material.transparent = transparent;
      material.depthWrite = depthWrite;
      material.needsUpdate = true;
      return;
    }

    material.transparent = true;
    material.opacity = opacity * visibility;
    material.depthWrite = false;
    material.needsUpdate = true;
  });

  if (visibility <= 0.001 && !isIncoming) {
    entry.container.visible = false;
  }
}

function collectMaterialStates(model) {
  const materials = [];

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    childMaterials.forEach((material) => {
      if (!material || materials.some((item) => item.material === material)) {
        return;
      }

      materials.push({
        material,
        opacity: material.opacity ?? 1,
        transparent: material.transparent ?? false,
        depthWrite: material.depthWrite ?? true,
      });
    });
  });

  return materials;
}

function improveImportedModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) {
        return;
      }

      material.envMapIntensity = 1.45;

      const referenceName = `${child.name} ${material.name}`.toLowerCase();

      if ('clearcoat' in material && referenceName.includes('body')) {
        material.clearcoat = 1;
        material.clearcoatRoughness = 0.14;
      }

      if ('roughness' in material && referenceName.includes('glass')) {
        material.transparent = true;
        material.opacity = 0.5;
        material.roughness = 0.04;
      }

      if ('metalness' in material && referenceName.includes('body')) {
        material.metalness = 0.68;
        material.roughness = 0.2;
      }

      material.needsUpdate = true;
    });
  });
}

function autoOrientModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x > size.z) {
    model.rotation.y = -Math.PI / 2;
  }
}

function centerAndScaleModel(model, targetSize = 3.2) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scaleFactor = targetSize / maxAxis;
  model.scale.multiplyScalar(scaleFactor);

  const groundedBox = new THREE.Box3().setFromObject(model);
  model.position.y -= groundedBox.min.y + 0.42;
}

function shouldUseProceduralFallback(model) {
  let meshCount = 0;
  let triangleCount = 0;
  let containsCubeName = false;

  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    meshCount += 1;
    containsCubeName ||= child.name.toLowerCase().includes('cube');

    if (child.geometry?.index) {
      triangleCount += child.geometry.index.count / 3;
      return;
    }

    const positionCount = child.geometry?.attributes?.position?.count || 0;
    triangleCount += positionCount / 3;
  });

  return meshCount <= 1 && triangleCount <= 12 && containsCubeName;
}

function createProceduralCar() {
  const car = new THREE.Group();
  car.name = 'aurora-procedural-concept';

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd6dce7,
    metalness: 0.86,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f1218,
    metalness: 0.7,
    roughness: 0.35,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x86b8ff,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    opacity: 0.4,
    transmission: 0.2,
    ior: 1.18,
    thickness: 0.6,
  });

  const frontLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xbad5ff,
    emissive: 0xbad5ff,
    emissiveIntensity: 3.4,
    metalness: 0,
    roughness: 0.18,
  });

  const rearLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6071,
    emissive: 0xff4d61,
    emissiveIntensity: 3,
    metalness: 0,
    roughness: 0.2,
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x07090e,
    metalness: 0.44,
    roughness: 0.82,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xaeb6c9,
    metalness: 1,
    roughness: 0.24,
  });

  const chassis = new THREE.Mesh(
    new RoundedBoxGeometry(1.58, 0.42, 3.08, 12, 0.18),
    bodyMaterial
  );
  chassis.position.y = 0.02;

  const shoulder = new THREE.Mesh(
    new RoundedBoxGeometry(1.32, 0.3, 2.2, 10, 0.18),
    bodyMaterial
  );
  shoulder.position.set(0, 0.25, -0.08);

  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(1.06, 0.46, 1.52, 10, 0.18),
    glassMaterial
  );
  canopy.position.set(0, 0.43, -0.1);

  const roof = new THREE.Mesh(
    new RoundedBoxGeometry(0.72, 0.16, 0.8, 8, 0.1),
    carbonMaterial
  );
  roof.position.set(0, 0.6, -0.12);

  const frontSplitter = new THREE.Mesh(
    new RoundedBoxGeometry(1.44, 0.1, 0.38, 8, 0.06),
    carbonMaterial
  );
  frontSplitter.position.set(0, -0.12, 1.58);

  const rearDiffuser = new THREE.Mesh(
    new RoundedBoxGeometry(1.36, 0.1, 0.3, 8, 0.06),
    carbonMaterial
  );
  rearDiffuser.position.set(0, -0.11, -1.55);

  const sideBladeLeft = new THREE.Mesh(
    new RoundedBoxGeometry(0.08, 0.12, 1.72, 4, 0.03),
    carbonMaterial
  );
  sideBladeLeft.position.set(0.82, -0.08, 0);

  const sideBladeRight = sideBladeLeft.clone();
  sideBladeRight.position.x *= -1;

  const frontLight = new THREE.Mesh(
    new RoundedBoxGeometry(1.18, 0.04, 0.06, 6, 0.02),
    frontLightMaterial
  );
  frontLight.position.set(0, 0.08, 1.58);

  const rearLight = new THREE.Mesh(
    new RoundedBoxGeometry(1.06, 0.04, 0.06, 6, 0.02),
    rearLightMaterial
  );
  rearLight.position.set(0, 0.16, -1.56);

  const underGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.02, 48),
    new THREE.MeshBasicMaterial({
      color: 0xa8d2ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  underGlow.rotation.x = -Math.PI / 2;
  underGlow.position.y = -0.18;
  underGlow.scale.set(1.25, 2.25, 1);

  car.add(
    chassis,
    shoulder,
    canopy,
    roof,
    frontSplitter,
    rearDiffuser,
    sideBladeLeft,
    sideBladeRight,
    frontLight,
    rearLight,
    underGlow
  );

  const wheelPositions = [
    [-0.88, -0.18, 1.02],
    [0.88, -0.18, 1.02],
    [-0.88, -0.18, -1.02],
    [0.88, -0.18, -1.02],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = createWheel(wheelMaterial, rimMaterial);
    wheel.position.set(x, y, z);
    car.add(wheel);
  });

  return car;
}

function createWheel(wheelMaterial, rimMaterial) {
  const group = new THREE.Group();

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.28, 36),
    wheelMaterial
  );
  tire.rotation.z = Math.PI / 2;

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.3, 24),
    rimMaterial
  );
  rim.rotation.z = Math.PI / 2;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.32, 18),
    rimMaterial
  );
  cap.rotation.z = Math.PI / 2;

  group.add(tire, rim, cap);

  return group;
}
