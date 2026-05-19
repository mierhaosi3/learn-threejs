/** GLSL 教程共享：类型、编辑器行模板、标准 shader */

export interface EditorSegmentFixed {
  type: "fixed";
  text: string;
}
export interface EditorSegmentField {
  type: "field";
  id: string;
  default: string;
  label?: string;
  colorChannel?: boolean;
  paramHint?: string;
}
export type EditorSegment = EditorSegmentFixed | EditorSegmentField;
export interface EditorLine {
  segments: EditorSegment[];
}
export interface LessonEditor {
  defaultTab?: "vertex" | "fragment";
  vertex?: EditorLine[];
  fragment?: EditorLine[];
  /** 第 16 课起：完整 textarea */
  full?: boolean;
}
export interface Lesson {
  title: string;
  summary: string;
  points: string[];
  code: string;
  hint: string;
  available: string[];
  vertexShader: string;
  fragmentShader: string;
  editor?: LessonEditor;
  needsAttributeGeo?: boolean;
  transparent?: boolean;
}

export const STD_VERT = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const STD_FRAG_BLUE = `
  void main() {
    gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0);
  }
`;

export const FRAG_UV_GRAD = `
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(vUv.x, vUv.y, 0.2, 1.0);
  }
`;

export const VERT_UV = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function fragColorLines(
  r = "0.25",
  g = "0.55",
  b = "0.95",
  a = "1.0",
): EditorLine[] {
  return [
    {segments: [{type: "fixed", text: "void main() {"}]},
    {
      segments: [
        {type: "fixed", text: "  gl_FragColor = vec4("},
        {
          type: "field",
          id: "r",
          default: r,
          label: "红色 R",
          colorChannel: true,
          paramHint: "红通道，常规 0.0 ~ 1.0",
        },
        {type: "fixed", text: ", "},
        {
          type: "field",
          id: "g",
          default: g,
          label: "绿色 G",
          colorChannel: true,
          paramHint: "绿通道，常规 0.0 ~ 1.0",
        },
        {type: "fixed", text: ", "},
        {
          type: "field",
          id: "b",
          default: b,
          label: "蓝色 B",
          colorChannel: true,
          paramHint: "蓝通道，常规 0.0 ~ 1.0",
        },
        {type: "fixed", text: ", "},
        {
          type: "field",
          id: "a",
          default: a,
          label: "透明度 A",
          colorChannel: true,
          paramHint: "1.0 完全不透明，0.0 全透明",
        },
        {type: "fixed", text: ");"}],
    },
    {segments: [{type: "fixed", text: "}"}]},
  ];
}

export const shaderIntroVertexLines: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ══ 顶点着色器（Three.js 字段名：vertexShader）══"}]},
  {segments: [{type: "fixed", text: "// 顶点 = 几何体的角点（平面有 4 个顶点）"}]},
  {segments: [{type: "fixed", text: "// 这段 GLSL 每个顶点跑一遍 → 输出 gl_Position（点在屏幕哪）"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const shaderIntroFragmentLines: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ══ 片元着色器（Three.js 字段名：fragmentShader）══"}]},
  {segments: [{type: "fixed", text: "// 片元 ≈ 像素，屏幕上的小格子"}]},
  {segments: [{type: "fixed", text: "// 这段 GLSL 每个像素跑一遍 → 输出 gl_FragColor（涂什么色）"}]},
  {segments: [{type: "fixed", text: "// 中间蓝色平面 = 下面这段代码跑出来的"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0);"}]},
  {segments: [{type: "fixed", text: "}"}]},
];

export const vertexPosLines: EditorLine[] = [
  {segments: [{type: "fixed", text: "void main() {"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const typeLessonVertex: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ── 顶点着色器（本课可先略读）──"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// Three.js 给每个顶点自带 uv（vec2）= 这个角点在平面上的 UV 地址",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "// varying vec2 vUv = 声明「要把 UV 传给片元 shader」（第 11 课详讲 varying）",
      },
    ],
  },
  {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  vUv = uv;  // 把顶点的 uv 存起来，GPU 会在中间自动插值"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  // ↓ 第 3 课照抄，决定顶点在屏幕哪——本课不管它",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const typeLessonFragment: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ── 片元着色器（本课重点：渐变怎么来的）──"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// vUv = 当前像素处的 UV 地址（vec2 = 两个 float：.x 和 .y）",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "// 左 0 → 右 1 的是 vUv.x；下 0 → 上 1 的是 vUv.y",
      },
    ],
  },
  {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {
    segments: [
      {type: "fixed", text: "  gl_FragColor = vec4(vUv.x, vUv.y, "},
      {type: "field", id: "blue", default: "0.2", label: "蓝色底"},
      {type: "fixed", text: ", 1.0);"},
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "  //        ↑红=vUv.x  ↑绿=vUv.y  ↑蓝=固定  ↑不透明",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "  // 左下(0,0)=暗  右下(1,0)=红  左上(0,1)=绿  右上(1,1)=黄",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const keywordLessonFragment: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ── 关键字 / 修饰符（第 5 课）──"}]},
  {segments: [{type: "fixed", text: "// void      函数无返回值 → void main()"}]},
  {segments: [{type: "fixed", text: "// uniform   全员相同，JS 传入 → uniform float uTime;"}]},
  {segments: [{type: "fixed", text: "// attribute  每顶点不同（只在顶点 shader）→ attribute vec3 position;"}]},
  {segments: [{type: "fixed", text: "// varying   顶点写、片元读、中间插值 → varying vec2 vUv;"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "uniform float uTime;"}]},
  {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  float pulse = sin(uTime) * 0.5 + 0.5;"}]},
  {segments: [{type: "fixed", text: "  gl_FragColor = vec4(vUv, pulse, 1.0);"}]},
  {segments: [{type: "fixed", text: "}"}]},
];

export const keywordLessonVertex: EditorLine[] = [
  {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  vUv = uv;  // uv 是 attribute vec2（内置）"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const builtinLessonFragment: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ── 片元 shader 内置变量 ──"}]},
  {segments: [{type: "fixed", text: "// gl_FragColor  必须赋值，输出颜色 vec4"}]},
  {segments: [{type: "fixed", text: "// gl_FragCoord  当前像素坐标（第 20 课）"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0);"}]},
  {segments: [{type: "fixed", text: "}"}]},
];

export const builtinLessonVertex: EditorLine[] = [
  {segments: [{type: "fixed", text: "// ── 顶点 shader：内置变量 + Three 自动注入 ──"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// attribute vec3 position  模型上这个顶点的 xyz（本地坐标）",
      },
    ],
  },
  {segments: [{type: "fixed", text: "// attribute vec2 uv       这个顶点的 UV 地址"}]},
  {segments: [{type: "fixed", text: ""}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// uniform mat4 modelViewMatrix  【模型视图矩阵】Three 每帧自动传入",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "//   model=模型 + view=相机 → 把点从「模型身上」搬到「相机眼前」",
      },
    ],
  },
  {segments: [{type: "fixed", text: ""}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// uniform mat4 projectionMatrix 【投影矩阵】Three 每帧自动传入",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "//   projection=投影 → 像相机镜头，3D 压成屏幕 2D（近大远小）",
      },
    ],
  },
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "// gl_Position  必须赋值 → 这个顶点最终在屏幕哪"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "  //            ③ 镜头投影      ② 搬到相机前    ① 模型上的点",
      },
    ],
  },
  {segments: [{type: "fixed", text: "}"}]},
];

export const matrixLessonVertex: EditorLine[] = [
  {segments: [{type: "fixed", text: "// 比喻：用相机给这个平面拍一张照片（第 7 课）"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "// ① position          角点在模型上的 xyz"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "// ② modelViewMatrix    模型视图矩阵：把物体举到相机镜头前",
      },
    ],
  },
  {
    segments: [
      {
        type: "fixed",
        text: "// ③ projectionMatrix   投影矩阵：镜头按下，3D → 屏幕 2D",
      },
    ],
  },
  {segments: [{type: "fixed", text: "// ④ gl_Position         照片里这个点在屏幕哪"}]},
  {segments: [{type: "fixed", text: ""}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {
    segments: [
      {
        type: "fixed",
        text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      },
    ],
  },
  {segments: [{type: "fixed", text: "  // 从右往左读：① → ② → ③ → ④"}]},
  {segments: [{type: "fixed", text: "}"}]},
];

export const matrixLessonFragment: EditorLine[] = [
  {segments: [{type: "fixed", text: "// 片元同第 2 课，本课重点在顶点变换"}]},
  {segments: [{type: "fixed", text: "void main() {"}]},
  {segments: [{type: "fixed", text: "  gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0);"}]},
  {segments: [{type: "fixed", text: "}"}]},
];
