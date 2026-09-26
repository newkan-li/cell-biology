/* 生成每章元数据 data/chapmeta.js：{ cid: { anim:[{k,anim,title}], derive:[{k,title}], exp:[{k,title}] } }
   用法：node _tools/gen_chapmeta.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
const meta = {};
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  const o = { anim: [], derive: [], exp: [] };
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    const k = id + "_s" + m.i + "_" + s.i, t = String(s.title || "").replace(/\s+/g, " ").slice(0, 40);
    if (s.anim) o.anim.push({ k: k, anim: s.anim, title: t });
    if (s.derive) o.derive.push({ k: k, title: t });
    if (s.experiment) o.exp.push({ k: k, title: t });
  }));
  meta[id] = o;
});
fs.writeFileSync(path.join(ROOT, "data", "chapmeta.js"), "window.CHAPMETA=" + JSON.stringify(meta) + ";");
let a = 0, d = 0, e = 0;
Object.keys(meta).forEach(k => { a += meta[k].anim.length; d += meta[k].derive.length; e += meta[k].exp.length; });
console.log("章:", Object.keys(meta).length, "| 动画:", a, "| 推导:", d, "| 实验:", e);
