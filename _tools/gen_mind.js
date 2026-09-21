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
    const hit = pages.filter((p) => !p.isFig && p.text.indexOf(t) >= 0);
    if (hit.length >= 2 && hit.length <= 4) {
      for (let i = 0; i < hit.length - 1; i++) addEdge(hit[i].kp, hit[i + 1].kp, t, "term");
      tcount++;
    }
  }
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
