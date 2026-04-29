<template></template>

<script setup lang="ts">
/**
 * 纹理 Demo：网络贴图失败 → Canvas 程序化备胎；离开时 dispose 回收 GPU。
 *
 * 九颗球从左到右、从下到上排列（序号与 mats.push 顺序一致）：
 *   ┌─────────────────────────────────┐
 *   z=0      ① uv   ② uv+normal  ③ uv+roughness        (row 0)
 *   z≈-4.8   ④ 砖bump⑤ 清漆coat ⑥ 自发光emissive       (row 1)
 *   z≈-9.6   ⑦ 位移  ⑧ 透明alpha⑨ 丝绒sheen            (row 2)
 *   「②」上会播 UV.offset 示意贴图位移。
 */

import * as THREE from "three";
import { onMounted, onUnmounted } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** 远端示例贴图（需网络）；任选失败则下面用 Canvas 画一张类似的 */
const SAMPLE = {
  uvGrid: "https://threejs.org/examples/textures/uv_grid_opengl.jpg",
  /** 仓库内为全小写 waternormals.jpg，waterNormals 会 404 */
  waterNormal: "https://threejs.org/examples/textures/waternormals.jpg",
  brickDiffuse: "https://threejs.org/examples/textures/brick_diffuse.jpg",
  brickBump: "https://threejs.org/examples/textures/brick_bump.jpg",
  disturb: "https://threejs.org/examples/textures/disturb.jpg",
} as const;

/** requestAnimationFrame 句柄（卸载时 cancel） */
let rafId = 0;
let renderer!: THREE.WebGLRenderer;
let resizeHandler: () => void;

/** WebGLTexture 必须从内存显式.dispose，否则泄漏；这里统一管理 */
const texturesPendingDispose: THREE.Texture[] = [];
const disposableMaterials: THREE.Material[] = [];

function registerTex<T extends THREE.Texture>(t: T): T {
  texturesPendingDispose.push(t);
  return t;
}

function registerMat<M extends THREE.Material>(m: M): M {
  disposableMaterials.push(m);
  return m;
}

/** 单次 TextureLoader.load 包一层 Promise */

async function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
): Promise<THREE.Texture | null> {
  try {
    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    return registerTex(tex);
  } catch {
    console.warn("[TextureLoader] 加载失败:", url);
    return null;
  }
}

/** 后备漫反射：棋盘 Canvas */
function createFallbackColorCanvas(): THREE.Texture {
  const px = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  const step = px / 4;
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#cca060" : "#4058a8";
      ctx.fillRect(i * step, j * step, step, step);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return registerTex(tex);
}

/** normal 占位（紫） */
function createFallbackNormal(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#8080ff";
    ctx.fillRect(0, 0, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return registerTex(tex);
}

/** emissiveMap：黑底亮字，仅发光区域亮 */
function createEmissiveMaskTexture(): THREE.Texture {
  const w = 128;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px monospace";
  ctx.fillText("EMISSIVE", 8, 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return registerTex(tex);
}

/** alphaMap：条纹遮罩 → 镂空感（须 transparent:true） */
function createStripeAlphaMask(): THREE.Texture {
  const w = 64;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");

  for (let y = 0; y < h; y++) {
    const on = Math.floor(y / 10) % 2 === 0;
    ctx.fillStyle = on ? "#0fffff" : "#0f0f0f";
    ctx.fillRect(0, y, w, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return registerTex(tex);
}

/** 共用：铺满重复 + 线性空间 / 线性数据（不传 null 则用默认） */
function applyTexCommon(
  t: THREE.Texture,
  repeats: readonly [number, number],
  colorSpace: THREE.ColorSpace | null,
): void {
  /** S/T 方向重复排布纹理，接缝处可选用 RepeatWrapping / MirroredRepeat */
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  /** repeat：(u,v) 铺满几次；越大纹路越碎 */
  t.repeat.set(repeats[0], repeats[1]);
  /** 有色图一般用 SRGB；法线 / 粗糙 / 高光等通道用 NoColorSpace 不参与伽马校正 */
  if (colorSpace !== null) t.colorSpace = colorSpace;
}

/** Promise.all 解包后要用的全部 Texture 手柄 */
type Bundle = {
  uvDiffuse: THREE.Texture;
  waterNormal: THREE.Texture;
  roughFromUv: THREE.Texture;
  brickColor: THREE.Texture;
  brickBump: THREE.Texture;
  disturb: THREE.Texture;
  emissiveMask: THREE.Texture;
  alphaStripe: THREE.Texture;
};

async function loadTextureBundle(): Promise<Bundle> {
  /** 把同一个 manager 塞进 loader，可多资源统一 onLoad/onProgress/onError */
  const loader = new THREE.TextureLoader();
  const mgr = new THREE.LoadingManager();
  loader.manager = mgr;
  let totalItems = 0;
  mgr.onStart = (_url, _loaded, itemsTotal) => {
    totalItems = itemsTotal ?? 0;
    console.info(`[LoadingManager] 开始 ${totalItems} 张贴图`);
  };
  mgr.onLoad = () => {
    console.info("[LoadingManager] 全部条目结束");
  };
  mgr.onError = (url?: string) => {
    console.error("[LoadingManager] 条目失败", url);
  };

  /** 斜视时更清晰；设备上限各不相同 */
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /** Promise.all：五张远端图并行；失败项由 ?? 接住 */
  const [uv, wa, brD, brB, dis] = await Promise.all([
    loadTexture(loader, SAMPLE.uvGrid),
    loadTexture(loader, SAMPLE.waterNormal),
    loadTexture(loader, SAMPLE.brickDiffuse),
    loadTexture(loader, SAMPLE.brickBump),
    loadTexture(loader, SAMPLE.disturb),
  ]);

  let uvDiffuse = uv ?? createFallbackColorCanvas();
  applyTexCommon(uvDiffuse, [5, 3], THREE.SRGBColorSpace);
  uvDiffuse.anisotropy = maxAniso;

  let normalW = wa ?? createFallbackNormal();
  applyTexCommon(normalW, [5, 3], THREE.NoColorSpace);

  /** 粗糙度图为数据通道（白糙黑亮），clone uv 棋盘作示意；必须 NoColorSpace */
  const roughFromUv = registerTex(uvDiffuse.clone());
  roughFromUv.needsUpdate = true;
  roughFromUv.colorSpace = THREE.NoColorSpace;

  let brickColor = brD ?? createFallbackColorCanvas();
  applyTexCommon(brickColor, [4, 2], THREE.SRGBColorSpace);
  brickColor.anisotropy = maxAniso;

  let brickBump = brB ?? createFallbackNormal();
  applyTexCommon(brickBump, [4, 2], THREE.NoColorSpace);

  let disturb = dis ?? createFallbackNormal();
  applyTexCommon(disturb, [5, 5], THREE.NoColorSpace);

  const emissiveMask = createEmissiveMaskTexture();
  const alphaStripe = createStripeAlphaMask();

  return {
    uvDiffuse,
    waterNormal: normalW,
    roughFromUv,
    brickColor,
    brickBump,
    disturb,
    emissiveMask,
    alphaStripe,
  };
}

/** col ∈ [0..2]，row ∈ [0..2]，中心列对齐世界原点（x）；z 负数往屏幕里排 */
function placeSphere(mesh: THREE.Mesh, col: number, row: number): void {
  const colSpread = 5.2;
  const rowSpread = -4.8;
  const colsTotal = 3;
  mesh.position.x = (col - (colsTotal - 1) / 2) * colSpread;
  mesh.position.z = row * rowSpread;
}

onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101018);

  /** 摄像机：fov↑视野更宽近大远小更明显；近平面别贴地太近防 z-fighting */
  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    0.1,
    250,
  );
  camera.position.set(0, 11, 28);
  camera.lookAt(0, 2, -4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  /** retina 上到 2 即可，再高费电 */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  document.getElementById("app")?.appendChild(renderer.domElement);

  scene.add(new THREE.GridHelper(48, 48, 0x3a4055, 0x22222a));

  /** 半球光：天/地双色环境；环境光：无方向补光；平行光：主方向阴影与明暗 */
  scene.add(new THREE.HemisphereLight(0x7ca0d4, 0x1a1620, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const sun = new THREE.DirectionalLight(0xfff6ec, 1.35);
  sun.position.set(10, 20, 8);
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  /** 轨道围绕中心点；略往 -z 指，才能同时看到三行球 */
  controls.target.set(0, 2.2, -4);

  const meshList: THREE.Mesh[] = [];
  /** 第二颗球素材：用来做 map.offset UV 漂移 */
  let uvScrollSphere: THREE.Mesh | undefined;

  /** 普通球体面数；高精度球只做 displacement（需细分顶点才能把顶点位移拉出起伏） */
  const geoS = new THREE.SphereGeometry(1.45, 64, 32);
  const geoHighSeg = new THREE.SphereGeometry(1.42, 128, 64);

  void loadTextureBundle().then((T) => {
    /** 下面九段 materials.name 与材质卡槽；序号见文件头示意 */
    const mats: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> =
      [];

    /** ① 只有 map：把图片当「涂料」糊在表面上 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "仅 map(uv)",
          roughness: 0.15,
          metalness: 0.05,
          map: T.uvDiffuse,
        }),
      ),
    );

    /** ② normalMap：法线图骗眼睛有凹凸（仍不改变真实顶点） */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "map + normalMap",
          roughness: 0.4,
          metalness: 0.06,
          normalMap: T.waterNormal,
          normalScale: new THREE.Vector2(0.75, 0.75),
        }),
      ),
    );

    /** ③ roughnessMap：灰度图控制「磨砂程度」各处不同 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "map + roughnessMap",
          roughness: 0.12,
          metalness: 0.05,
          map: T.uvDiffuse,
          roughnessMap: T.roughFromUv,
        }),
      ),
    );

    /** ④ bumpMap：比 normal 老式，只沿法线微调光照 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "map + bumpMap(砖)",
          roughness: 0.55,
          metalness: 0,
          map: T.brickColor,
          bumpMap: T.brickBump,
          bumpScale: 0.08,
        }),
      ),
    );

    /** 清漆自己的法线与表面法线可分开展示；clone 后要单独 repeat，dispose 一起走 */
    const ccNormal = registerTex(T.waterNormal.clone());
    ccNormal.repeat.set(3, 3);
    /** ⑤ 物理清漆：表面再叠一层镜面 + 独立法线图 */
    mats.push(
      registerMat(
        new THREE.MeshPhysicalMaterial({
          name: "clearcoat + clearcoatNormalMap",
          roughness: 0.35,
          metalness: 0.02,
          map: T.uvDiffuse,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          clearcoatNormalMap: ccNormal,
          clearcoatNormalScale: new THREE.Vector2(0.45, 0.85),
        }),
      ),
    );

    /** ⑥ emissive：不受灯影响的发光分量；emissiveMap 决定哪里亮 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "emissive + emissiveMap",
          color: 0x222122,
          roughness: 0.7,
          metalness: 0,
          emissive: 0xff6600,
          emissiveMap: T.emissiveMask,
          emissiveIntensity: 2.2,
        }),
      ),
    );

    /** ⑦ displacementMap：真要顶点位移，必须高分段几何体 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "displacementMap + map",
          color: 0x88cc99,
          roughness: 0.45,
          metalness: 0,
          map: T.uvDiffuse,
          displacementMap: T.disturb,
          displacementScale: 0.15,
          displacementBias: -0.05,
        }),
      ),
    );

    /** ⑧ alphaMap：镂空遮罩（须 transparent）；alphaTest 可防止排序鬼影 */
    mats.push(
      registerMat(
        new THREE.MeshStandardMaterial({
          name: "alphaMap + transparent",
          color: 0x44aaff,
          roughness: 0.55,
          metalness: 0,
          transparent: true,
          alphaTest: 0.02,
          alphaMap: T.alphaStripe,
          side: THREE.DoubleSide,
        }),
      ),
    );

    /** ⑨ MeshPhysicalMaterial：清漆 roughness / sheen 丝绒边光（布料车漆） */
    mats.push(
      registerMat(
        new THREE.MeshPhysicalMaterial({
          name: "清漆车漆(Physical)",
          roughness: 0.25,
          metalness: 0.15,
          map: T.brickColor,
          clearcoat: 0.94,
          clearcoatRoughness: 0.12,
          sheen: 0.35,
          sheenRoughness: 0.42,
          sheenColor: new THREE.Color(0xffffff),
        }),
      ),
    );

    /** idx → (col,row)：每行三只，第三行再往 -z */
    mats.forEach((mat, idx) => {
      const geo = mat.name.includes("displacement") ? geoHighSeg : geoS;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.55;
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      placeSphere(mesh, col, row);
      scene.add(mesh);
      meshList.push(mesh);
      if (idx === 1) uvScrollSphere = mesh;
    });

    /** 地面：clone 纹理以免与球共用同一 repeat */
    const floorGrass = registerTex(T.uvDiffuse.clone());
    floorGrass.wrapS = THREE.RepeatWrapping;
    floorGrass.wrapT = THREE.RepeatWrapping;
    floorGrass.repeat.set(22, 22);
    floorGrass.colorSpace = THREE.SRGBColorSpace;
    floorGrass.needsUpdate = true;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      registerMat(
        new THREE.MeshStandardMaterial({
          color: 0xdddddd,
          roughness: 0.94,
          metalness: 0,
          map: floorGrass,
        }),
      ),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
  });

  let tScroll = 0;
  function animate() {
    tScroll += 0.03;
    /** 只动第二颗球的 map.offset，示意「贴图在平面上拖动」 */
    if (uvScrollSphere?.material instanceof THREE.MeshStandardMaterial) {
      const m = uvScrollSphere.material;
      if (m.map) m.map.offset.x = Math.sin(tScroll) * 0.1;
    }
    meshList.forEach((m) => {
      m.rotation.y += 0.0035;
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
  /** 打断 RAF + 卸载 resize；GPU 纹理/材质必须 dispose */
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeHandler);
  texturesPendingDispose.forEach((t) => t.dispose());
  texturesPendingDispose.length = 0;
  disposableMaterials.forEach((m) => m.dispose());
  disposableMaterials.length = 0;
  renderer.dispose();
  renderer.domElement.remove();
});
</script>
