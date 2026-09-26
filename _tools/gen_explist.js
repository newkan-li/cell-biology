global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const ids = [];
for (let i = 1; i <= 13; i++) ids.push("ch" + String(i).padStart(2, "0"));
["tb03","tb06","tb11","tb12","tb13","tb15","tb17"].forEach(function (x) { ids.push(x); });
const out = [];
ids.forEach(function (id) {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  ch.modules.forEach(function (m, mi) {
    (m.slides || []).forEach(function (s, si) {
      if (!s.experiment) return;
      out.push({ ch: id, chTitle: ch.title, mod: m.name, kp: id + "_s" + mi + "_" + si, page: s.page, title: s.title, ex: s.experiment });
    });
  });
});
fs.writeFileSync(path.join(ROOT, "data", "explist.js"), "window.EXPLIST=" + JSON.stringify(out) + ";");
console.log("实验条目:", out.length);
