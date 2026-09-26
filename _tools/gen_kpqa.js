/* 生成 data/kpqa.js：{ kp: { t:标题, p:[考点], q:[[kind,题干,答案]], ex:实验原文(截断) } }
   来源：含 kp 的实验/科学史/方法/高频实验 对应讲义页 + 该页关联题目
   用法：node _tools/gen_kpqa.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const slideByKp = {}, qByKp = {};
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => { slideByKp[id + "_s" + m.i + "_" + s.i] = s; }));
  ["mcq","judge","fill","short","calc","term"].forEach(k => (ch[k] || []).forEach(q => {
    if (!q.kp) return;
    (qByKp[q.kp] = qByKp[q.kp] || []).push({ kind: k, q: (k === "term" ? q.term : q.q), a: (k === "term" ? q.def : (q.a != null ? q.a : "")) });
  }));
});
const targets = {};
function addKp(kp) { if (kp) targets[kp] = 1; }
try { require(path.join(ROOT, "data", "expmap.js")); Object.keys(window.EXPMAP).forEach(c => window.EXPMAP[c].forEach(e => addKp(e.k))); } catch (e) { }
try { require(path.join(ROOT, "data", "history.js")); (window.HISTORY || []).forEach(h => addKp(h.kp)); } catch (e) { }
try { require(path.join(ROOT, "data", "methods.js")); (window.METHODS || []).forEach(m => addKp(m.kp)); } catch (e) { }
try { require(path.join(ROOT, "data", "hotexp.js")); (window.HOTEXP || []).forEach(h => addKp(h.kp)); } catch (e) { }
/* 同章全部题目（用于关键词匹配） */
const chQs = {};
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  const arr = [];
  ["mcq","judge","fill","short","calc","term"].forEach(k => (ch[k] || []).forEach(q => {
    arr.push({ kind: k, q: (k === "term" ? q.term : q.q), a: (k === "term" ? q.def : (q.a != null ? q.a : "")) });
  }));
  chQs[id] = arr;
});
function kw(title) {
  return String(title).split(/[，、（）()\s\/:：·—\-]+/).map(x => x.replace(/[（(].*$/, "").trim()).filter(x => x.length >= 2).slice(0, 6);
}
const out = {};
let withQ = 0, tot = 0;
Object.keys(targets).forEach(kp => {
  const s = slideByKp[kp]; if (!s) return;
  const exact = (qByKp[kp] || []).slice(0, 4);
  let qs = exact.slice();
  if (qs.length < 3) {
    const cid = kp.split("_s")[0];
    const cand = kw(s.title).concat(kw((s.points || []).join(" "))).filter(function (v, i, a) { return a.indexOf(v) === i; });
    const seen = {}; qs.forEach(x => seen[x.q] = 1);
    (chQs[cid] || []).forEach(q => {
      if (qs.length >= 4) return;
      if (seen[q.q]) return;
      const blob = String(q.q) + String(q.a);
      if (cand.some(k => blob.indexOf(k) >= 0)) { qs.push(q); seen[q.q] = 1; }
    });
  }
  qs = qs.slice(0, 4).map(x => [x.kind, String(x.q).replace(/\s+/g, " ").slice(0, 80), String(x.a).replace(/\s+/g, " ").slice(0, 120)]);
  out[kp] = {
    t: String(s.title || "").replace(/\s+/g, " ").slice(0, 40),
    p: (s.points || []).slice(0, 4).map(x => String(x).replace(/\s+/g, " ").slice(0, 80)),
    q: qs,
    ex: s.experiment ? String(s.experiment).replace(/\s+/g, " ").slice(0, 160) : ""
  };
  tot++; if (qs.length) withQ++;
});
fs.writeFileSync(path.join(ROOT, "data", "kpqa.js"), "window.KPQA=" + JSON.stringify(out) + ";");
console.log("目标 kp:", tot, "| 有对应考题的 kp:", withQ, "| 文件大小约", Math.round(fs.statSync(path.join(ROOT, "data", "kpqa.js")).size / 1024) + "KB");
