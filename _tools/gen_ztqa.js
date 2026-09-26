/* 为历年真题(ZHENTI)/客观真题(ZTOBJ)生成解析：data/ztqa.js
   { "ZS<ch>_<i>": {e:解析, kp:讲义页}, "ZT<ch>_<kind>_<i>": {...} }
   方法：用站内“术语表 + 各页术语”建索引，按术语在题干中的命中（越长越具体）匹配最佳讲义页，
        解析取该术语定义 + 该页要点。
   用法：node _tools/gen_ztqa.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const terms = []; // {t, d, kp, pts}
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    const kp = id + "_s" + m.i + "_" + s.i;
    (s.terms || []).forEach(t => { if (t && t.t) terms.push({ t: String(t.t), d: String(t.d || ""), kp: kp, pts: (s.points || []).slice(0, 2) }); });
  }));
});
try {
  require(path.join(ROOT, "data", "glossary.js"));
  (window.GLOSSARY || []).forEach(g => { if (g && g.t) terms.push({ t: String(g.t), d: String(g.d || ""), kp: null, pts: [] }); });
} catch (e) { }
const byLen = terms.slice().sort((a, b) => b.t.length - a.t.length);
function explain(q) {
  const s = String(q || "");
  let best = null;
  for (let i = 0; i < byLen.length; i++) {
    const T = byLen[i];
    if (T.t.length < 2) continue;
    if (s.indexOf(T.t) >= 0) { best = T; break; }  // 已按长度降序，首个命中即最具体
  }
  if (!best) return null;
  let e = "【考点】" + best.t + (best.d ? "：" + best.d : "");
  if (best.pts && best.pts.length) e += "（要点：" + best.pts.join("；") + "）";
  return { e: e.slice(0, 300), kp: best.kp };
}
const out = {};
try {
  require(path.join(ROOT, "data", "zhenti.js"));
  Object.keys(window.ZHENTI || {}).forEach(c => (window.ZHENTI[c] || []).forEach((x, i) => {
    const r = explain(x.q); if (r) out["ZS" + c + "_" + i] = r;
  }));
} catch (e) { }
try {
  require(path.join(ROOT, "data", "ztobj.js"));
  Object.keys(window.ZTOBJ || {}).forEach(c => ["mcq", "judge", "fill"].forEach(k => (window.ZTOBJ[c][k] || []).forEach((x, i) => {
    const r = explain(x.q); if (r) out["ZT" + c + "_" + k + "_" + i] = r;
  })));
} catch (e) { }
fs.writeFileSync(path.join(ROOT, "data", "ztqa.js"), "window.ZTQA=" + JSON.stringify(out) + ";");
console.log("解析条数:", Object.keys(out).length, "| 大小约", Math.round(fs.statSync(path.join(ROOT, "data", "ztqa.js")).size / 1024) + "KB");
