/* 生成“提纲卡/默写”数据 data/outline.js
   来源：各章名词解释(term)/简答(short)/论述(calc) + 术语表(glossary)
   每题含 题干 + 标准答案 + 关键词提纲(优先用已有 kps，缺则从句中抽取)
   用法：node _tools/gen_outline.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
function splitKps(kps) {
  return String(kps).split(/[;；]/).map(x => clean(x)).filter(x => x.length >= 2).slice(0, 8);
}
function deriveKeys(ans) {
  if (!ans) return [];
  const s = String(ans).replace(/[①②③④⑤⑥⑦⑧⑨]/g, "\n").replace(/（\d+）/g, "\n").replace(/\(\d+\)/g, "\n");
  const parts = s.split(/[\n。；;]/);
  const out = [];
  parts.forEach(p => { p = clean(p).replace(/^[、，,。]+/, ""); if (p.length >= 4) out.push(p.length > 28 ? p.slice(0, 28) + "…" : p); });
  return out.slice(0, 6);
}
const items = [];
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  const title = ch.title || id;
  ["term", "short", "calc"].forEach(kind => {
    (ch[kind] || []).forEach(q => {
      const isTerm = kind === "term";
      const question = clean(isTerm ? q.term : q.q);
      const answer = clean(isTerm ? q.def : q.a);
      if (!question || !answer) return;
      let keys = q.kps && clean(q.kps) ? splitKps(q.kps) : [];
      if (!keys.length) keys = deriveKeys(answer);
      items.push({ id: q.id, cid: id, ctitle: title, kind: kind, q: question, a: answer, keys: keys, kp: q.kp || null });
    });
  });
});
// 术语表补充（作为名解）
try {
  require(path.join(ROOT, "data", "glossary.js"));
  (window.GLOSSARY || []).forEach((g, i) => {
    const question = clean(g.t), answer = clean(g.d);
    if (!question || !answer) return;
    items.push({ id: "gl_" + (g.ch || "x") + "_" + i, cid: g.ch || "", ctitle: "术语表", kind: "term", q: question, a: answer, keys: deriveKeys(answer), kp: null });
  });
} catch (e) { }
fs.writeFileSync(path.join(ROOT, "data", "outline.js"), "window.OUTLINE=" + JSON.stringify(items) + ";");
const byKind = {}; items.forEach(x => byKind[x.kind] = (byKind[x.kind] || 0) + 1);
console.log("提纲条目:", items.length, JSON.stringify(byKind), "| 无关键词:", items.filter(x => !x.keys.length).length);
