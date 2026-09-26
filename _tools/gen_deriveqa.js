/* 生成 data/deriveqa.js：{ kp: { q:题目, a:答案(取该页 derive 内容) } }
   用法：node _tools/gen_deriveqa.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const Q = {
 "ch01_s1_3": "完成细胞尺度换算：1 μm、1 nm 各等于多少米？细胞核直径 5–10 μm 等于多少 nm？为什么细胞普遍很小（比表面积角度）？",
 "ch01_s1_4": "写出球的体积、表面积与比表面积公式，并说明为什么卵细胞（直径约 100 μm）物质交换相对受限。",
 "ch01_s2_7": "估算一个人体细胞中 DNA 的总长度：单倍体基因组约 3×10⁹ bp，B-DNA 每碱基对轴向长约 0.34 nm。",
 "ch02_s0_29": "写出 FRAP 中由半恢复时间估算扩散系数的公式，并说明“恢复越快”代表什么。",
 "ch02_s1_6": "写出载体介导运输的饱和动力学方程，并说明 [S]≪Km 与 [S]≫Km 时分别呈什么特征。",
 "ch02_s1_23": "写出 Nernst 方程估算静息电位的简化式，并代入 [K⁺]外≈5、[K⁺]内≈140 mmol/L 估算 E_K。",
 "ch02_s1_27": "为什么说协同运输属于继发性主动运输？其能量最终来源是什么？",
 "ch02_s1_31": "Na⁺/K⁺ 泵每水解 1 分子 ATP 泵出/摄入多少离子？净移出几个正电荷？对维持渗透平衡有何意义？",
 "ch03_s0_8": "写出相对离心力 RCF 的公式，并计算转子半径 r=10 cm、转速 10000 rpm 时的 RCF。",
 "ch06_s2_11": "推导微管临界浓度 Cc 的表达式，并说明游离 tubulin 高于/低于 Cc 时微管的行为。",
 "ch06_s7_45": "已知 kinesin 每水解 1 个 ATP 前进约 8 nm，若测得速度 v=1 μm/s，求其步频与每秒 ATP 水解数。",
 "ch07_s1_7": "说明微丝发生踏车(treadmilling)的条件，并写出正、负端净伸长速率的表达式。",
 "ch09_s1_3": "写出群体倍增时间公式，并计算：24 h 内细胞数由 1×10⁵ 增至 4×10⁵ 时的 Td。",
 "ch09_s1_4": "简述用脉冲标记法(PLM)测定细胞周期各时相时长的原理与步骤。",
 "ch10_s3_9": "说明信号级联放大的估算方法，并计算三级放大倍数分别为 1∶10∶100 时的总放大倍数。",
 "ch12_s3_12": "若端粒每次细胞分裂约缩短 100 bp，初始约 12 kb，试估算其可继续分裂的次数（到临界长度）。",
 "tb03_s0_30": "写出显微镜分辨率公式，并计算 λ=550 nm、NA=1.4 时的分辨率（并说明与光镜分辨极限的关系）。",
 "tb03_s2_42": "写出细胞计数与稀释换算公式，并计算：血细胞计数板 4 个大方格共 200 个细胞、每格 0.1 mm³ 时的浓度。",
 "tb06_s0_92": "估算 1 分子葡萄糖经有氧氧化的净 ATP 产额（糖酵解 + TCA 循环 + 氧化磷酸化）。",
 "tb06_s1_104": "写出质子动力势 Δp 的表达式，并说明 ATP 合成酶合成 ATP 的 H⁺ 计量（约几个 H⁺/ATP）。"
};
/* 可自动判分的数值答案（容差 5%；支持 5×10^5 / 5e5 等写法） */
const N = {
 "ch01_s2_7": ["1.02e9", "1e9", "1"],
 "ch02_s1_23": ["-89", "-88", "-90"],
 "ch03_s0_8": ["11180", "1.118e4", "1.1e4"],
 "ch06_s7_45": ["125"],
 "ch09_s1_3": ["12"],
 "ch10_s3_9": ["1000"],
 "tb03_s0_30": ["240", "0.24", "0.2"],
 "tb03_s2_42": ["5e5", "500000", "5×10^5"]
};
const out = {};
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    const k = id + "_s" + m.i + "_" + s.i;
    if (!s.derive) return;
    out[k] = { q: Q[k] || ("请完成本页推导： " + String(s.title).replace(/\s+/g, " ")), a: String(s.derive).replace(/\s+/g, " ").trim(), n: N[k] || null };
  }));
});
fs.writeFileSync(path.join(ROOT, "data", "deriveqa.js"), "window.DERIVEQA=" + JSON.stringify(out) + ";");
console.log("推导题:", Object.keys(out).length, "| 大小约", Math.round(fs.statSync(path.join(ROOT, "data", "deriveqa.js")).size / 1024) + "KB");
