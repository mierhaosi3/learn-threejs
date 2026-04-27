<template></template>

<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
//轨道控制器
// 场景
const scene = new THREE.Scene();
// 相机
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1, //进平面
  1000, //远平面
);

// 渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app")?.appendChild(renderer.domElement);

// 添加直接坐标辅助器？
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 几何体
const geometry = new THREE.BoxGeometry(1, 1, 1);

// 材质
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const material2 = new THREE.MeshBasicMaterial({ color: 0x0000ff });
// 网格
// 父子关系
const parentMesh = new THREE.Mesh(geometry, material2);
const mesh = new THREE.Mesh(geometry, material);
// 添加到场景
scene.add(parentMesh);
parentMesh.add(mesh);

// 绝对定位的概念
parentMesh.position.x = -1;
mesh.position.x = 2;
camera.position.z = 5;
camera.position.y = 1;
camera.position.x = 2;
camera.lookAt(0, 0, 0);

// 缩放
parentMesh.scale.y = 2;
mesh.scale.y = 1 / 2;

// 旋转
mesh.rotation.x = Math.PI / 4;
// 注册轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
// 设置阻尼
controls.enableDamping = true;
controls.dampingFactor = 0.25;
// controls.autoRotate = true;
// 渲染
renderer.render(scene, camera);
function animate() {
  controls.update();
  requestAnimationFrame(animate);
  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerWidth;
  camera.updateProjectionMatrix();
});

let enventObj = {
  FullScreen: function () {
    document.body.requestFullscreen();
    console.log("FullScreen");
  },
  ExitFullScreen: function () {
    document.exitFullscreen();
    console.log("ExitFullScreen");
  },
};
const gui = new GUI();
gui.add(enventObj, "FullScreen");
gui.add(enventObj, "ExitFullScreen");
let floder = gui.addFolder("mesh");
floder.add(mesh.position, "y", -5, 5);
floder.add(mesh.position, "z", -5, 5);
floder.add(mesh.position, "x", -5, 5);
floder.add(mesh.rotation, "x", -5, 5);

gui.add(parentMesh.material, "wireframe");
gui.add(mesh.material, "wireframe");
</script>
