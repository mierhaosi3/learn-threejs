<template></template>

<script setup lang="ts">
import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const amountX = 50;
const amountY = 50;
const separation = 100;
const total = amountX * amountY;
let controls: OrbitControls | undefined;
let renderer!: THREE.WebGLRenderer;
let rafId = 0;
let resizeHandler: (() => void) | undefined;
let waveCount = 0;
const positions = new Float32Array(total * 3);
const scales = new Float32Array(total);
const intensities = new Float32Array(total);
let i = 0;
let p = 0;
for (let ix = 0; ix < amountX; ix++) {
  for (let iy = 0; iy < amountY; iy++) {
    positions[i] = ix * separation - (amountX * separation) / 2;
    positions[i + 1] = 0;
    positions[i + 2] = iy * separation - (amountY * separation) / 2;
    scales[p] = 8;
    intensities[p] = 0.6;
    i += 3;
    p += 1;
  }
}
onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15161a);
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  camera.position.set(0, 400, 1200);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById("app")?.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xb7c8ff, 0x2a2532, 0.25));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const sun = new THREE.DirectionalLight(0xfff2de, 1.6);
  sun.position.set(8, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("intensity", new THREE.BufferAttribute(intensities, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(0x66ccff) },
    },
    vertexShader: `
      attribute float scale;
      attribute float intensity;
      varying float vIntensity;
      void main() {
        vIntensity = intensity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = scale * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      varying float vIntensity;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        vec3 color = uBaseColor * vIntensity;
        float alpha = (1.0 - r2) * (0.35 + vIntensity * 0.65);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const renderFrame = () => {
    const pos = geometry.attributes.position.array as Float32Array;
    const scl = geometry.attributes.scale.array as Float32Array;
    const ints = geometry.attributes.intensity.array as Float32Array;
    let ptr = 0;
    let idx = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        const phase = Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453;
        const rand = phase - Math.floor(phase);
        const wave =
          Math.sin((ix + waveCount * 1.05) * 0.16 + rand * 1) * 72 +
          Math.sin((iy + waveCount * 0.9) * 0.23 + rand * 2.3) * 42 +
          Math.sin((ix + iy + waveCount * 0.35) * 0.08) * 20;
        pos[ptr + 1] = wave;
        const t = THREE.MathUtils.clamp((wave + 140) / 280, 0, 1);
        scl[idx] = THREE.MathUtils.lerp(28, 42, t);
        ints[idx] = THREE.MathUtils.lerp(0.65, 1.85, t);
        ptr += 3;
        idx += 1;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.scale.needsUpdate = true;
    geometry.attributes.intensity.needsUpdate = true;
    waveCount += 0.2;
    // camera.position.x = Math.sin(waveCount * 0.18) * 140;
    // camera.position.z = 1180 + Math.cos(waveCount * 0.12) * 55;
    // camera.lookAt(0, 0, 0);
    controls?.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(renderFrame);
  };
  renderFrame();

  resizeHandler = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  controls?.dispose();
  renderer.dispose();
  renderer.domElement.remove();
});
</script>
