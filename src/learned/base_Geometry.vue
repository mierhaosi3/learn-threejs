<template></template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 场景：可以理解为 3D 世界的“容器”
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// 相机：决定我们从哪里、以什么角度看这个 3D 世界
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);
// 网格辅助线，方便观察空间位置
scene.add(new THREE.GridHelper(20, 20));

// 渲染器：把场景 + 相机 渲染成浏览器里的画面（canvas）
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app")?.appendChild(renderer.domElement);
// 关键：适配高分屏（如 Retina）
// devicePixelRatio 通常是 1/2/3，值越大画面越清晰，但性能消耗也会更高
renderer.setPixelRatio(window.devicePixelRatio);

// 常见几何体集合
const geometries: Array<{ name: string; geo: THREE.BufferGeometry }> = [
  { name: "Box", geo: new THREE.BoxGeometry(1.2, 1.2, 1.2) },
  { name: "Sphere", geo: new THREE.SphereGeometry(0.7, 24, 16) },
  { name: "Plane", geo: new THREE.PlaneGeometry(1.4, 1.2) },
  { name: "Circle", geo: new THREE.CircleGeometry(0.7, 32) },
  { name: "Cone", geo: new THREE.ConeGeometry(0.7, 1.2, 24) },
  { name: "Cylinder", geo: new THREE.CylinderGeometry(0.6, 0.6, 1.3, 24) },
  { name: "Torus", geo: new THREE.TorusGeometry(0.6, 0.22, 16, 40) },
  { name: "TorusKnot", geo: new THREE.TorusKnotGeometry(0.45, 0.15, 80, 12) },
  { name: "Dodecahedron", geo: new THREE.DodecahedronGeometry(0.7) },
  { name: "Octahedron", geo: new THREE.OctahedronGeometry(0.8) },
];

const material = new THREE.MeshNormalMaterial({ wireframe: true });
const spacing = 2.6;
const colCount = 5;
const meshList: THREE.Mesh[] = [];

geometries.forEach((item, i) => {
  // 几何体 + 材质 = 网格（可渲染对象）
  const mesh = new THREE.Mesh(item.geo, material);
  const col = i % colCount;
  const row = Math.floor(i / colCount);
  // 把模型排成网格，避免堆叠在一起
  mesh.position.set((col - 2) * spacing, (0.5 - row) * spacing, 0);
  scene.add(mesh);
  meshList.push(mesh);
});

// 把相机拉远一点，确保能看到全部几何体
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// 轨道控制器：鼠标拖拽旋转、滚轮缩放
const controls = new OrbitControls(camera, renderer.domElement);
// 阻尼：让相机运动有“惯性”，手感更顺滑
controls.enableDamping = true;
function animate() {
  meshList.forEach((mesh, i) => {
    mesh.rotation.x += 0.004 + i * 0.0002;
    mesh.rotation.y += 0.006 + i * 0.0002;
  });
  // 若开启阻尼，每一帧都要 update
  controls.update();
  // 告诉浏览器下一帧继续调用 animate，形成动画循环
  requestAnimationFrame(animate);
  // 真正执行渲染
  renderer.render(scene, camera);
}
animate();

// 浏览器窗口变化时，同步更新渲染尺寸和相机宽高比
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
</script>
