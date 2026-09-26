/* 生成“提纲卡/默写”数据 data/outline.js
   来源：各章名词解释(term)/简答(short)/论述(calc) + 术语表(glossary)
   处理：去重（术语表与章节同名合并）+ 分层(必背/常考/了解) + 关键词提纲
   用法：node _tools/gen_outline.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];

/* 人工高频清单：题干（规范化后）包含以下关键词者 → 必背 */
const HIGH = [
  "细胞学说","流动镶嵌","膜流动性","被动运输","主动运输","钠钾泵","钠泵","协同运输","水通道",
  "信号肽","共翻译","蛋白质分选","膜泡运输","snare","受体介导",
  "氧化磷酸化","化学渗透","细胞骨架","动态不稳定性","踏车","分子马达",
  "细胞周期","mpf","cdk","检验点","减数分裂","联会","细胞凋亡","细胞自噬","癌基因","抑癌","p53",
  "g蛋白","第二信使","酪氨酸激酶","桥粒","间隙连接","钙黏蛋白","整联蛋白","核小体","端粒酶",
  
];

function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
function norm(s) { return String(s).replace(/[（(].*?[)）]/g, "").replace(/[\s。，、；;：:（）()【】\[\]]/g, "").toLowerCase(); }
function splitKps(kps) { return String(kps).split(/[;；]/).map(x => clean(x)).filter(x => x.length >= 2).slice(0, 8); }
function deriveKeys(ans) {
  if (!ans) return [];
  const s = String(ans).replace(/[①②③④⑤⑥⑦⑧⑨]/g, "\n").replace(/（\d+）/g, "\n").replace(/\(\d+\)/g, "\n");
  const parts = s.split(/[\n。；;]/), out = [];
  parts.forEach(p => { p = clean(p).replace(/^[、，,。]+/, ""); if (p.length >= 4) out.push(p.length > 28 ? p.slice(0, 28) + "…" : p); });
  return out.slice(0, 6);
}
function isHigh(q) { const n = norm(q); if (n.length > 22) return false; return HIGH.some(k => n.indexOf(norm(k)) >= 0); }

/* 802 手写真题涉及的 kp → 必背 */
const kp802 = {};
try { require(path.join(ROOT, "data", "802.js")); (window.ZT802.items || []).forEach(z => { if (z.kp) kp802[z.kp] = 1; }); } catch (e) { }

const items = [], seen = {};
function add(src, o) {
  const key = norm(o.q);
  if (!key || seen[key]) return;               /* 去重：保留先加入者（章节优先） */
  seen[key] = 1;
  let tier = "了解";
  if (o.kp && kp802[o.kp]) tier = "必背";
  else if (isHigh(o.q)) tier = "必背";
  else if (src !== "术语表") tier = "常考";
  items.push({ id: o.id, cid: o.cid, ctitle: o.ctitle, kind: o.kind, q: o.q, a: o.a, keys: o.keys, kp: o.kp || null, tier: tier, src: src });
}

ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  const title = ch.title || id;
  ["term", "short", "calc"].forEach(kind => {
    (ch[kind] || []).forEach(q => {
      const isTerm = kind === "term";
      const question = clean(isTerm ? q.term : q.q), answer = clean(isTerm ? q.def : q.a);
      if (!question || !answer) return;
      let keys = q.kps && clean(q.kps) ? splitKps(q.kps) : [];
      if (!keys.length) keys = deriveKeys(answer);
      add("章节", { id: q.id, cid: id, ctitle: title, kind: kind, q: question, a: answer, keys: keys, kp: q.kp });
    });
  });
});
try {
  require(path.join(ROOT, "data", "glossary.js"));
  (window.GLOSSARY || []).forEach((g, i) => {
    const question = clean(g.t), answer = clean(g.d);
    if (!question || !answer) return;
    add("术语表", { id: "gl_" + (g.ch || "x") + "_" + i, cid: g.ch || "", ctitle: "术语表", kind: "term", q: question, a: answer, keys: deriveKeys(answer), kp: null });
  });
} catch (e) { }

fs.writeFileSync(path.join(ROOT, "data", "outline.js"), "window.OUTLINE=" + JSON.stringify(items) + ";");
const byKind = {}, byTier = {};
items.forEach(x => { byKind[x.kind] = (byKind[x.kind] || 0) + 1; byTier[x.tier] = (byTier[x.tier] || 0) + 1; });
console.log("提纲条目:", items.length, JSON.stringify(byKind));
console.log("分层:", JSON.stringify(byTier), "| 无关键词:", items.filter(x => !x.keys.length).length);
