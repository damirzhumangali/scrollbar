import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './style.css';
import { createSceneApp, getResponsiveView, updateRendererSize } from './three/scene.js';
import { addShowroomLighting } from './three/lights.js';
import { loadShowcaseCars, updateShowcaseState } from './three/carModel.js';
import {
  createScrollNarrative,
  createTextRevealAnimations,
  hideLoader,
  setLoaderProgress,
} from './three/animation.js';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#webgl');
const loader = document.querySelector('.loader');
const progressBar = document.querySelector('.loader-progress');
const progressValue = document.querySelector('.loader-value');

const app = createSceneApp(canvas);
addShowroomLighting(app);

const orbitState = {
  angle: 0,
};
const transitionState = {
  blend: 0,
};

const cursor = { x: 0, y: 0 };
const parallax = { x: 0, y: 0 };
const clock = new THREE.Clock();

let viewState = getResponsiveView(window.innerWidth);
let showcase = null;

createTextRevealAnimations();
applyResponsiveView(viewState);

window.addEventListener('pointermove', (event) => {
  cursor.x = event.clientX / window.innerWidth - 0.5;
  cursor.y = event.clientY / window.innerHeight - 0.5;
});

window.addEventListener(
  'resize',
  () => {
    updateRendererSize(app);
    viewState = getResponsiveView(window.innerWidth);
    applyResponsiveView(viewState);
    ScrollTrigger.refresh();
  },
  { passive: true }
);

await initializeModel();
tick();

async function initializeModel() {
  const result = await loadShowcaseCars({
    parent: app.carStage,
    onProgress: (value) => {
      setLoaderProgress(progressBar, progressValue, value);
    },
  });
  showcase = result.showcase;
  updateShowcaseState(showcase, transitionState.blend);

  setLoaderProgress(progressBar, progressValue, 1);

  createScrollNarrative({
    orbitState,
    transitionState,
    progressSelector: '.progress-indicator span',
  });

  hideLoader(loader);
  ScrollTrigger.refresh();

  if (result.usingFallback) {
    console.warn(
      'Loaded model was missing or too primitive for a premium showcase. A procedural concept car is being displayed instead.'
    );
  }
}

function applyResponsiveView(nextView) {
  app.camera.fov = nextView.fov;
  app.camera.updateProjectionMatrix();
  app.carStage.scale.setScalar(nextView.stageScale);
  app.groundGlow.scale.setScalar(nextView.glowScale);
  app.floorRing.scale.setScalar(nextView.ringScale);
  app.shadowPlane.scale.setScalar(nextView.shadowScale);
}

function tick() {
  const elapsedTime = clock.getElapsedTime();
  const blend = transitionState.blend;

  app.carStage.position.y = Math.sin(elapsedTime * 1.05) * 0.035;
  app.carStage.rotation.z = Math.sin(elapsedTime * 0.42) * 0.012;

  parallax.x += (cursor.x * viewState.parallaxX - parallax.x) * 0.05;
  parallax.y += (-cursor.y * viewState.parallaxY - parallax.y) * 0.05;

  app.cameraRig.position.x = parallax.x;
  app.cameraRig.position.y = parallax.y;

  if (showcase) {
    updateShowcaseState(showcase, blend);
  }

  const radius = viewState.radius + blend * 0.28;
  const height = viewState.height + blend * 0.06;
  const targetY = viewState.targetY + blend * 0.05;

  const orbitX = Math.sin(orbitState.angle) * radius;
  const orbitZ = Math.cos(orbitState.angle) * radius;

  app.camera.position.set(orbitX, height, orbitZ);
  app.camera.lookAt(0, targetY, 0);

  app.renderer.render(app.scene, app.camera);
  window.requestAnimationFrame(tick);
}
