<template></template>

<script setup lang="ts">
/**
 * 下一个学习主题：材质 + 光照 + 阴影（不依赖网络纹理）
 * 1) 同一盏灯下，不同 roughness / metalness 的观感差异
 * 2) DirectionalLight 阴影参数（mapSize / bias / normalBias）如何影响结果
 * 3) 阴影生效三要素：renderer 开阴影 + castShadow + receiveShadow
 */
import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let rafId = 0;
let renderer!: THREE.WebGLRenderer;
let resizeHandler: () => void;
let controls: OrbitControls | undefined;

const disposableTextures: THREE.Texture[] = [];
const disposableMaterials: THREE.Material[] = [];
const disposableGeometries: THREE.BufferGeometry[] = [];

function registerTex<T extends THREE.Texture>(t: T): T {
  disposableTextures.push(t);
  return t;
}
function registerMat<T extends THREE.Material>(m: T): T {
  disposableMaterials.push(m);
  return m;
}
function registerGeo<T extends THREE.BufferGeometry>(g: T): T {
  disposableGeometries.push(g);
  return g;
}

/** 程序化棋盘图：作为地面 map（有色数据，SRGB） */
function makeFloorTexture(): THREE.Texture {
  const size = 256;
  const cell = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const odd = ((x + y) / cell) % 2 === 1;
      ctx.fillStyle = odd ? "#5c6470" : "#3f4651";
      ctx.fillRect(x, y, cell, cell);
    }
  }
  const tex = registerTex(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15161a);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(10, 8, 12);
  camera.lookAt(0, 1.2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
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

  // 环境补光（低强度）
  scene.add(new THREE.HemisphereLight(0xb7c8ff, 0x2a2532, 0.25));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  // 主光：平行光 + 阴影
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

  // 一盏点光让高光更明显，方便观察金属感
  const fill = new THREE.PointLight(0x8cc4ff, 45, 35, 2);
  fill.position.set(-6, 5, -3);
  scene.add(fill);

  scene.add(new THREE.GridHelper(36, 36, 0x2e3340, 0x23262f));

  const floor = new THREE.Mesh(
    registerGeo(new THREE.PlaneGeometry(38, 38)),
    registerMat(
      new THREE.MeshStandardMaterial({
        map: makeFloorTexture(),
        roughness: 0.9,
        metalness: 0,
      }),
    ),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 三颗球：观察 roughness / metalness 组合
  const sphereGeo = registerGeo(new THREE.SphereGeometry(1.2, 64, 32));
  const sphereConfs = [
    {
      x: -3.8,
      color: 0xdadada,
      metalness: 0,
      roughness: 0.08,
      label: "塑料亮面",
    },
    {
      x: 0,
      color: 0xc0c6cf,
      metalness: 1,
      roughness: 0.22,
      label: "金属中粗糙",
    },
    {
      x: 3.8,
      color: 0xd7b37c,
      metalness: 0.05,
      roughness: 0.78,
      label: "非金属磨砂",
    },
  ] as const;

  const rotatingMeshes: THREE.Mesh[] = [];
  sphereConfs.forEach((cfg) => {
    const mat = registerMat(
      new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        metalness: cfg.metalness,
        roughness: cfg.roughness,
        clearcoat: 0.2,
        clearcoatRoughness: 0.15,
      }),
    );
    const m = new THREE.Mesh(sphereGeo, mat);
    m.position.set(cfg.x, 1.2, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = cfg.label;
    scene.add(m);
    rotatingMeshes.push(m);
  });

  // 一个立方体增强“接触阴影”观感
  const cube = new THREE.Mesh(
    registerGeo(new THREE.BoxGeometry(1.8, 1.8, 1.8)),
    registerMat(
      new THREE.MeshStandardMaterial({
        color: 0x7da2ff,
        roughness: 0.45,
        metalness: 0.15,
      }),
    ),
  );
  cube.position.set(0, 0.9, -4.2);
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
  rotatingMeshes.push(cube);

  let t = 0;
  function animate() {
    t += 0.01;
    // 让补光轻微绕圈，观察高光与阴影边缘变化
    fill.position.x = Math.cos(t * 0.7) * 6;
    fill.position.z = Math.sin(t * 0.7) * 6;

    rotatingMeshes.forEach((m, i) => {
      m.rotation.y += 0.004 + i * 0.0008;
    });
    controls?.update();
    rafId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  resizeHandler = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeHandler);
  controls?.dispose();
  disposableTextures.forEach((t) => t.dispose());
  disposableMaterials.forEach((m) => m.dispose());
  disposableGeometries.forEach((g) => g.dispose());
  renderer.dispose();
  renderer.domElement.remove();
});
</script>
