global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "data", "methods.js"));
require(path.join(ROOT, "data", "hotexp.js"));
require(path.join(ROOT, "data", "explist.js"));
const M = window.METHODS, H = window.HOTEXP, E = window.EXPLIST;
const MANUAL = { "膜片钳": ["ch02_s1_23"], "免疫荧光": ["tb03_s1_41"], "免疫电镜": ["tb03_s1_41"] };
function titleOf(kp) { // 从页面数据取标题
  const id = kp.split("_s")[0];
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return ""; }
  const ch = window.CHAPTERS[id]; if (!ch) return "";
  const m = kp.match(/_s(\d+)_(\d+)$/); if (!m) return "";
  let t = "";
  ch.modules.forEach((mm, mi) => (mm.slides || []).forEach((s, si) => {
    if ((mm.i + "_" + s.i) === (m[1] + "_" + m[2]) || (mi + "_" + si) === (m[1] + "_" + m[2])) t = String(s.title || "").replace(/\s+/g, " ").slice(0, 24);
  }));
  return t;
}
const byKp = {};
function add(kp, ref) { if (!kp) return; (byKp[kp] = byKp[kp] || []).push(ref); }
M.forEach((mm, idx) => {
  const kps = {};
  H.forEach(h => { if (h.kp && h.kp === mm.kp) kps[h.kp] = 1; });
  E.forEach(e => { if (e.kp === mm.kp) kps[e.kp] = 1; });
  (MANUAL[mm.t] || []).forEach(k => kps[k] = 1);
  Object.keys(kps).forEach(k => add(k, { t: mm.t, idx: idx }));
});
const methods = M.map((mm, idx) => {
  const seen = {}, exps = [];
  H.forEach(h => { if (h.kp && h.kp === mm.kp && !seen["H" + h.kp]) { seen["H" + h.kp] = 1; exps.push({ k: h.kp, kind: "hot", label: h.e.slice(0, 20) }); } });
  E.forEach(e => { if (e.kp === mm.kp && !seen["E" + e.kp]) { seen["E" + e.kp] = 1; exps.push({ k: e.kp, kind: "exp", label: String(e.title).replace(/\s+/g, " ").slice(0, 20) }); } });
  (MANUAL[mm.t] || []).forEach(k => { if (!seen["M" + k]) { seen["M" + k] = 1; exps.push({ k: k, kind: "exp", label: titleOf(k) || "讲义页" }); } });
  return { t: mm.t, idx: idx, exps: exps };
});
fs.writeFileSync(path.join(ROOT, "data", "xref.js"), "window.XREF=" + JSON.stringify({ methods: methods, byKp: byKp }) + ";");
console.log("方法数", methods.length, "| 有相关实验的方法", methods.filter(m => m.exps.length).length, "| 被引用的页数", Object.keys(byKp).length);
