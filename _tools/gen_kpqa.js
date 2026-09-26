/* 生成 data/kpqa.js：{ kp: { t, p:[考点], ex:实验原文, q:[题目对象] } }
   题目对象：{ k:类型, id, q:题干, o:选项(mcq), a:答案, e:解析, kp }
   来源：含 kp 的实验/科学史/方法/高频实验 对应讲义页 + 该页关联题目（精确 kp 或同章关键词匹配）
   用法：node _tools/gen_kpqa.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const slideByKp = {}, qByKp = {}, chQs = {};
function normQ(q, k) { return { k: k, id: q.id, q: String(k === "term" ? q.term : q.q), o: q.o || null, a: String(k === "term" ? q.def : (q.a != null ? q.a : "")), e: q.e || "", kp: q.kp || null }; }
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => { slideByKp[id + "_s" + m.i + "_" + s.i] = s; }));
  const all = [];
  ["mcq","judge","fill","short","calc","term"].forEach(k => (ch[k] || []).forEach(q => {
    const o = normQ(q, k); all.push(o);
    if (q.kp) (qByKp[q.kp] = qByKp[q.kp] || []).push(o);
  }));
  chQs[id] = all;
});
const targets = {};
function addKp(kp) { if (kp) targets[kp] = 1; }
try { require(path.join(ROOT, "data", "expmap.js")); Object.keys(window.EXPMAP).forEach(c => window.EXPMAP[c].forEach(e => addKp(e.k))); } catch (e) { }
try { require(path.join(ROOT, "data", "history.js")); (window.HISTORY || []).forEach(h => addKp(h.kp)); } catch (e) { }
try { require(path.join(ROOT, "data", "methods.js")); (window.METHODS || []).forEach(m => addKp(m.kp)); } catch (e) { }
try { require(path.join(ROOT, "data", "hotexp.js")); (window.HOTEXP || []).forEach(h => addKp(h.kp)); } catch (e) { }
function kw(title) { return String(title).split(/[，、（）()\s\/:：·—\-]+/).map(x => x.replace(/[（(].*$/, "").trim()).filter(x => x.length >= 2).slice(0, 6); }
const out = {};
let withQ = 0, tot = 0;
Object.keys(targets).forEach(kp => {
  const s = slideByKp[kp]; if (!s) return;
  let qs = (qByKp[kp] || []).slice(0, 4);
  if (qs.length < 3) {
    const cid = kp.split("_s")[0];
    const cand = kw(s.title).concat(kw((s.points || []).join(" "))).filter(function (v, i, a) { return a.indexOf(v) === i; });
    const seen = {}; qs.forEach(x => seen[x.q] = 1);
    (chQs[cid] || []).forEach(q => {
      if (qs.length >= 4 || seen[q.q]) return;
      const blob = String(q.q) + String(q.a);
      if (cand.some(k => blob.indexOf(k) >= 0)) { qs.push(q); seen[q.q] = 1; }
    });
  }
  qs = qs.slice(0, 4).map(x => ({ k: x.k, id: x.id, q: String(x.q).replace(/\s+/g, " ").slice(0, 140), o: x.o, a: String(x.a).replace(/\s+/g, " ").slice(0, 180), e: String(x.e).replace(/\s+/g, " ").slice(0, 140), kp: x.kp }));
  out[kp] = {
    t: String(s.title || "").replace(/\s+/g, " ").slice(0, 40),
    p: (s.points || []).slice(0, 4).map(x => String(x).replace(/\s+/g, " ").slice(0, 80)),
    ex: s.experiment ? String(s.experiment).replace(/\s+/g, " ").slice(0, 160) : "",
    q: qs
  };
  tot++; if (qs.length) withQ++;
});
fs.writeFileSync(path.join(ROOT, "data", "kpqa.js"), "window.KPQA=" + JSON.stringify(out) + ";");
console.log("目标 kp:", tot, "| 有对应考题:", withQ, "| 大小约", Math.round(fs.statSync(path.join(ROOT, "data", "kpqa.js")).size / 1024) + "KB");
