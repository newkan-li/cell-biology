/* 生成 data/schedule.js：把 ch01-13 的模块按章分组为约 30 个「讲次」
   用法：node _tools/gen_schedule.js  */
global.window = {};
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = [];
for (let i = 1; i <= 13; i++) ids.push("ch" + String(i).padStart(2, "0"));

const GROUPS = {
  ch01: [[0, 3]],
  ch02: [[0, 0], [1, 1]],
  ch03: [[0, 0], [1, 1], [2, 2]],
  ch04: [[0, 0], [1, 1]],
  ch05: [[0, 2]],
  ch06: [[0, 4], [5, 7], [8, 14]],
  ch07: [[0, 3], [4, 8], [9, 11]],
  ch08: [[0, 8]],
  ch09: [[0, 2], [3, 6]],
  ch10: [[0, 4], [5, 6], [7, 8]],
  ch11: [[0, 1], [2, 2], [3, 6]],
  ch12: [[0, 3], [4, 4], [5, 7]],
  ch13: [[0, 2], [3, 5], [6, 7]]
};

function label(modName) {
  const s = String(modName || "");
  const i = s.lastIndexOf("·");
  return (i >= 0 ? s.slice(i + 1) : s).trim();
}

const lessons = [];
let n = 0;
ids.forEach(function (id) {
  require(path.join(ROOT, "data", id + ".js"));
  const ch = window.CHAPTERS[id];
  if (!ch) return;
  const groups = GROUPS[id] || [[0, ch.modules.length - 1]];
  groups.forEach(function (g) {
    const a = g[0], b = g[1];
    const pages = [];
    const names = [];
    let est = 0;
    for (let mi = a; mi <= b; mi++) {
      const m = ch.modules[mi];
      if (!m) continue;
      names.push(label(m.name));
      (m.slides || []).forEach(function (s, si) {
        pages.push({ k: id + "_s" + mi + "_" + si, page: s.page, title: s.title, level: s.level });
        est += 2;
      });
    }
    n++;
    lessons.push({
      n: n, ch: id, chTitle: ch.title,
      name: names.filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).join(" / ") || ch.title,
      mods: [[a, b]], pages: pages, est: est
    });
  });
});

const out = {
  generatedFrom: "ch01-ch13 modules",
  total: lessons.length,
  lessons: lessons
};
fs.writeFileSync(path.join(ROOT, "data", "schedule.js"),
  "window.SCHEDULE=" + JSON.stringify(out) + ";");
console.log("写出 " + lessons.length + " 讲，页面总数 " +
  lessons.reduce(function (a, l) { return a + l.pages.length; }, 0));
