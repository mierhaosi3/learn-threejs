<template></template>

<script setup lang="ts">
import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let rafId = 0;
let renderer: THREE.WebGLRenderer;
let resizeHandler: () => void;

/** 画布程序化纹理，卸载时 dispose */
const texturesPendingDispose: THREE.Texture[] = [];

/** 棋盘格 color 贴图 → 给 Lambert.map */
function createCheckerColorTexture(): THREE.CanvasTexture {
  const canvasSize = 256;
  const gridCount = 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unsupported");
  const cell = canvasSize / gridCount;
  for (let gy = 0; gy < gridCount; gy++) {
    for (let gx = 0; gx < gridCount; gx++) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? "#aaccee" : "#446699";
      ctx.fillRect(gx * cell, gy * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/** 斜条纹 color 贴图 → 给 Phong.map */
function createStripeColorTexture(): THREE.CanvasTexture {
  const canvasSize = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unsupported");
  ctx.fillStyle = "#228855";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 6;
  const step = 28;
  for (let i = -canvasSize; i < canvasSize * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + canvasSize, canvasSize);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * Toon 专用 gradientMap：一条从左暗到右亮的灰度条。
 * 着色器用光照强弱对应横坐标去取样 → 形成分层明暗。
 * NearestFilter：台阶不被线性插值糊成渐变。
 */
function createToonGradientMapTexture(): THREE.CanvasTexture {
  const bandCount = 5;
  const grayscaleLevels = [38, 88, 138, 188, 238];
  const canvas = document.createElement("canvas");
  canvas.width = bandCount;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unsupported");
  for (let i = 0; i < bandCount; i++) {
    const g = grayscaleLevels[i];
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(i, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  return tex;
}

onMounted(() => {
  // 创建场景
  const scene = new THREE.Scene();
  // 设置场景背景颜色
  scene.background = new THREE.Color(0x111111);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(
    45, // 视角
    window.innerWidth / window.innerHeight,
    0.1, // 进平面
    1000, // 远平面
  );

  // 添加网格辅助线，方便观察空间位置
  scene.add(new THREE.GridHelper(20, 20));

  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 10);

  // 使用抗锯齿
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById("app")?.appendChild(renderer.domElement);

  // 需要光源的材质必须先加灯，否则一片漆黑
  // 环境光：让整个场景有个基础亮度，避免背光面全黑
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  // 平行光：模拟太阳，有方向，会产生明暗面 范围是0-180度
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  // 设置平行光的位置
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  // 创建几何体 半径 细分水平 细分垂直
  const geo = new THREE.SphereGeometry(0.9, 32, 32);

  // 给 basic 专用几何体写入顶点颜色数据（y越高越红，越低越蓝）
  const geoColored = new THREE.SphereGeometry(0.9, 32, 32);
  const vertCount = geoColored.attributes.position.count;
  const colorData = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const y = geoColored.attributes.position.getY(i);
    // y 范围约 -0.9 ~ 0.9，归一化到 0~1
    const t = (y / 0.9 + 1) / 2;
    colorData[i * 3] = t; // R：顶部偏红
    colorData[i * 3 + 1] = 0.5; // G：固定低绿
    colorData[i * 3 + 2] = 1 - t; // B：底部偏蓝
  }
  geoColored.setAttribute("color", new THREE.BufferAttribute(colorData, 3));

  // 设置几何体之间的间距
  const spacing = 2.6;

  // ─────────────────────────────────────────────
  // 第一组：不依赖光源的材质
  // ─────────────────────────────────────────────

  // MeshBasicMaterial：最简单的材质，纯色显示，完全不受光照影响
  // 常用于：调试、UI 标记、不需要立体感的场景
  // vertexColors: true → 忽略 color，改用几何体顶点数据里的颜色（上红下蓝渐变）
  const basic = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: false,
    opacity: 0.9,
    // alphaTest: 0.5, //硬切边

    wireframe: false,
    side: THREE.DoubleSide, // 双面渲染  这个后面再说吧
    depthTest: true,
    vertexColors: true,
  });

  // MeshNormalMaterial：把顶点法线方向映射成 RGB 颜色显示
  // 常用于：调试法线方向是否正确 用三维坐标 对法线方向单位化转为的结果 转为rgb颜色
  const normal = new THREE.MeshNormalMaterial();

  // MeshDepthMaterial：根据像素距离相机的远近显示深浅（近=白，远=黑）
  // 常用于：生成深度图，做后处理效果
  const depth = new THREE.MeshDepthMaterial();

  // 纯白球：MeshBasicMaterial 不受光照，color=白就是纯白
  const white = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });

  // ─────────────────────────────────────────────
  // 第二组：经典光照模型（需要光源）
  // ─────────────────────────────────────────────

  const texLambertMap = createCheckerColorTexture();
  texturesPendingDispose.push(texLambertMap);

  // MeshLambertMaterial：漫反射材质，只有漫反射光，没有高光
  // map：颜色贴图 × color；贴图亮时用白色固有色避免串色
  const lambert = new THREE.MeshLambertMaterial({
    color: 0x00ffff,
    map: texLambertMap,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const texPhongMap = createStripeColorTexture();
  texturesPendingDispose.push(texPhongMap);

  // MeshPhongMaterial：漫反射 + 镜面高光，shininess 控制高光锐度
  const phong = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 1,
    map: texPhongMap,
    shininess: 120,
    specular: 0xffffff,
  });

  const texToonGradient = createToonGradientMapTexture();
  texturesPendingDispose.push(texToonGradient);

  // MeshToonMaterial：卡通渲染（赛璐珞风格）
  // gradientMap：明暗按纹理横轴分段（左暗右亮），层数 ≈ 纹理里竖条段数
  const toon = new THREE.MeshToonMaterial({
    color: 0xff4488,
    gradientMap: texToonGradient,
  });

  // ─────────────────────────────────────────────
  // 第三组：PBR 物理材质（需要光源，最接近真实世界）
  // ─────────────────────────────────────────────

  // MeshStandardMaterial：基于物理的渲染（PBR），工程项目首选
  // metalness：金属度（0=塑料/非金属，1=纯金属）
  // roughness：粗糙度（0=镜面，1=完全磨砂）
  const standardPlastic = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    metalness: 0,
    roughness: 0.4,
  });

  // MeshStandardMaterial 金属版：metalness=1 呈现金属质感
  const standardMetal = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 1,
    roughness: 0.1,
  });

  // MeshPhysicalMaterial：MeshStandardMaterial 的超集，增加透明/折射/清漆等
  // transmission=1 + transparent=true：玻璃/水晶效果
  const physical = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transmission: 0.98,
    transparent: true,
    roughness: 0,
    thickness: 1.5,
  });

  // ─────────────────────────────────────────────
  // 排列成网格展示
  // ─────────────────────────────────────────────
  const materials: Array<{ mat: THREE.Material; geo?: THREE.BufferGeometry }> =
    [
      { mat: basic, geo: geoColored }, // 顶点色需要有颜色数据的几何体
      { mat: normal },
      { mat: depth },
      { mat: white },
      { mat: lambert },
      { mat: phong },
      { mat: toon },
      { mat: standardPlastic },
      { mat: standardMetal },
      { mat: physical },
    ];

  const colCount = 5;
  const meshList: THREE.Mesh[] = [];

  materials.forEach(({ mat, geo: itemGeo }, i) => {
    const mesh = new THREE.Mesh(itemGeo ?? geo, mat);
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    mesh.position.set((col - 2) * spacing, (0.5 - row) * spacing, 0);
    scene.add(mesh);
    meshList.push(mesh);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  function animate() {
    meshList.forEach((mesh) => {
      mesh.rotation.y += 0.005;
    });
    controls.update();
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
  texturesPendingDispose.forEach((t) => t.dispose());
  texturesPendingDispose.length = 0;
  renderer.domElement.remove();
  renderer.dispose();
});
</script>
