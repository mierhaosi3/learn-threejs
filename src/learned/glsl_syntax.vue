<template>
  <div class="glsl-lab">
    <aside class="panel lesson-panel">
      <header class="panel-head">
        <span class="badge">GLSL 语法课</span>
        <span class="counter">{{ current + 1 }} / {{ lessons.length }}</span>
      </header>

      <h2>{{ lesson.title }}</h2>
      <p class="summary">{{ lesson.summary }}</p>

      <ul class="points">
        <li v-for="(pt, i) in lesson.points" :key="i">{{ pt }}</li>
      </ul>

      <pre class="code"><code>{{ lesson.code }}</code></pre>

      <p class="hint">{{ lesson.hint }}</p>

      <div class="nav">
        <button type="button" :disabled="current === 0" @click="prev">
          ← 上一课
        </button>
        <button
          type="button"
          :disabled="current === lessons.length - 1"
          @click="next"
        >
          下一课 →
        </button>
      </div>
    </aside>

    <aside class="panel editor-panel">
      <header class="panel-head">
        <span class="badge">动手练习</span>
        <span class="counter">{{ editorTabLabel }}</span>
      </header>

      <div class="tab-row">
        <button
          type="button"
          class="tab"
          :class="{active: shaderTab === 'fragment'}"
          @click="shaderTab = 'fragment'"
        >
          片元着色器
        </button>
        <button
          type="button"
          class="tab"
          :class="{active: shaderTab === 'vertex'}"
          @click="shaderTab = 'vertex'"
        >
          顶点着色器
        </button>
      </div>

      <!-- 结构化练习：完整代码预览 + 下方参数表单 -->
      <template v-if="!useFullEditor">
        <div class="shader-preview">
          <p class="preview-label">
            {{ shaderTab === "vertex" ? "顶点" : "片元" }}着色器 ·
            完整代码（只读）
          </p>
          <pre class="preview-code"><code>{{ previewSource }}</code></pre>
        </div>

        <div v-if="activeFields.length" class="param-form">
          <h3 class="param-heading">修改参数</h3>
          <p class="param-desc">
            上方代码完整只读；【 】内是你下方填写的值 · Enter 运行
          </p>

          <div v-if="colorPreviewCss" class="color-preview">
            <span class="color-preview-label">当前颜色预览</span>
            <span class="color-swatch" :style="{background: colorPreviewCss}" />
            <span class="color-preview-rgba">{{ colorPreviewLabel }}</span>
          </div>

          <div v-for="field in activeFields" :key="field.id" class="param-row">
            <label class="param-label" :for="'field-' + field.id">
              {{ field.label ?? field.id }}
            </label>
            <input
              :id="'field-' + field.id"
              v-model="fieldValues[field.id]"
              class="param-input"
              :class="{warn: !!fieldWarning(field)}"
              spellcheck="false"
              :placeholder="field.default"
              @keydown.enter.prevent="applyUserShader"
            />
            <p v-if="field.paramHint" class="param-note">
              {{ field.paramHint }}
            </p>
            <p v-if="fieldWarning(field)" class="param-warn">
              {{ fieldWarning(field) }}
            </p>
          </div>
        </div>

        <p v-else-if="!hasEditableFields" class="readonly-tip">
          本课代码由框架提供，请阅读左侧说明
        </p>
      </template>

      <!-- 高级课：完整 shader 编辑 -->
      <textarea
        v-else
        v-model="activeEdit"
        class="shader-input"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        @keydown.enter.exact.prevent="applyUserShader"
      />

      <div class="editor-actions">
        <button
          v-if="hasEditableFields || useFullEditor"
          type="button"
          class="primary"
          @click="applyUserShader"
        >
          运行
        </button>
        <button
          v-if="hasEditableFields || useFullEditor"
          type="button"
          @click="resetEditor"
        >
          重置本课
        </button>
      </div>
      <p v-if="hasEditableFields || useFullEditor" class="shortcut">
        在输入框按 Enter 运行
      </p>

      <p v-if="shaderError" class="shader-error">{{ shaderError }}</p>
      <p v-else-if="shaderApplied" class="shader-ok">
        着色器已应用，看中间画面变化
      </p>

      <details class="ref">
        <summary>本课可用变量</summary>
        <ul>
          <li v-for="(v, i) in lesson.available" :key="i">
            <code>{{ v }}</code>
          </li>
        </ul>
      </details>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * GLSL 语法交互教程：每课改 shader，左侧面板讲一个知识点。
 * 方向键 ← → 也可切换课程。
 */
import * as THREE from "three";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import type {EditorLine, EditorSegmentField} from "./glsl_lesson_shared";
import {lessons} from "./glsl_lessons";

const current = ref(0);
const shaderTab = ref<"vertex" | "fragment">("fragment");
const editVertex = ref("");
const editFragment = ref("");
const fieldValues = ref<Record<string, string>>({});
const shaderError = ref("");
const shaderApplied = ref(false);

const activeEdit = computed({
  get: () =>
    shaderTab.value === "vertex" ? editVertex.value : editFragment.value,
  set: (v: string) => {
    if (shaderTab.value === "vertex") editVertex.value = v;
    else editFragment.value = v;
  },
});

function trimShader(src: string) {
  return src.trim().replace(/^\s+/gm, "");
}

function initFieldValues(index: number) {
  const L = lessons[index]!;
  const next: Record<string, string> = {};
  if (L.editor && !L.editor.full) {
    for (const lines of [L.editor.vertex, L.editor.fragment]) {
      if (!lines) continue;
      for (const line of lines) {
        for (const seg of line.segments) {
          if (seg.type === "field") next[seg.id] = seg.default;
        }
      }
    }
  }
  fieldValues.value = next;
}

function buildShaderFromLines(
  lines: EditorLine[] | undefined,
  values: Record<string, string>,
): string | null {
  if (!lines?.length) return null;
  return lines
    .map((line) =>
      line.segments
        .map((seg) =>
          seg.type === "fixed" ? seg.text : (values[seg.id] ?? seg.default),
        )
        .join(""),
    )
    .join("\n");
}

function compileEditorShaders(index: number) {
  const L = lessons[index]!;
  if (L.editor?.full) {
    return {vert: editVertex.value, frag: editFragment.value};
  }
  return {
    vert:
      buildShaderFromLines(L.editor?.vertex, fieldValues.value) ??
      trimShader(L.vertexShader),
    frag:
      buildShaderFromLines(L.editor?.fragment, fieldValues.value) ??
      trimShader(L.fragmentShader),
  };
}

function syncEditorFromLesson(index = current.value) {
  initFieldValues(index);
  const {vert, frag} = compileEditorShaders(index);
  editVertex.value = vert;
  editFragment.value = frag;
  shaderError.value = "";
  shaderApplied.value = false;
}

type ShaderDiagnostics = {
  runnable?: boolean;
  programLog?: string;
  vertexShader?: {log?: string};
  fragmentShader?: {log?: string};
};

function getShaderDiagnostics(
  mat: THREE.ShaderMaterial,
): ShaderDiagnostics | undefined {
  return (
    mat as THREE.ShaderMaterial & {program?: {diagnostics?: ShaderDiagnostics}}
  ).program?.diagnostics;
}

function applyUserShader() {
  if (!renderer || !mesh || !camera || !scene) return;

  const {vert, frag} = compileEditorShaders(current.value);
  editVertex.value = vert;
  editFragment.value = frag;
  const prevVert = material.vertexShader;
  const prevFrag = material.fragmentShader;

  material.vertexShader = vert;
  material.fragmentShader = frag;
  material.needsUpdate = true;

  renderer.compile(mesh, camera, scene);

  const diag = getShaderDiagnostics(material);
  if (diag?.runnable === false) {
    material.vertexShader = prevVert;
    material.fragmentShader = prevFrag;
    material.needsUpdate = true;
    shaderError.value =
      diag.fragmentShader?.log ||
      diag.vertexShader?.log ||
      diag.programLog ||
      "着色器编译失败，请检查语法";
    shaderApplied.value = false;
    return;
  }

  shaderError.value = "";
  shaderApplied.value = true;
}

function resetEditor() {
  syncEditorFromLesson();
  applyUserShader();
}

const lesson = computed(() => lessons[current.value]!);
const useFullEditor = computed(() => !!lesson.value.editor?.full);

const activeLines = computed((): EditorLine[] => {
  const ed = lesson.value.editor;
  if (!ed || ed.full) return [];
  const lines = shaderTab.value === "vertex" ? ed.vertex : ed.fragment;
  if (lines?.length) return lines;
  const src =
    shaderTab.value === "vertex"
      ? lesson.value.vertexShader
      : lesson.value.fragmentShader;
  return trimShader(src)
    .split("\n")
    .map((text) => ({segments: [{type: "fixed" as const, text}]}));
});

const hasEditableFields = computed(() => activeFields.value.length > 0);

const activeFields = computed((): EditorSegmentField[] => {
  const list: EditorSegmentField[] = [];
  for (const line of activeLines.value) {
    for (const seg of line.segments) {
      if (seg.type === "field") list.push(seg);
    }
  }
  return list;
});

const previewSource = computed(() =>
  activeLines.value
    .map((line) =>
      line.segments
        .map((seg) => {
          if (seg.type === "fixed") return seg.text;
          const val = fieldValues.value[seg.id] ?? seg.default;
          return `【 ${val} 】`;
        })
        .join(""),
    )
    .join("\n"),
);

const colorFieldIds = ["r", "g", "b", "a"] as const;

const colorPreviewCss = computed(() => {
  if (!activeFields.value.some((f) => f.colorChannel && f.id === "r"))
    return "";
  const clamp = (id: string, fallback: string) => {
    const n = parseFieldNum(fieldValues.value[id] ?? fallback);
    if (n === null) return 0;
    return Math.min(1, Math.max(0, n));
  };
  const r = clamp("r", "0");
  const g = clamp("g", "0");
  const b = clamp("b", "0");
  const a = clamp("a", "1");
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
});

const colorPreviewLabel = computed(() => {
  if (!colorPreviewCss.value) return "";
  return colorFieldIds
    .map(
      (id) =>
        fieldValues.value[id] ??
        activeFields.value.find((f) => f.id === id)?.default ??
        "0",
    )
    .join(", ");
});

function parseFieldNum(raw: string): number | null {
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function fieldWarning(field: EditorSegmentField): string | null {
  const raw = fieldValues.value[field.id] ?? field.default;
  const n = parseFieldNum(raw);
  if (n === null) {
    return "请输入有效数字（建议带小数点，如 0.5 或 1.0）";
  }
  const msgs: string[] = [];
  if (field.colorChannel) {
    if (n > 1) msgs.push("超过 1.0：不会编译报错，但颜色会过曝变亮");
    if (n < 0) msgs.push("小于 0：一般无意义");
  }
  if (/^-?\d+$/.test(raw.trim())) {
    msgs.push("整数会自动当作 float（2 → 2.0），习惯写 2.0 更清晰");
  }
  return msgs.length ? msgs.join("；") : null;
}

const editorTabLabel = computed(() => {
  if (useFullEditor.value) {
    return shaderTab.value === "vertex" ? "顶点" : "片元";
  }
  if (shaderTab.value === "vertex") return "顶点 · 只读";
  return hasEditableFields.value ? "片元 · 可改参数" : "片元 · 只读";
});

let rafId = 0;
let renderer!: THREE.WebGLRenderer;
let material!: THREE.ShaderMaterial;
let mesh!: THREE.Mesh;
let backMesh!: THREE.Mesh;
let scene!: THREE.Scene;
let camera!: THREE.PerspectiveCamera;
let resizeHandler: () => void;
let keyHandler: (e: KeyboardEvent) => void;
let checkerTex!: THREE.CanvasTexture;
const clock = new THREE.Clock();

function createCheckerTexture(): THREE.CanvasTexture {
  const size = 256;
  const cells = 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unsupported");
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#aaccee" : "#334466";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function buildGeometry(index: number): THREE.BufferGeometry {
  if (lessons[index]?.needsAttributeGeo) {
    const geo = new THREE.PlaneGeometry(2.4, 2.4, 1, 1);
    const hues = new Float32Array([1, 0, 0, 1]);
    geo.setAttribute("aHue", new THREE.BufferAttribute(hues, 1));
    return geo;
  }
  return new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
}

function buildMaterial(
  index: number,
  vertexShader?: string,
  fragmentShader?: string,
): THREE.ShaderMaterial {
  const L = lessons[index]!;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: {value: 0},
      uColor: {value: new THREE.Color(0x66ccff)},
      uRot: {value: new THREE.Matrix4()},
      uMap: {value: checkerTex},
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    vertexShader: vertexShader ?? L.vertexShader,
    fragmentShader: fragmentShader ?? L.fragmentShader,
    transparent: !!L.transparent,
    depthWrite: !L.transparent,
    side: THREE.DoubleSide,
  });
}

function applyLesson(index: number) {
  if (!scene) return;

  syncEditorFromLesson(index);
  mesh.geometry.dispose();
  material.dispose();
  mesh.geometry = buildGeometry(index);
  material = buildMaterial(index, editVertex.value, editFragment.value);
  mesh.material = material;
  backMesh.visible = !!lessons[index]?.transparent;
  shaderApplied.value = true;
}

function prev() {
  if (current.value > 0) current.value -= 1;
}

function next() {
  if (current.value < lessons.length - 1) current.value += 1;
}

watch(current, (idx) => {
  shaderTab.value = lessons[idx]?.editor?.defaultTab ?? "fragment";
  applyLesson(idx);
});

onMounted(() => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0f14);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 3.2);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("app")?.appendChild(renderer.domElement);

  checkerTex = createCheckerTexture();

  const backGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const backMat = new THREE.MeshNormalMaterial();
  backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.z = -0.6;
  backMesh.visible = false;
  scene.add(backMesh);

  syncEditorFromLesson(current.value);
  shaderTab.value = lessons[current.value]?.editor?.defaultTab ?? "fragment";
  material = buildMaterial(current.value, editVertex.value, editFragment.value);
  mesh = new THREE.Mesh(buildGeometry(current.value), material);
  scene.add(mesh);
  shaderApplied.value = true;

  const animate = () => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime!.value = t;
    material.uniforms.uColor!.value.setHSL((t * 0.08) % 1, 0.65, 0.55);

    const rot = new THREE.Matrix4().makeRotationZ(t * 0.6);
    material.uniforms.uRot!.value.copy(rot);

    material.uniforms.uResolution!.value.set(
      renderer.domElement.width,
      renderer.domElement.height,
    );

    backMesh.rotation.x = t * 0.7;
    backMesh.rotation.y = t * 0.5;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };
  animate();

  resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.uResolution!.value.set(
      renderer.domElement.width,
      renderer.domElement.height,
    );
  };
  window.addEventListener("resize", resizeHandler);

  keyHandler = (e: KeyboardEvent) => {
    const t = e.target;
    if (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement)
      return;
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };
  window.addEventListener("keydown", keyHandler);
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeHandler);
  window.removeEventListener("keydown", keyHandler);
  mesh.geometry.dispose();
  material.dispose();
  backMesh.geometry.dispose();
  (backMesh.material as THREE.Material).dispose();
  checkerTex.dispose();
  renderer.dispose();
  renderer.domElement.remove();
});
</script>

<style scoped>
.glsl-lab {
  pointer-events: none;
}

.panel {
  pointer-events: auto;
  position: fixed;
  top: 16px;
  z-index: 10;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px 18px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(12, 14, 22, 0.88);
  color: #d6dbe8;
  font-size: 14px;
  line-height: 1.55;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.lesson-panel {
  left: 16px;
  width: min(380px, calc(50vw - 24px));
}

.editor-panel {
  right: 16px;
  width: min(440px, calc(50vw - 24px));
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.badge {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #9ecbff;
}

.counter {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  color: #8b93a8;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #f3f6ff;
}

.summary {
  margin: 0 0 10px;
  color: #b8bfd0;
}

.points {
  margin: 0 0 12px;
  padding-left: 18px;
  color: #c4cad8;
}

.points li + li {
  margin-top: 4px;
}

.code {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}

.code code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  color: #000;
  white-space: pre;
}

.hint {
  margin: 0 0 14px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(102, 204, 255, 0.1);
  border: 1px solid rgba(102, 204, 255, 0.25);
  color: #b8e4ff;
  font-size: 13px;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav button {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #eef2ff;
  cursor: pointer;
  font-size: 13px;
}

.nav button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.nav button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tab-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.tab {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: #aeb6cb;
  font-size: 12px;
  cursor: pointer;
}

.tab.active {
  color: #eef2ff;
  border-color: rgba(102, 204, 255, 0.45);
  background: rgba(102, 204, 255, 0.12);
}

.shader-preview {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.35);
}

.preview-label {
  margin: 0 0 6px;
  font-size: 11px;
  color: #8b93a8;
}

.preview-code {
  margin: 0;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  color: #9aa6bc;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-code code {
  color: inherit;
}

.param-form {
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(102, 204, 255, 0.22);
  background: rgba(102, 204, 255, 0.06);
}

.param-heading {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #e8f4ff;
}

.param-desc {
  margin: 0 0 10px;
  font-size: 11px;
  color: #8b93a8;
}

.color-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
}

.color-preview-label {
  font-size: 11px;
  color: #9aa3b8;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.color-preview-rgba {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  color: #c8d0e0;
}

.param-row {
  margin-bottom: 10px;
}

.param-row:last-child {
  margin-bottom: 0;
}

.param-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #c8d0e0;
}

.param-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff8e7;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
}

.param-input:focus {
  outline: none;
  border-color: rgba(102, 204, 255, 0.55);
}

.param-input.warn {
  border-color: rgba(255, 180, 80, 0.55);
}

.param-note {
  margin: 4px 0 0;
  font-size: 11px;
  color: #7f879c;
}

.param-warn {
  margin: 4px 0 0;
  font-size: 11px;
  color: #ffc896;
  line-height: 1.4;
}

.readonly-tip {
  margin: 0 0 8px;
  font-size: 11px;
  color: #8b93a8;
}

.shader-input {
  width: 100%;
  min-height: 220px;
  flex: 1;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.45);
  color: #000;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  resize: vertical;
  box-sizing: border-box;
  tab-size: 2;
}

.shader-input:focus {
  outline: none;
  border-color: rgba(102, 204, 255, 0.5);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-actions button {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #eef2ff;
  cursor: pointer;
  font-size: 13px;
}

.editor-actions button.primary {
  border-color: rgba(102, 204, 255, 0.45);
  background: rgba(102, 204, 255, 0.18);
}

.editor-actions button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.shortcut {
  margin: 6px 0 0;
  font-size: 11px;
  color: #7f879c;
  text-align: center;
}

.shader-error {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 90, 90, 0.12);
  border: 1px solid rgba(255, 90, 90, 0.35);
  color: #ffb4b4;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
}

.shader-ok {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(80, 200, 120, 0.1);
  border: 1px solid rgba(80, 200, 120, 0.3);
  color: #a8ebc4;
  font-size: 12px;
}

.ref {
  margin-top: 12px;
  font-size: 12px;
  color: #9aa3b8;
}

.ref summary {
  cursor: pointer;
  color: #b8c0d4;
}

.ref ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.ref li + li {
  margin-top: 4px;
}

.ref code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  color: #000;
}

@media (max-width: 960px) {
  .lesson-panel,
  .editor-panel {
    width: calc(100vw - 32px);
    max-height: 42vh;
  }

  .editor-panel {
    top: auto;
    bottom: 16px;
  }

  .shader-input {
    min-height: 140px;
  }
}
</style>
