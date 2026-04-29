<template></template>

<script setup lang="ts">
/**
 * 按 three.js webgl_points_waves 经典写法复刻：
 * - amountX/amountY/separation 规则点阵
 * - 每帧用 sin/cos 改 position.y 与点大小
 * - PointsMaterial + Sprite 软圆点
 */
import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";

let rafId = 0;
let renderer!: THREE.WebGLRenderer;
let resizeHandler: () => void;
let pointerMoveHandler: ((e: PointerEvent) => void) | undefined;
let mouseX = 0;
let mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const disposableMaterials: THREE.Material[] = [];
const disposableGeometries: THREE.BufferGeometry[] = [];
const disposableTextures: THREE.Texture[] = [];

function registerMat<T extends THREE.Material>(m: T): T {
  disposableMaterials.push(m);
  return m;
}
function registerGeo<T extends THREE.BufferGeometry>(g: T): T {
  disposableGeometries.push(g);
  return g;
}
function registerTex<T extends THREE.Texture>(t: T): T {
  disposableTextures.push(t);
  return t;
}

const amountX = 50;
const amountY = 50;
const separation = 100;
const total = amountX * amountY;

onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  camera.position.set(0, 1000, 3000);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("app")?.appendChild(renderer.domElement);

  const positions = new Float32Array(total * 3);
  const scales = new Float32Array(total);

  let i = 0;
  let j = 0;
  for (let ix = 0; ix < amountX; ix++) {
    for (let iy = 0; iy < amountY; iy++) {
      positions[i] = ix * separation - (amountX * separation) / 2;
      positions[i + 1] = 0;
      positions[i + 2] = iy * separation - (amountY * separation) / 2;
      scales[j] = 1;
      i += 3;
      j++;
    }
  }

  const geometry = registerGeo(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = 64;
  spriteCanvas.height = 64;
  const ctx = spriteCanvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.2, "rgba(160,220,255,1)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const sprite = registerTex(new THREE.CanvasTexture(spriteCanvas));

  const material = registerMat(
    new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x66ccff) },
        pointTexture: { value: sprite },
      },
      vertexShader: `
        attribute float scale;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D pointTexture;
        void main() {
          gl_FragColor = vec4(color, 1.0);
          gl_FragColor *= texture2D(pointTexture, gl_PointCoord);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    }),
  );

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  pointerMoveHandler = (e: PointerEvent) => {
    mouseX = e.clientX - windowHalfX;
    mouseY = e.clientY - windowHalfY;
  };
  window.addEventListener("pointermove", pointerMoveHandler);

  let count = 0;
  function animate() {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY + 1000 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    const pos = geometry.attributes.position.array as Float32Array;
    const scl = geometry.attributes.scale.array as Float32Array;

    let pIdx = 0;
    let sIdx = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        pos[pIdx + 1] =
          Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
        scl[sIdx] =
          (Math.sin((ix + count) * 0.3) + 1) * 8 +
          (Math.sin((iy + count) * 0.5) + 1) * 8;
        pIdx += 3;
        sIdx++;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.scale.needsUpdate = true;

    rafId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
    count += 0.1;
  }
  animate();

  resizeHandler = () => {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeHandler);
  if (pointerMoveHandler) {
    window.removeEventListener("pointermove", pointerMoveHandler);
  }
  disposableTextures.forEach((t) => t.dispose());
  disposableMaterials.forEach((m) => m.dispose());
  disposableGeometries.forEach((g) => g.dispose());
  renderer.dispose();
  renderer.domElement.remove();
});
</script>
