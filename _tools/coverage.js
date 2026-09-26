/* 内容覆盖率报告 + 抽样复核
   用法：
     node _tools/coverage.js              打印各章覆盖表与总分
     node _tools/coverage.js --md FILE    另存为 Markdown 报告
     node _tools/coverage.js --sample 3   每章随机抽 3 页供人工/视觉复核
*/
global.window = {};
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
process.chdir(ROOT);
require(path.join(ROOT, "data", "manifest.js"));
const MANIFEST = window.MANIFEST || [];
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || true) : d; };
const mdFile = opt("--md", null), sampleN = parseInt(opt("--sample", "0"), 10) || 0;

const rows = [];
const ids = MANIFEST.map(m => m.id);
ids.forEach(id => {
  try { require(path.join(ROOT, "data", id + ".js")); } catch (e) { return; }
  const ch = window.CHAPTERS[id]; if (!ch) return;
  let n = 0, pts = 0, sum = 0, goal = 0, intu = 0, terms = 0, chk = 0, der = 0, exp = 0, anim = 0, ocr = 0;
  const slides = [];
  ch.modules.forEach(m => (m.slides || []).forEach(s => {
    n++;
    if ((s.points || []).length) pts++;
    if (s.summary) sum++;
    if (s.goal) goal++;
    if (s.intuition) intu++;
    if ((s.terms || []).length) terms++;
    if (s.check) chk++;
    if (s.derive) der++;
    if (s.experiment) exp++;
    if (s.anim) anim++;
    if (s.ocr) ocr++;
    slides.push(s);
  }));
  const qn = ["mcq", "judge", "fill", "short", "calc", "term"].reduce((a, k) => a + ((ch[k] || []).length), 0);
  const narrative = !!ch.narrative;
  const preview = !!(ch.preview && ch.preview.questions && ch.preview.questions.length);
  // 简化“自足度”：要点/主旨/自测/通俗/题目 各占权重
  const score = Math.round(100 * (0.30 * (pts / n) + 0.15 * (sum / n) + 0.15 * (chk / n) + 0.15 * (intu / n) + 0.10 * (terms / n) + 0.15 * (qn > 0 ? 1 : 0)));
  rows.push({ id, title: ch.title, n, qn, der, exp, anim, ocr, terms, narrative, preview, score, slides });
});

const pad = (s, w) => { s = String(s); return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length); };
let L = pad("章", 6) + pad("页", 5) + pad("题", 5) + pad("推导", 5) + pad("实验", 5) + pad("动画", 5) + pad("OCR", 5) + pad("术语页", 6) + pad("叙述", 5) + pad("预习", 5) + "自足度";
let md = "| 章 | 页 | 题 | 推导 | 实验 | 动画 | OCR | 术语页 | 叙述 | 预习 | 自足度 |\n|---|--:|--:|--:|--:|--:|--:|--:|:--:|:--:|--:|\n";
console.log(L); console.log("-".repeat(L.length));
let T = { n: 0, qn: 0, der: 0, exp: 0, anim: 0, terms: 0 }, scoreSum = 0;
rows.forEach(r => {
  console.log(pad(r.id, 6) + pad(r.n, 5) + pad(r.qn, 5) + pad(r.der, 5) + pad(r.exp, 5) + pad(r.anim, 5) + pad(r.ocr, 5) + pad(r.terms, 6) + pad(r.narrative ? "✓" : "", 5) + pad(r.preview ? "✓" : "", 5) + r.score + "%");
  md += "| " + r.id + " | " + r.n + " | " + r.qn + " | " + r.der + " | " + r.exp + " | " + r.anim + " | " + r.ocr + " | " + r.terms + " | " + (r.narrative ? "✓" : "") + " | " + (r.preview ? "✓" : "") + " | " + r.score + "% |\n";
  T.n += r.n; T.qn += r.qn; T.der += r.der; T.exp += r.exp; T.anim += r.anim; T.terms += r.terms; scoreSum += r.score;
});
console.log("-".repeat(L.length));
console.log("合计: 页 " + T.n + " | 题 " + T.qn + " | 推导 " + T.der + " | 实验 " + T.exp + " | 动画 " + T.anim + " | 有术语页 " + T.terms);
console.log("平均自足度: " + Math.round(scoreSum / rows.length) + "%（各章按 要点/主旨/自测/通俗/术语/题目 加权）");

if (sampleN) {
  console.log("\n抽样复核（每章随机 " + sampleN + " 页，请人工/视觉核对内容与图片）:");
  rows.forEach(r => {
    const picks = r.slides.slice().sort(() => Math.random() - 0.5).slice(0, sampleN);
    picks.forEach((s, i) => console.log("  [" + r.id + "] " + String(s.title).replace(/\s+/g, " ").slice(0, 40) + "  img=" + (s.img || "(无)")));
  });
}
if (mdFile) {
  fs.writeFileSync(mdFile, "# 覆盖率报告\n\n生成时间: " + new Date().toISOString() + "\n\n" + md +
    "\n合计: 页 " + T.n + "，题 " + T.qn + "，推导 " + T.der + "，实验 " + T.exp + "，动画 " + T.anim + "。平均自足度 " + Math.round(scoreSum / rows.length) + "%。\n");
  console.log("\n已写入 " + mdFile);
}
