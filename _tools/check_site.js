/* 全站回归自检：版本号 / 本地引用 / 章节动画与图片 / manifest 一致性
   用法：node _tools/check_site.js  */
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
try { process.chdir(ROOT); } catch (e) { }
const ids = ["ch01","ch02","ch03","ch04","ch05","ch06","ch07","ch08","ch09","ch10","ch11","ch12","ch13","tb03","tb06","tb11","tb12","tb13","tb15","tb17"];
let fail = 0;
function bad(msg) { console.log("  ✗ " + msg); fail++; }

const htmlFiles = fs.readdirSync(".").filter(f => f.endsWith(".html"));
const animHtml = fs.readdirSync("anim").filter(f => f.endsWith(".html")).map(f => "anim/" + f);

// 1) 版本号一致性
const vers = {};
[...htmlFiles, ...animHtml].forEach(f => {
  const s = fs.readFileSync(f, "utf8");
  (s.match(/\?v=([0-9a-zA-Z]+)/g) || []).forEach(v => { const k = v.slice(3); vers[k] = (vers[k] || 0) + 1; });
});
const vk = Object.keys(vers);
console.log("1) 版本号:", JSON.stringify(vers));
if (vk.length > 1) bad("存在多个版本号: " + vk.join(", "));

// 2) 本地引用存在性（排除内联模板拼接）
let checked = 0, missing = {};
[...htmlFiles, ...animHtml].forEach(f => {
  const dir = path.dirname(f), s = fs.readFileSync(f, "utf8"), re = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(s))) {
    let u = m[1];
    if (/['+]/.test(u)) continue;
    if (/^(https?:|#|mailto:|data:|javascript:|\/\/)/.test(u)) continue;
    u = u.split("?")[0].split("#")[0];
    if (!u) continue;
    checked++;
    if (!fs.existsSync(path.join(dir, u))) (missing[u] = missing[u] || []).push(f);
  }
});
console.log("2) 本地引用:", checked, "| 缺失:", Object.keys(missing).length);
Object.keys(missing).forEach(k => bad("缺 " + k + " <- " + missing[k].slice(0, 2).join(",")));

// 3) 章节 slide 的动画与图片资源
let animRef = 0, animMiss = 0, imgMiss = 0;
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    if (s.anim) { animRef++; if (!fs.existsSync("anim/" + s.anim + ".html")) { animMiss++; bad(id + " 缺动画 " + s.anim); } }
    if (s.img && !fs.existsSync(s.img)) { imgMiss++; bad(id + " 缺图 " + s.img); }
  }));
});
console.log("3) slide 动画引用:", animRef, "缺:", animMiss, "| slide 图片缺失:", imgMiss);

// 4) manifest 与实际文件
require(path.join(ROOT, "data", "manifest.js"));
let mf = 0;
(window.MANIFEST || []).forEach(m => {
  if (!fs.existsSync("data/" + m.id + ".js")) { mf++; bad("manifest 无数据文件 " + m.id); }
  if (!fs.existsSync(m.id + ".html")) { mf++; bad("manifest 无页面 " + m.id); }
});
console.log("4) manifest 不一致:", mf);

console.log(fail ? ("\n结果：发现 " + fail + " 个问题") : "\n结果：全部通过 ✔");
process.exit(fail ? 1 : 0);
