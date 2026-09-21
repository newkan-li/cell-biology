/* 生成每章「知识串联图」数据 data/mind-<id>.js（开发用，不随站点发布）
   规则保守，只在高置信时连边；生成后由 AI 逐章校对。
   用法：node _tools/gen_mind.js
*/
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

global.window = {};
const dataDir = path.join(ROOT, "data");
fs.readdirSync(dataDir)
  .filter((f) => /^(ch|tb)\d+\.js$/.test(f) || f === "manifest.js" || f === "glossary.js" || f === "compare.js")
  .forEach((f) => { try { require(path.join(dataDir, f)); } catch (e) {} });

const M = window.MANIFEST || [];
const GLOSS = window.GLOSSARY || [];
const CMP = (window.COMPARE && window.COMPARE.tables) || [];

function core(s) { return String(s || "").split(/[（(]/)[0].replace(/[。．.、，,；;：:！!？?"'“”‘’\s]/g, "").trim(); }
const STOP = new Set(["细胞", "结构", "功能", "特点", "概念", "过程", "作用", "类型", "方式", "机制", "研究", "主要", "重要", "包括", "分为", "组成", "蛋白", "蛋白质", "基因", "分子", "生物", "生命"]);

/* AI 精选关系：[关键词A, 关键词B, 标签, 类型]；关键词按页面标题子串匹配（取首个匹配页） */
const CURATE = {
  ch01: [
    ["细胞学说的建立", "细胞学说三个基本原则", "构成", "mech"],
    ["原核细胞的基本特点", "原核与真核的共同点", "对比", "cmp"],
    ["Pax6与eyeless同源", "Pax6与无虹膜症", "机制", "mech"],
    ["酵母与人类周期蛋白相似", "功能保守性", "证据", "mech"],
    ["模式材料总论", "秀丽隐杆线虫", "举例", "mech"]
  ],
  ch02: [
    ["流动镶嵌模型", "膜的流动性", "构成", "mech"],
    ["膜脂的不对称性", "上皮细胞极性", "机制", "mech"],
    ["被动运输", "主动运输与离子泵", "对比", "cmp"],
    ["通道蛋白", "3种载体蛋白", "对比", "cmp"],
    ["Na+/K+泵", "静息电位", "机制", "mech"],
    ["协同运输", "小肠上皮细胞吸收葡萄糖", "机制", "mech"],
    ["胆固醇在膜中的位置", "胆固醇对流动性的调节", "机制", "mech"]
  ],
  ch03: [
    ["信号肽与信号斑", "SRP信号识别颗粒", "机制", "mech"],
    ["SRP信号识别颗粒", "SRP受体", "机制", "mech"],
    ["易位子", "Sec61复合体", "组成", "mech"],
    ["分子伴侣", "ER质量监控体制", "机制", "mech"],
    ["泛素化过程", "26S蛋白酶体", "机制", "mech"],
    ["N-连接vs O-连接糖基化", "高尔基体功能1-糖基化", "对比", "cmp"],
    ["M6P分选信号", "溶酶体酶分选多样化", "机制", "mech"]
  ],
  ch04: [
    ["COPII有被小泡", "COPI有被小泡", "对比", "cmp"],
    ["Rab与SNARE", "SNARE催化融合", "机制", "mech"],
    ["网格蛋白结构", "发动蛋白dynamin作用", "机制", "mech"],
    ["LDL受体途径", "家族性高胆固醇血症", "机制", "mech"],
    ["受体介导内吞步骤", "网格蛋白胞吞作用", "机制", "mech"]
  ],
  ch05: [
    ["线粒体膜的转运子", "线粒体基质蛋白导入", "机制", "mech"],
    ["叶绿体蛋白的转运肽", "类囊体腔蛋白的双区转运肽", "机制", "mech"],
    ["核定位信号", "输入蛋白importin", "机制", "mech"],
    ["输入蛋白importin", "Ran-GTP的作用", "机制", "mech"],
    ["核输出信号", "Ran-GTP的作用", "机制", "mech"],
    ["过氧化物酶体的发生", "两种形成途径", "机制", "mech"]
  ],
  ch06: [
    ["微管的动态不稳定性", "GTP cap理论", "机制", "mech"],
    ["微管组织中心", "γ-tubulin", "机制", "mech"],
    ["驱动蛋白", "Dynein", "对比", "cmp"],
    ["微管特异性药物", "taxol", "机制", "mech"],
    ["马达蛋白特点", "驱动蛋白", "机制", "mech"]
  ],
  ch07: [
    ["微丝的装配", "脚踏车", "机制", "mech"],
    ["微丝的马达蛋白", "肌肉收缩", "机制", "mech"],
    ["微丝特异性药物", "微丝的装配", "机制", "mech"],
    ["细胞爬行运动", "胞质分裂的收缩环", "对比", "cmp"]
  ],
  ch08: [
    ["中间纤维(IFs)的装配", "中间纤维的动态装配特点", "机制", "mech"],
    ["核纤层", "参与细胞连接", "组成", "mech"],
    ["组成成分", "IF proteins are tissue-specific", "机制", "mech"]
  ],
  ch09: [
    ["细胞周期蛋白(Cyclin)", "周期蛋白依赖性蛋白激酶", "机制", "mech"],
    ["M期促进因子", "细胞周期蛋白(Cyclin)", "机制", "mech"],
    ["CDK1 活性受多种因素综合调节", "Cdk的磷酸化状态", "机制", "mech"],
    ["Controlled proteolysis", "APC", "机制", "mech"],
    ["PCC", "M期促进因子", "机制", "mech"],
    ["周期调控之brake", "检验点", "构成", "mech"]
  ],
  ch10: [
    ["异三聚体G-蛋白", "GTPase 分子开关", "机制", "mech"],
    ["NO信号", "鸟苷酸环化酶", "机制", "mech"],
    ["G蛋白偶联的受体", "G蛋白与跨膜信号转导", "机制", "mech"],
    ["信号分子称为配体", "受体是一类能够识别", "构成", "mech"]
  ],
  ch11: [
    ["cAMP -PKA 信号通路", "肌醇磷脂信号通路", "对比", "cmp"],
    ["RTK-Ras蛋白信号通路", "RTKs激活Ras", "机制", "mech"],
    ["Ras 蛋白", "Raf 蛋白", "机制", "mech"],
    ["酪氨酸蛋白激酶活性的受体", "胰岛素", "举例", "mech"],
    ["分子开关", "蛋白激酶", "构成", "mech"]
  ],
  ch12: [
    ["端粒酶", "端粒缩短是衰老", "机制", "mech"],
    ["细胞凋亡与坏死区别", "细胞坏死与细胞凋亡的形态学特征", "对比", "cmp"],
    ["外源信号介导的凋亡途径起始", "内源信号介导的细胞凋亡", "对比", "cmp"],
    ["Bcl-2", "Apaf", "机制", "mech"],
    ["凋亡小体", "DNA 电泳特点", "机制", "mech"]
  ],
  ch13: [
    ["肿瘤抑制基因", "原癌基因", "对比", "cmp"],
    ["Rb gene", "p53基因", "举例", "mech"],
    ["抑癌基因与原癌基因突变效果的比较", "原癌基因转为癌基因", "机制", "mech"],
    ["化学致癌物与辐射", "基因的稳定性取决于 DNA", "机制", "mech"],
    ["血管发生和肿瘤发生", "抑制新的血管发生", "机制", "mech"]
  ],
  tb03: [
    ["光学显微镜的构造与分辨率", "电子显微镜与光镜的区别", "对比", "cmp"],
    ["激光扫描共焦显微镜", "荧光标记技术", "机制", "mech"],
    ["免疫电镜技术", "速度沉降、等密度沉降", "组成", "mech"],
    ["细胞系、细胞株", "细胞融合与单克隆抗体技术", "组成", "mech"]
  ],
  tb06: [
    ["线粒体分裂的分子机制", "线粒体的融合与分裂装置", "机制", "mech"],
    ["ATP合酶与结合变构机制", "电子传递链与氧化磷酸化", "机制", "mech"],
    ["光系统Ⅱ与Cytb6f", "光系统Ⅰ与光合磷酸化", "机制", "mech"],
    ["Rubisco与光合作用概述", "卡尔文循环", "机制", "mech"],
    ["半自主性与细胞器DNA", "内共生起源学说", "机制", "mech"]
  ],
  tb11: [
    ["DNA结合蛋白：组蛋白与非组蛋白", "核小体的结构", "组成", "mech"],
    ["染色质的高级结构与多级螺旋模型", "常染色质与异染色质", "对比", "cmp"],
    ["组蛋白乙酰化与转录调控", "异染色质化与巴氏小体", "机制", "mech"],
    ["着丝粒的结构与功能", "端粒与端粒酶", "对比", "cmp"],
    ["多线染色体与灯刷染色体", "染色体显带技术", "对比", "cmp"]
  ],
  tb12: [
    ["核糖体的基本类型与化学组成", "核糖体大小亚基与结构研究", "组成", "mech"],
    ["核糖体的活性位点与rRNA结构", "肽酰转移酶位点与核酶本质", "机制", "mech"],
    ["蛋白质合成的起始", "肽链的延伸与终止", "机制", "mech"],
    ["核酶的发现", "RNA世界假说", "机制", "mech"]
  ],
  tb13: [
    ["SMC蛋白复合物", "前中期：核膜崩解与纺锤体装配", "机制", "mech"],
    ["中心体分离与动粒结构", "动粒的分子组成与检验点", "组成", "mech"],
    ["染色体整列与后期A、B", "后期染色体分离的分子机制", "机制", "mech"],
    ["减数分裂概述", "有丝分裂与减数分裂的比较", "对比", "cmp"],
    ["偶线期的联会与联会复合体", "联会复合体的分子组成", "组成", "mech"]
  ],
  tb15: [
    ["组合调控与主导基因", "干细胞与iPS细胞", "机制", "mech"],
    ["Y染色体与性别决定", "支持细胞与Sox9", "机制", "mech"],
    ["支持细胞与Sox9", "卵巢分化与Wnt4", "对比", "cmp"],
    ["神经分化的信号梯度与旁侧抑制", "Shh与BMP的背腹梯度", "机制", "mech"],
    ["三胚层形成与神经胚", "神经管形成与神经干细胞", "机制", "mech"]
  ],
  tb17: [
    ["紧密连接", "锚定连接", "对比", "cmp"],
    ["间隙连接的结构", "间隙连接通透性的调节", "机制", "mech"],
    ["细胞黏着分子（CAM）的分类", "整联蛋白的结构", "组成", "mech"],
    ["胶原", "弹性蛋白", "对比", "cmp"],
    ["纤连蛋白与层粘连蛋白", "基膜与细胞外被", "机制", "mech"]
  ]
};

function buildChapter(id) {
  const ch = window.CHAPTERS[id];
  if (!ch) return null;
  const pages = [];
  (ch.modules || []).forEach((m, mi) => (m.slides || []).forEach((s, si) => {
    const title = String(s.title || "").replace(/\s+/g, " ").trim();
    const pts = (s.points || []).join(" ");
    pages.push({
      kp: id + "_s" + mi + "_" + si, mod: mi, si, page: s.page, title,
      isFig: !title || /图片|无文字层/.test(title),
      text: title + " " + pts
    });
  }));
  const edges = [];
  const seen = new Set();
  function addEdge(a, b, t, k) {
    if (!a || !b || a === b) return;
    const key = a + ">" + b + ">" + t;
    if (seen.has(key)) return;
    seen.add(key); edges.push({ a, b, t, k });
  }
  // 1) 顺序：同模块相邻页
  (ch.modules || []).forEach((m, mi) => {
    const ps = pages.filter((p) => p.mod === mi);
    for (let i = 0; i < ps.length - 1; i++) addEdge(ps[i].kp, ps[i + 1].kp, "顺序", "seq");
  });
  // 2) 概念关联：术语/名词解释在 2~5 页中出现
  const terms = [];
  (ch.term || []).forEach((q) => terms.push(core(q.term)));
  GLOSS.filter((g) => g.ch === id).forEach((g) => terms.push(core(g.t)));
  const uniq = [...new Set(terms)].filter((t) => t.length >= 3 && t.length <= 18 && !STOP.has(t) && /[\u4e00-\u9fa5]/.test(t));
  let tcount = 0;
  for (const t of uniq) {
    if (tcount >= 40) break;
    const inTitle = pages.filter((p) => !p.isFig && p.title.indexOf(t) >= 0);
    const inText = pages.filter((p) => !p.isFig && p.text.indexOf(t) >= 0);
    let hit = null;
    if (inTitle.length >= 2 && inTitle.length <= 4) hit = inTitle;
    else if (inTitle.length === 1 && inText.length >= 2 && inText.length <= 3) hit = inText;
    if (hit) {
      for (let i = 0; i < hit.length - 1; i++) addEdge(hit[i].kp, hit[i + 1].kp, t, "term");
      tcount++;
    }
  }
  // 2b) 对比：对比速记表里"同章内"出现的两/多个主题
  CMP.forEach((tb) => {
    const cols = (tb.cols || []).slice(1)
      .map((c) => String(c).replace(/[（(].*/, "").replace(/[A-Za-z].*/, "").trim())
      .filter((c) => c.length >= 2);
    const matched = [];
    cols.forEach((c) => {
      const p = pages.find((pp) => !pp.isFig && pp.title.indexOf(c) >= 0);
      if (p && matched.indexOf(p) < 0) matched.push(p);
    });
    if (matched.length >= 2) {
      for (let i = 0; i < matched.length - 1; i++) addEdge(matched[i].kp, matched[i + 1].kp, "对比", "cmp");
    }
  });
  // 3) 主线：按模块顺序串首尾
  (ch.modules || []).forEach((m, mi) => {
    const a = pages.filter((p) => p.mod === mi), b = pages.filter((p) => p.mod === mi + 1);
    if (a.length && b.length) addEdge(a[a.length - 1].kp, b[0].kp, "主线", "main");
  });
  // 4) 对比表：与本章内容匹配的表
  const cmp = [];
  CMP.forEach((tb) => {
    const cells = (tb.rows || []).flat().join(" ") + " " + tb.title;
    const hit = pages.some((p) => p.title && p.title.length >= 3 && cells.indexOf(p.title.slice(0, 8)) >= 0);
    if (hit) cmp.push(tb.id);
  });
  // 5) AI 精选关系（关键词→页面标题/要点解析）
  (CURATE[id] || []).forEach(function (r) {
    const pa = pages.find((p) => !p.isFig && p.title.indexOf(r[0]) >= 0) || pages.find((p) => !p.isFig && p.text.indexOf(r[0]) >= 0);
    const pb = pages.find((p) => !p.isFig && p.title.indexOf(r[1]) >= 0) || pages.find((p) => !p.isFig && p.text.indexOf(r[1]) >= 0);
    if (pa && pb) addEdge(pa.kp, pb.kp, r[2], r[3] || "mech");
    else console.log("  [curate miss] " + id + " : " + r[0] + " / " + r[1]);
  });
  return { edges, cmp };
}

let total = 0;
M.forEach((m) => {
  const d = buildChapter(m.id);
  if (!d) return;
  const out = "window.MIND=window.MIND||{};window.MIND[" + JSON.stringify(m.id) + "]=" + JSON.stringify(d) + ";";
  fs.writeFileSync(path.join(dataDir, "mind-" + m.id + ".js"), out);
  total += d.edges.length;
  console.log(m.id + ": edges=" + d.edges.length + " cmp=" + JSON.stringify(d.cmp));
});
console.log("TOTAL edges=" + total);
