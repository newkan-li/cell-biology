/* 生成实验页映射 data/expmap.js：window.EXPMAP = { cid: [{k,title}] }
   来源：各章含 s.experiment 的页面；k 为渲染锚点 id（cid_s<m.i>_<s.i>）
   用法：node _tools/gen_expmap.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const map = {};
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    if (!s.experiment) return;
    (map[id] = map[id] || []).push({ k: id + "_s" + m.i + "_" + s.i, title: String(s.title || "").replace(/\s+/g, " ").slice(0, 40) });
  }));
});
fs.writeFileSync(path.join(ROOT, "data", "expmap.js"), "window.EXPMAP=" + JSON.stringify(map) + ";");
let tot = 0; Object.keys(map).forEach(k => tot += map[k].length);
console.log("有实验的章:", Object.keys(map).length, "| 实验页合计:", tot);
Object.keys(map).forEach(k => console.log("  " + k + ": " + map[k].length));
