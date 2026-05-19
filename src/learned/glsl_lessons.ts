import {
  STD_VERT,
  STD_FRAG_BLUE,
  VERT_UV,
  FRAG_UV_GRAD,
  fragColorLines,
  shaderIntroVertexLines,
  shaderIntroFragmentLines,
  vertexPosLines,
  typeLessonVertex,
  typeLessonFragment,
  keywordLessonVertex,
  keywordLessonFragment,
  builtinLessonVertex,
  builtinLessonFragment,
  matrixLessonVertex,
  matrixLessonFragment,
  type Lesson,
} from "./glsl_lesson_shared";

/** 教程大纲见各课 code 块末尾路线图 */
export const lessons: Lesson[] = [
  // ── 第 1 部分：建立地图 ──
  {
    title: "01 · 什么是 Shader（着色器）",
    summary:
      "着色器（Shader）是跑在 GPU（显卡）上的小程序，用 GLSL 写。Three.js 里必须同时传两段代码：vertexShader（顶点着色器）和 fragmentShader（片元着色器）——名字是英文，下面先对照中文含义。",
    points: [
      "Shader = 着色器，同一个东西；英文资料写 Shader，中文叫着色器",
      "它不是 JavaScript，是 GLSL 语言，在显卡（GPU）上执行",
      "JavaScript 只把 GLSL 当字符串传给 Three.js，自己不跑这段逻辑",
      "顶点（vertex）= 几何体上的角点，比如一张平面有 4 个顶点",
      "顶点着色器（vertexShader）= 每个顶点跑一次 → 决定「角点画在屏幕哪」",
      "像素 / 片元（fragment）= 屏幕上的小格子",
      "片元着色器（fragmentShader）= 每个像素跑一次 → 决定「格子涂什么色」",
      "Three.js 写法：{ vertexShader: `...`, fragmentShader: `...` } —— 字段名英文，含义就是上面两个中文词",
      "中间蓝色画面 = 两段着色器同时在 GPU 上跑出来的结果",
    ],
    code: `// ── 名词对照（先记中文，再认英文字段名）──
//  着色器       Shader
//  顶点着色器   vertexShader    → 管位置（第 3 课）
//  片元着色器   fragmentShader  → 管颜色（第 2 课）
//
//  几何体 → 顶点着色器 → 三角形 → 片元着色器 → 屏幕
//
// 路线：02 片元着色器 → 03 顶点着色器 → 04~06 语言基础 …`,
    hint: "右侧 tab 写「顶点着色器 / 片元着色器」= Three.js 里的 vertexShader / fragmentShader。切 tab 看两段只读代码。",
    available: [
      "Shader / 着色器",
      "vertexShader = 顶点着色器",
      "fragmentShader = 片元着色器",
      "GLSL（着色器语言）",
      "ShaderMaterial",
    ],
    editor: {
      defaultTab: "fragment",
      vertex: shaderIntroVertexLines,
      fragment: shaderIntroFragmentLines,
    },
    vertexShader: STD_VERT,
    fragmentShader: STD_FRAG_BLUE,
  },
  {
    title: "02 · 片元着色器（fragmentShader）",
    summary:
      "上一课说了 fragmentShader = 片元着色器。本课只练它：每个像素运行一次，用 gl_FragColor 输出颜色。vec4 先当「四个数的颜色盒子」用，第 4 课正式讲类型。",
    points: [
      "片元着色器（fragmentShader）= 决定每个像素涂什么色",
      "Three.js 里写在 fragmentShader: `...` 这个字符串字段里",
      "void main() { ... } 是程序入口，GPU 从这里开始跑",
      "gl_FragColor 必须赋值（WebGL1 内置输出变量）",
      "vec4(R,G,B,A) 四个数表示颜色+透明——第 4 课详解 vec4",
      "颜色常规 0~1；写 2 不会报错但会过曝",
      "顶点着色器（vertexShader）管位置，本课不管（第 3 课）",
    ],
    code: `void main() {
  gl_FragColor = vec4(0.25, 0.55, 0.95, 1.0);
  //              红   绿   蓝   透明
}`,
    hint: "改下方 R/G/B/A，Enter 运行。先会用，第 4 课再理解 vec4。",
    available: ["gl_FragColor（片元输出）", "vec4（第 4 课讲类型）"],
    editor: {defaultTab: "fragment", fragment: fragColorLines()},
    vertexShader: STD_VERT,
    fragmentShader: STD_FRAG_BLUE,
  },
  {
    title: "03 · 顶点着色器（vertexShader）",
    summary:
      "上一课练了片元着色器（管颜色）。本课练顶点着色器（vertexShader）：每个顶点运行一次，必须给 gl_Position 赋值。中间那行矩阵乘法先照抄，第 4~7 课再理解为什么。",
    points: [
      "顶点着色器（vertexShader）= 决定每个顶点画在屏幕哪",
      "Three.js 里写在 vertexShader: `...` 这个字符串字段里",
      "每个顶点执行一次（对比：片元着色器是每个像素一次）",
      "gl_Position 必须赋值（内置输出变量）",
      "中间公式先照抄——modelViewMatrix（模型视图矩阵）、projectionMatrix（投影矩阵）第 6~7 课解释",
      "position、mat4 等名词——第 4~6 课补语言基础",
      "完整流水线：顶点着色器(位置) → 光栅化 → 片元着色器(颜色，第 2 课)",
    ],
    code: `void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // ↑ 先照抄；第 7 课理解每一步
}`,
    hint: "切「顶点」看这行；「片元」仍可改颜色练手。",
    available: ["gl_Position（顶点输出）", "照抄公式（第 7 课详解）"],
    editor: {
      defaultTab: "vertex",
      vertex: vertexPosLines,
      fragment: fragColorLines(),
    },
    vertexShader: STD_VERT,
    fragmentShader: STD_FRAG_BLUE,
  },

  // ── 第 2 部分：语言基础（先类型，再关键字，再变量）──
  {
    title: "04 · UV 坐标 + GLSL 类型",
    summary:
      "先搞懂画面为什么渐变：UV 是平面上的「横纵地址」（左 0 右 1、下 0 上 1）。片元 shader 把地址的 x 当红色、y 当绿色，就得到渐变。然后再认识 float / vec2 / vec3 / vec4 这些类型。",
    points: [
      "【UV 是什么】给平面上每个点一个「地址」，两个数 (u, v)，也叫 (x, y)",
      "左下角地址 ≈ (0, 0)，右下角 ≈ (1, 0)，左上角 ≈ (0, 1)，右上角 ≈ (1, 1)",
      "Three.js 自动给每个顶点算好 uv（内置 attribute），你不用自己算",
      "【渐变怎么来的】片元代码：gl_FragColor = vec4(vUv.x, vUv.y, 0.2, 1.0)",
      "  → vUv.x 左边 0、右边 1 → 红色从左到右变亮",
      "  → vUv.y 下边 0、上边 1 → 绿色从下到上变亮",
      "  → 左下偏暗蓝，右下偏红，左上偏绿，右上红+绿=偏黄",
      "【vUv / uv 是啥】uv 是顶点自带的 UV；vUv = uv 是把地址传给片元（varying 第 11 课详讲，现在先记「传过去」）",
      "【类型】float=1个数；vec2=2个数（UV 就是 vec2）；vec3=RGB；vec4=RGBA（第 2 课）",
      "顶点里 gl_Position 那行 = 第 3 课照抄，本课可忽略",
    ],
    code: `// UV 地址（俯视一张平面）
//   左上(0,1) ────── 右上(1,1)
//      │                 │
//   左下(0,0) ────── 右下(1,0)
//
// 片元着色器（重点看这段）：
//   gl_FragColor = vec4(vUv.x, vUv.y, 0.2, 1.0);
//                   红←→位置  绿↑↓位置  蓝固定
//
// 类型：float / vec2 / vec3 / vec4 / mat4`,
    hint: "本课重点在「片元」tab：看 vUv.x、vUv.y 怎么变成颜色。顶点 tab 的 gl_Position 先忽略（第 3、7 课）。",
    available: [
      "UV / uv（顶点地址）",
      "vUv（片元读到的地址）",
      "float / vec2 / vec3 / vec4",
      ".x .y 取分量",
    ],
    editor: {
      defaultTab: "fragment",
      vertex: typeLessonVertex,
      fragment: typeLessonFragment,
    },
    vertexShader: VERT_UV,
    fragmentShader: FRAG_UV_GRAD,
  },
  {
    title: "05 · 关键字：void / uniform / attribute / varying",
    summary:
      "这些是 GLSL 修饰符，描述变量「从哪来、怎么传」。先记规则，第 8~11 课分别实战。",
    points: [
      "void = 无返回值 → void main() 程序入口",
      "uniform = 全员相同，JS 传入（如 uTime）或 Three 注入（如矩阵）",
      "attribute = 每个顶点不同，只在顶点 shader（如 position、uv）",
      "varying = 顶点写、片元读，GPU 自动插值（如 vUv）",
      "命名可自取；修饰符才是规则",
      "u 前缀是习惯（uTime = uniform time），不是语法",
    ],
    code: `// 顶点 shader
varying vec2 vUv;
void main() {
  vUv = uv;  // attribute → varying
  gl_Position = ...;
}

// 片元 shader
uniform float uTime;  // 全员共享
varying vec2 vUv;     // 插值后的 UV
void main() {
  gl_FragColor = vec4(vUv, sin(uTime)*0.5+0.5, 1.0);
}`,
    hint: "读注释对照三种修饰符。第 8 课总览，9~11 课分别深入。",
    available: ["void", "uniform", "attribute", "varying", "void main()"],
    editor: {
      defaultTab: "fragment",
      vertex: keywordLessonVertex,
      fragment: keywordLessonFragment,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float pulse = sin(uTime) * 0.5 + 0.5;
        gl_FragColor = vec4(vUv, pulse, 1.0);
      }
    `,
  },
  {
    title: "06 · 内置变量一览",
    summary:
      "内置变量名是 WebGL/Three 规定好的，不能改。这课重点搞懂两个英文矩阵的中文含义：modelViewMatrix（模型视图矩阵）和 projectionMatrix（投影矩阵）——Three.js 每帧自动算好传进 shader，你不用在 JS 里写。",
    points: [
      "【片元输出】gl_FragColor = 输出颜色，必须赋值 vec4",
      "【顶点输出】gl_Position = 输出屏幕位置，必须赋值 vec4",
      "【顶点 attribute】position = 模型上这个顶点的 xyz；uv = UV 地址",
      "【两个矩阵都是 mat4】= 4×4 数字表，用来做坐标变换（第 4 课讲过 mat4）",
      "modelViewMatrix = 模型视图矩阵（model 模型 + view 相机/视图）",
      "  → 干什么：把 position「从模型身上」搬到「相机眼前」",
      "projectionMatrix = 投影矩阵（projection 投影）",
      "  → 干什么：像相机镜头，把 3D 压成屏幕上的 2D，近大远小",
      "【Three 注入 uniform】上面两个矩阵 Three 自动传，不用像 uTime 那样自己写 uniforms",
      "公式（第 3 课照抄）：gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0)",
      "  → 从右往左：模型上的点 → 搬到相机前 → 镜头投影 → 屏幕位置",
      "第 7 课用「拍照四步」把这两个矩阵讲透",
    ],
    code: `// ── 两个矩阵中文对照 ──
// modelViewMatrix   模型视图矩阵   物体 + 相机 → 搬到镜头前
// projectionMatrix  投影矩阵       相机镜头 → 3D 压成屏幕 2D
//
// 顶点必写：
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//             ↑ ③ 镜头投影      ↑ ② 搬到相机前    ↑ ① 模型上的点
//
// 片元必写：gl_FragColor = vec4(...);`,
    hint: "看右侧顶点代码里的中文注释。两个矩阵现在只需知道「干什么」；第 7 课拍照比喻会讲透。",
    available: [
      "gl_FragColor / gl_Position",
      "position / uv（attribute）",
      "modelViewMatrix = 模型视图矩阵",
      "projectionMatrix = 投影矩阵",
      "Three 自动注入（不用自己写 uniform）",
    ],
    editor: {
      defaultTab: "vertex",
      vertex: builtinLessonVertex,
      fragment: builtinLessonFragment,
    },
    vertexShader: STD_VERT,
    fragmentShader: STD_FRAG_BLUE,
  },

  // ── 第 3 部分：3D → 屏幕 ──
  {
    title: "07 · 3D 怎么画到屏幕上",
    summary:
      "复习第 6 课两个矩阵：modelViewMatrix（模型视图矩阵）= 搬物体到相机前；projectionMatrix（投影矩阵）= 镜头把 3D 拍成 2D。用「拍照四步」串起来。",
    points: [
      "【问题】模型上的 xyz 不能直接变成屏幕像素",
      "【比喻】卡片放桌上 → 举到镜头前 → 按快门 → 照片上有点",
      "① position（attribute）：角点在「模型自身」的 xyz",
      "② modelViewMatrix（模型视图矩阵）：把物体搬到世界里，再搬到「相机眼前」",
      "③ projectionMatrix（投影矩阵）：相机「镜头」，近大远小，3D→屏幕 2D",
      "④ gl_Position（内置输出）：最终这个点在屏幕哪",
      "公式照抄，从右往左读；两个 mat4 由 Three.js 每帧自动算好注入",
      "你一般不用在 JS 里写这两个 uniform，Three 帮你算",
    ],
    code: `// 拍照四步（中文 ← → 英文变量名）
// ① position           模型上的点
// ② modelViewMatrix    模型视图矩阵：搬到相机前
// ③ projectionMatrix   投影矩阵：镜头拍成 2D
// ④ gl_Position         屏幕上的位置
//
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);`,
    hint: "切「顶点」看分步注释。本课不用改参数。",
    available: ["position", "modelViewMatrix", "projectionMatrix", "gl_Position", "mat4"],
    editor: {
      defaultTab: "vertex",
      vertex: matrixLessonVertex,
      fragment: matrixLessonFragment,
    },
    vertexShader: STD_VERT,
    fragmentShader: STD_FRAG_BLUE,
  },

  // ── 第 4 部分：传参实战 ──
  {
    title: "08 · uniform / attribute / varying 总览",
    summary: "三种传参方式合在一起看：attribute 进顶点 → varying 插值 → uniform 全员共享。",
    points: [
      "attribute uv → 顶点 vUv = uv → 片元读 vUv",
      "uniform uTime → 片元全员同一个时间",
      "三者配合：UV 渐变 + 时间呼吸",
      "第 9~11 课分别只讲一种",
    ],
    code: `// 见右侧顶点+片元代码`,
    hint: "可改 pulse 两个参数。理解三种修饰符如何配合。",
    available: ["attribute uv", "varying vUv", "uniform uTime"],
    editor: {
      defaultTab: "fragment",
      vertex: keywordLessonVertex,
      fragment: [
        {segments: [{type: "fixed", text: "uniform float uTime;"}]},
        {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  float pulse = sin(uTime) * "},
            {type: "field", id: "amp", default: "0.5", label: "振幅"},
            {type: "fixed", text: " + "},
            {type: "field", id: "base", default: "0.5", label: "基准"},
            {type: "fixed", text: ";"},
          ],
        },
        {segments: [{type: "fixed", text: "  gl_FragColor = vec4(vUv, pulse, 1.0);"}]},
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float pulse = sin(uTime) * 0.5 + 0.5;
        gl_FragColor = vec4(vUv, pulse, 1.0);
      }
    `,
  },
  {
    title: "09 · uniform 详解",
    summary:
      "uniform = JS 与 GLSL 同名配对的「全局参数」，一次绘制内所有像素相同。本课代码里 pulse 是 float，但 gl_FragColor 必须输出 vec4——下面分步看类型怎么拼起来。",
    points: [
      "JS: uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(...) } }",
      "GLSL: uniform float uTime;  uniform vec3 uColor;",
      "对比第 7 课矩阵：uTime、uColor 要自己写；modelViewMatrix 是 Three 自动注入",
      "【第 1 步】float pulse = sin(...) * 0.5 + 0.5;  → pulse 是 1 个数（0~1 呼吸）",
      "【第 2 步】0.5 + pulse * 0.5  → 还是 float，当作「亮度倍数」（0.5~1.0）",
      "【第 3 步】uColor 是 vec3（R,G,B 三个数）；uColor * float → vec3（每个通道都乘这个倍数）",
      "  → 效果：pulse 大时更亮，pulse 小时更暗，色相还是 uColor",
      "【第 4 步】gl_FragColor 必须 vec4（第 2 课：R+G+B+透明）",
      "  → vec4( vec3的RGB , 1.0 ) 把三个颜色 + 不透明 alpha 打包成 vec4",
      "pulse 不是直接当 vec4，而是用来「调亮度」的 float",
    ],
    code: `uniform vec3 uColor;   // vec3 = 三个 float：R G B
uniform float uTime;   // float = 一个数
void main() {
  float pulse = sin(uTime * 2.0) * 0.5 + 0.5;  // ① float
  vec3 rgb = uColor * (0.5 + pulse * 0.5);       // ② vec3 * float → vec3
  gl_FragColor = vec4(rgb, 1.0);                 // ③ vec4(RGB, 透明)
}`,
    hint: "改速度参数看呼吸快慢。重点理解：pulse 是 float，只参与算亮度；最后 vec4 是 RGB+alpha 打包。",
    available: ["uniform float", "uniform vec3", "JS uniforms"],
    editor: {
      defaultTab: "fragment",
      fragment: [
        {segments: [{type: "fixed", text: "uniform vec3 uColor;"}]},
        {segments: [{type: "fixed", text: "uniform float uTime;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  float pulse = sin(uTime * "},
            {type: "field", id: "speed", default: "2.0", label: "速度"},
            {type: "fixed", text: ") * 0.5 + 0.5;  // ① float，一个数 0~1"},
          ],
        },
        {
          segments: [
            {
              type: "fixed",
              text: "  // ② uColor(vec3) * 亮度(float) → vec3；pulse 只调明暗，不是 vec4",
            },
          ],
        },
        {
          segments: [
            {
              type: "fixed",
              text: "  gl_FragColor = vec4(uColor * (0.5 + pulse * 0.5), 1.0);  // ③ vec4=RGB+alpha",
            },
          ],
        },
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: STD_VERT,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      void main() {
        float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
        gl_FragColor = vec4(uColor * (0.5 + pulse * 0.5), 1.0);
      }
    `,
  },
  {
    title: "10 · attribute 详解",
    summary: "attribute = 每个顶点独有，geometry.setAttribute 传入；只在顶点 shader 读。",
    points: [
      "内置：position(vec3) uv(vec2) normal(vec3)",
      "自定义：setAttribute('aHue', ...)",
      "片元不能直接读 attribute → 用 varying 传",
    ],
    code: `attribute float aHue;
varying vec3 vColor;
void main() {
  vColor = vec3(aHue, 0.6, 1.0 - aHue);
  gl_Position = ...;
}`,
    hint: "改 vec3 中间数字，Enter 运行。",
    available: ["attribute float aHue", "varying vColor"],
    needsAttributeGeo: true,
    editor: {
      defaultTab: "vertex",
      vertex: [
        {segments: [{type: "fixed", text: "attribute float aHue;"}]},
        {segments: [{type: "fixed", text: "varying vec3 vColor;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  vColor = vec3(aHue, "},
            {type: "field", id: "mid", default: "0.6", label: "中间分量"},
            {type: "fixed", text: ", 1.0 - aHue);"},
          ],
        },
        {segments: [{type: "fixed", text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);"}]},
        {segments: [{type: "fixed", text: "}"}]},
      ],
      fragment: [
        {segments: [{type: "fixed", text: "varying vec3 vColor;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {segments: [{type: "fixed", text: "  gl_FragColor = vec4(vColor, 1.0);"}]},
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: `
      attribute float aHue;
      varying vec3 vColor;
      void main() {
        vColor = vec3(aHue, 0.6, 1.0 - aHue);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
  },
  {
    title: "11 · varying 详解",
    summary: "varying = 顶点赋值，GPU 在三角形内插值，片元读取。",
    points: [
      "顶点、片元必须同名声明 varying",
      "适合传 UV、自定义颜色",
      "WebGL2 改用 in/out，概念相同",
    ],
    code: `varying vec2 vPos;
// 顶点: vPos = position.xy;
// 片元: gl_FragColor = vec4(vPos * 0.5 + 0.5, 0.4, 1.0);`,
    hint: "改 vec4 里缩放/偏移/蓝色分量。",
    available: ["varying vec2 vPos", "插值"],
    editor: {
      defaultTab: "fragment",
      vertex: [
        {segments: [{type: "fixed", text: "varying vec2 vPos;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {segments: [{type: "fixed", text: "  vPos = position.xy;"}]},
        {segments: [{type: "fixed", text: "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);"}]},
        {segments: [{type: "fixed", text: "}"}]},
      ],
      fragment: [
        {segments: [{type: "fixed", text: "varying vec2 vPos;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  gl_FragColor = vec4(vPos * "},
            {type: "field", id: "scale", default: "0.5", label: "缩放"},
            {type: "fixed", text: " + "},
            {type: "field", id: "bias", default: "0.5", label: "偏移"},
            {type: "fixed", text: ", "},
            {type: "field", id: "z", default: "0.4", label: "蓝"},
            {type: "fixed", text: ", 1.0);"},
          ],
        },
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vPos;
      void main() {
        gl_FragColor = vec4(vPos * 0.5 + 0.5, 0.4, 1.0);
      }
    `,
  },

  // ── 第 5 部分：进阶 ──
  {
    title: "12 · float 运算",
    summary: "float 参与 sin、mix 等运算；灰度呼吸示例。",
    points: [
      "float v = sin(uTime) * 0.5 + 0.5;",
      "vec3(v) 把一个 float 复制成三个（灰度）",
      "mix 在 vec3 课也会用到",
    ],
    code: `float v = sin(uTime) * 0.5 + 0.5;
gl_FragColor = vec4(vec3(v), 1.0);`,
    hint: "改振幅和基准。",
    available: ["sin()", "float 运算"],
    editor: {
      defaultTab: "fragment",
      vertex: typeLessonVertex,
      fragment: [
        {segments: [{type: "fixed", text: "uniform float uTime;"}]},
        {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  float v = sin(uTime) * "},
            {type: "field", id: "amp", default: "0.5", label: "振幅"},
            {type: "fixed", text: " + "},
            {type: "field", id: "base", default: "0.5", label: "基准"},
            {type: "fixed", text: ";"},
          ],
        },
        {segments: [{type: "fixed", text: "  gl_FragColor = vec4(vec3(v), 1.0);"}]},
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: VERT_UV,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float v = sin(uTime) * 0.5 + 0.5;
        gl_FragColor = vec4(vec3(v), 1.0);
      }
    `,
  },
  {
    title: "13 · vec2 实战",
    summary: "vec2 用作 UV：vUv.x 红、vUv.y 绿。",
    points: ["vUv 是 varying vec2", ".x .y 取分量", "uv 是 attribute vec2"],
    code: `gl_FragColor = vec4(vUv.x, vUv.y, 0.2, 1.0);`,
    hint: "改蓝色底色数字。",
    available: ["vec2", "vUv", "uv"],
    editor: {
      defaultTab: "fragment",
      vertex: typeLessonVertex,
      fragment: [
        {segments: [{type: "fixed", text: "varying vec2 vUv;"}]},
        {segments: [{type: "fixed", text: "void main() {"}]},
        {
          segments: [
            {type: "fixed", text: "  gl_FragColor = vec4(vUv.x, vUv.y, "},
            {type: "field", id: "blue", default: "0.2", label: "蓝"},
            {type: "fixed", text: ", 1.0);"},
          ],
        },
        {segments: [{type: "fixed", text: "}"}]},
      ],
    },
    vertexShader: VERT_UV,
    fragmentShader: FRAG_UV_GRAD,
  },
  {
    title: "14 · vec3 实战",
    summary: "vec3 表示 RGB；mix 混合两个 vec3 颜色。",
    points: ["vec3 red / blue", "mix(a, b, t) 插值", "vec4(color, 1.0) 输出"],
    code: `vec3 color = mix(red, blue, t);
gl_FragColor = vec4(color, 1.0);`,
    hint: "完整 shader 可编辑。",
    available: ["vec3", "mix()"],
    editor: {full: true},
    vertexShader: VERT_UV,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec3 red = vec3(1.0, 0.2, 0.2);
        vec3 blue = vec3(0.2, 0.4, 1.0);
        float t = sin(uTime) * 0.5 + 0.5;
        gl_FragColor = vec4(mix(red, blue, t), 1.0);
      }
    `,
  },
  {
    title: "15 · vec4 透明度",
    summary: "vec4 第四分量是 alpha；< 1 需 transparent。",
    points: ["alpha 左透右实", "material.transparent = true", "vec4(rgb, alpha)"],
    code: `float alpha = 0.35 + vUv.x * 0.65;
gl_FragColor = vec4(rgb, alpha);`,
    hint: "能看到后面旋转方块。",
    available: ["alpha", "transparent"],
    transparent: true,
    editor: {full: true},
    vertexShader: VERT_UV,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 rgb = vec3(0.3, 0.8, 1.0);
        float alpha = 0.35 + vUv.x * 0.65;
        gl_FragColor = vec4(rgb, alpha);
      }
    `,
  },
  {
    title: "16 · Swizzle",
    summary: "vec 可用 .xy .rgb 取子向量，顺序可打乱。",
    points: [".yx 交换", ".xyx 重排", ".r .g .b 与 .x .y .z 等价"],
    code: `vec2 swapped = vUv.yx;
vec3 color = vUv.xyx;`,
    hint: "完整编辑。",
    available: ["swizzle"],
    editor: {full: true},
    vertexShader: VERT_UV,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 swapped = vUv.yx;
        vec3 color = vUv.xyx;
        gl_FragColor = vec4(color * swapped, 1.0);
      }
    `,
  },
  {
    title: "17 · int 与 bool",
    summary: "int/bool 较少用；条纹用 floor+mod 模拟。",
    points: ["实际多用 float", "floor + mod 做条纹", "if 在片元里谨慎"],
    code: `float id = floor(vUv.x * 8.0);
float shade = mod(id, 2.0);`,
    hint: "竖条纹。",
    available: ["floor", "mod"],
    editor: {full: true},
    vertexShader: VERT_UV,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float id = floor(vUv.x * 8.0);
        float shade = mod(id, 2.0);
        vec3 color = mix(vec3(0.15), vec3(0.9, 0.5, 1.0), shade);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  },
  {
    title: "18 · mat4 深入",
    summary: "自己传 uniform mat4 uRot 旋转顶点；复习第 7 课矩阵。",
    points: ["uniform mat4 uRot", "uRot * vec4(position,1)", "第 7 课矩阵是 Three 算好的"],
    code: `vec4 p = uRot * vec4(position, 1.0);
gl_Position = projectionMatrix * modelViewMatrix * p;`,
    hint: "平面持续旋转。",
    available: ["mat4", "uRot"],
    editor: {full: true},
    vertexShader: `
      uniform mat4 uRot;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = uRot * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        gl_FragColor = vec4(vUv, 0.5, 1.0);
      }
    `,
  },
  {
    title: "19 · sampler2D 纹理",
    summary: "sampler2D + texture2D 从贴图取色。",
    points: ["uniform sampler2D uMap", "texture2D(uMap, vUv)", "wrap 重复/裁切"],
    code: `gl_FragColor = texture2D(uMap, vUv);`,
    hint: "棋盘格贴图。",
    available: ["sampler2D", "texture2D"],
    editor: {full: true},
    vertexShader: VERT_UV,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(uMap, vUv);
      }
    `,
  },
  {
    title: "20 · gl_FragCoord",
    summary: "片元内置：当前像素屏幕坐标。",
    points: ["gl_FragCoord.xy", "原点在左下", "配合 uResolution"],
    code: `vec2 uv = gl_FragCoord.xy / uResolution;`,
    hint: "resize 窗口比例会变。",
    available: ["gl_FragCoord", "uResolution"],
    editor: {full: true},
    vertexShader: STD_VERT,
    fragmentShader: `
      uniform vec2 uResolution;
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        gl_FragColor = vec4(uv, 0.5, 1.0);
      }
    `,
  },
];
