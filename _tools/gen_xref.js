global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "data", "methods.js"));
require(path.join(ROOT, "data", "hotexp.js"));
require(path.join(ROOT, "data", "explist.js"));
const M = window.METHODS, H = window.HOTEXP, E = window.EXPLIST;
const MANUAL = {};
const hotKps = {}, expKps = {};
H.forEach(h => { if (h.kp) hotKps[h.kp] = 1; });
E.forEach(e => { expKps[e.kp] = 1; });
function kindOf(k) { return hotKps[k] ? "hot" : expKps[k] ? "exp" : "page"; }
function titleOf(kp) {
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
M.forEach((mm, idx) => {
  const kps = {};
  H.forEach(h => { if (h.kp && h.kp === mm.kp) kps[h.kp] = 1; });
  E.forEach(e => { if (e.kp === mm.kp) kps[e.kp] = 1; });
  (MANUAL[mm.t] || []).forEach(k => kps[k] = 1);
  Object.keys(kps).forEach(k => { if (kindOf(k) !== "page") (byKp[k] = byKp[k] || []).push({ t: mm.t, idx: idx }); });
});
const methods = M.map((mm, idx) => {
  const seen = {}, exps = [];
  function push(k, label, forceKind) {
    if (!k || seen[k]) return; seen[k] = 1;
    const kind = forceKind || kindOf(k);
    if (kind === "hot") { const h = H.find(x => x.kp === k); exps.push({ k: k, kind: "hot", label: h ? h.e.slice(0, 20) : "高频实验" }); }
    else if (kind === "exp") { const e = E.find(x => x.kp === k); exps.push({ k: k, kind: "exp", label: e ? String(e.title).replace(/\s+/g, " ").slice(0, 20) : "实验" }); }
    else exps.push({ k: k, kind: "page", label: titleOf(k) || "讲义页" });
  }
  H.forEach(h => { if (h.kp === mm.kp) push(h.kp); });
  E.forEach(e => { if (e.kp === mm.kp) push(e.kp); });
  (MANUAL[mm.t] || []).forEach(k => push(k));
  return { t: mm.t, idx: idx, exps: exps };
});
fs.writeFileSync(path.join(ROOT, "data", "xref.js"), "window.XREF=" + JSON.stringify({ methods: methods, byKp: byKp }) + ";");
console.log("方法数", methods.length, "| 有相关项的方法", methods.filter(m => m.exps.length).length, "| 实验卡可挂的方法页", Object.keys(byKp).length);
methods.filter(m => m.exps.length).forEach(m => console.log("  " + m.t + " -> " + m.exps.map(e => e.kind + ":" + e.label).join(" , ")));
