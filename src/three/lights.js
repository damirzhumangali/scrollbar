import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function addShowroomLighting({ scene, renderer }) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.05);

  scene.environment = environment.texture;
  pmremGenerator.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
  const hemisphereLight = new THREE.HemisphereLight(0xe9f1ff, 0x14161d, 0.9);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
  keyLight.position.set(5.2, 5.5, 6.4);

  const fillLight = new THREE.DirectionalLight(0xaec4ff, 1.6);
  fillLight.position.set(-5.4, 2.5, 4.4);

  const rimLight = new THREE.DirectionalLight(0xffffff, 2.6);
  rimLight.position.set(0, 3.2, -6.4);

  const accentLight = new THREE.PointLight(0x9bd1ff, 10, 14, 2);
  accentLight.position.set(0, 0.9, 2.6);

  scene.add(
    ambientLight,
    hemisphereLight,
    keyLight,
    fillLight,
    rimLight,
    accentLight
  );
}
