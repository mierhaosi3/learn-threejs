<template></template>

<script setup lang="ts">
import * as THREE from "three";
import {onMounted, onUnmounted} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

let rafId = 0;
let renderer: THREE.WebGLRenderer;
let resizeHandler: () => void;

onMounted(() => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151520);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(0, 12, 22);
  camera.lookAt(0, 2, 0);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // 允许渲染器开影子
  renderer.shadowMap.enabled = true;
  // 设置影子类型
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 设置色值映射
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  document.getElementById("app")?.appendChild(renderer.domElement);

  scene.add(new THREE.GridHelper(30, 30, 0x444455, 0x2a2a35));

  // ─── 半球光 HemisphereLight ───
  // 参数：(天空色, 地面色, intensity)
  // 从上到下混合两色 → 室内外「天光 + 地面对反射」的简单近似，不产生阴影
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a4a66, 0.8);
  scene.add(hemi);

  // ─── 环境光 AmbientLight ───
  // 参数：(颜色, intensity)
  // 四面八方均匀提亮，不产生方向与阴影（避免只靠定向光导致-背光面全黑）
  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(ambient);

  // ─── 平行光 DirectionalLight ───
  // 光线互相平行 → 常用于太阳 / 远距离主光；可产生阴影（需 castShadow）
  const sunDir = new THREE.Vector3(-6, -10, -4).normalize();
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
  sun.position.copy(sunDir.multiplyScalar(-1).multiplyScalar(22));
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  // ─── 点光源 PointLight ───
  // 从一点向四面八方衰减；参数：(颜色, intensity, distance, decay)
  // distance：0 表示无限远（不衰减衰减项仍有）；decay 常用 2（物理更接近平方反比）
  const pointLt = new THREE.PointLight(0x44ffff, 88, 32, 2);
  pointLt.position.set(-8, 5, 3);
  pointLt.castShadow = true;
  pointLt.shadow.mapSize.set(1024, 1024);
  scene.add(pointLt);

  // ─── 聚光灯 SpotLight ───
  // 圆锥形光锥；参数：(颜色, intensity, distance, angle, penumbra, decay)
  // angle：圆锥半角（弧度）；penumbra：锥缘柔化 0~1
  const spotLt = new THREE.SpotLight(0x588bfb, 28, 40, Math.PI / 6, 0.35, 2);
  spotLt.position.set(10, 14, -2);
  spotLt.target.position.set(-2, 0, -4);
  spotLt.castShadow = true;
  spotLt.shadow.mapSize.set(1024, 1024);
  scene.add(spotLt);
  scene.add(spotLt.target);

  // 可视化光源方向（仅学习用）；实际项目可删掉以省性能
  const helpers = [
    new THREE.DirectionalLightHelper(sun, 3, 0xffdd88),
    new THREE.PointLightHelper(pointLt, 0.6, 0x44ffff),
    new THREE.SpotLightHelper(spotLt, 0xff6655),
  ];
  helpers.forEach((h) => scene.add(h));

  const matStd = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.15,
  });

  const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 2.8), matStd);
  box.position.set(-4, 1.41, -1);
  box.castShadow = true;
  box.receiveShadow = true;

  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 3.6, 40),
    matStd,
  );
  cyl.position.set(4, 1.81, -1);

  cyl.castShadow = true;
  cyl.receiveShadow = true;

  const torus = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.35, 0.45, 120, 16),
    matStd,
  );
  torus.position.set(0, 2.35, -4);
  torus.castShadow = true;
  torus.receiveShadow = true;

  scene.add(box, cyl, torus);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      color: 0x2a2a38,
      roughness: 0.95,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 2, -1);

  const clock = new THREE.Clock();

  function animate() {
    const t = clock.getElapsedTime();
    pointLt.position.x = Math.cos(t * 0.9) * 8;
    pointLt.position.z = Math.sin(t * 0.9) * 8 + 2;
    spotLt.position.x = 8 + Math.sin(t * 0.4) * 4;
    spotLt.target.position.x = Math.sin(t * 0.5) * 3;
    box.rotation.y += 0.008;
    cyl.rotation.y += 0.006;
    torus.rotation.x += 0.005;
    torus.rotation.y += 0.007;
    helpers.forEach((h) => h.update?.());
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
  renderer.dispose();
  renderer.domElement.remove();
});
</script>
