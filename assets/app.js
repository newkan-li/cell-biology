/* 细胞生物学自学网页 — 学习/答题/错题本/手写/统计/备份
   纯前端，localStorage 本地存储。 */
(function () {
  "use strict";

  /* ---------- constants ---------- */
  var CAUSES = [
    ["concept", "概念不清"],
    ["memory", "记忆错误"],
    ["understand", "理解偏差"],
    ["careless", "审题失误"],
    ["other", "其他"]
  ];
  var PREFIX = "cellbio_";

  /* ---------- storage ---------- */
  function jget(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("存储失败", e); } }
  function skey(cid, kind) { return PREFIX + kind + ":" + cid; }
  function touch(cid) { jset(skey(cid, "last"), Date.now()); }

  function mcqStore(cid) { return jget(skey(cid, "mcq"), {}); }
  function judgeStore(cid) { return jget(skey(cid, "judge"), {}); }
  function fillStore(cid) { return jget(skey(cid, "fill"), {}); }
  function selfStore(cid) { return jget(skey(cid, "self"), {}); }
  function seenStore(cid) { return jget(skey(cid, "seen"), {}); }
  function textStore(cid) { return jget(skey(cid, "text"), {}); }
  function saveText(cid, qid, val) {
    var s = textStore(cid); s[qid] = val; jset(skey(cid, "text"), s); touch(cid);
  }
  function wrongList(cid) { return jget(skey(cid, "wrong"), []); }
  function setWrong(cid, arr) { jset(skey(cid, "wrong"), arr); }

  function addWrong(cid, entry) {
    var arr = wrongList(cid).filter(function (e) { return e.id !== entry.id; });
    arr.push(entry);
    setWrong(cid, arr);
  }
  function clearWrong(cid, id) {
    setWrong(cid, wrongList(cid).filter(function (e) { return e.id !== id; }));
  }

  /* ---------- 不懂 / 待问 ---------- */
  function confusedStore(cid) { return jget(skey(cid, "confused"), {}); }
  function setConfusedStore(cid, o) { jset(skey(cid, "confused"), o); }
  function isConfused(cid, kp) { return !!confusedStore(cid)[kp]; }
  function toggleConfused(cid, kp, note) {
    var o = confusedStore(cid);
    if (o[kp]) { delete o[kp]; }
    else { o[kp] = { note: note || "", ts: Date.now() }; }
    setConfusedStore(cid, o);
    return !!o[kp];
  }
  function confusedCount(cid) { return Object.keys(confusedStore(cid)).length; }
  function confusedAll() {
    var out = {};
    (window.MANIFEST || []).forEach(function (m) {
      var cs = confusedStore(m.id);
      Object.keys(cs).forEach(function (kp) { out[kp] = cs[kp]; });
    });
    return out;
  }

  /* ---------- 间隔复习 / 掌握度 / 打卡 状态层 ---------- */
  var SRS_KEY = PREFIX + "srs", KPS_KEY = PREFIX + "kpStats",
    STREAK_KEY = PREFIX + "streak", TASK_KEY = PREFIX + "tasks";
  var DAY = 86400000;

  function srsAll() { return jget(SRS_KEY, {}); }
  function srsSave(o) { jset(SRS_KEY, o); }
  function srsGet(id) { return srsAll()[id]; }
  /* rating: 2=会 1=模糊 0=不会 */
  function srsRate(id, rating) {
    if (!id) return null;
    var o = srsAll();
    var c = o[id] || { ease: 2.5, ivl: 0, reps: 0, lapses: 0, due: 0, last: 0 };
    var now = Date.now();
    if (rating >= 2) {
      c.reps = (c.reps || 0) + 1;
      if (c.reps <= 1) c.ivl = 1;
      else if (c.reps === 2) c.ivl = 3;
      else c.ivl = Math.round((c.ivl || 1) * (c.ease || 2.5));
      c.ease = Math.min(2.8, (c.ease || 2.5) + 0.1);
    } else if (rating === 1) {
      c.ivl = Math.max(1, Math.round((c.ivl || 1) * 0.6));
      c.ease = Math.max(1.3, (c.ease || 2.5) - 0.15);
    } else {
      c.reps = 0; c.ivl = 0; c.lapses = (c.lapses || 0) + 1;
      c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2);
    }
    c.last = now; c.due = now + c.ivl * DAY;
    o[id] = c; srsSave(o);
    bumpTask("review");
    return c;
  }
  function srsDue() {
    var now = Date.now(), o = srsAll(), out = [];
    for (var k in o) if (o[k] && o[k].due <= now) out.push(k);
    return out;
  }
  function srsCount() { return Object.keys(srsAll()).length; }

  /* ---------- 闪卡作答记录 ---------- */
  function fcAnsAll() { return jget(PREFIX + "fcans", {}); }
  function fcAnsGet(id) { return fcAnsAll()[id]; }
  function fcAnsSave(id, mode, input, ok) {
    var o = fcAnsAll(), c = o[id] || { n: 0, okN: 0, attempts: [] };
    c.n++; if (ok) c.okN++;
    c.last = input; c.lastOk = ok; c.lastTs = Date.now(); c.lastMode = mode;
    c.attempts.push({ ts: Date.now(), mode: mode, input: input, ok: ok });
    if (c.attempts.length > 10) c.attempts.shift();
    o[id] = c; jset(PREFIX + "fcans", o);
  }

  function kpAll() { return jget(KPS_KEY, {}); }
  function kpRecord(kp, correct) {
    if (!kp) return;
    var o = kpAll(), c = o[kp] || { ok: 0, n: 0 };
    if (c.first === undefined) c.first = !!correct;
    c.lastOk = !!correct;
    c.n++; if (correct) c.ok++;
    o[kp] = c; jset(KPS_KEY, o);
    bumpTask("practice");
    if (typeof window.__refreshHeat === "function") window.__refreshHeat();
  }
  /* 0~1 掌握度：正确率(0.6) + 复习强度(0.4) */
  function kpMastery(kp) {
    var c = kpAll()[kp], s = srsGet(kp);
    var acc = (c && c.n) ? c.ok / c.n : null;
    var strength = s ? Math.min(1, (s.reps || 0) / 4) : 0;
    if (acc == null) return strength;
    return 0.6 * acc + 0.4 * strength;
  }
  /* ---------- 章末通关测记录 ---------- */
  function passedAll() { return jget(PREFIX + "passed", {}); }
  function passedGet(cid) { return passedAll()[cid] || null; }
  function passedSet(cid, rec) { var o = passedAll(); o[cid] = rec; jset(PREFIX + "passed", o); }

  function todayStr(d) { d = d || new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function isoWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
    var y = d.getUTCFullYear(), start = new Date(Date.UTC(y, 0, 1));
    return y + "-W" + Math.ceil(((d - start) / 86400000 + 1) / 7);
  }
  function bumpTask(kind) {
    var all = jget(TASK_KEY, {}), t = todayStr();
    if (!all[t]) all[t] = { read: 0, review: 0, practice: 0 };
    all[t][kind] = (all[t][kind] || 0) + 1;
    jset(TASK_KEY, all);
    var st = jget(STREAK_KEY, { days: {}, last: "" });
    if (!st.days[t]) st.days[t] = 1; else st.days[t]++;
    st.last = t; jset(STREAK_KEY, st);
  }
  function taskState() {
    var all = jget(TASK_KEY, {}), t = todayStr();
    return all[t] || { read: 0, review: 0, practice: 0 };
  }
  function streakCount() {
    var st = jget(STREAK_KEY, { days: {} }), n = 0, d = new Date();
    for (var i = 0; i < 3650; i++) {
      if (st.days[todayStr(d)]) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]; }); }
  /* 参考难度（按题型分层）：客观→基础、填空/名词/简答→中等、论述/计算/设计→提高 */
  function diffTag(kind) {
    var m = { mcq: ["基础", 1], judge: ["基础", 1], fill: ["中等", 2], term: ["中等", 2], short: ["中等", 2], calc: ["提高", 3] };
    var x = m[kind]; if (!x) return "";
    return '<span class="diff d' + x[1] + '" title="参考难度（按题型分层）">' + x[0] + "</span>";
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function lev(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  function ratio(a, b) { a = String(a); b = String(b); var m = Math.max(a.length, b.length); return m ? 1 - lev(a, b) / m : 1; }

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/[，,、;；\/|]+/g, " ")
      .replace(/[（）()【】\[\]{}“”"'’·:：.。\-—_~!！?？]/g, "")
      .replace(/\s+/g, " ").trim();
  }
  function tokens(s) { return norm(s).split(" ").filter(Boolean); }

  /* fuzzy match: exact / all-token-contained / per-token similarity */
  function fuzzyMatch(expected, user) {
    if (!user || !String(user).trim()) return false;
    var e = tokens(expected), u = norm(user), ut = u.split(" ").filter(Boolean);
    if (norm(expected) === u) return true;
    if (e.length && e.every(function (t) { return u.indexOf(t) >= 0; })) return true;
    if (e.length === ut.length && e.every(function (t, i) {
      return ratio(t, ut[i]) >= 0.8 || t.indexOf(ut[i]) >= 0 || ut[i].indexOf(t) >= 0;
    })) return true;
    // single-answer long string
    if (e.length === 1 && ratio(e[0], u) >= 0.82) return true;
    return false;
  }

  /* ================= handwriting ================= */
  var HW = {
    data: {}, cid: null,
    init: function (cid) { this.cid = cid; this.data = jget(skey(cid, "hw"), {}); },
    save: function () { jset(skey(this.cid, "hw"), this.data); },
    get: function (key) { return this.data[key] || []; },
    set: function (key, strokes) { this.data[key] = strokes; this.save(); },
    attach: function (canvas, key) {
      var self = this;
      canvas.dataset.key = key;
      function draw() {
        var dpr = window.devicePixelRatio || 1;
        var r = canvas.getBoundingClientRect();
        if (!r.width) return;
        canvas.width = r.width * dpr; canvas.height = r.height * dpr;
        var ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, r.width, r.height);
        ctx.strokeStyle = "#1a2b45"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        var strokes = self.get(key);
        strokes.forEach(function (st) {
          if (!st.length) return;
          if (st.length === 1) { ctx.beginPath(); ctx.arc(st[0][0] * r.width, st[0][1] * r.height, 1.6, 0, 7); ctx.fill(); return; }
          ctx.beginPath();
          st.forEach(function (p, i) { var x = p[0] * r.width, y = p[1] * r.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.stroke();
        });
      }
      function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
      var drawing = false, cur = null;
      canvas.addEventListener("pointerdown", function (e) {
        e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true;
        var p = pos(e);
        if (canvas.dataset.eraser === "1") { self.erase(key, p); draw(); return; }
        cur = [p]; var arr = self.get(key).slice(); arr.push(cur); self.data[key] = arr; draw();
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!drawing) return; e.preventDefault();
        var p = pos(e);
        if (canvas.dataset.eraser === "1") { self.erase(key, p); draw(); return; }
        cur.push(p); draw();
      });
      function end() { if (!drawing) return; drawing = false; cur = null; self.save(); }
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", end);
      canvas.addEventListener("pointerleave", function () { if (drawing) end(); });
      canvas._redraw = draw; draw();
    },
    erase: function (key, p) {
      var arr = this.get(key).filter(function (st) {
        return !st.some(function (q) { return Math.abs(q[0] - p[0]) < 0.03 && Math.abs(q[1] - p[1]) < 0.05; });
      });
      this.data[key] = arr; this.save();
    },
    undo: function (key) { var arr = this.get(key); arr.pop(); this.data[key] = arr; this.save(); }
  };

  function hwBox(cid, key, tall) {
    var box = el("div", "hwbox");
    var bar = el("div", "hwbar");
    bar.appendChild(el("span", "lbl", "✍️ 手写作答/批注（触控笔/手指）"));
    var bEr = el("button", "", "橡皮：关"), bUn = el("button", "", "撤销"), bCl = el("button", "", "清空");
    bar.appendChild(bEr); bar.appendChild(bUn); bar.appendChild(bCl);
    var cv = el("canvas", "hw" + (tall ? " tall" : ""));
    box.appendChild(bar); box.appendChild(cv);
    bEr.onclick = function () {
      var on = cv.dataset.eraser === "1"; cv.dataset.eraser = on ? "0" : "1";
      bEr.textContent = "橡皮：" + (on ? "关" : "开"); bEr.classList.toggle("on", !on);
    };
    bUn.onclick = function () { HW.undo(key); cv._redraw(); };
    bCl.onclick = function () { if (confirm("清空本框手写？")) { HW.set(key, []); cv._redraw(); } };
    setTimeout(function () { HW.attach(cv, key); }, 0);
    window.addEventListener("resize", function () { if (cv._redraw) cv._redraw(); });
    return box;
  }

  /* ================= error-cause selector ================= */
  function causeBox(cid, qid, onPick) {
    var box = el("div", "causes"); box.style.display = "none";
    box.appendChild(el("span", "lab", "错因："));
    var entry = wrongList(cid).filter(function (e) { return e.id === qid; })[0];
    CAUSES.forEach(function (c) {
      var b = el("button", "", c[1]);
      if (entry && entry.cause === c[0]) b.classList.add("on");
      b.onclick = function () {
        Array.prototype.forEach.call(box.querySelectorAll("button"), function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var arr = wrongList(cid);
        arr.forEach(function (e) { if (e.id === qid) e.cause = c[0]; });
        setWrong(cid, arr);
        if (onPick) onPick(c[0]);
      };
      box.appendChild(b);
    });
    return box;
  }

  /* ================= MCQ ================= */
  function optsExplain(q) {
    if (!q || !q.oe || !q.oe.length) return "";
    var correct = String(q.a).trim();
    var h = '<div class="oe-list">';
    (q.o || []).forEach(function (o, i) {
      var L = String(o).trim().charAt(0);
      var ok = (L === correct);
      h += '<div class="oe ' + (ok ? "ok" : "no") + '"><b>' + (ok ? "✔" : "✘") + " " + esc(L) + "</b> " + esc(q.oe[i] || "") + "</div>";
    });
    h += "</div>";
    return h;
  }
  function fillExplain(q) {
    if (!q || !q.oe || !q.oe.length) return "";
    var marks = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫";
    var h = '<div class="oe-list">';
    q.oe.forEach(function (r, i) {
      h += '<div class="oe"><b>' + (q.oe.length > 1 ? (marks.charAt(i) || ((i + 1) + ".")) : "解析") + "</b> " + esc(r) + "</div>";
    });
    return h + "</div>";
  }
  function renderMCQ(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题 " + diffTag("mcq") + " " + esc(q.q) + (q.mod ? '<span class="src">[' + esc(q.mod) + "]</span>" : "")));
    var opts = el("div", "mcq");
    q.o.forEach(function (o) {
      var letter = o.trim().charAt(0);
      var b = el("button", "mopt", esc(o));
      b.dataset.l = letter;
      b.onclick = function () { gradeMCQ(cid, q, box, letter); };
      opts.appendChild(b);
    });
    box.appendChild(opts);
    var res = el("div", "mres"); res.style.display = "none"; box.appendChild(res);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box._cause = cb; box._res = res;
    var _rec = mcqStore(cid)[q.id];
    if (_rec && _rec.last != null) {
      var _ok = String(_rec.last) === String(q.a).trim();
      var _bar = redoBar(_ok ? "上次作答：✅ 正确" : "上次作答：❌ 错误", function () {
        clearQRec(cid, "mcq", q.id);
        resetQuestionBox(box, opts, res, cb);
        _bar.remove();
      });
      box.appendChild(_bar);
    }
    return box;
  }

  function gradeMCQ(cid, q, box, chosen) {
    var correct = String(q.a).trim();
    var ok = chosen === correct;
    var store = mcqStore(cid);
    var rec = store[q.id] || { ok: 0, miss: 0 };
    if (rec.first === undefined) rec.first = ok;
    rec.n = (rec.n || 0) + 1;
    rec.last = chosen;
    if (ok) { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
    store[q.id] = rec; jset(skey(cid, "mcq"), store); touch(cid);

    Array.prototype.forEach.call(box.querySelectorAll(".mopt"), function (b) {
      b.classList.remove("sel", "right", "wrong");
      if (b.dataset.l === chosen) b.classList.add(ok ? "right" : "wrong");
      if (!ok && b.dataset.l === correct) b.classList.add("right");
      if (b.dataset.l === chosen) b.classList.add("sel");
    });
    var res = box._res; res.style.display = "block";
    res.innerHTML = (ok ? '<span class="ok">✔ 正确</span>' : '<span class="no">✘ 错误</span>（正确答案：<b>' + esc(correct) + "</b>）") +
      '<div style="margin-top:4px">解析：' + esc(q.e || "") + "</div>" + optsExplain(q);
    box._cause.style.display = ok ? "none" : "flex";
    if (!ok) {
      addWrong(cid, { id: q.id, type: "mcq", q: q.q, correct: correct, chosen: chosen, cause: "", ts: Date.now() });
    } else {
      clearWrong(cid, q.id);
    }
    kpRecord(q.kp, ok);
    if (!ok) srsRate(q.id, 0); else if (srsGet(q.id)) srsRate(q.id, 2);
  }

  /* ================= 判断题 ================= */
  function renderJudge(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题（判断对错） " + diffTag("judge") + " " + esc(q.q)));
    var opts = el("div", "mcq");
    ["对", "错"].forEach(function (v) {
      var b = el("button", "mopt", v); b.dataset.l = v;
      b.onclick = function () { gradeJudge(cid, q, box, v); };
      opts.appendChild(b);
    });
    box.appendChild(opts);
    var res = el("div", "mres"); res.style.display = "none"; box.appendChild(res);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box._cause = cb; box._res = res;
    var _jr = judgeStore(cid)[q.id];
    if (_jr && _jr.last != null) {
      var _jok = String(_jr.last) === String(q.a).trim();
      var _jbar = redoBar(_jok ? "上次作答：✅ 正确" : "上次作答：❌ 错误", function () {
        clearQRec(cid, "judge", q.id);
        resetQuestionBox(box, opts, res, cb);
        _jbar.remove();
      });
      box.appendChild(_jbar);
    }
    return box;
  }
  function gradeJudge(cid, q, box, chosen) {
    var correct = String(q.a).trim();
    var ok = chosen === correct;
    var store = judgeStore(cid);
    var rec = store[q.id] || { ok: 0, miss: 0 };
    if (rec.first === undefined) rec.first = ok;
    rec.n = (rec.n || 0) + 1;
    rec.last = chosen;
    if (ok) { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
    store[q.id] = rec; jset(skey(cid, "judge"), store); touch(cid);
    Array.prototype.forEach.call(box.querySelectorAll(".mopt"), function (b) {
      b.classList.remove("sel", "right", "wrong");
      if (b.dataset.l === chosen) b.classList.add(ok ? "right" : "wrong");
      if (!ok && b.dataset.l === correct) b.classList.add("right");
      if (b.dataset.l === chosen) b.classList.add("sel");
    });
    var res = box._res; res.style.display = "block";
    res.innerHTML = (ok ? '<span class="ok">✔ 正确</span>' : '<span class="no">✘ 错误</span>（正确答案：<b>' + esc(correct) + "</b>）") +
      '<div style="margin-top:4px">解析：' + esc(q.e || "") + "</div>" + optsExplain({ o: ["对", "错"], a: q.a, oe: q.oe });
    box._cause.style.display = ok ? "none" : "flex";
    if (!ok) addWrong(cid, { id: q.id, type: "judge", q: q.q, correct: correct, chosen: chosen, cause: "", ts: Date.now() });
    else clearWrong(cid, q.id);
    kpRecord(q.kp, ok);
    if (!ok) srsRate(q.id, 0); else if (srsGet(q.id)) srsRate(q.id, 2);
  }

  /* ================= fill ================= */
  function renderFill(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题 " + diffTag("fill") + " " + esc(q.q)));
    var inp = el("input", "ans"); inp.placeholder = "输入答案（多个空用逗号分隔）"; box.appendChild(inp);
    var bar = el("div", "self");
    var bChk = el("button", "ok", "检查"), bShow = el("button", "", "显示答案");
    bar.appendChild(bChk); bar.appendChild(bShow); box.appendChild(bar);
    var det = el("details", "sol");
    det.innerHTML = '<summary>参考答案</summary><div class="ansbox"><b>' + esc(q.a) + "</b>" + fillExplain(q) + "</div>";
    box.appendChild(det);
    var res = el("div", "mres"); res.style.display = "none"; box.appendChild(res);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box.appendChild(hwBox(cid, q.id));

    box._check = function () {
      var ok = fuzzyMatch(q.a, inp.value);
      var store = fillStore(cid); var rec = store[q.id] || { ok: 0, miss: 0 };
      if (rec.first === undefined) rec.first = ok;
      rec.n = (rec.n || 0) + 1;
      rec.last = inp.value;
      if (ok) { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
      store[q.id] = rec; jset(skey(cid, "fill"), store); touch(cid);
      inp.classList.remove("right", "wrong"); inp.classList.add(ok ? "right" : "wrong");
      res.style.display = "block";
      res.innerHTML = (ok ? '<span class="ok">✔ 正确</span>' : '<span class="no">✘ 与参考答案不完全一致</span>，可点“显示答案”核对。') + fillExplain(q);
      cb.style.display = ok ? "none" : "flex";
      if (ok) { clearWrong(cid, q.id); } else { addWrong(cid, { id: q.id, type: "fill", q: q.q, correct: q.a, chosen: inp.value, cause: "", ts: Date.now() }); }
      kpRecord(q.kp, ok);
      if (!ok) srsRate(q.id, 0); else if (srsGet(q.id)) srsRate(q.id, 2);
    };
    bChk.onclick = box._check;
    bShow.onclick = function () { det.open = true; };
    var _fr = fillStore(cid)[q.id];
    if (_fr && _fr.last != null) {
      var _fok = fuzzyMatch(q.a, _fr.last);
      var _fbar = redoBar(_fok ? "上次作答：✅ 正确" : "上次作答：❌ 错误", function () {
        clearQRec(cid, "fill", q.id);
        resetQuestionBox(box, null, res, cb, inp);
        _fbar.remove();
      });
      box.appendChild(_fbar);
    }
    return box;
  }

  /* ================= self-assessed (short/calc/term) ================= */
  function renderSelf(cid, q, idx, kind) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    var title, answerHTML, kps = "";
    if (kind === "term") {
      title = "名词解释 " + idx + "：" + esc(q.term);
      answerHTML = "<b>标准定义：</b><br>" + esc(q.def).replace(/\n/g, "<br>");
      kps = q.kps || "";
    } else {
      title = (kind === "short" ? "简答题 " : "论述/推导 ") + idx + "：" + diffTag(kind) + " " + esc(q.q) + (q.type ? ' <span class="src">[' + esc(q.type) + "]</span>" : "") + (q.src ? ' <span class="src">[' + esc(q.src) + "]</span>" : "");
      answerHTML = "<b>参考答案：</b><br>" + esc(kind === "calc" ? (q.steps || q.a) : q.a).replace(/\n/g, "<br>");
      kps = q.kps || "";
    }
    box.appendChild(el("p", "qq", title));
    var tmpl = el("details", "tmpl");
    tmpl.innerHTML = "<summary>📝 答题模板（先看结构再作答）</summary><div class='tmpl-body'>" +
      (kind === "term"
        ? "【名词解释模板】定义（属 + 种差）＋ 1–2 条关键特征 ＋（可选）实例/意义。力求准确、简练，一般 3–5 分。"
        : "【简答/论述答题模板】<br>① <b>点名概念</b>：先给核心名词下定义（是什么）。<br>② <b>分步机制/过程</b>：按顺序或分类，用“首先/其次/此外”写清环节（怎么发生）。<br>③ <b>举例或证据</b>：给出典型实验、实例或数据支持。<br>④ <b>结论/意义</b>：一句话总结作用、意义或应用。") +
      "</div>";
    box.appendChild(tmpl);
    var ta = el("textarea", "ta");
    ta.placeholder = (kind === "term")
      ? "在此用键盘输入你的定义（先自己写，再展开标准定义核对；内容会自动保存）"
      : "在此用键盘输入你的答案要点（先自己写，再展开参考答案核对；内容会自动保存）";
    ta.rows = 5;
    ta.value = textStore(cid)[q.id] || "";
    ta.addEventListener("input", function () { saveText(cid, q.id, ta.value); });
    box.appendChild(ta);
    var tbar = el("div", "self");
    var bClr = el("button", "", "清空输入");
    bClr.onclick = function () { if (confirm("清空已输入的答案？")) { ta.value = ""; saveText(cid, q.id, ""); } };
    tbar.appendChild(bClr);
    box.appendChild(tbar);
    var det = el("details", "sol");
    det.innerHTML = '<summary>参考答案 / 踩分点</summary><div class="ansbox">' + answerHTML + "</div>" +
      (kps ? '<div class="kps">' + esc(kps) + "</div>" : "");
    box.appendChild(det);
    var bar = el("div", "self");
    bar.appendChild(el("span", "rubric", "自评：对照“踩分点”，要点完整=掌握；漏 1–2 个要点=部分；写不出或方向错=不会。"));
    var bOk = el("button", "ok", "✓ 掌握"), bPart = el("button", "part", "△ 部分"), bNo = el("button", "no", "✗ 不会");
    bar.appendChild(bOk); bar.appendChild(bPart); bar.appendChild(bNo); box.appendChild(bar);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box.appendChild(hwBox(cid, q.id, kind !== "term"));

    function mark(state) {
      var store = selfStore(cid); var rec = store[q.id] || { ok: 0, miss: 0 };
      if (state === "ok") { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); }
      else if (state === "part") { rec.part = (rec.part || 0) + 1; }
      else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
      rec.state = state; store[q.id] = rec; jset(skey(cid, "self"), store); touch(cid);
      bOk.classList.toggle("on", state === "ok"); bPart.classList.toggle("on", state === "part"); bNo.classList.toggle("on", state === "no");
      cb.style.display = state === "no" ? "flex" : "none";
      if (state === "no") {
        addWrong(cid, { id: q.id, type: kind, q: (kind === "term" ? q.term : q.q), correct: (kind === "term" ? q.def : (kind === "calc" ? (q.a || q.steps) : q.a)), chosen: "(自评不会)", cause: "", ts: Date.now() });
      } else { clearWrong(cid, q.id); }
      kpRecord(q.kp, state === "ok");
      if (state === "no") srsRate(q.id, 0); else if (state === "part") srsRate(q.id, 1); else if (srsGet(q.id)) srsRate(q.id, 2);
    }
    bOk.onclick = function () { mark("ok"); };
    bPart.onclick = function () { mark("part"); };
    bNo.onclick = function () { mark("no"); };
    var st = selfStore(cid)[q.id];
    if (st && st.state) { bOk.classList.toggle("on", st.state === "ok"); bPart.classList.toggle("on", st.state === "part"); bNo.classList.toggle("on", st.state === "no"); if (st.state === "no") cb.style.display = "flex"; }
    return box;
  }

  /* ================= stats ================= */
  /* 统一「按题」正确率：每题最多计 1 次；优先首次作答，旧记录回退到最近一次作答。
     计入：章节选择/判断/填空 + 本页自测。主观题（自评）不计入正确率。 */
  function chapterStats(cid, ch) {
    var seen = seenStore(cid);
    var totalSlides = 0; ch.modules.forEach(function (m) { totalSlides += m.slides.length; });
    var seenN = 0; ch.modules.forEach(function (m) { m.slides.forEach(function (s) { if (seen[cid + "_s" + m.i + "_" + s.i]) seenN++; }); });
    var mc = mcqStore(cid), jg = judgeStore(cid), fi = fillStore(cid);
    var n = 0, ok = 0;
    (ch.mcq || []).forEach(function (q) {
      var r = mc[q.id]; if (!r) return; n++;
      var good = (r.first !== undefined) ? r.first : (String(r.last) === String(q.a));
      if (good) ok++;
    });
    (ch.judge || []).forEach(function (q) {
      var r = jg[q.id]; if (!r) return; n++;
      var good = (r.first !== undefined) ? r.first : (String(r.last) === String(q.a));
      if (good) ok++;
    });
    (ch.fill || []).forEach(function (q) {
      var r = fi[q.id]; if (!r) return; n++;
      var good = (r.first !== undefined) ? r.first : fuzzyMatch(q.a, r.last);
      if (good) ok++;
    });
    var kps = kpAll();
    ch.modules.forEach(function (m) {
      m.slides.forEach(function (s) {
        if (!s.check) return;
        var c = kps[cid + "_s" + m.i + "_" + s.i]; if (!c) return; n++;
        var good = (c.first !== undefined) ? c.first : (c.ok === c.n);
        if (good) ok++;
      });
    });
    var cumOk = 0, cumMiss = 0;
    [mc, jg, fi, selfStore(cid)].forEach(function (st) { Object.keys(st).forEach(function (k) { cumOk += st[k].ok || 0; cumMiss += st[k].miss || 0; }); });
    var wb = wrongList(cid);
    /* 分母 = 全部客观题（章节选择/判断/填空）+ 本页自测；未做的按未得分计 */
    var checkTotal = 0;
    ch.modules.forEach(function (m) { m.slides.forEach(function (s) { if (s.check) checkTotal++; }); });
    var totalQ = (ch.mcq || []).length + (ch.judge || []).length + (ch.fill || []).length + checkTotal;
    var rate = totalQ ? Math.round(ok * 100 / totalQ) : null;
    var rateCum = (cumOk + cumMiss) ? Math.round(cumOk * 100 / (cumOk + cumMiss)) : null;
    return { slides: totalSlides, seen: seenN, wrong: wb.length, answered: n, totalQ: totalQ, ok: ok,
             firstN: n, firstOK: ok, rate: rate, rateFirst: rate, rateCum: rateCum };
  }

  function renderStats(cid, ch, host) {
    var s = chapterStats(cid, ch);
    host.innerHTML =
      '<h3 style="margin-top:0">📊 本章学习统计</h3>' +
      '<p><span class="pill">概念页 ' + s.seen + "/" + s.slides + '</span>' +
      '<span class="pill">正确率 ' + (s.rate == null ? "—" : s.rate + "%") + '</span>' +
      '<span class="pill">已作答 ' + (s.answered || 0) + "/" + (s.totalQ || 0) + ' 题</span>' +
      '<span class="pill">累计正确率 ' + (s.rateCum == null ? "—" : s.rateCum + "%") + '</span>' +
      '<span class="pill">错题本 ' + s.wrong + " 题</span></p>" +
      '<p class="hint" style="margin:6px 0 0">正确率分母 = <b>本章全部客观题（选择/判断/填空）+ 本页自测</b>，<b>没做的按未得分计</b>；每题只算一次（优先首次作答，旧记录取最近一次）。主观题自评不计入。</p>';
  }

  /* ================= 每章课后习题（主观题集中栏） ================= */
  function renderAfterClass(cid, ch) {
    var sh = ch.short || [], ca = ch.calc || [], te = ch.term || [];
    var sec = el("section"); sec.id = "afterclass";
    sec.appendChild(el("h2", "", "📚 课后习题（简答 / 论述 / 名词解释）"));
    var total = sh.length + ca.length + te.length + (ch.jyq || []).length;
    var box = el("div", "statsbox");
    box.innerHTML = '<p class="hint" style="margin:0">先自己<b>默写</b>答案，再展开「参考答案 / 踩分点」核对——<b>主观题必须自己输出才算真正消化</b>。本章共 ' + total + ' 题。</p>';
    sec.appendChild(box);
    function block(id, title, arr, kind) {
      if (!arr.length) return;
      var h = el("h3", "", title); h.id = id; sec.appendChild(h);
      arr.forEach(function (q, i) { sec.appendChild(renderSelf(cid, q, i + 1, kind)); });
    }
    block("afterclass-term", "一、名词解释（含踩分点）", te, "term");
    block("afterclass-short", "二、简答题", sh, "short");
    block("afterclass-calc", "三、论述 / 推导题", ca, "calc");
    var jyq = ch.jyq || [];
    if (jyq.length) {
      var hj = el("h3", "", "四、姜益泉《辅导与习题集》（各校真题 / 课后题）"); hj.id = "afterclass-jyq"; sec.appendChild(hj);
      [["mcq", "选择题"], ["judge", "判断题"], ["fill", "填空题"], ["short", "简答 / 问答"]].forEach(function (kk) {
        var arr = jyq.filter(function (x) { return (x.kind || "short") === kk[0]; });
        if (!arr.length) return;
        sec.appendChild(el("h4", "", kk[1] + "（" + arr.length + " 题）"));
        arr.forEach(function (q, i) {
          var node = kk[0] === "mcq" ? renderMCQ(cid, q, i + 1)
            : kk[0] === "judge" ? renderJudge(cid, q, i + 1)
              : kk[0] === "fill" ? renderFill(cid, q, i + 1)
                : renderSelf(cid, q, i + 1, "short");
          if (q.doubt) {
            var w = el("div", "doubtwrap");
            w.appendChild(el("div", "doubtbadge", "⚠ 原书答案存疑，以下解析按事实说明（请对照原书核对）"));
            w.appendChild(node);
            sec.appendChild(w);
          } else sec.appendChild(node);
        });
      });
    }
    if (!total && !jyq.length) sec.appendChild(el("p", "empty", "本章暂无课后习题。"));
    return sec;
  }

  /* ================= 章末通关测（随机客观题，≥80% 通过） ================= */
  function renderChapterExam(cid, ch) {
    var host = el("div", "statsbox"); host.id = "chexam";
    function pool() {
      var arr = [];
      ch.modules.forEach(function (m) {
        (m.mcq || []).forEach(function (q) { arr.push({ k: "mcq", q: q }); });
        (m.judge || []).forEach(function (q) { arr.push({ k: "judge", q: q }); });
        (m.fill || []).forEach(function (q) { arr.push({ k: "fill", q: q }); });
      });
      return arr;
    }
    function isCorrect(it) {
      var q = it.q, r;
      if (it.k === "mcq") { r = mcqStore(cid)[q.id]; return r && r.last === String(q.a); }
      if (it.k === "judge") { r = judgeStore(cid)[q.id]; return r && r.last === String(q.a); }
      r = fillStore(cid)[q.id]; return r && fuzzyMatch(q.a, r.last);
    }
    function draw() {
      var p = passedGet(cid), n = pool().length;
      host.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<h3 style="margin:0">🏁 本章通关测 <span class="hint">随机 20 题 · 正确率 ≥80% 通过</span></h3>' +
        '<span class="pill" id="chexamBadge"></span></div>' +
        '<p class="hint" style="margin:6px 0">从本章选择题 / 判断题 / 填空题（共 ' + n + ' 题）中随机抽 20 题，交卷后自动统计。达标后本章标记「已通关」。</p>' +
        '<button class="navbtn" style="width:auto;margin:0" id="chexamStart">开始通关测</button>' +
        '<div id="chexamBody"></div>';
      var badge = host.querySelector("#chexamBadge");
      if (p && p.passed) badge.innerHTML = "✅ 已通关（最佳 " + (p.best != null ? p.best : p.pct) + "%）";
      else if (p) badge.innerHTML = "未通关（上次 " + p.pct + "%）";
      else badge.textContent = "未开始";
      host.querySelector("#chexamStart").onclick = start;
    }
    function start() {
      var all = pool();
      if (all.length < 5) { alert("本章客观题不足，无法进行通关测。"); return; }
      for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
      var picks = all.slice(0, 20);
      var body = host.querySelector("#chexamBody"); body.innerHTML = "";
      host.querySelector("#chexamStart").disabled = true;
      picks.forEach(function (it, i) {
        var wrap = el("div", "ex-item");
        wrap.appendChild(el("div", "ex-num", "第 " + (i + 1) + " 题 · " + ({ mcq: "选择", judge: "判断", fill: "填空" }[it.k])));
        var c = it.k === "mcq" ? renderMCQ(cid, it.q, i + 1) : (it.k === "judge" ? renderJudge(cid, it.q, i + 1) : renderFill(cid, it.q, i + 1));
        wrap.appendChild(c); body.appendChild(wrap);
      });
      var bar = el("div", "ex-bar"); var bs = el("button", "navbtn", "📋 交卷判分");
      bs.onclick = function () { submit(picks); }; bar.appendChild(bs); body.appendChild(bar);
    }
    function submit(picks) {
      var ok = 0; picks.forEach(function (it) { if (isCorrect(it)) ok++; });
      var n = picks.length, pct = Math.round(ok * 100 / n);
      var prev = passedGet(cid) || {};
      var best = Math.max(pct, prev.best || 0);
      var passed = pct >= 80 || !!prev.passed;
      passedSet(cid, { score: ok, n: n, pct: pct, best: best, passed: passed, ts: Date.now() });
      var badge = host.querySelector("#chexamBadge");
      if (badge) badge.innerHTML = passed ? ("✅ 已通关（最佳 " + best + "%）") : ("未通关（上次 " + pct + "%）");
      var box = el("div", "statsbox");
      box.innerHTML = '<h3 style="margin:0">📊 成绩</h3><p>正确 <b>' + ok + " / " + n + "</b>（" + pct + "%）" +
        (pct >= 80 ? '　<span style="color:#1a7f37;font-weight:700">✅ 通过（≥80%）</span>' : '　<span style="color:#b42318">未通过，建议复习后重测</span>') +
        '</p><button class="navbtn" style="width:auto;margin:0" id="chexamAgain">🔁 重新测一次</button>';
      host.querySelector("#chexamBody").appendChild(box);
      host.querySelector("#chexamAgain").onclick = function () { draw(); start(); };
    }
    draw();
    return host;
  }

  /* ================= wrong book (chapter drawer) ================= */
  function openWrongDrawer(cid, ch) {
    var old = document.getElementById("wbd"); if (old) old.remove();
    var d = el("div", "statsbox"); d.id = "wbd";
    d.style.cssText = "position:fixed;top:0;right:0;bottom:0;width:min(420px,94vw);overflow:auto;z-index:1500;box-shadow:-4px 0 16px rgba(0,0,0,.18);border-radius:0;margin:0";
    var head = el("div", "");
    head.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:var(--blue)">📕 错题本</b><button class="navbtn" style="width:auto;margin:0" id="wbClose">关闭</button></div>';
    d.appendChild(head);
    var list = wrongList(cid);
    var qmap = {};
    ch.mcq.forEach(function (q) { qmap[q.id] = q; });
    if (!list.length) { d.appendChild(el("p", "empty", "暂无错题，继续加油！")); }
    list.slice().reverse().forEach(function (e) {
      var item = el("div", "wb-entry");
      var q = qmap[e.id];
      var extra = q ? ("<div style='margin-top:4px'>选项：" + q.o.map(esc).join("　") + "</div>") : "";
      item.innerHTML = '<div class="wq">' + esc(e.q) + '<span class="pill">' + esc(kindName(e.type)) + "</span>" +
        (e.cause ? '<span class="cause-tag">' + esc((CAUSES.filter(function (c) { return c[0] === e.cause; })[0] || ["", "其他"])[1]) + "</span>" : "") + "</div>" +
        extra +
        '<div class="wa">正确答案：<b>' + esc(e.correct) + "</b></div>" +
        (e.chosen ? '<div class="wa">你的作答：' + esc(e.chosen) + "</div>" : "");
      var act = el("div", "act");
      var bm = el("button", "", "标记已掌握");
      bm.onclick = function () { clearWrong(cid, e.id); item.remove(); };
      act.appendChild(bm); item.appendChild(act);
      d.appendChild(item);
    });
    document.body.appendChild(d);
    document.getElementById("wbClose").onclick = function () { d.remove(); };
  }

  /* ================= backup / restore ================= */
  function backupChapter(cid) {
    var out = {};
    ["mcq", "judge", "fill", "self", "seen", "text", "wrong", "hw", "last"].forEach(function (k) {
      var v = jget(skey(cid, k), null); if (v != null) out[skey(cid, k)] = v;
    });
    var blob = new Blob([JSON.stringify({ v: 1, cid: cid, data: out }, null, 1)], { type: "application/json" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = cid + "-backup.json"; a.click();
  }
  function restoreFile(cid, file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var obj = JSON.parse(r.result); var d = obj.data || obj;
        Object.keys(d).forEach(function (k) { if (k.indexOf(PREFIX) === 0) jset(k, d[k]); });
        alert("恢复成功，页面将刷新。"); location.reload();
      } catch (e) { alert("文件解析失败：" + e.message); }
    };
    r.readAsText(file);
  }

  /* ================= 自动快照（防丢） ================= */
  var AUTO_KEY = PREFIX + "autobak", AUTO2_KEY = PREFIX + "autobak2";
  function cellbioKeys() {
    var keys = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0 && k !== AUTO_KEY && k !== AUTO2_KEY) keys.push(k); } } catch (e) { }
    return keys;
  }
  function autoSnapshot(force) {
    try {
      var last = jget(AUTO_KEY, null), now = Date.now();
      if (!force && last && last.ts && (now - last.ts) < 6 * 3600 * 1000) return false;
      var data = {}; cellbioKeys().forEach(function (k) { var v = localStorage.getItem(k); if (v != null && v.length < 200000) data[k] = v; });
      if (!Object.keys(data).length) return false;
      if (last) { try { localStorage.setItem(AUTO2_KEY, JSON.stringify(last)); } catch (e) { } }
      localStorage.setItem(AUTO_KEY, JSON.stringify({ ts: now, n: Object.keys(data).length, data: data }));
      return true;
    } catch (e) { return false; }
  }
  function autoInfo() {
    var a = jget(AUTO_KEY, null), b = jget(AUTO2_KEY, null);
    return { latest: a ? { ts: a.ts, n: a.n } : null, prev: b ? { ts: b.ts, n: b.n } : null };
  }
  function restoreAuto(which) {
    var s = jget(which === "prev" ? AUTO2_KEY : AUTO_KEY, null);
    if (!s || !s.data) { alert("暂无自动快照可恢复。"); return false; }
    Object.keys(s.data).forEach(function (k) { try { localStorage.setItem(k, s.data[k]); } catch (e) { } });
    return true;
  }

  /* ================= export PDF (questions + student answers) ================= */
  var PRINT_CSS =
    "*{box-sizing:border-box}" +
    "body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;font-size:12px;line-height:1.65;margin:0}" +
    "h1{font-size:20px;color:#1f5c8b;border-bottom:2px solid #1f5c8b;padding-bottom:6px;margin:0 0 6px}" +
    "h2{font-size:16px;color:#7a2a24;border-left:5px solid #c0392b;padding-left:8px;margin:0 0 8px}" +
    "h3{font-size:13.5px;color:#1f5c8b;margin:14px 0 6px}" +
    ".meta{color:#666;font-size:11px;margin:4px 0 14px}" +
    "section.module{page-break-before:always}" +
    "section.module:first-of-type{page-break-before:avoid}" +
    ".q{border:1px solid #ccc;border-radius:6px;padding:8px 10px;margin:8px 0;page-break-inside:avoid}" +
    ".qt{font-weight:700;margin-bottom:4px}" +
    ".opts{margin:2px 0 4px}" +
    ".stu{color:#0a6b2e;margin-top:3px}" +
    ".ans{color:#b0301f;margin-top:3px}" +
    ".exp{color:#555;font-size:11px;margin-top:3px}" +
    ".hwimg{max-width:100%;border:1px solid #ddd;border-radius:4px;margin-top:4px}" +
    "@media print{@page{size:A4;margin:14mm}}";

  function strokesToDataURL(strokes, w, h) {
    if (!strokes || !strokes.length) return null;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#fffdf7"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1a2b45"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokes.forEach(function (st) {
      if (!st.length) return;
      if (st.length === 1) { ctx.beginPath(); ctx.arc(st[0][0] * w, st[0][1] * h, 1.6, 0, 7); ctx.fill(); return; }
      ctx.beginPath();
      st.forEach(function (p, i) { var x = p[0] * w, y = p[1] * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    });
    return cv.toDataURL("image/png");
  }

  function buildChapterDoc(cid, ch) {
    var mc = mcqStore(cid), fi = fillStore(cid), se = selfStore(cid), tx = textStore(cid), jg = judgeStore(cid);
    var hw = jget(skey(cid, "hw"), {});
    var P = [];
    P.push('<h1>' + esc(ch.title) + '</h1>');
    P.push('<p class="meta">题目与我的作答 ｜ 导出时间：' + esc(new Date().toLocaleString("zh-CN")) + '</p>');
    ch.modules.forEach(function (m) {
      P.push('<section class="module">');
      P.push('<h2>' + esc(m.name) + '</h2>');
      if (m.mcq && m.mcq.length) {
        P.push('<h3>一、选择题</h3>');
        m.mcq.forEach(function (q, i) {
          var rec = mc[q.id] || {};
          P.push('<div class="q"><div class="qt">' + (i + 1) + '. ' + esc(q.q) + '</div>');
          P.push('<div class="opts">' + q.o.map(function (o) { return '<div>' + esc(o) + '</div>'; }).join('') + '</div>');
          P.push('<div class="stu">我的作答：<b>' + esc(rec.last || "（未作答）") + '</b></div>');
          P.push('<div class="ans">正确答案：' + esc(q.a) + '</div>');
          if (q.e) P.push('<div class="exp">解析：' + esc(q.e) + '</div>');
          var im = strokesToDataURL(hw[q.id], 900, 150);
          if (im) P.push('<img class="hwimg" src="' + im + '">');
          P.push('</div>');
        });
      }
      if (m.judge && m.judge.length) {
        P.push('<h3>二、判断题</h3>');
        m.judge.forEach(function (q, i) {
          var rec = jg[q.id] || {};
          P.push('<div class="q"><div class="qt">' + (i + 1) + '. ' + esc(q.q) + '</div>');
          P.push('<div class="stu">我的作答：<b>' + esc(rec.last || "（未作答）") + '</b></div>');
          P.push('<div class="ans">正确答案：' + esc(q.a) + '</div>');
          if (q.e) P.push('<div class="exp">解析：' + esc(q.e) + '</div>');
          P.push('</div>');
        });
      }
      if (m.fill && m.fill.length) {
        P.push('<h3>三、填空题</h3>');
        m.fill.forEach(function (q, i) {
          var rec = fi[q.id] || {};
          P.push('<div class="q"><div class="qt">' + (i + 1) + '. ' + esc(q.q) + '</div>');
          P.push('<div class="stu">我的作答：<b>' + esc(rec.last || tx[q.id] || "（未作答）") + '</b></div>');
          P.push('<div class="ans">参考答案：' + esc(q.a) + '</div>');
          var im = strokesToDataURL(hw[q.id], 900, 150);
          if (im) P.push('<img class="hwimg" src="' + im + '">');
          P.push('</div>');
        });
      }
      function selfSec(title, arr, kind) {
        if (!arr || !arr.length) return;
        P.push('<h3>' + title + '</h3>');
        arr.forEach(function (q, i) {
          var st = se[q.id] || {};
          var qtext = kind === "term" ? q.term : q.q;
          var ans = kind === "term" ? q.def : (kind === "calc" ? (q.steps || q.a) : q.a);
          P.push('<div class="q"><div class="qt">' + (i + 1) + '. ' + esc(qtext) + '</div>');
          P.push('<div class="stu">我的作答：<br>' + esc(tx[q.id] || "（未作答）").replace(/\n/g, "<br>") + '</div>');
          P.push('<div class="stu">自评：' + (st.state === "ok" ? "会" : st.state === "no" ? "不会" : "未评") + '</div>');
          P.push('<div class="ans">参考答案：<br>' + esc(ans).replace(/\n/g, "<br>") + '</div>');
          if (q.kps) P.push('<div class="exp">踩分点：' + esc(q.kps) + '</div>');
          var im = strokesToDataURL(hw[q.id], 900, 230);
          if (im) P.push('<img class="hwimg" src="' + im + '">');
          P.push('</div>');
        });
      }
      selfSec("四、简答题", m.short, "short");
      selfSec("五、论述 / 推导题", m.calc, "calc");
      selfSec("六、名词解释", m.term, "term");
      P.push('</section>');
    });
    return P.join("");
  }

  function printDoc(bodyHtml, title, css) {
    var html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + (css || PRINT_CSS) + '</style></head><body>' + bodyHtml + '</body></html>';
    var iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    var doc = iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(function () {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch (e) { alert("打印失败：" + e.message); }
      setTimeout(function () { iframe.remove(); }, 60000);
    }, 300);
  }

  function exportChapterPDF(cid) {
    var ch = window.CHAPTERS[cid];
    printDoc(buildChapterDoc(cid, ch), ch.title + " 题目与作答");
  }

  function exportAllPDF() {
    var M = window.MANIFEST || [];
    var P = ['<h1>细胞生物学 · 全部章节（题目与我的作答）</h1>', '<p class="meta">导出时间：' + esc(new Date().toLocaleString("zh-CN")) + '</p>'];
    M.forEach(function (m) { var ch = window.CHAPTERS[m.id]; if (ch) P.push(buildChapterDoc(m.id, ch)); });
    printDoc(P.join(""), "细胞生物学 全部题目与作答");
  }

  /* ================= 闪卡 PDF 导出（按章） ================= */
  var CARDS_CSS =
    "body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;font-size:12px;line-height:1.6;margin:0}" +
    "h1{font-size:20px;color:#1f5c8b;border-bottom:2px solid #1f5c8b;padding-bottom:6px;margin:0 0 6px}" +
    "h2{font-size:15px;color:#7a2a24;border-left:5px solid #c0392b;padding-left:8px;margin:16px 0 8px;page-break-after:avoid}" +
    ".meta{color:#666;font-size:11px;margin:4px 0 12px}" +
    ".fc{padding:5px 10px;margin:5px 0;page-break-inside:avoid;border-bottom:1px dashed #ddd}" +
    ".fcn{color:#1f5c8b;font-weight:700}" +
    ".fcq{font-weight:700;color:#111}" +
    ".fca{color:#0a6b2e;margin-top:2px}" +
    ".fcm{color:#9a6b00;font-size:11px;margin-top:2px}" +
    "@media print{@page{size:A4;margin:14mm}}";

  function buildCardsDoc(cid, ch) {
    var cards = buildCards().filter(function (c) { return c.ch === cid; });
    var byMod = {};
    cards.forEach(function (c) { var k = (c.mod == null ? "z" : c.mod); (byMod[k] = byMod[k] || []).push(c); });
    var P = ['<h1>' + esc(ch.title) + ' · 闪卡</h1>',
      '<p class="meta">共 ' + cards.length + ' 张 · 导出时间：' + esc(new Date().toLocaleString("zh-CN")) + ' · 数据存本机</p>'];
    Object.keys(byMod).sort(function (a, b) { return (a === "z" ? 99 : a) - (b === "z" ? 99 : b); }).forEach(function (mi) {
      var arr = byMod[mi];
      P.push('<h2>' + esc(arr[0].modName || "其他") + "（" + arr.length + "）</h2>");
      arr.forEach(function (c, i) {
        var back = String(c.back || "").replace(/<img[^>]*>/g, "");
        P.push('<div class="fc"><div class="fcq"><span class="fcn">' + (i + 1) + ".</span> " + esc(c.front) +
          '</div><div class="fca">' + back + "</div></div>");
      });
    });
    return P.join("");
  }
  function exportCardsPDF(cid) {
    var ch = window.CHAPTERS[cid]; if (!ch) return;
    printDoc(buildCardsDoc(cid, ch), ch.title + " 闪卡", CARDS_CSS);
  }
  function exportAllCardsPDF() {
    var M = window.MANIFEST || [];
    var P = ['<h1>细胞生物学 · 全部闪卡</h1>', '<p class="meta">导出时间：' + esc(new Date().toLocaleString("zh-CN")) + '</p>'];
    M.forEach(function (m) { var ch = window.CHAPTERS[m.id]; if (ch) P.push(buildCardsDoc(m.id, ch)); });
    printDoc(P.join(""), "细胞生物学 全部闪卡", CARDS_CSS);
  }

  /* ================= chapter page ================= */
  /* ---------- 本页自测（选做）与掌握度热力图 ---------- */
  function pickCheckpoint(qByKp, kp) {
    var arr = qByKp[kp]; if (!arr) return null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].kind === "mcq" || arr[i].kind === "judge" || arr[i].kind === "fill") return arr[i];
    }
    return null;
  }
  function cpStore(cid) { return jget(skey(cid, "cp"), {}); }
  function cpPrior(cid, kp, q, kind) {
    if (q && q.id) {
      var r;
      if (kind === "mcq") { r = mcqStore(cid)[q.id]; if (r) return { a: r.last, ok: String(r.last) === String(q.a).trim() }; }
      else if (kind === "judge") { r = judgeStore(cid)[q.id]; if (r) return { a: r.last, ok: String(r.last) === String(q.a).trim() }; }
      else { r = fillStore(cid)[q.id]; if (r) return { a: r.last, ok: fuzzyMatch(q.a, r.last) }; }
    }
    return cpStore(cid)[kp] || null;
  }
  function clearQRec(cid, kind, key) {
    if (kind === "cp") { var o = cpStore(cid); delete o[key]; jset(skey(cid, "cp"), o); return; }
    var st = jget(skey(cid, kind), {}) || {}; delete st[key]; jset(skey(cid, kind), st);
  }
  function resetQuestionBox(box, optsEl, resEl, cbEl, inpEl) {
    if (optsEl) Array.prototype.forEach.call(optsEl.querySelectorAll("button"), function (x) { x.classList.remove("sel", "right", "wrong"); });
    if (resEl) { resEl.style.display = "none"; resEl.innerHTML = ""; }
    if (cbEl) cbEl.style.display = "none";
    if (inpEl) { inpEl.value = ""; inpEl.classList.remove("right", "wrong"); }
  }
  function redoBar(text, onRedo) {
    var bar = el("div", "redobar");
    bar.innerHTML = '<span class="hint">' + esc(text) + "</span> ";
    var b = el("button", "navbtn", "🔁 重做"); b.style.width = "auto"; b.style.margin = "0";
    b.onclick = onRedo; bar.appendChild(b);
    return bar;
  }
  function optFull(q, letter) {
    if (!q || !q.o) return letter;
    for (var i = 0; i < q.o.length; i++) if (String(q.o[i]).trim().charAt(0) === String(letter).trim()) return q.o[i];
    return letter;
  }
  function cpWriteGrade(cid, kp, q, kind, chosen, ok) {
    if (!q) return;
    var id = q.id || (cid + "_cp_" + kp);
    if (q.id) {
      var store = jget(skey(cid, kind), {}) || {};
      var rec = store[q.id] || { ok: 0, miss: 0 };
      if (rec.first === undefined) rec.first = ok;
      rec.n = (rec.n || 0) + 1; rec.last = chosen;
      if (ok) { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
      store[q.id] = rec; jset(skey(cid, kind), store); touch(cid);
    } else {
      var o = cpStore(cid); o[kp] = { a: chosen, ok: !!ok, ts: Date.now() }; jset(skey(cid, "cp"), o);
    }
    var correctText = (kind === "fill") ? String(q.a) : (kind === "judge") ? String(q.a) : optFull(q, q.a);
    var chosenText = (kind === "mcq") ? optFull(q, chosen) : chosen;
    if (ok) { clearWrong(cid, id); }
    else { addWrong(cid, { id: id, type: kind, q: q.q || "", correct: correctText, chosen: chosenText, cause: "", ts: Date.now() }); }
  }
  function renderCheckpoint(cid, kp, qByKp, slide) {
    var pick = pickCheckpoint(qByKp, kp);
    var q, kind;
    if (pick) { q = pick.q; kind = pick.kind; }
    else if (slide && slide.check) { q = slide.check; kind = "mcq"; }
    else return null;
    var box = el("div", "checkpoint");
    box.appendChild(el("div", "cp-h", "🎯 本页自测（AI 生成 · 概念自检）" + (q && q.lv ? ' <span class="lvtag">了解即可</span>' : "")));
    var done = false, optsBox = null;
    var fb = el("div", "cp-fb");
    function optLetter(o) { return String(o).trim().charAt(0); }
    function answerText() {
      if (kind === "mcq") {
        for (var i = 0; i < (q.o || []).length; i++) if (optLetter(q.o[i]) === String(q.a).trim()) return q.o[i];
        return String(q.a);
      }
      return q.a != null ? String(q.a) : "";
    }
    function paint(correct, chosen) {
      if (optsBox) {
        Array.prototype.forEach.call(optsBox.children, function (b) {
          var isRight = (kind === "judge") ? (b.textContent.trim() === String(q.a).trim()) : (optLetter(b.textContent) === String(q.a).trim());
          if (isRight) b.classList.add("right");
          var isChosen = (kind === "judge") ? (b.textContent.trim() === String(chosen)) : (optLetter(b.textContent) === String(chosen));
          if (isChosen) { b.classList.add("sel"); if (!correct) b.classList.add("wrong"); }
        });
      }
      fb.style.display = "block";
      fb.innerHTML = (correct ? '<span class="ok">✔ 正确</span>' : '<span class="no">✘ 错误</span>') +
        '　正确答案：<b>' + esc(answerText()) + "</b>" +
        (q.e ? '<div style="margin-top:4px">解析：' + esc(q.e) + "</div>" : "") +
        optsExplain(kind === "judge" ? { o: ["对", "错"], a: q.a, oe: q.oe } : q) +
        (q.basis ? '<div class="basis">📌 依据本页：' + esc(q.basis) + "</div>" : "");
    }
    function grade(correct, chosen) {
      if (done) return; done = true;
      kpRecord(kp, correct);
      if (q.id) { if (!correct) srsRate(q.id, 0); else if (srsGet(q.id)) srsRate(q.id, 2); }
      cpWriteGrade(cid, kp, q, kind, chosen, correct);
      paint(correct, chosen);
    }
    if (kind === "mcq") {
      box.appendChild(el("div", "cp-q", esc(q.q)));
      optsBox = el("div", "cp-opts");
      q.o.forEach(function (o) { var b = el("button", "cp-opt", esc(o)); b.onclick = function () { grade(optLetter(o) === String(q.a).trim(), optLetter(o)); }; optsBox.appendChild(b); });
      box.appendChild(optsBox);
    } else if (kind === "judge") {
      box.appendChild(el("div", "cp-q", esc(q.q)));
      optsBox = el("div", "cp-opts");
      ["对", "错"].forEach(function (v) { var b = el("button", "cp-opt", v); b.onclick = function () { grade(v === q.a, v); }; optsBox.appendChild(b); });
      box.appendChild(optsBox);
    } else {
      box.appendChild(el("div", "cp-q", esc(q.q)));
      var inp = el("input", "cp-in"); inp.placeholder = "输入答案";
      var bc = el("button", "cp-opt", "检查"); bc.onclick = function () { grade(fuzzyMatch(q.a, inp.value), inp.value); };
      box.appendChild(inp); box.appendChild(bc);
      box._cpInput = inp;
    }
    box.appendChild(fb);
    var prior = cpPrior(cid, kp, q, kind);
    if (prior) {
      var _pbar = redoBar(prior.ok ? "上次作答：✅ 正确" : "上次作答：❌ 错误", function () {
        clearQRec(cid, "cp", kp);
        if (q && q.id) clearQRec(cid, kind, q.id);
        done = false;
        resetQuestionBox(box, optsBox, fb, null, box._cpInput);
        _pbar.remove();
      });
      box.appendChild(_pbar);
    }
    return box;
  }
  function renderHeatmap(cid, ch, host) {
    function draw() {
      var total = 0, mastered = 0, html = "";
      ch.modules.forEach(function (m) {
        html += '<div class="hm-mod"><div class="hm-name">' + esc(m.name) + '</div><div class="hm-grid">';
        m.slides.forEach(function (s) {
          var kp = cid + "_s" + m.i + "_" + s.i, v = kpMastery(kp);
          total++; if (v >= 0.6) mastered++;
          var cls = v >= 0.8 ? "hm-a" : v >= 0.6 ? "hm-b" : v > 0 ? "hm-c" : "hm-0";
          if (isConfused(cid, kp)) cls += " hm-conf";
          html += '<a class="hm-cell ' + cls + '" href="#s_' + kp + '" title="' + esc(s.title) + '（掌握度 ' + Math.round(v * 100) + '%）' + (isConfused(cid, kp) ? " · 待问" : "") + '"></a>';
        });
        html += "</div></div>";
      });
      host.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<h3 style="margin:0">🧭 知识点掌握度</h3><span class="hint">已掌握 ' + mastered + "/" + total + ' ｜ 点方块跳到该页</span></div>' +
        '<div class="hm-legend">' +
        '<span><i class="hm-cell hm-0"></i>未学</span>' +
        '<span><i class="hm-cell hm-c"></i>学过·未掌握</span>' +
        '<span><i class="hm-cell hm-b"></i>已掌握</span>' +
        '<span><i class="hm-cell hm-a"></i>熟练</span>' +
        '<span><i class="hm-cell hm-0 hm-conf"></i>待问/没听懂</span>' +
        '<span class="hint">掌握度 = 0.6×答对率 + 0.4×复习强度；答错或自评“不会”会下降</span>' +
        '</div>' + html;
    }
    draw();
    window.__refreshHeat = draw;
  }

  /* ================= 本章知识串联图（结构树 + 关系图 + 概念关联） ================= */
  function renderOutline(ch) {
    if (!(ch.outline || []).length && !(ch.modules || []).length) return null;
    var cid = ch.id;
    var mind = (window.MIND && window.MIND[cid]) || { edges: [], cmp: [] };
    var box = el("div", "statsbox outlinebox mindbox");
    var pages = [], pageByKp = {}, modOf = {};
    (ch.modules || []).forEach(function (m, mi) {
      (m.slides || []).forEach(function (s, si) {
        var p = { kp: cid + "_s" + mi + "_" + si, mod: mi, si: si, page: s.page, title: String(s.title || "").replace(/\s+/g, " ").trim() };
        pages.push(p); pageByKp[p.kp] = p; modOf[p.kp] = mi;
      });
    });
    var rel = {};
    (mind.edges || []).forEach(function (e) {
      if (e.k === "seq" || e.k === "main") return;
      (rel[e.a] = rel[e.a] || []).push({ to: e.b, t: e.t, k: e.k });
      (rel[e.b] = rel[e.b] || []).push({ to: e.a, t: e.t, k: e.k });
    });

    var h = '<h3 style="margin:0 0 8px">🧠 本章知识串联图 <span class="hint">主线 · 结构 · 概念关联</span> <span class="mm-done" id="mmdone_' + cid + '"></span>'
      + '<button class="mm-tool on" id="mmTabTree_' + cid + '">结构树</button>'
      + '<button class="mm-tool" id="mmTabGraph_' + cid + '">关系图</button>'
      + '<button class="mm-tool" id="mmExp_' + cid + '">全部展开</button>'
      + '<button class="mm-tool" id="mmCol_' + cid + '">全部折叠</button></h3>';

    if ((ch.outline || []).length) {
      h += '<div class="mm-chain">';
      h += ch.outline.map(function (s, i) {
        var mods = [];
        (ch.outlineMap || []).forEach(function (v, mi) { if (v === i) mods.push(mi); });
        return '<a class="ostep" href="' + (mods.length ? "#m" + mods[0] : "#m0") + '">' + (i + 1) + ". " + esc(s) + "</a>";
      }).join('<span class="oarrow">→</span>');
      h += "</div>";
    }
    if ((mind.cmp || []).length) {
      h += '<div class="mm-cmp">🔗 相关对比速记表：' + mind.cmp.map(function (id) { return '<a href="compare.html">' + esc(id) + "</a>"; }).join(" ") + "</div>";
    }

    h += '<div class="mind-view" id="mmTree_' + cid + '"><ul class="mm-tree">';
    (ch.modules || []).forEach(function (m) {
      var slides = m.slides || [];
      if (!slides.length && !(m.mcq || []).length && !(m.judge || []).length && !(m.fill || []).length) return;
      h += '<li class="mm-tmod"><details><summary><span class="mm-check" data-k="' + cid + "_m" + m.i + '"></span>' + esc(m.name) + ' <span class="mm-cnt">' + (slides.length ? slides.length + " 页" : "") + "</span></summary>";
      if (slides.length) {
        h += '<ul class="mm-tpages">';
        slides.forEach(function (s) {
          var kp = cid + "_s" + m.i + "_" + s.i;
          h += '<li class="mm-tpage"><details><summary><span class="mm-check" data-k="' + kp + '"></span><a class="mm-plink" href="#s_' + kp + '">p' + s.page + " " + esc(String(s.title || "").slice(0, 30)) + "</a></summary>";
          var kids = "";
          (s.points || []).forEach(function (p) { kids += "<li>" + esc(p) + "</li>"; });
          if (s.fig) kids += '<li class="mm-fig">📖 ' + esc(String(s.fig).split("\n")[0]) + "</li>";
          h += '<ul class="mm-tpoints">' + (kids || "<li>（本页要点见页面）</li>") + "</ul>";
          var rs = rel[kp];
          if (rs && rs.length) {
            h += '<div class="mm-rel">🔗 关联：' + rs.slice(0, 8).map(function (r) {
              var tp = pageByKp[r.to];
              var lab = (r.k === "cmp" ? "对比：" : "") + r.t;
              return '<a class="rel-' + r.k + '" href="#s_' + r.to + '">' + esc(lab) + " ↔ p" + (tp ? tp.page : "?") + "</a>";
            }).join("") + "</div>";
          }
          h += "</details></li>";
        });
        h += "</ul>";
      }
      h += '<a class="mm-goto" href="#m' + m.i + '">→ 去本节（讲解与考题）</a></details></li>';
    });
    h += "</ul></div>";

    h += '<div class="mind-view" id="mmGraph_' + cid + '" style="display:none"></div>';
    box.innerHTML = h;

    var store = jget(PREFIX + "mm", {});
    function syncCount() {
      var all = box.querySelectorAll('.mm-check[data-k^="' + cid + '_s"]');
      var done = 0;
      Array.prototype.forEach.call(all, function (x) { if (store[x.dataset.k]) done++; });
      var el0 = box.querySelector("#mmdone_" + cid);
      if (el0) el0.textContent = "已掌握 " + done + "/" + all.length + " 页";
    }
    Array.prototype.forEach.call(box.querySelectorAll(".mm-check"), function (sp) {
      var k = sp.dataset.k;
      sp.textContent = store[k] ? "☑" : "☐";
      sp.classList.toggle("on", !!store[k]);
      sp.title = "标记/取消「已掌握」";
      sp.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        if (store[k]) delete store[k]; else store[k] = 1;
        jset(PREFIX + "mm", store);
        sp.textContent = store[k] ? "☑" : "☐"; sp.classList.toggle("on", !!store[k]);
        syncCount();
      };
    });
    var bE = box.querySelector("#mmExp_" + cid), bC = box.querySelector("#mmCol_" + cid);
    if (bE) bE.onclick = function () { Array.prototype.forEach.call(box.querySelectorAll("#mmTree_" + cid + " details"), function (d) { d.open = true; }); };
    if (bC) bC.onclick = function () { Array.prototype.forEach.call(box.querySelectorAll("#mmTree_" + cid + " details"), function (d) { d.open = false; }); };

    var tabT = box.querySelector("#mmTabTree_" + cid), tabG = box.querySelector("#mmTabGraph_" + cid);
    var viewT = box.querySelector("#mmTree_" + cid), viewG = box.querySelector("#mmGraph_" + cid);
    if (tabT && tabG) {
      tabT.onclick = function () { viewT.style.display = ""; viewG.style.display = "none"; tabT.classList.add("on"); tabG.classList.remove("on"); };
      tabG.onclick = function () { viewT.style.display = "none"; viewG.style.display = ""; tabG.classList.add("on"); tabT.classList.remove("on"); buildGraph(); };
    }

    var graphBuilt = false;
    function buildGraph() {
      if (graphBuilt || !viewG) return;
      graphBuilt = true;
      var mods = [];
      (ch.modules || []).forEach(function (m, mi) { if ((m.slides || []).length) mods.push({ mi: mi, name: m.name, n: (m.slides || []).length }); });
      if (!mods.length) { viewG.innerHTML = '<p class="hint">本章无模块数据。</p>'; return; }
      var idxOf = {}; mods.forEach(function (m, i) { idxOf[m.mi] = i; });
      var pair = {};
      (mind.edges || []).forEach(function (e) {
        if (e.k === "seq" || e.k === "main") return;
        var ma = modOf[e.a], mb = modOf[e.b];
        if (ma == null || mb == null || ma === mb || idxOf[ma] == null || idxOf[mb] == null) return;
        var key = Math.min(ma, mb) + "-" + Math.max(ma, mb);
        (pair[key] = pair[key] || []).push((e.k === "cmp" ? "对比·" : "") + e.t);
      });
      var NS = "http://www.w3.org/2000/svg";
      var rowH = 76, W = 880, nodeW = 360, nodeH = 48, cx = W / 2;
      var H = mods.length * rowH + 30;
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("class", "mindsvg");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      function mk(tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
      function line(x1, y1, x2, y2, cls) { svg.appendChild(mk("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": cls })); }
      function path(d, cls) { svg.appendChild(mk("path", { d: d, "class": cls })); }
      function txt(x, y, s, cls) { var t = mk("text", { x: x, y: y, "class": cls, "text-anchor": "middle" }); t.textContent = s; svg.appendChild(t); }
      for (var i = 0; i < mods.length - 1; i++) line(cx, i * rowH + nodeH, cx, (i + 1) * rowH, "mm-mainline");
      Object.keys(pair).slice(0, 14).forEach(function (key, ki) {
        var parts = key.split("-").map(Number);
        var ia = idxOf[parts[0]], ib = idxOf[parts[1]];
        var y1 = ia * rowH + nodeH / 2, y2 = ib * rowH + nodeH / 2;
        var lx = cx + ((ki % 2 === 0) ? -1 : 1) * 260, ly = (y1 + y2) / 2;
        path("M " + cx + " " + y1 + " C " + lx + " " + y1 + ", " + lx + " " + y2 + ", " + cx + " " + y2, "mm-termline");
        txt(lx, ly, pair[key][0] + (pair[key].length > 1 ? " +" + (pair[key].length - 1) : ""), "mm-termlabel");
      });
      mods.forEach(function (m, i) {
        var g = mk("g", { "class": "mm-node" });
        g.appendChild(mk("rect", { x: cx - nodeW / 2, y: i * rowH, width: nodeW, height: nodeH, rx: 12, "class": "mm-node-rect" }));
        var t = mk("text", { x: cx, y: i * rowH + 29, "class": "mm-node-text", "text-anchor": "middle" });
        t.textContent = (m.name || "").slice(0, 30) + (m.n ? "（" + m.n + "页）" : "");
        g.appendChild(t); g.style.cursor = "pointer";
        g.onclick = function () { location.hash = "#m" + m.mi; };
        svg.appendChild(g);
      });
      viewG.appendChild(svg);
    }

    syncCount();
    return box;
  }

  function renderChapter(cid) {
    var ch = window.CHAPTERS[cid];
    if (!ch) { document.getElementById("main").innerHTML = "<p>数据未加载。</p>"; return; }
    HW.init(cid);
    document.title = ch.title + " · 细胞生物学";
    var aside = document.getElementById("sidebar"), main = document.getElementById("main");
    aside.innerHTML = '<div class="ttl">' + esc(ch.title) + '</div><a href="index.html">← 返回首页</a><a href="guide.html">🚀 上手指南</a><a href="faq.html">❓ 常见问题</a><a href="recite.html">✍️ 背诵/默写</a><a href="quest.html">🚩 闯关模式</a><a href="schedule.html">🧭 学习路线</a><a href="report.html">📊 学习报告</a><a href="animations.html">🎬 动画总目录</a><a href="history.html">🕰 科学史</a><a href="methods.html">🧪 实验方法</a><a href="experiments.html">🔬 实验一览</a><a href="mindmap.html">🕸 跨章总图</a><a href="textbook.html">📚 教材对照表</a><a href="compare.html">🔗 对比速记表</a><a href="zhenti.html">📋 历年真题</a><a href="802.html">📋 802 真题</a><a href="glossary.html">📖 术语表</a><a href="review.html">🔁 今日复习</a><a href="flashcards.html?ch=' + esc(cid) + '">🃏 闪卡</a><a href="exam.html">📝 模拟测验</a>';
    aside.appendChild(el("div", "grp", "各模块（概念 + 考题）"));
    ch.modules.forEach(function (m) {
      var a = el("a", "", esc(m.name)); a.href = "#m" + m.i; aside.appendChild(a);
      if (m.slides && m.slides.length && /^tb/.test(cid)) {
        var det = el("details", "subpages");
        det.appendChild(el("summary", "", "本节目录（" + m.slides.length + " 页）"));
        m.slides.forEach(function (s) {
          var t = String(s.title || "").replace(/^[\d\.\s、（）()]+/, "").slice(0, 20);
          var sa = el("a", "sub subpg", "p" + s.page + " " + esc(t));
          sa.href = "#s_" + cid + "_s" + m.i + "_" + s.i;
          det.appendChild(sa);
        });
        aside.appendChild(det);
      }
      var subs = [];
      if (m.mcq && m.mcq.length) subs.push(["m" + m.i + "-mcq", "选择题"]);
      if (m.judge && m.judge.length) subs.push(["m" + m.i + "-judge", "判断题"]);
      if (m.fill && m.fill.length) subs.push(["m" + m.i + "-fill", "填空题"]);
      subs.forEach(function (x) { var sa = el("a", "sub", "· " + x[1]); sa.href = "#" + x[0]; aside.appendChild(sa); });
    });
    if ((ch.short || []).length || (ch.calc || []).length || (ch.term || []).length || (ch.jyq || []).length) {
      aside.appendChild(el("div", "grp", "课后习题（主观）"));
      var ac = el("a", "", "📚 本章课后习题"); ac.href = "#afterclass"; aside.appendChild(ac);
      [["afterclass-term", "名词解释"], ["afterclass-short", "简答题"], ["afterclass-calc", "论述/推导"], ["afterclass-jyq", "姜益泉真题/课后题"]].forEach(function (x) {
        var sa = el("a", "sub", "· " + x[1]); sa.href = "#" + x[0]; aside.appendChild(sa);
      });
    }
    var tools = el("div", "navbtns");
    function tb(label, fn) { var b = el("button", "navbtn", label); b.onclick = fn; tools.appendChild(b); }
    tb("📕 错题本", function () { openWrongDrawer(cid, ch); });
    tb("📋 交卷判分", function () { mGradeAll(cid); });
    tb("📊 学习统计", function () { renderStats(cid, ch, document.getElementById("statsbox")); document.getElementById("statsbox").scrollIntoView({ behavior: "smooth" }); });
    tb("💾 数据备份", function () { backupChapter(cid); });
    tb("🖨 导出PDF（题目+我的作答）", function () { exportChapterPDF(cid); });
    var rst = el("button", "navbtn", "⬆ 从备份恢复");
    var fi = el("input"); fi.type = "file"; fi.accept = ".json"; fi.style.display = "none";
    fi.onchange = function () { if (fi.files[0]) restoreFile(cid, fi.files[0]); };
    rst.onclick = function () { fi.click(); };
    tools.appendChild(rst); aside.appendChild(tools); aside.appendChild(fi);
    aside.appendChild(el("div", "grp", "进度"));
    var pbar = el("div", "prog"); pbar.innerHTML = "<i></i>"; aside.appendChild(pbar);
    var ptxt = el("div", "hint"); aside.appendChild(ptxt);
    function refreshProgress() { var s = chapterStats(cid, ch); pbar.firstChild.style.width = (s.slides ? Math.round(s.seen * 100 / s.slides) : 0) + "%"; ptxt.textContent = "概念页 " + s.seen + "/" + s.slides + " ｜ 错题 " + s.wrong + " ｜ 待问 " + confusedCount(cid); }

    // hero
    var hero = el("div", "hero");
    hero.innerHTML = "<h1>" + esc(ch.title) + '</h1><div class="tag">' + esc(ch.sub2 || "") + " ｜ 概念逐页 + 全题型练习 + 错题本 + 手写</div>";
    main.appendChild(hero);

    if (ch.preview) {
      var pv = el("div", "statsbox previewbox");
      pv.innerHTML = '<h3 style="margin:0 0 6px">📖 课前预习导览</h3>' +
        '<p class="pv-main">' + esc(ch.preview.main) + "</p>" +
        '<div class="pv-q">带着这些问题去听课（点问题可看参考答案）：</div><ol>' +
        (ch.preview.questions || []).map(function (q, i) {
          var a = (ch.preview.answers || [])[i];
          if (a) return '<li><details class="pv-qa"><summary>' + esc(q) + '</summary><div class="pv-a">' + esc(a).replace(/\n/g, "<br>") + "</div></details></li>";
          return "<li>" + esc(q) + "</li>";
        }).join("") + "</ol>";
      main.appendChild(pv);
    }
    if (ch.narrative) {
      var nb = el("div", "statsbox narbox");
      nb.innerHTML = '<details><summary>📖 本章完整叙述（教材式导读·串联概念与实验）</summary><div class="nar-body">' +
        esc(ch.narrative).replace(/\n/g, "<br>") + "</div></details>";
      main.appendChild(nb);
    }
    var ob = renderOutline(ch); if (ob) main.appendChild(ob);

    var statsbox = el("div", "statsbox"); statsbox.id = "statsbox"; renderStats(cid, ch, statsbox); main.appendChild(statsbox);
    var heat = el("div", "statsbox"); heat.id = "heatmap"; renderHeatmap(cid, ch, heat); main.appendChild(heat);

    // concept slides
    var seen = seenStore(cid);
    var qByKp = {};
    ["mcq", "judge", "fill", "short", "calc", "term"].forEach(function (kind) {
      (ch[kind] || []).forEach(function (q) { if (q.kp) { (qByKp[q.kp] = qByKp[q.kp] || []).push({ q: q, kind: kind }); } });
    });
    var animIO = window.IntersectionObserver ? new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { var f = en.target; if (!f.src) f.src = f.getAttribute("data-src"); animIO.unobserve(f); } });
    }, { rootMargin: "500px" }) : null;
    var pageMeta = {};
    ch.modules.forEach(function (m, mi) { (m.slides || []).forEach(function (s, si) {
      var meta = { page: s.page, title: s.title };
      pageMeta[cid + "_s" + m.i + "_" + s.i] = meta;
      pageMeta[cid + "_s" + mi + "_" + si] = meta;
    }); });
    var seqPrev = {}, relMap = {};
    ((window.MIND && window.MIND[cid] && window.MIND[cid].edges) || []).forEach(function (e) {
      if (e.k === "seq") { seqPrev[e.b] = e.a; return; }
      (relMap[e.a] = relMap[e.a] || []).push(e.b);
      (relMap[e.b] = relMap[e.b] || []).push(e.a);
    });
    ch.modules.forEach(function (m, mi) {
      var sec = el("section"); sec.id = "m" + m.i;
      sec.appendChild(el("h2", "", esc(m.name)));
      m.slides.forEach(function (s, si) {
        var key = cid + "_s" + m.i + "_" + s.i;
        var altKey = cid + "_s" + mi + "_" + si;
        var card = el("div", "slide"); card.id = "s_" + key;
        if (altKey !== key) { var anch = document.createElement("span"); anch.id = "s_" + altKey; anch.style.cssText = "display:block;height:0;overflow:hidden"; card.appendChild(anch); }
        var seqPrevK = (seqPrev[key] != null ? seqPrev[key] : seqPrev[altKey]);
        var relK = (relMap[key] && relMap[key].length ? relMap[key] : (relMap[altKey] || []));
        if (s.explain) card.classList.add("tbslide");
        var lv = s.level || "掌握";
        var head = el("div", "sh");
        head.innerHTML = '<span class="t">' + esc(s.title) + '</span><span class="lv lv-' + esc(lv) + '">' + esc(lv) + "</span>";
        card.appendChild(head);
        if (s.summary || s.goal || seqPrevK || (relK && relK.length)) {
          var ob = el("div", "objbox");
          var oh = '<div class="ob-h">🎯 本页主旨与目标</div>';
          if (s.summary) oh += '<p class="ob-sum">' + esc(s.summary) + '</p>';
          if (s.goal) oh += '<div class="ob-goal">' + esc(s.goal) + '</div>';
          var links = [];
          if (seqPrevK && pageMeta[seqPrevK]) links.push('<a class="ob-link" href="#s_' + seqPrevK + '">⬅ 承接上一页 p' + pageMeta[seqPrevK].page + ' ' + esc(String(pageMeta[seqPrevK].title).slice(0, 16)) + '</a>');
          (relK || []).slice(0, 4).forEach(function (r) { if (pageMeta[r]) links.push('<a class="ob-link" href="#s_' + r + '">🔗 相关 p' + pageMeta[r].page + ' ' + esc(String(pageMeta[r].title).slice(0, 14)) + '</a>'); });
          if (links.length) oh += '<div class="ob-links">' + links.join("") + '</div>';
          ob.innerHTML = oh;
          card.appendChild(ob);
        }
        var body = el("div", "body");
        if (s.ocr && s.ocr.lines && s.ocr.lines.length) {
          var wrap = el("div", "ocrwrap");
          var page = el("div", "ocrpage");
          page.style.aspectRatio = s.ocr.w + " / " + s.ocr.h;
          (s.ocr.figs || []).forEach(function (f) {
            var im = document.createElement("img"); im.className = "ocrfig"; im.loading = "lazy"; im.alt = "";
            im.src = f[4];
            im.style.left = (f[0] / s.ocr.w * 100) + "%";
            im.style.top = (f[1] / s.ocr.h * 100) + "%";
            im.style.width = (f[2] / s.ocr.w * 100) + "%";
            page.appendChild(im);
          });
          s.ocr.lines.forEach(function (l) {
            var sp = el("span", "ocrline");
            sp.style.left = (l[0] / s.ocr.w * 100) + "%";
            sp.style.top = (l[1] / s.ocr.h * 100) + "%";
            sp.style.width = (l[2] / s.ocr.w * 100) + "%";
            sp.style.fontSize = (l[3] * 0.92 / s.ocr.w * 100) + "cqw";
            sp.textContent = l[4];
            page.appendChild(sp);
          });
          var img = el("img"); img.alt = s.title; img.className = "ocrimg"; img.loading = "lazy"; img.src = s.img;
          img.style.display = "none";
          img.onclick = function () { document.getElementById("lbimg").src = (s.big || s.img); document.getElementById("lightbox").classList.add("on"); };
          img.onerror = function () { img.style.display = "none"; if (wrap._err) wrap._err.style.display = "block"; };
          var errd = el("div", "hint", "⚠ 原图加载失败，可点「🔍 放大原图」查看。"); errd.style.display = "none"; wrap._err = errd;
          var ctr = el("div", "ocrctrl");
          var bTxt = el("button", "navbtn", "📄 文字版"), bImg = el("button", "navbtn", "🖼 原图"), bZoom = el("button", "navbtn", "🔍 放大原图");
          bTxt.onclick = function () { page.style.display = "block"; img.style.display = "none"; errd.style.display = "none"; };
          bImg.onclick = function () {
            page.style.display = "none"; errd.style.display = "none"; img.style.display = "block";
            img.loading = "eager";
            if (!img.complete || !img.naturalWidth) img.src = s.img;   /* 强制加载隐藏期间未加载的图 */
          };
          bZoom.onclick = function () { document.getElementById("lbimg").src = (s.big || s.img); document.getElementById("lightbox").classList.add("on"); };
          ctr.appendChild(bTxt); ctr.appendChild(bImg); ctr.appendChild(bZoom);
          wrap.appendChild(ctr); wrap.appendChild(errd); wrap.appendChild(page); wrap.appendChild(img);
          body.appendChild(wrap);
        } else if (s.img) {
          var img2 = el("img"); img2.alt = s.title;
          img2.onclick = function () { document.getElementById("lbimg").src = (s.big || s.img); document.getElementById("lightbox").classList.add("on"); };
          img2.loading = /^tb/.test(cid) ? "eager" : "lazy";
          img2.src = s.img;
          body.appendChild(img2);
        }
        if (s.explain) body.appendChild(el("div", "explain", esc(s.explain).replace(/\n/g, "<br>")));
        else body.appendChild(el("div", "notes", esc(s.notes)));
        card.appendChild(body);
        if (s.intuition) {
          var ib = el("div", "intuition");
          ib.innerHTML = '<div class="in-h">🧠 通俗理解（直觉 · 类比）</div><p>' + esc(s.intuition).replace(/\n/g, "<br>") + '</p>';
          card.appendChild(ib);
        }
        if (s.derive) {
          var db = el("div", "derivebox");
          db.innerHTML = '<div class="dv-h">📐 推导 / 计算</div><div class="dv-body">' + esc(s.derive).replace(/\n/g, "<br>") + '</div>';
          card.appendChild(db);
        }
        if (s.experiment) {
          var eb = el("div", "expbox");
          eb.innerHTML = '<div class="ex-h">🧪 实验过程 / 方法</div><div class="ex-body">' + esc(s.experiment).replace(/\n/g, "<br>") + '</div>';
          card.appendChild(eb);
        }
        if (s.points && s.points.length) {
          var pb = el("div", "points");
          pb.innerHTML = '<div class="pt-h">📌 本页要点</div><ul>' +
            s.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
          card.appendChild(pb);
        }
        if (s.terms && s.terms.length) {
          var tmb = el("div", "termsbox");
          tmb.innerHTML = '<div class="tm-h">📚 本页术语</div><ul>' +
            s.terms.map(function (x) {
              return "<li><b>" + esc(x.t) + "</b>" + (x.en ? " (" + esc(x.en) + ")" : "") + "：" + esc(x.d) + "</li>";
            }).join("") + "</ul>";
          card.appendChild(tmb);
        }
        if (s.fig) {
          var fb = el("div", "fignote");
          fb.innerHTML = '<div class="fn-h">' + (s.explain ? "📖 关键术语（中英对照）" : "🔍 图注解读") + '</div><p>' + esc(s.fig).replace(/\n/g, "<br>") + "</p>";
          card.appendChild(fb);
        }
        if (s.figure) {
          var fgb = el("div", "fignote figurebox");
          fgb.innerHTML = '<div class="fn-h">🖼 读图讲解</div><p>' + esc(s.figure).replace(/\n/g, "<br>") + "</p>";
          card.appendChild(fgb);
        }
        var cp = renderCheckpoint(cid, key, qByKp, s);
        if (cp) card.appendChild(cp);
        if (s.explain) {
          var rawbox = el("details", "rawbox");
          rawbox.innerHTML = '<summary>📄 教材原文（OCR，可展开对照）</summary><div class="notes">' + esc(s.notes) + "</div>";
          card.appendChild(rawbox);
        }
        if (s.anim) {
          var aw = el("div", "animwrap");
          aw.appendChild(el("div", "animhead", "🎬 动画演示（在老师原图下方）"));
          var ifr = document.createElement("iframe");
          ifr.className = "animframe"; ifr.loading = "lazy"; ifr.setAttribute("title", s.title);
          ifr.setAttribute("data-src", "anim/" + s.anim + ".html?embed=1&v=20260926bx");
          ifr.onload = function () { var o = jget(PREFIX + "animSeen", {}); if (!o[s.anim]) { o[s.anim] = 1; jset(PREFIX + "animSeen", o); } };
          aw.appendChild(ifr); card.appendChild(aw);
          if (animIO) animIO.observe(ifr); else ifr.src = ifr.getAttribute("data-src");
        }
        var db = el("button", "donebtn", seen[key] ? "✓ 已读" : "标记已读");
        if (seen[key]) { card.classList.add("done"); db.classList.add("on"); }
        db.onclick = function () {
          seen[key] = seen[key] ? 0 : 1; jset(skey(cid, "seen"), seen);
          if (seen[key]) {
            bumpTask("read");
            if (!srsGet(key)) srsRate(key, 2);   // 首次标记已读 → 安排首次复习
          }
          card.classList.toggle("done", !!seen[key]); db.classList.toggle("on", !!seen[key]);
          db.textContent = seen[key] ? "✓ 已读" : "标记已读"; refreshProgress();
        };
        card.appendChild(db);
        var cfd = confusedStore(cid)[key] || {};
        var cf = el("button", "confbtn" + (isConfused(cid, key) ? " on" : ""), isConfused(cid, key) ? "❓ 待问" : "❓ 没听懂");
        var cnote = el("input", "confnote");
        cnote.placeholder = "哪里不懂？（选填，方便问老师）";
        cnote.value = cfd.note || "";
        cnote.style.display = isConfused(cid, key) ? "block" : "none";
        cnote.oninput = function () { var o = confusedStore(cid); if (o[key]) { o[key].note = cnote.value; setConfusedStore(cid, o); } };
        cf.onclick = function () {
          var on = toggleConfused(cid, key, cnote.value);
          cf.classList.toggle("on", on);
          cf.textContent = on ? "❓ 待问" : "❓ 没听懂";
          cnote.style.display = on ? "block" : "none";
          refreshProgress();
        };
        card.appendChild(cf); card.appendChild(cnote);
        sec.appendChild(card);
      });
      // 本模块考题：概念页后紧跟该模块的全部考题（选择/填空/简答/论述/名词）
      var qWrap = el("div", "modquiz");
      function qh(id, text) { var h = el("h3", "", text); h.id = id; return h; }
      if (m.mcq && m.mcq.length) {
        qWrap.appendChild(qh("m" + m.i + "-mcq", "📝 本模块考题 · 选择题（配套题库 · 点选项即时判分）"));
        m.mcq.forEach(function (q, i) { qWrap.appendChild(renderMCQ(cid, q, i + 1)); });
      }
      if (m.judge && m.judge.length) {
        qWrap.appendChild(qh("m" + m.i + "-judge", "📝 本模块考题 · 判断题（配套题库 · 点“对/错”即时判分）"));
        m.judge.forEach(function (q, i) { qWrap.appendChild(renderJudge(cid, q, i + 1)); });
      }
      if (m.fill && m.fill.length) {
        qWrap.appendChild(qh("m" + m.i + "-fill", "📝 本模块考题 · 填空题（配套题库 · 输入答案自动判分）"));
        m.fill.forEach(function (q, i) { qWrap.appendChild(renderFill(cid, q, i + 1)); });
      }
      if (qWrap.children.length) sec.appendChild(qWrap);
      main.appendChild(sec);
    });

    main.appendChild(renderAfterClass(cid, ch));
    main.appendChild(renderChapterExam(cid, ch));
    main.appendChild(el("footer", "", "仅供个人学习使用 ｜ 数据保存在本机浏览器 localStorage"));
    refreshProgress();
  }

  function mGradeAll(cid) {
    var n = 0;
    document.querySelectorAll(".q").forEach(function (q) { if (typeof q._check === "function") { q._check(); n++; } });
    var ch = window.CHAPTERS[cid], host = document.getElementById("statsbox");
    if (ch && host) renderStats(cid, ch, host);
    alert("已判分：本次检查 " + n + " 道填空题。选择题为点选即时判分。可在左侧查看『学习统计』或『错题本』。");
  }

  /* ================= flashcards (auto-derived) ================= */
  function noteSection(notes, head) {
    var i = (notes || "").indexOf(head);
    if (i < 0) return "";
    var t = notes.slice(i + head.length);
    var j = t.search(/\n\s*【/);
    if (j >= 0) t = t.slice(0, j);
    return t.replace(/^\s+|\s+$/g, "");
  }
  function frontHtml(c) {
    return esc(c.front) + (c.frontImg ? '<img class="fc-img" src="' + c.frontImg + '" loading="lazy" alt="">' : "");
  }
  function buildCards() {
    var cards = [];
    (window.MANIFEST || []).forEach(function (m) {
      var ch = window.CHAPTERS[m.id]; if (!ch) return;
      (ch.term || []).forEach(function (q) {
        var modName = (q.modI != null && ch.modules[q.modI]) ? ch.modules[q.modI].name : "";
        cards.push({
          id: "fc_term_" + q.id, ch: m.id, mod: (q.modI != null ? q.modI : null), modName: modName, tag: "名词解释", front: q.term,
          back: "<b>定义</b><br>" + esc(q.def).replace(/\n/g, "<br>") + (q.kps ? '<div class="fc-kps">踩分点：' + esc(q.kps) + "</div>" : ""),
          plain: q.def, blank: q.term
        });
      });
      (ch.appcards || []).forEach(function (c, i) {
        cards.push({
          id: "fc_app_" + m.id + "_" + i, ch: m.id, mod: c.mod, modName: c.modName || "应用综合",
          tag: "应用卡片", subjective: true, front: c.front,
          back: esc(c.back).replace(/\n/g, "<br>") + (c.points ? '<div class="fc-kps">踩分点：' + esc(c.points) + "</div>" : ""),
          plain: c.back, blank: ""
        });
      });
      ch.modules.forEach(function (mod) {
        mod.slides.forEach(function (s) {
          var kp0 = m.id + "_s" + mod.i + "_" + s.i;
          (s.cards || []).forEach(function (c, i) {
            var back = esc(c.back).replace(/\n/g, "<br>");
            if (c.mnemonic) back += '<div class="fc-mn">💡 ' + esc(c.mnemonic) + "</div>";
            if (c.useImg && s.img) back += '<img class="fc-img" src="' + s.img + '" loading="lazy" alt="">';
            cards.push({ id: "fc_s_" + kp0 + "_" + i, ch: m.id, mod: mod.i, modName: mod.name, tag: "掌握卡片", front: c.front, back: back, plain: c.back, blank: c.blank || "", blank2: c.blank2 || "" });
          });
          var noteKp = m.id + "_s" + mod.i + "_" + s.i;
          var figExp = noteSection(s.notes || "", "【读图讲解】");
          if (figExp && s.img) cards.push({
            id: "fc_fig_" + noteKp, ch: m.id, mod: mod.i, modName: mod.name, tag: "读图卡片", subjective: true,
            front: "看图讲解：" + (s.title || ""), frontImg: s.img, back: esc(figExp).replace(/\n/g, "<br>"),
            plain: figExp, blank: ""
          });
          var enExp = noteSection(s.notes || "", "【本页英文讲解】");
          if (enExp && s.img) cards.push({
            id: "fc_en_" + noteKp, ch: m.id, mod: mod.i, modName: mod.name, tag: "英文页讲解", subjective: true,
            front: (s.title || "English page"), frontImg: s.img, back: esc(enExp).replace(/\n/g, "<br>"),
            plain: enExp, blank: ""
          });
          var pgExp = noteSection(s.notes || "", "【本页讲解】");
          if (pgExp && s.img) cards.push({
            id: "fc_pg_" + noteKp, ch: m.id, mod: mod.i, modName: mod.name, tag: "本页讲解", subjective: true,
            front: (s.title || ""), frontImg: s.img, back: esc(pgExp).replace(/\n/g, "<br>"),
            plain: pgExp, blank: ""
          });
        });
      });
    });
    (window.GLOSSARY || []).forEach(function (g, i) {
      cards.push({
        id: "fc_gloss_" + i, ch: g.ch, mod: null, modName: "", tag: "术语", front: g.t,
        back: (g.en ? "<b>" + esc(g.en) + "</b><br>" : "") + esc(g.d),
        plain: g.d, blank: g.t
      });
    });
    return cards;
  }
  function cardMap() { var m = {}; buildCards().forEach(function (c) { m[c.id] = c; }); return m; }

  function renderFlashcards() {
    var ctl = document.getElementById("fcctl"), host = document.getElementById("fchost"), progEl = document.getElementById("fcprog");
    if (!host) return;
    var cards = buildCards();
    function renderProgress() {
      if (!progEl) return;
      var now = Date.now(), learned = 0, mastered = 0, due = 0, byTag = {};
      cards.forEach(function (c) {
        var s = srsGet(c.id);
        var t = byTag[c.tag] = byTag[c.tag] || { n: 0, learned: 0 };
        t.n++;
        if (s) {
          learned++; t.learned++;
          if ((s.reps || 0) >= 3) mastered++;
          if (s.due <= now) due++;
        }
      });
      var tags = Object.keys(byTag).map(function (t) {
        return '<span class="fcp-tag">' + esc(t) + " " + byTag[t].learned + "/" + byTag[t].n + "</span>";
      }).join("");
      progEl.innerHTML = '<div class="fcp"><span class="fcp-big">已学 ' + learned + "/" + cards.length + "</span>" +
        "<span>掌握 <b>" + mastered + "</b></span><span>待复习 <b>" + due + "</b></span>" +
        '<span class="fcp-tags">' + tags + "</span></div>";
    }
    var names = { ch01: "绪论", ch02: "质膜", ch03: "内膜系统", ch04: "蛋白质运输", ch05: "后翻译转运", ch06: "微管", ch07: "微丝", ch08: "中间纤维", ch09: "细胞周期", ch10: "信号(一)", ch11: "信号(二)", ch12: "衰老凋亡", ch13: "癌细胞" };
    var chs = {}, tags = {};
    cards.forEach(function (c) { if (c.ch) chs[c.ch] = 1; tags[c.tag] = 1; });
    var curCh = "all", curTag = "all", curMod = "all", mode = "填空", dueOnly = false, wrongOnly = false, deck = [], pos = 0;
    try {
      var usp = new URLSearchParams(location.search);
      var qp = usp.get("ch"); if (qp && chs[qp]) curCh = qp;
      if (usp.get("due") === "1") dueOnly = true;
    } catch (e) { }
    ctl.innerHTML = "";
    var row1 = el("div", "fc-chips"), rowMod = el("div", "fc-chips"), row2 = el("div", "fc-chips"), row3 = el("div", "fc-chips"), row0 = el("div", "fc-chips");
    var dueN = cards.filter(function (c) { var s = srsGet(c.id); return s && s.due <= Date.now(); }).length;
    var bDue = el("button", "fc-chip" + (dueOnly ? " on" : ""), "📅 今日卡片（" + dueN + " 张到期）");
    bDue.onclick = function () { dueOnly = !dueOnly; wrongOnly = false; curCh = "all"; curTag = "all"; curMod = "all"; sync(); build(); };
    row0.appendChild(bDue);
    var wrongN = cards.filter(function (c) { var a = fcAnsGet(c.id); return a && !a.lastOk; }).length;
    var bWrong = el("button", "fc-chip" + (wrongOnly ? " on" : ""), "❌ 重练错卡（" + wrongN + "）");
    bWrong.onclick = function () { wrongOnly = !wrongOnly; dueOnly = false; curCh = "all"; curTag = "all"; curMod = "all"; sync(); build(); };
    row0.appendChild(bWrong);
    function mk(label, val, group) {
      var b = el("button", "fc-chip", label); b.dataset.v = val;
      b.onclick = function () {
        dueOnly = false;
        if (group === "ch") { curCh = val; curMod = "all"; } else if (group === "tag") curTag = val; else mode = val;
        sync(); build();
      };
      return b;
    }
    row1.appendChild(mk("全部章节", "all", "ch"));
    Object.keys(chs).sort().forEach(function (c) { row1.appendChild(mk(names[c] || c, c, "ch")); });
    function renderModChips() {
      rowMod.innerHTML = "";
      if (curCh === "all") { rowMod.style.display = "none"; return; }
      rowMod.style.display = "";
      rowMod.appendChild(el("span", "fc-chiplabel", "模块："));
      var b0 = el("button", "fc-chip" + (curMod === "all" ? " on" : ""), "整章");
      b0.onclick = function () { curMod = "all"; sync(); build(); }; rowMod.appendChild(b0);
      var mods = {};
      cards.forEach(function (c) { if (c.ch === curCh && c.mod != null) mods[c.mod] = c.modName || ("模块" + c.mod); });
      Object.keys(mods).sort(function (a, b) { return a - b; }).forEach(function (mi) {
        var nm = mods[mi], lab = nm.length > 18 ? nm.slice(0, 18) + "…" : nm;
        var b = el("button", "fc-chip" + (String(curMod) === String(mi) ? " on" : ""), lab);
        b.title = nm; b.onclick = function () { curMod = mi; sync(); build(); }; rowMod.appendChild(b);
      });
    }
    row2.appendChild(mk("全部类型", "all", "tag"));
    Object.keys(tags).forEach(function (t) { row2.appendChild(mk(t, t, "tag")); });
    [["背", "背"], ["填空", "填空"], ["写", "写"]].forEach(function (o) { row3.appendChild(mk("模式：" + o[0], o[1], "mode")); });
    ctl.appendChild(row0); ctl.appendChild(row1); ctl.appendChild(rowMod); ctl.appendChild(row2); ctl.appendChild(row3);
    // 分类学习：按章 / 主题（模块）
    var catsEl = document.getElementById("fccats");
    if (catsEl) {
      var cats = {};
      cards.forEach(function (c) {
        if (!c.ch) return;
        var cat = cats[c.ch] = cats[c.ch] || { name: names[c.ch] || c.ch, total: 0, mods: {} };
        cat.total++;
        if (c.mod != null) { var mm = cat.mods[c.mod] = cat.mods[c.mod] || { name: c.modName || ("模块" + c.mod), count: 0 }; mm.count++; }
      });
      var ch2 = '<div class="fc-catbox"><div class="fc-cathead">📂 分类学习（点「学这组」只练该章/该主题） ' +
        '<button class="fc-pdf" data-ch="">🖨 导出全部闪卡PDF</button></div>';
      Object.keys(cats).sort().forEach(function (cid) {
        var cat = cats[cid];
        ch2 += '<details class="fc-cat"><summary>' + esc(cat.name) + ' <span class="fc-cnt">' + cat.total + ' 张</span></summary>' +
          '<div class="fc-catrow"><button class="fc-go" data-ch="' + cid + '" data-mod="">学整章（' + cat.total + '）</button> ' +
          '<button class="fc-pdf" data-ch="' + cid + '">🖨 导出本章PDF</button></div>';
        Object.keys(cat.mods).sort(function (a, b) { return a - b; }).forEach(function (mi) {
          var mm = cat.mods[mi];
          ch2 += '<div class="fc-catrow"><button class="fc-go" data-ch="' + cid + '" data-mod="' + mi + '">' + esc(mm.name) + '（' + mm.count + '）</button></div>';
        });
        ch2 += "</details>";
      });
      ch2 += "</div>";
      catsEl.innerHTML = ch2;
      Array.prototype.forEach.call(catsEl.querySelectorAll(".fc-go"), function (b) {
        b.onclick = function () {
          curCh = b.dataset.ch; curMod = b.dataset.mod === "" ? "all" : b.dataset.mod; curTag = "all";
          sync(); build();
          host.scrollIntoView({ behavior: "smooth" });
        };
      });
      Array.prototype.forEach.call(catsEl.querySelectorAll(".fc-pdf"), function (b) {
        b.onclick = function () { if (b.dataset.ch) exportCardsPDF(b.dataset.ch); else exportAllCardsPDF(); };
      });
    }
    function sync() {
      bDue.classList.toggle("on", dueOnly);
      bWrong.classList.toggle("on", wrongOnly);
      Array.prototype.forEach.call(row1.children, function (b) { b.classList.toggle("on", !dueOnly && !wrongOnly && b.dataset.v === curCh); });
      Array.prototype.forEach.call(row2.children, function (b) { b.classList.toggle("on", !dueOnly && !wrongOnly && b.dataset.v === curTag); });
      Array.prototype.forEach.call(row3.children, function (b) { b.classList.toggle("on", b.dataset.v === mode); });
      renderModChips();
    }
    function build() {
      deck = cards.filter(function (c) {
        if (dueOnly) { var s = srsGet(c.id); if (!s || s.due > Date.now()) return false; }
        if (wrongOnly) { var a = fcAnsGet(c.id); if (!a || a.lastOk) return false; }
        return (curCh === "all" || c.ch === curCh) && (curTag === "all" || c.tag === curTag) &&
          (curMod === "all" || String(c.mod) === String(curMod));
      });
      for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      pos = 0; renderProgress(); show();
    }
    function rateRow(c) {
      var r = el("div", "fc-rate"); r.style.display = "none";
      [["不会", 0], ["模糊", 1], ["会", 2]].forEach(function (o, i) {
        var b = el("button", o[2], o[0]);
        b.onclick = function () {
          srsRate(c.id, o[1]);
          if (c.subjective) { var o2 = fcAnsAll(); if (o2[c.id]) { o2[c.id].lastOk = (o[1] >= 2); jset(PREFIX + "fcans", o2); } }
          renderProgress(); renderRecords(); pos++; show();
        };
        r.appendChild(b);
      });
      return r;
    }
    function show() {
      if (!deck.length) { host.innerHTML = '<p class="empty">没有符合条件的卡片。</p>'; return; }
      if (pos >= deck.length) {
        host.innerHTML = '<div class="fc-done">🎉 本组完成（共 ' + deck.length + ' 张）<div style="margin-top:10px"><button class="navbtn" style="width:auto" id="fcAgain">再来一组</button></div></div>';
        var b = document.getElementById("fcAgain"); if (b) b.onclick = build; return;
      }
      var c = deck[pos];
      var rec = fcAnsGet(c.id);
      var recLine = rec ? '<div class="fc-rec">📝 已答 ' + rec.n + " 次 · 正确 " + rec.okN + " 次" +
        (rec.last ? " ｜ 上次：" + esc(String(rec.last).slice(0, 24)) + (rec.lastOk ? " ✓" : " ✗") : "") + "</div>" : "";
      var head = '<div class="fc-progress">第 ' + (pos + 1) + " / " + deck.length + " 张 · " + esc(c.tag) + " · " + mode + "</div>" + recLine;
      if (mode === "背") {
        host.innerHTML = head + '<div class="fc-card" id="fcCard"><div class="fc-front">' + frontHtml(c) + '</div>' +
          '<div class="fc-back" style="display:none">' + c.back + "</div></div>" +
          '<div class="fc-hint">点击卡片翻面</div>';
        var card = document.getElementById("fcCard");
        var rr = rateRow(c); host.appendChild(rr);
        card.onclick = function () {
          card.querySelector(".fc-back").style.display = "block";
          card.querySelector(".fc-front").style.display = "none";
          rr.style.display = "flex";
        };
      } else if (mode === "写") {
        if (c.subjective) {
          host.innerHTML = head + '<div class="fc-card"><div class="fc-front">' + frontHtml(c) + '</div></div>' +
            '<div class="fc-input"><textarea class="fc-ta" placeholder="先自己写下答题要点（可选，自动保存）…"></textarea></div>' +
            '<div class="fc-input"><button class="fc-check">显示参考答案</button></div>' +
            '<div class="fc-back" style="display:none">' + c.back + "</div>";
          var rrS = rateRow(c); host.appendChild(rrS);
          var ta = host.querySelector(".fc-ta"), bkS = host.querySelector(".fc-back");
          var rec0 = fcAnsGet(c.id); if (rec0 && rec0.last) ta.value = rec0.last;
          host.querySelector(".fc-check").onclick = function () {
            fcAnsSave(c.id, "写", ta.value, null); renderRecords();
            bkS.style.display = "block"; rrS.style.display = "flex";
          };
        } else {
          host.innerHTML = head + '<div class="fc-card"><div class="fc-front">' + frontHtml(c) + '</div></div>' +
            '<div class="fc-input"><input class="fc-ans" placeholder="输入你的答案…"><button class="fc-check">检查</button></div>' +
            '<div class="fc-back" style="display:none">' + c.back + "</div>";
          var rr2 = rateRow(c); host.appendChild(rr2);
          var inp = host.querySelector(".fc-ans"), bk = host.querySelector(".fc-back");
          var doCheck = function () {
            var ok = fuzzyMatch(c.plain || "", inp.value);
            inp.classList.remove("right", "wrong"); inp.classList.add(ok ? "right" : "wrong");
            fcAnsSave(c.id, "写", inp.value, ok); renderRecords();
            bk.style.display = "block"; rr2.style.display = "flex";
          };
          host.querySelector(".fc-check").onclick = doCheck;
          inp.addEventListener("keydown", function (e) { if (e.key === "Enter") doCheck(); });
        }
      } else {
        if (c.subjective) { mode = "写"; sync(); show(); return; }
        var cloze = c.plain || "", blank = c.blank || "", blank2 = c.blank2 || "", cardInner, answers = [];
        if (blank && cloze.indexOf(blank) >= 0) {
          if (blank2 && blank2 !== blank && cloze.indexOf(blank2) >= 0) {
            cardInner = '<div class="fc-front">' + esc(c.front) + '</div><div class="fc-cloze">' +
              esc(cloze.replace(blank, "①______").replace(blank2, "②______")) + "</div>";
            answers = [blank, blank2];
          } else {
            cardInner = '<div class="fc-front">' + esc(c.front) + '</div><div class="fc-cloze">' + esc(cloze.replace(blank, "______")) + "</div>";
            answers = [blank];
          }
        } else if ((c.tag === "名词解释" || c.tag === "术语") && c.front && c.plain) {
          cardInner = '<div class="fc-front">' + esc(c.plain) + "</div>";
          answers = [c.front];
        } else { mode = "写"; sync(); show(); return; }
        var inputsHtml = answers.map(function (a, i) {
          var lbl = answers.length > 1 ? ("①②③".charAt(i) + " ") : "";
          return '<input class="fc-ans" placeholder="' + lbl + "填 " + a.length + ' 字">';
        }).join("");
        host.innerHTML = head + '<div class="fc-card">' + cardInner + "</div>" +
          '<div class="fc-input">' + inputsHtml + '<button class="fc-check">检查</button></div>' +
          '<div class="fc-back" style="display:none">' + c.back + "</div>";
        var rr3 = rateRow(c); host.appendChild(rr3);
        var inps = host.querySelectorAll(".fc-ans"), bk3 = host.querySelector(".fc-back");
        var doCheck3 = function () {
          var allOk = true, joined = [];
          Array.prototype.forEach.call(inps, function (inp, i) {
            var ok = fuzzyMatch(answers[i], inp.value);
            inp.classList.remove("right", "wrong"); inp.classList.add(ok ? "right" : "wrong");
            joined.push(inp.value); if (!ok) allOk = false;
          });
          fcAnsSave(c.id, "填空", joined.join(" / "), allOk); renderRecords();
          bk3.style.display = "block"; rr3.style.display = "flex";
        };
        host.querySelector(".fc-check").onclick = doCheck3;
        Array.prototype.forEach.call(inps, function (inp) { inp.addEventListener("keydown", function (e) { if (e.key === "Enter") doCheck3(); }); });
      }
    }
    var recEl = document.getElementById("fcrec");
    function renderRecords() {
      if (!recEl) return;
      var ans = fcAnsAll();
      var answered = cards.filter(function (c) { return ans[c.id]; });
      if (!answered.length) {
        recEl.innerHTML = '<div class="fc-recb"><div class="fc-cathead">📊 作答记录</div>' +
          '<div class="fc-recsum">还没有作答记录。做几道「填空 / 写」后，这里会显示正确率与错卡。</div></div>';
        return;
      }
      var okN = answered.filter(function (c) { return ans[c.id].lastOk === true; }).length;
      var wrongCards = answered.filter(function (c) { return ans[c.id].lastOk === false; });
      var byCh = {};
      answered.forEach(function (c) { var a = ans[c.id]; var t = byCh[c.ch] = byCh[c.ch] || { n: 0, ok: 0 }; t.n++; if (a.lastOk) t.ok++; });
      var h = '<div class="fc-recb"><div class="fc-cathead">📊 作答记录</div>' +
        '<div class="fc-recsum">已答 <b>' + answered.length + "</b> 张 · 正确 <b>" + okN + "</b> · 错 <b>" + wrongCards.length +
        "</b>（正确率 " + Math.round(okN * 100 / answered.length) + "%）</div>" +
        '<div class="fc-recsum">' + Object.keys(byCh).sort().map(function (cid) { var t = byCh[cid]; return esc(names[cid] || cid) + " " + t.ok + "/" + t.n; }).join(" ｜ ") + "</div>";
      if (wrongCards.length) {
        h += '<details class="fc-cat"><summary>错卡 ' + wrongCards.length + ' 张（点上方「重练错卡」专练）</summary><ul class="fc-wlist">' +
          wrongCards.slice(0, 60).map(function (c) { return "<li>" + esc(c.front) + ' <span class="fc-recans">你答：' + esc(String(ans[c.id].last).slice(0, 20)) + "</span></li>"; }).join("") +
          "</ul></details>";
      }
      h += "</div>";
      recEl.innerHTML = h;
    }
    renderRecords();
    sync(); build();
  }

  /* ================= mock exam ================= */
  function renderExam() {
    var ctl = document.getElementById("examctl"), host = document.getElementById("examhost");
    var timerEl = document.getElementById("examtimer");
    if (!ctl || !host) return;
    var names = { ch01: "绪论", ch02: "质膜", ch03: "内膜系统", ch04: "蛋白质运输", ch05: "后翻译转运", ch06: "微管", ch07: "微丝", ch08: "中间纤维", ch09: "细胞周期", ch10: "信号(一)", ch11: "信号(二)", ch12: "衰老凋亡", ch13: "癌细胞" };
    var ztNames = ZT_NAMES;
    var types = [["mcq", "选择题"], ["judge", "判断题"], ["fill", "填空题"], ["short", "简答题"], ["calc", "论述/推导"], ["term", "名词解释"]];
    var pool = [];
    (window.MANIFEST || []).forEach(function (m) {
      var ch = window.CHAPTERS[m.id]; if (!ch) return;
      types.forEach(function (t) { (ch[t[0]] || []).forEach(function (q) { pool.push({ cid: m.id, kind: t[0], q: q }); }); });
    });
    function ztItems() {
      var tg = document.getElementById("exZt");
      if (!tg || !tg.checked) return [];
      var sel = Array.prototype.map.call(ctl.querySelectorAll(".ex-zch:checked"), function (x) { return x.value; });
      var out = [], O = window.ZTOBJ || {};
      Object.keys(O).forEach(function (c) {
        if (sel.indexOf(c) < 0) return;
        ["mcq", "judge", "fill"].forEach(function (k) {
          (O[c][k] || []).forEach(function (x, i) {
            out.push({ cid: "T" + c, kind: k, q: { id: "zt_" + c + "_" + k + "_" + i, q: x.q, o: x.o, a: x.a, e: x.e, kp: null } });
          });
        });
      });
      return out;
    }
    ctl.innerHTML =
      '<div class="ex-row"><b>章节：</b>' + (window.MANIFEST || []).map(function (m) {
        return '<label class="ex-lb"><input type="checkbox" class="ex-ch" value="' + m.id + '" checked> ' + esc(names[m.id] || m.title || m.id) + "</label>";
      }).join("") + "</div>" +
      '<div class="ex-row"><b>题型：</b>' + types.map(function (t) {
        return '<label class="ex-lb"><input type="checkbox" class="ex-ty" value="' + t[0] + '" checked> ' + t[1] + "</label>";
      }).join("") + "</div>" +
      '<div class="ex-row"><b>题库真题：</b><label class="ex-lb"><input type="checkbox" id="exZt"> 纳入客观真题（选择/判断/填空，配套题库）</label></div>' +
      '<div class="ex-row" id="exZtRow" style="display:none"><b>真题章节：</b>' +
      (window.ZTOBJ ? Object.keys(window.ZTOBJ).sort().map(function (c) {
        return '<label class="ex-lb"><input type="checkbox" class="ex-zch" value="' + c + '" checked> ' + esc(ztNames[c] || c) + "</label>";
      }).join("") : "<span>（未加载 data/ztobj.js）</span>") + "</div>" +
      '<div class="ex-row"><b>题量：</b><select id="exCount"><option>10</option><option selected>20</option><option>30</option><option>50</option></select>' +
      '<b>时间：</b><select id="exMin"><option value="15">15 分钟</option><option value="30" selected>30 分钟</option><option value="60">60 分钟</option><option value="120">120 分钟</option></select>' +
      '<button id="exFull" class="navbtn" style="width:auto;margin:0;background:#c0392b;border-color:#c0392b">📄 802 整套模拟</button>' +
      '<button id="exStart" class="navbtn" style="width:auto;margin:0">开始测验</button></div>';
    var ztToggle = document.getElementById("exZt"), ztRow = document.getElementById("exZtRow");
    if (ztToggle) ztToggle.onchange = function () { ztRow.style.display = ztToggle.checked ? "" : "none"; };
    Object.keys(window.ZTOBJ || {}).forEach(function (c) { names["T" + c] = "真题·" + (ztNames[c] || c); });
    var timer = null, remain = 0, current = [], examMode = "custom";
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function start(plan) {
      examMode = plan ? "full" : "custom";
      var chs = Array.prototype.map.call(ctl.querySelectorAll(".ex-ch:checked"), function (x) { return x.value; });
      var tys = Array.prototype.map.call(ctl.querySelectorAll(".ex-ty:checked"), function (x) { return x.value; });
      if (!plan && (!chs.length || !tys.length)) { alert("请至少选择一个章节和一个题型。"); return; }
      var n = parseInt(document.getElementById("exCount").value, 10);
      var mins = parseInt(document.getElementById("exMin").value, 10);
      var cand = pool.filter(function (it) {
        return (plan || chs.indexOf(it.cid) >= 0) && (plan || tys.indexOf(it.kind) >= 0);
      });
      var zi = ztItems();
      if (!plan) zi = zi.filter(function (it) { return tys.indexOf(it.kind) >= 0; });
      cand = cand.concat(zi);
      if (plan) {
        mins = plan.minutes || mins; current = [];
        Object.keys(plan.counts).forEach(function (k) {
          current = current.concat(shuffle(cand.filter(function (it) { return it.kind === k; })).slice(0, plan.counts[k]));
        });
      } else {
        shuffle(cand); current = cand.slice(0, n);
      }
      host.innerHTML = "";
      current.forEach(function (it, i) {
        var wrap = el("div", "ex-item");
        wrap.appendChild(el("div", "ex-num", "第 " + (i + 1) + " 题 · " + esc(names[it.cid] || it.cid)));
        var c;
        if (it.kind === "mcq") c = renderMCQ(it.cid, it.q, i + 1);
        else if (it.kind === "judge") c = renderJudge(it.cid, it.q, i + 1);
        else if (it.kind === "fill") c = renderFill(it.cid, it.q, i + 1);
        else c = renderSelf(it.cid, it.q, i + 1, it.kind);
        wrap.appendChild(c); host.appendChild(wrap);
      });
      remain = mins * 60;
      if (timerEl) { timerEl.style.display = "block"; timerEl.textContent = "⏱ 剩余 " + fmt(remain); }
      stopTimer();
      timer = setInterval(function () {
        remain--; if (timerEl) timerEl.textContent = "⏱ 剩余 " + fmt(remain);
        if (remain <= 0) { stopTimer(); submit(true); }
      }, 1000);
      var bar = el("div", "ex-bar"); var bs = el("button", "navbtn", "📋 交卷判分");
      bs.onclick = function () { stopTimer(); submit(false); }; bar.appendChild(bs); host.appendChild(bar);
    }
    function isCorrect(it) {
      var cid = it.cid, q = it.q, r;
      if (it.kind === "mcq") { r = mcqStore(cid)[q.id]; return r && r.last === String(q.a); }
      if (it.kind === "judge") { r = judgeStore(cid)[q.id]; return r && r.last === String(q.a); }
      if (it.kind === "fill") { r = fillStore(cid)[q.id]; return r && fuzzyMatch(q.a, r.last); }
      r = selfStore(cid)[q.id]; return r && r.state === "ok";
    }
    function submit(auto) {
      stopTimer();
      if (timerEl) timerEl.textContent = "⏱ 已交卷";
      var ok = 0, weak = {};
      current.forEach(function (it) { if (isCorrect(it)) ok++; else if (it.q.kp) weak[it.q.kp] = 1; });
      var total = current.length || 1;
      var pct = Math.round(ok * 100 / total);
      try {
        var o = jget(PREFIX + "examBest", {});
        if (!o.best || pct > o.best) { o.best = pct; o.bestTs = Date.now(); }
        o.last = pct; o.lastTs = Date.now(); o.n = current.length; o.mode = examMode;
        jset(PREFIX + "examBest", o);
        var wk = isoWeek(new Date()), wb = jget(PREFIX + "weekBoss", {}), cw = wb[wk] || { runs: 0 };
        cw.runs++; cw.last = pct; if (!cw.best || pct > cw.best) cw.best = pct;
        cw.n = current.length; cw.mode = examMode; cw.ts = Date.now();
        wb[wk] = cw; jset(PREFIX + "weekBoss", wb);
      } catch (e) { }
      var h = '<div class="statsbox"><h3 style="margin:0">📊 成绩</h3>' +
        "<p>得分（客观自动 + 主观自评）：<b>" + ok + " / " + current.length + "</b>（" + Math.round(ok * 100 / total) + "%）" + (auto ? " · 时间到自动交卷" : "") + "</p>" +
        (Object.keys(weak).length ? "<p>待加强知识点 " + Object.keys(weak).length + " 个，去「今日复习」巩固。</p>" : "<p>全部正确，很好！</p>") +
        '<p><a class="navbtn" style="display:inline-block;width:auto;text-decoration:none" href="review.html">🔁 去复习</a></p></div>';
      var res = el("div", "ex-result", h); host.appendChild(res);
      res.scrollIntoView({ behavior: "smooth" });
    }
    document.getElementById("exStart").onclick = function () { start(); };
    document.getElementById("exFull").onclick = function () {
      start({ minutes: 180, counts: { term: 5, fill: 10, mcq: 15, judge: 10, short: 3, calc: 2 } });
    };
  }

  /* ================= review page (spaced repetition) ================= */
  function kpIndex() {
    var kp = {}, q = {}, titles = {};
    (window.MANIFEST || []).forEach(function (m) {
      var ch = window.CHAPTERS[m.id]; if (!ch) return;
      titles[m.id] = m.title;
      ch.modules.forEach(function (mod) {
        mod.slides.forEach(function (s) { kp[m.id + "_s" + mod.i + "_" + s.i] = { cid: m.id, slide: s }; });
      });
      ["mcq", "judge", "fill", "short", "calc", "term"].forEach(function (kind) {
        (ch[kind] || []).forEach(function (x) { q[x.id] = { cid: m.id, kind: kind, q: x }; });
      });
    });
    return { kp: kp, q: q, titles: titles };
  }
  function kindName(k) { return { mcq: "选择题", judge: "判断题", fill: "填空题", short: "简答题", calc: "论述/推导", term: "名词解释" }[k] || k; }
  function answerHtml(info) {
    var q = info.q, k = info.kind, a = "";
    if (k === "mcq") {
      a = String(q.a);
      for (var i = 0; i < (q.o || []).length; i++) { if (String(q.o[i]).trim().charAt(0) === String(q.a).trim()) { a = q.o[i]; break; } }
    } else if (k === "term") a = q.def || "";
    else a = q.a != null ? q.a : "";
    var h = "<div>答案：<b>" + esc(a) + "</b></div>";
    if (q.e) h += '<div class="rev-exp">' + esc(q.e) + "</div>";
    if (q.kps) h += '<div class="rev-kps">踩分点：' + esc(q.kps) + "</div>";
    return h;
  }
  function renderReview() {
    var host = document.getElementById("reviewhost"), dueEl = document.getElementById("duecount");
    if (!host) return;
    var idx = kpIndex();
    var cmap = cardMap();
    function cardCard(id, c) {
      var box = el("div", "rev-card");
      box.innerHTML = '<div class="rev-meta">' + esc(idx.titles[c.ch] || c.ch || "") + " · " + esc(c.tag) + "</div>" +
        '<div class="rev-title">' + esc(c.front) + "</div>";
      var body = el("div", "rev-ans"); body.style.display = "none"; body.innerHTML = c.back;
      var rv = el("button", "rev-reveal", "显示答案"); rv.setAttribute("data-open", "显示答案");
      rv.onclick = toggle(rv, body);
      box.appendChild(rv); box.appendChild(body); box.appendChild(rateRow(id));
      return box;
    }
    function toggle(btn, box) {
      return function () {
        var open = box.style.display !== "none";
        box.style.display = open ? "none" : "block";
        btn.textContent = open ? btn.getAttribute("data-open") : "收起";
      };
    }
    function rateRow(id) {
      var row = el("div", "rev-rate");
      row.appendChild(el("span", "rev-ratelbl", "记住程度："));
      [["不会", 0, "no"], ["模糊", 1, "mid"], ["会", 2, "ok"]].forEach(function (o) {
        var b = el("button", o[2], o[0]);
        b.onclick = function () { srsRate(id, o[1]); render(); };
        row.appendChild(b);
      });
      return row;
    }
    function kpCard(id, info) {
      var s = info.slide, c = el("div", "rev-card");
      c.innerHTML = '<div class="rev-meta">' + esc(idx.titles[info.cid] || info.cid) + " · " + esc(s.sec || "") + "</div>" +
        '<div class="rev-title">' + esc(s.title) + "</div>" +
        '<div class="rev-hint">先在心里回忆这一页讲了什么，再展开核对。</div>';
      var body = el("div", "rev-body"); body.style.display = "none";
      body.innerHTML = '<div class="notes">' + esc(s.notes) + "</div>" +
        (s.points && s.points.length ? '<div class="points"><div class="pt-h">📌 本页要点</div><ul>' + s.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>" : "") +
        (s.fig ? '<div class="fignote"><div class="fn-h">🔍 图注解读</div><p>' + esc(s.fig).replace(/\n/g, "<br>") + "</p></div>" : "");
      var rv = el("button", "rev-reveal", "展开讲解"); rv.setAttribute("data-open", "展开讲解");
      rv.onclick = toggle(rv, body);
      c.appendChild(rv); c.appendChild(body); c.appendChild(rateRow(id));
      return c;
    }
    function qCard(id, info) {
      var q = info.q, c = el("div", "rev-card");
      c.innerHTML = '<div class="rev-meta">' + esc(idx.titles[info.cid] || info.cid) + " · " + esc(kindName(info.kind)) + "</div>" +
        '<div class="rev-title">' + esc(q.q || q.term || "") + "</div>";
      if (info.kind === "mcq" && q.o) {
        var opts = el("div", "rev-opts");
        q.o.forEach(function (o, i) {
          var b = el("button", "rev-opt", esc(o));
          b.onclick = function () {
            var cl = function (s) { return String(s).trim().charAt(0); };
            Array.prototype.forEach.call(opts.children, function (x) { if (cl(x.textContent) === String(q.a).trim()) x.classList.add("right"); });
            if (cl(o) !== String(q.a).trim()) b.classList.add("wrong");
            ans.style.display = "block";
          };
          opts.appendChild(b);
        });
        c.appendChild(opts);
      }
      var ans = el("div", "rev-ans"); ans.style.display = "none"; ans.innerHTML = answerHtml(info);
      var rv = el("button", "rev-reveal", "显示答案"); rv.setAttribute("data-open", "显示答案");
      rv.onclick = toggle(rv, ans);
      c.appendChild(rv); c.appendChild(ans); c.appendChild(rateRow(id));
      return c;
    }
    function render() {
      var due = srsDue().filter(function (id) { return idx.kp[id] || idx.q[id] || cmap[id]; });
      var conf = Object.keys(confusedAll()).filter(function (kp) { return idx.kp[kp]; });
      var confSet = {}; conf.forEach(function (k) { confSet[k] = 1; });
      due = conf.concat(due.filter(function (id) { return !confSet[id]; }));
      if (dueEl) dueEl.textContent = due.length;
      host.innerHTML = "";
      if (!due.length) {
        host.innerHTML = '<p class="empty">今天没有待复习的内容。去各章学习，标记已读、做题或翻卡片后会自动安排复习。</p>';
        return;
      }
      due.forEach(function (id) {
        host.appendChild(idx.kp[id] ? kpCard(id, idx.kp[id]) : idx.q[id] ? qCard(id, idx.q[id]) : cardCard(id, cmap[id]));
      });
    }
    render();
  }

  function renderDashboard() {
    var host = document.getElementById("dashbody"); if (!host) return;
    var due = srsDue().length, task = taskState(), streak = streakCount();
    var confN = Object.keys(confusedAll()).length;
    var fcDue = buildCards().filter(function (c) { var s = srsGet(c.id); return s && s.due <= Date.now(); }).length;
    var total = 0, mastered = 0;
    (window.MANIFEST || []).forEach(function (m) {
      var ch = window.CHAPTERS[m.id]; if (!ch) return;
      ch.modules.forEach(function (mod) {
        mod.slides.forEach(function (s) {
          total++;
          if (kpMastery(m.id + "_s" + mod.i + "_" + s.i) >= 0.6) mastered++;
        });
      });
    });
    host.innerHTML = '<div class="dash">' +
      '<div class="dcell"><a href="review.html"><b>' + due + '</b><span>待复习</span></a></div>' +
      '<div class="dcell"><a href="flashcards.html?due=1"><b>' + fcDue + '</b><span>闪卡到期</span></a></div>' +
      '<div class="dcell"><a href="flashcards.html"><b>' + streak + '</b><span>连续打卡（天）</span></a></div>' +
      '<div class="dcell"><b>' + (task.read || 0) + '</b><span>今日已读</span></div>' +
      '<div class="dcell"><b>' + (task.practice || 0) + '</b><span>今日练习</span></div>' +
      '<div class="dcell"><a href="review.html"><b>' + confN + '</b><span>待问/不懂</span></a></div>' +
      '<div class="dcell"><b>' + mastered + "/" + total + '</b><span>已掌握知识点</span></div>' +
      '</div>';
  }

  /* ---------- 学习计划 / 提醒 ---------- */
  function planGet() { return jget(PREFIX + "plan", { exam: "2027-12-20", read: 3, cards: 30, qs: 10 }); }
  function renderPlan() {
    var host = document.getElementById("planbody"); if (!host) return;
    var p = planGet(), task = taskState();
    var days = Math.max(0, Math.ceil((new Date(p.exam + "T00:00:00") - new Date()) / 86400000));
    host.innerHTML =
      '<div class="planrow">考试日期 <input type="date" id="planExam" value="' + p.exam + '"> ' +
      '<span class="hint">距考试 <b>' + days + '</b> 天</span></div>' +
      '<div class="planrow">每日目标：读 <input type="number" id="planRead" min="0" value="' + p.read + '" class="pnum"> 页 · ' +
      '卡片 <input type="number" id="planCards" min="0" value="' + p.cards + '" class="pnum"> 张 · ' +
      '题 <input type="number" id="planQs" min="0" value="' + p.qs + '" class="pnum"> 道</div>' +
      '<div class="planrow hint">今日进度：已读 <b>' + (task.read || 0) + "/" + p.read + '</b> · 练习 <b>' + (task.practice || 0) + "</b> · 复习 <b>" + (task.review || 0) + "</b></div>" +
      '<div class="planrow"><button class="navbtn" style="width:auto;margin:0" id="planRemind">🔔 每日提醒</button> <span id="planRemindMsg" class="hint"></span></div>';
    function save() {
      var q = planGet();
      q.exam = document.getElementById("planExam").value || q.exam;
      q.read = +document.getElementById("planRead").value || 0;
      q.cards = +document.getElementById("planCards").value || 0;
      q.qs = +document.getElementById("planQs").value || 0;
      jset(PREFIX + "plan", q); renderPlan();
    }
    ["planExam", "planRead", "planCards", "planQs"].forEach(function (id) { document.getElementById(id).onchange = save; });
    document.getElementById("planRemind").onclick = setupReminder;
    var rm = jget(PREFIX + "remind", null);
    if (rm && rm.on) document.getElementById("planRemindMsg").textContent = "已开启：" + rm.time + "（页面打开时提醒）";
  }
  function setupReminder() {
    var msg = document.getElementById("planRemindMsg");
    if (!("Notification" in window)) { msg.textContent = "此浏览器不支持通知"; return; }
    Notification.requestPermission().then(function (perm) {
      if (perm === "granted") {
        var t = window.prompt("每天几点提醒？（24 小时制，如 20:00）", "20:00") || "20:00";
        jset(PREFIX + "remind", { on: true, time: t, last: "" });
        msg.textContent = "已开启：" + t + "（需保持页面打开）";
      } else { msg.textContent = "未授权通知"; }
    });
  }
  function maybeRemind() {
    var rm = jget(PREFIX + "remind", null);
    if (!rm || !rm.on || !("Notification" in window) || Notification.permission !== "granted") return;
    var now = new Date(), hm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2), today = todayStr();
    if (hm >= rm.time && rm.last !== today) {
      rm.last = today; jset(PREFIX + "remind", rm);
      try { new Notification("细胞生物学 · 今日复习", { body: "该复习啦：打开网站完成今日任务。" }); } catch (e) { }
    }
  }

  /* ================= 历年真题页 ================= */
  /* 历年真题题型识别：判断题(对/错) / 选择题(选项内嵌,答案为字母) / 填空 / 其余简答 */
  function ztParseMC(q, a) {
    var s = String(q || ""), idx = s.search(/[A-D][.．、]/);
    if (idx < 0) return null;
    var stem = s.slice(0, idx).replace(/[（(]\s*[)）]\s*$/, "").trim();
    var rest = s.slice(idx);
    var parts = rest.split(/(?=[A-D][.．、])/).filter(function (x) { return /^[A-D][.．、]/.test(x); });
    if (parts.length < 2) return null;
    var ansL = String(a || "").trim().charAt(0);
    if (!/^[A-D]$/.test(ansL)) return null;
    return { q: stem, o: parts.map(function (p) { return p.replace(/\s+/g, " ").trim(); }), a: ansL };
  }
  function ztItemType(x) {
    var a = String(x.a || "").trim(), q = String(x.q || "");
    if (/^(对|错|正确|错误|√|×)[。.．]?$/.test(a)) {
      var aa = a.replace(/[。.．]/g, ""); if (aa === "正确") aa = "对"; if (aa === "错误") aa = "错";
      return { t: "judge", a: aa };
    }
    var mc = ztParseMC(q, a); if (mc) return { t: "mcq", mc: mc };
    if (/(_{2,}|＿{2,}|[（(]\s*[)）])/.test(q) && a.length <= 20) return { t: "fill" };
    return { t: "short" };
  }
  function renderZhentiSub() {
    var ctl = document.getElementById("ztctl"), host = document.getElementById("zthost"), cnt = document.getElementById("ztcount");
    if (!host) return;
    var Z = window.ZHENTI || {};
    var names = {
      ch01: "第一章 绪论", ch02: "第二章 细胞的统一性与多样性", ch03: "第三章 研究方法", ch04: "第四章 细胞质膜",
      ch05: "第五章 跨膜运输", ch06: "第六章 线粒体和叶绿体", ch07: "第七章 细胞质基质与内膜系统", ch08: "第八章 蛋白质分选与膜泡运输",
      ch09: "第九章 细胞信号转导", ch10: "第十章 细胞骨架", ch11: "第十一章 细胞核与染色质", ch12: "第十二章 核糖体",
      ch13: "第十三章 细胞周期与细胞分裂", ch14: "第十四章 细胞增殖调控与癌细胞", ch15: "第十五章 细胞分化与胚胎发育",
      ch16: "第十六章 细胞死亡与细胞衰老", ch17: "第十七章 细胞的社会联系"
    };
    var covered = { ch01: 1, ch02: 1, ch03: 1, ch04: 1, ch05: 1, ch07: 1, ch08: 1, ch11: 1 };
    var cur = "all", q = "";
    ctl.innerHTML = '<div class="fc-chips" id="ztchips"></div><input id="ztsearch" class="ans" placeholder="搜索题干 / 答案…" style="margin-top:6px">' +
      '<button class="navbtn" style="width:auto;margin-top:8px" id="ztQuiz">🎯 真题自测（随机 20 题）</button>';
    var chips = document.getElementById("ztchips");
    function chip(label, val) {
      var b = el("button", "fc-chip" + (val === cur ? " on" : ""), label); b.dataset.v = val;
      b.onclick = function () { cur = val; syncChips(); render(); };
      chips.appendChild(b);
    }
    chip("全部（17章）", "all"); chip("只看已讲章节", "covered");
    Object.keys(Z).sort().forEach(function (cid) { chip(esc(names[cid] || cid), cid); });
    function syncChips() { Array.prototype.forEach.call(chips.children, function (b) { b.classList.toggle("on", b.dataset.v === cur); }); }
    var urlSet = {};
    try { var _q = new URLSearchParams(location.search).get("ch"); if (_q) _q.split(",").forEach(function (c) { if (Z[c]) urlSet[c] = 1; }); } catch (e) { }
    if (Object.keys(urlSet).length) { cur = "__ch"; chip("本章相关真题（" + Object.keys(urlSet).length + "）", "__ch"); syncChips(); }
    var search = document.getElementById("ztsearch");
    search.oninput = function () { q = (search.value || "").trim().toLowerCase(); render(); };
    function render() {
      host.innerHTML = ""; var total = 0;
      Object.keys(Z).sort().forEach(function (cid) {
        if (cur === "__ch") { if (!urlSet[cid]) return; }
        else if (cur === "covered") { if (!covered[cid]) return; }
        else if (cur !== "all" && cid !== cur) return;
        var arr = Z[cid].filter(function (x) { return !q || (x.q + " " + x.a).toLowerCase().indexOf(q) >= 0; });
        if (!arr.length) return;
        var sec = el("section");
        sec.appendChild(el("h2", "", esc(names[cid] || cid) + "（" + arr.length + "）"));
        arr.forEach(function (x, i) {
          total++;
          var id = "zts_" + cid + "_" + i, ty = ztItemType(x), box;
          if (ty.t === "judge") box = renderJudge("ZS" + cid, { id: id, q: x.q, a: ty.a, e: x.src ? ("来源：" + x.src) : "" }, i + 1);
          else if (ty.t === "mcq") box = renderMCQ("ZS" + cid, { id: id, q: ty.mc.q, o: ty.mc.o, a: ty.mc.a, e: x.src ? ("来源：" + x.src) : "" }, i + 1);
          else if (ty.t === "fill") box = renderFill("ZS" + cid, { id: id, q: x.q, a: x.a, e: x.src ? ("来源：" + x.src) : "" }, i + 1);
          else box = renderSelf("ZS" + cid, { id: id, q: x.q, a: x.a, src: x.src }, i + 1, "short");
          sec.appendChild(box);
        });
        host.appendChild(sec);
      });
      if (!total) host.innerHTML = '<p class="empty">没有匹配的真题。</p>';
      if (cnt) cnt.textContent = total;
    }
    function startQuiz() {
      var pool = [];
      Object.keys(Z).forEach(function (cid) {
        if (cur === "covered" && !covered[cid]) return;
        if (cur !== "all" && cur !== "covered" && cid !== cur) return;
        Z[cid].forEach(function (x) { if (x.q) pool.push({ cid: cid, x: x }); });
      });
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      pool = pool.slice(0, 20);
      var pos = 0, okN = 0;
      function draw() {
        if (!pool.length) { host.innerHTML = '<p class="empty">该范围没有真题。</p>'; return; }
        if (pos >= pool.length) {
          host.innerHTML = '<div class="statsbox"><h3 style="margin:0">🎯 真题自测完成</h3><p>共 ' + pool.length + " 题，自评掌握 <b>" + okN + "</b> 题。</p>" +
            '<button class="navbtn" style="width:auto" id="ztBack">返回真题列表</button></div>';
          document.getElementById("ztBack").onclick = function () { render(); };
          return;
        }
        var it = pool[pos];
        host.innerHTML = '<div class="fc-progress">第 ' + (pos + 1) + " / " + pool.length + " 题 · " + esc(names[it.cid] || it.cid) + "</div>" +
          '<div class="zt"><div class="zt-q">' + esc(it.x.q) + "</div>" +
          (it.x.src ? '<div class="zt-src">📌 ' + esc(it.x.src) + "</div>" : "") +
          '<div class="zt-a" style="display:none;margin-top:6px"><b>答案：</b>' + esc(it.x.a || "（原书未给出，见教材）") + "</div>" +
          '<div style="margin-top:8px"><button class="fc-check" id="ztReveal">显示答案</button></div>' +
          '<div class="fc-rate" style="display:none;margin-top:8px"><button class="no">不会</button><button class="mid">模糊</button><button class="ok">会</button></div></div>';
        document.getElementById("ztReveal").onclick = function () {
          host.querySelector(".zt-a").style.display = "block";
          host.querySelector(".fc-rate").style.display = "flex";
          this.style.display = "none";
        };
        var rate = host.querySelector(".fc-rate");
        [["不会", 0], ["模糊", 1], ["会", 2]].forEach(function (o, i) {
          rate.children[i].onclick = function () { if (o[1] >= 2) okN++; pos++; draw(); };
        });
      }
      draw();
    }
    document.getElementById("ztQuiz").onclick = startQuiz;
    render();
  }

  /* ================= textbook cross-reference page ================= */
  function renderTextbook() {
    var host = document.getElementById("tbhost"); if (!host) return;
    var T = window.TEXTBOOK; if (!T) { host.innerHTML = '<p class="empty">数据未加载。</p>'; return; }
    var html = (T.target ? '<div class="notice" style="background:#eef3fb;border-color:#c3d6f0"><b>' + esc(T.target) + "</b></div>" : "") +
      '<p class="hint">' + esc(T.source) + " ｜ " + esc(T.note) + "</p>" +
      '<p class="hint">📌 内容来源：老师课件 13 章（覆盖教材第 <b>1、2、3、4、5、7、8、9、10、11、13、14、16</b> 章）+ 本站按教材原文 OCR 新增第 <b>6、12、15、17</b> 章。下表把「教材章/节」与「本站模块」一一对应。</p>';
    var stars = function (n) { return "★★★★★".slice(0, n || 1); };
    if (T.notCovered && (T.notCovered.sections || []).length) {
      var secs = T.notCovered.sections.slice().sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); });
      html += '<div class="tb-gaps" style="margin-bottom:16px">⚠️ <b>教材未讲</b>（按建议补齐优先级排序）：<ol class="tb-notcov">';
      (T.notCovered.whole || []).forEach(function (x) { html += "<li><b>" + esc(x.ch) + "</b>（" + esc(x.pages) + "）</li>"; });
      secs.forEach(function (x) {
        html += "<li><b>" + esc(x.title) + "</b>（" + esc(x.pages) + '）<span class="lvl lvl' + (x.level || 1) + '">' + stars(x.level) + "</span>" +
          '<div class="tb-why">' + esc(x.why || "") + (x.status ? '　<span class="hint">' + esc(x.status) + "</span>" : "") + "</div></li>";
      });
      html += "</ol></div>";
    }
    (T.chapters || []).forEach(function (ch) {
      html += '<div class="tb-chapter"><h3>' + esc(ch.title) + "</h3>" +
        '<table class="tbl"><thead><tr><th>教材章节（第4版）</th><th>本站模块</th><th>页号</th><th>覆盖</th><th></th></tr></thead><tbody>';
      (ch.maps || []).forEach(function (m) {
        var anchor = "s_" + ch.web + "_s" + m.mod + "_" + (m.first != null ? m.first : 0);
        var cov = m.cover === "全" ? "全" : "部分";
        html += "<tr><td>" + esc(m.tb) + "</td><td>" + esc(m.modName || ("模块" + m.mod)) + "</td><td>" + esc(m.pages) + "</td><td>" + esc(cov) + "</td>" +
          '<td><a href="' + ch.web + '.html#' + anchor + '">去学习 →</a></td></tr>';
      });
      (T.notCovered && T.notCovered.sections || []).filter(function (x) { return x.web === ch.web; })
        .sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); })
        .forEach(function (x) {
          html += '<tr class="tb-nc"><td>' + esc(x.title) + "（" + esc(x.pages) + '）</td><td>— 未讲 —</td><td>' + esc(x.pages) + '</td><td><span class="lvl lvl' + (x.level || 1) + '">未讲 ' + stars(x.level) + "</span></td><td></td></tr>";
        });
      html += "</tbody></table></div>";
    });
    host.innerHTML = html;
  }

  /* ================= compare page ================= */
  function renderCompare() {
    var host = document.getElementById("cmphost"); if (!host) return;
    var C = window.COMPARE; if (!C) { host.innerHTML = '<p class="empty">数据未加载。</p>'; return; }
    var cnt = document.getElementById("cmpcount"); if (cnt) cnt.textContent = (C.tables || []).length;
    function table(t) {
      return '<div class="cmpbox" id="cmp_' + esc(t.id) + '"><h2>' + esc(t.title) + "</h2>" +
        (t.tip ? '<p class="hint" style="margin:2px 0 8px">💡 ' + esc(t.tip) + "</p>" : "") +
        '<div class="cmpscroll"><table class="tbl cmptbl"><thead><tr>' +
        t.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        t.rows.map(function (r) { return "<tr>" + r.map(function (c, i) { return '<td class="' + (i === 0 ? "cmprow" : "") + '">' + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table></div></div>";
    }
    host.innerHTML = (C.intro ? '<p class="hint">' + esc(C.intro) + "</p>" : "") + (C.tables || []).map(table).join("");
    var chips = document.getElementById("cmpChips");
    if (chips) {
      chips.innerHTML = "";
      (C.tables || []).forEach(function (t) {
        var b = el("button", "fc-chip", t.title.replace(/（.*/, "").replace(/\(.*/, ""));
        b.onclick = function () { var e = document.getElementById("cmp_" + t.id); if (e) e.scrollIntoView({ behavior: "smooth" }); };
        chips.appendChild(b);
      });
    }
    var mk = document.getElementById("cmpMask");
    if (mk) mk.onclick = function () {
      var on = !mk.classList.contains("on");
      mk.classList.toggle("on", on);
      mk.textContent = on ? "✅ 挖空中（点单元格看答案）" : "🎯 挖空自测（点单元格看答案）";
      Array.prototype.forEach.call(host.querySelectorAll(".cmptbl"), function (t) {
        t.classList.toggle("mask", on);
        if (on && !t._bound) {
          t._bound = 1;
          Array.prototype.forEach.call(t.querySelectorAll("td"), function (td) {
            if (td.classList.contains("cmprow")) return;
            td.onclick = function () { td.classList.toggle("reveal"); };
          });
        }
      });
    };
  }

  /* ================= glossary page ================= */
  function renderGlossary() {
    var data = window.GLOSSARY || [];
    var host = document.getElementById("glist");
    var chips = document.getElementById("gchips");
    var search = document.getElementById("gsearch");
    var cnt = document.getElementById("gcount");
    if (!host) return;
    if (cnt) cnt.textContent = data.length;
    var names = ZT_NAMES;
    names["通用"] = "通用术语（名词解释）";
    var cur = "all";
    var chs = {}; data.forEach(function (g) { if (g.ch) chs[g.ch] = 1; });
    var bAll = el("button", "on", "全部"); bAll.dataset.ch = "all";
    bAll.onclick = function () { cur = "all"; syncChips(); render(); }; chips.appendChild(bAll);
    Object.keys(chs).sort().forEach(function (c) {
      var b = el("button", "", names[c] || c); b.dataset.ch = c;
      b.onclick = function () { cur = c; syncChips(); render(); }; chips.appendChild(b);
    });
    function syncChips() { Array.prototype.forEach.call(chips.children, function (b) { b.classList.toggle("on", (b.dataset.ch || "all") === cur); }); }
    function render() {
      var q = (search && search.value || "").trim().toLowerCase();
      var html = "";
      data.filter(function (g) {
        return (cur === "all" || g.ch === cur) && (!q || (g.t + " " + (g.en || "") + " " + g.d).toLowerCase().indexOf(q) >= 0);
      }).forEach(function (g) {
        html += '<div class="gitem"><div class="gt">' + esc(g.t) +
          (g.en ? ' <span class="gen">' + esc(g.en) + "</span>" : "") +
          '<span class="gch">' + esc(names[g.ch] || g.ch || "") + "</span></div>" +
          '<div class="gd">' + esc(g.d) + "</div></div>";
      });
      host.innerHTML = html || '<p class="empty">没有匹配的术语。</p>';
    }
    if (search) search.oninput = render;
    render();
  }

  /* ================= index page ================= */
  function renderIndex() {
    var list = document.getElementById("list");
    var M = window.MANIFEST || [];
    M.forEach(function (m) {
      var c = el("div", "card");
      var s = chapterStats(m.id, window.CHAPTERS[m.id] || { modules: [] });
      var ps = passedGet(m.id);
      c.innerHTML =
        '<div class="row"><h2>' + esc(m.title) + '</h2><span class="badge">' + (ps && ps.passed ? "🏁 已通关 · " : "") + m.n_slides + " 页 · " + m.n_q + " 题</span></div>" +
        '<p class="topics">' + esc(m.sub2) + "</p>" +
        '<div class="prog"><i style="width:' + (s.slides ? Math.round(s.seen * 100 / s.slides) : 0) + '%"></i></div>' +
        '<p class="topics">' + (ps ? (ps.passed ? '<b style="color:#1a7f37">🏁 通关 ' + ps.best + "%</b> ｜ " : "🏁 未通关（" + ps.pct + "%）｜ ") : "") + '概念已读 ' + s.seen + "/" + s.slides + " ｜ 正确率 " + (s.rate == null ? "—" : s.rate + "%") + "（已答 " + (s.answered || 0) + "/" + (s.totalQ || 0) + "）｜ 错题 " + s.wrong + " 题</p>";
      var a = el("a", "go", "开始学习 →"); a.href = m.id + ".html"; c.appendChild(a);
      list.appendChild(c);
    });
    renderOverview();
    renderDashboard();
    renderPlan();
    var bAll = document.getElementById("backupAll"), rAll = document.getElementById("restoreAll"), fAll = document.getElementById("fileAll");
    if (bAll) bAll.onclick = backupAll;
    var bExp = document.getElementById("exportAll");
    if (bExp) bExp.onclick = exportAllPDF;
    if (rAll && fAll) { rAll.onclick = function () { fAll.click(); }; fAll.onchange = function () { if (fAll.files[0]) restoreAll(fAll.files[0]); }; }
  }

  function renderOverview() {
    var host = document.getElementById("overview"); if (!host) return;
    var M = window.MANIFEST || [];
    var rows = "", tW = 0, tOK = 0, tN = 0, tD = 0, any = false;
    M.forEach(function (m) {
      var ch = window.CHAPTERS[m.id];
      var s = chapterStats(m.id, ch || { modules: [] });
      if (s.seen || s.answered || s.wrong) any = true;
      tW += s.wrong; tN += (s.answered || 0); tOK += (s.ok || 0); tD += (s.totalQ || 0);
      rows += "<tr><td>" + esc(m.title) + "</td><td>" + s.seen + "/" + s.slides + "</td><td>" +
        (s.answered || 0) + "/" + (s.totalQ || 0) + "</td><td>" +
        (s.rate == null ? "—" : s.rate + "%") + "</td><td>" + s.wrong + "</td><td>" +
        (function () { var p = passedGet(m.id); return p ? (p.passed ? '<b style="color:#1a7f37">✅ ' + p.best + "%</b>" : p.pct + "%") : "—"; })() + "</td></tr>";
    });
    if (!any) { host.innerHTML = '<p class="empty">本设备还没有学习记录。打开任意一章开始学习，记录只存在这台设备。</p>'; return; }
    host.innerHTML = '<table class="tbl"><thead><tr><th>章节</th><th>概念已读</th><th>已答/题量</th><th>正确率</th><th>错题</th><th>通关测</th></tr></thead><tbody>' +
      rows + '<tr style="font-weight:700"><td>合计</td><td>—</td><td>' + tN + "/" + tD + "</td><td>" + (tD ? Math.round(tOK * 100 / tD) + "%" : "—") + "</td><td>" + tW + "</td><td>—</td></tr></tbody></table>";
  }

  function backupAll() {
    var out = {};
    (window.MANIFEST || []).forEach(function (m) {
      ["mcq", "judge", "fill", "self", "seen", "text", "wrong", "hw", "last"].forEach(function (k) {
        var v = jget(skey(m.id, k), null); if (v != null) out[skey(m.id, k)] = v;
      });
    });
    var blob = new Blob([JSON.stringify({ v: 1, all: true, data: out }, null, 1)], { type: "application/json" });
    var a = el("a"); a.href = URL.createObjectURL(blob); a.download = "cellbio-backup-all.json"; a.click();
  }
  function restoreAll(file) {
    var r = new FileReader();
    r.onload = function () {
      try { var obj = JSON.parse(r.result); var d = obj.data || obj;
        Object.keys(d).forEach(function (k) { if (k.indexOf(PREFIX) === 0) jset(k, d[k]); });
        alert("恢复成功，页面将刷新。"); location.reload();
      } catch (e) { alert("文件解析失败：" + e.message); }
    };
    r.readAsText(file);
  }

  /* ================= global wrong page ================= */
  function renderWrongPage() {
    var host = document.getElementById("wronghost");
    var M = window.MANIFEST || [];
    var onlyCh = ""; try { onlyCh = new URLSearchParams(location.search).get("ch") || ""; } catch (e) { }
    var total = 0;
    M.forEach(function (m) {
      if (onlyCh && m.id !== onlyCh) return;
      var ch = window.CHAPTERS[m.id]; if (!ch) return;
      var list = wrongList(m.id);
      if (!list.length) return;
      total += list.length;
      var sec = el("section");
      sec.appendChild(el("h2", "", esc(m.title) + "（" + list.length + "）"));
      var qmap = {}; ch.mcq.forEach(function (q) { qmap[q.id] = q; });
      list.slice().reverse().forEach(function (e) {
        var item = el("div", "wb-entry");
        var q = qmap[e.id];
        item.innerHTML = '<div class="wq">' + esc(e.q) + '<span class="pill">' + esc(kindName(e.type)) + "</span>" +
          (e.cause ? '<span class="cause-tag">' + esc((CAUSES.filter(function (c) { return c[0] === e.cause; })[0] || ["", "其他"])[1]) + "</span>" : "") + "</div>" +
          (q ? '<div style="margin-top:4px">选项：' + q.o.map(esc).join("　") + "</div>" : "") +
          '<div class="wa">正确答案：<b>' + esc(e.correct) + "</b></div>" +
          (e.chosen ? '<div class="wa">你的作答：' + esc(e.chosen) + "</div>" : "");
        var act = el("div", "act"); var b = el("button", "", "标记已掌握");
        b.onclick = function () { clearWrong(m.id, e.id); item.remove(); };
        act.appendChild(b); item.appendChild(act); sec.appendChild(item);
      });
      host.appendChild(sec);
    });
    /* 真题错题（cid 形如 ZS<ch>/ZT<ch>） */
    var mset = {}; M.forEach(function (m) { mset[m.id] = 1; });
    var pseudo = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX + "wrong:") === 0) { var cid = k.slice((PREFIX + "wrong:").length); if (!mset[cid]) pseudo.push(cid); } } } catch (e) { }
    pseudo.forEach(function (cid) {
      var list = wrongList(cid); if (!list.length) return; total += list.length;
      var sec = el("section");
      var nm = (window.ZT_NAMES && window.ZT_NAMES[cid.replace(/^(ZS|ZT)/, "")]) || cid;
      sec.appendChild(el("h2", "", "历年/客观真题 · " + esc(nm) + "（" + list.length + "）"));
      list.slice().reverse().forEach(function (e) {
        var item = el("div", "wb-entry");
        item.innerHTML = '<div class="wq">' + esc(e.q) + '<span class="pill">' + esc(kindName(e.type)) + "</span></div>" +
          '<div class="wa">正确答案：<b>' + esc(e.correct) + "</b></div>" + (e.chosen ? '<div class="wa">你的作答：' + esc(e.chosen) + "</div>" : "");
        var act = el("div", "act"); var b = el("button", "", "标记已掌握");
        b.onclick = function () { clearWrong(cid, e.id); item.remove(); };
        act.appendChild(b); item.appendChild(act); sec.appendChild(item);
      });
      host.appendChild(sec);
    });
    if (!total) host.innerHTML = '<p class="empty">还没有错题记录。去各章练习，答错的题会自动进入这里。</p>';
  }

  /* ---------- 动画自适应高度（消除内层滚动） ---------- */
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || !d.__animResize || typeof d.h !== "number") return;
    var frames = document.querySelectorAll("iframe.animframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === ev.source) {
        frames[i].style.height = Math.max(140, Math.ceil(d.h)) + "px";
        break;
      }
    }
  });

  /* ================= 客观真题（选择/判断/填空） ================= */
  var ZT_NAMES = {
    ch01: "第一章 绪论", ch02: "第二章 细胞的统一性与多样性", ch03: "第三章 研究方法", ch04: "第四章 细胞质膜",
    ch05: "第五章 跨膜运输", ch06: "第六章 线粒体和叶绿体", ch07: "第七章 细胞质基质与内膜系统", ch08: "第八章 蛋白质分选与膜泡运输",
    ch09: "第九章 细胞信号转导", ch10: "第十章 细胞骨架", ch11: "第十一章 细胞核与染色质", ch12: "第十二章 核糖体",
    ch13: "第十三章 细胞周期与细胞分裂", ch14: "第十四章 细胞增殖调控与癌细胞", ch15: "第十五章 细胞分化与胚胎发育",
    ch16: "第十六章 细胞死亡与细胞衰老", ch17: "第十七章 细胞的社会联系"
  };
  function renderZhenti() {
    if (!window.__ztmode) window.__ztmode = "sub";
    var sub = document.getElementById("ztModeSub"), obj = document.getElementById("ztModeObj");
    function sync() { if (sub) sub.classList.toggle("on", window.__ztmode === "sub"); if (obj) obj.classList.toggle("on", window.__ztmode === "obj"); }
    if (sub) sub.onclick = function () { window.__ztmode = "sub"; sync(); renderZhentiSub(); };
    if (obj) obj.onclick = function () { window.__ztmode = "obj"; sync(); renderZtObj(); };
    sync();
    if (window.__ztmode === "obj") renderZtObj(); else renderZhentiSub();
  }
  function renderZtObj() {
    var ctl = document.getElementById("ztctl"), host = document.getElementById("zthost"), cnt = document.getElementById("ztcount");
    if (!host) return;
    var O = window.ZTOBJ || {};
    var names = ZT_NAMES;
    var covered = { ch01: 1, ch02: 1, ch03: 1, ch04: 1, ch05: 1, ch07: 1, ch08: 1, ch11: 1 };
    var TY = [["all", "全部题型"], ["mcq", "选择题"], ["judge", "判断题"], ["fill", "填空题"]];
    var cur = "all", ty = "all", q = "";
    ctl.innerHTML = '<div class="fc-chips" id="zty"></div><div class="fc-chips" id="ztc"></div>' +
      '<input id="ztsearch" class="ans" placeholder="搜索题干 / 答案…" style="margin-top:6px">' +
      '<button class="navbtn" style="width:auto;margin-top:8px" id="ztQuiz">🎯 客观题自测（随机 20 题，可判分）</button>';
    var yc = document.getElementById("zty"), cc = document.getElementById("ztc");
    TY.forEach(function (t) { var b = el("button", "fc-chip" + (t[0] === ty ? " on" : ""), t[1]); b.dataset.v = t[0]; b.onclick = function () { ty = t[0]; sync(); render(); }; yc.appendChild(b); });
    function chapChip(label, val) { var b = el("button", "fc-chip" + (val === cur ? " on" : ""), label); b.dataset.v = val; b.onclick = function () { cur = val; sync(); render(); }; cc.appendChild(b); }
    chapChip("全部（17章）", "all"); chapChip("只看已讲章节", "covered");
    Object.keys(O).sort().forEach(function (cid) { chapChip(esc(names[cid] || cid), cid); });
    var urlSet = {};
    try { var _q = new URLSearchParams(location.search).get("ch"); if (_q) _q.split(",").forEach(function (c) { if (O[c]) urlSet[c] = 1; }); } catch (e) { }
    if (Object.keys(urlSet).length) { cur = "__ch"; chapChip("本章相关（" + Object.keys(urlSet).length + "）", "__ch"); sync(); }
    function sync() {
      Array.prototype.forEach.call(yc.children, function (b) { b.classList.toggle("on", b.dataset.v === ty); });
      Array.prototype.forEach.call(cc.children, function (b) { b.classList.toggle("on", b.dataset.v === cur); });
    }
    var search = document.getElementById("ztsearch"); search.oninput = function () { q = (search.value || "").trim().toLowerCase(); render(); };
    function inScope(cid) { if (cur === "__ch") return !!urlSet[cid]; if (cur === "covered") return !!covered[cid]; if (cur !== "all") return cid === cur; return true; }
    function types() { return ty === "all" ? ["mcq", "judge", "fill"] : [ty]; }
    function render() {
      host.innerHTML = ""; var total = 0;
      Object.keys(O).sort().forEach(function (cid) {
        if (!inScope(cid)) return;
        var rows = [];
        types().forEach(function (t) { (O[cid][t] || []).forEach(function (x) { if (!x.q || x.q.trim().length < 4) return; if (!q || (x.q + " " + (x.o || []).join(" ") + " " + x.a).toLowerCase().indexOf(q) >= 0) rows.push({ t: t, x: x }); }); });
        if (!rows.length) return;
        var sec = el("section");
        sec.appendChild(el("h2", "", esc(names[cid] || cid) + "（" + rows.length + "）"));
        rows.forEach(function (r, i) {
          total++; var x = r.x;
          var o = { id: "ztobj_" + cid + "_" + r.t + "_" + i, q: x.q, o: x.o, a: x.a, e: x.e, oe: x.oe, kp: null, src: x.src };
          var box = r.t === "mcq" ? renderMCQ("ZT" + cid, o, i + 1) : (r.t === "judge" ? renderJudge("ZT" + cid, o, i + 1) : renderFill("ZT" + cid, o, i + 1));
          sec.appendChild(box);
        });
        host.appendChild(sec);
      });
      if (!total) host.innerHTML = '<p class="empty">没有匹配的客观题。</p>';
      if (cnt) cnt.textContent = total;
    }
    function startQuiz() {
      var pool = [];
      Object.keys(O).sort().forEach(function (cid) { if (!inScope(cid)) return; types().forEach(function (t) { (O[cid][t] || []).forEach(function (x) { if (x.q && x.q.trim().length >= 4) pool.push({ cid: cid, t: t, x: x }); }); }); });
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tt = pool[i]; pool[i] = pool[j]; pool[j] = tt; }
      pool = pool.slice(0, 20);
      if (!pool.length) { host.innerHTML = '<p class="empty">该范围没有客观题。</p>'; return; }
      host.innerHTML = '<div class="statsbox" style="margin-bottom:8px"><b>🎯 客观题自测：' + pool.length + ' 题</b>　选择题点选项、判断题点对/错即时判分；填空题输入后点「检查」</div>';
      pool.forEach(function (it, i) {
        var x = it.x;
        var o = { q: x.q, o: x.o, a: x.a, e: x.e, id: "ztobj_" + it.cid + "_" + it.t + "_" + i, kp: null };
        var box = it.t === "mcq" ? renderMCQ(it.cid, o, i + 1) : (it.t === "judge" ? renderJudge(it.cid, o, i + 1) : renderFill(it.cid, o, i + 1));
        host.appendChild(box);
      });
      if (cnt) cnt.textContent = pool.length;
    }
    document.getElementById("ztQuiz").onclick = startQuiz;
    render();
  }

  /* ================= 跨章知识总图 ================= */
  function renderMindmap() {
    var host = document.getElementById("mhhost");
    var listEl = document.getElementById("mhlist");
    var legEl = document.getElementById("mhlegend");
    if (!host) return;
    var mm = window.MINDMAP || { domains: {}, edges: [] };
    var M = window.MANIFEST || [];
    var byId = {}; M.forEach(function (m) { byId[m.id] = m; });
    var path = mm.path || [];
    var pathSet = {}; path.forEach(function (id) { pathSet[id] = 1; });
    function shortName(id) {
      var m = byId[id]; if (!m) return id;
      var t = String(m.title || id).replace(/^第[一二三四五六七八九十百]+章\s*/, "").trim();
      var par = t.match(/^[（(]([^）)]*)[）)]\s*(.+)$/);
      if (par) t = par[2] + "·" + par[1];
      return t.replace(/[（(].*$/, "").replace(/\s+/g, " ").trim().slice(0, 10);
    }
    var palette = ["#2b6ef2", "#1b7f3b", "#a3541e", "#7a2a24", "#6a3fb5", "#0e7490", "#b8860b", "#4b5563"];
    var doms = [], colorOf = {}, colOf = {}, rowOf = {};
    Object.keys(mm.domains || {}).forEach(function (d, di) {
      var c = palette[di % palette.length]; doms.push(d);
      (mm.domains[d] || []).forEach(function (id, ri) { if (byId[id]) { colorOf[id] = c; colOf[id] = di; rowOf[id] = ri; } });
    });
    var other = M.filter(function (m) { return colOf[m.id] == null; }).map(function (m) { return m.id; });
    if (other.length) { doms.push("其他"); var oi = doms.length - 1; other.forEach(function (id, ri) { colorOf[id] = "#4b5563"; colOf[id] = oi; rowOf[id] = ri; }); }
    if (legEl) {
      legEl.innerHTML = doms.map(function (d, i) {
        return '<span class="mm-leg"><i style="background:' + palette[i % palette.length] + '"></i>' + esc(d) + "</span>";
      }).join("");
    }
    var colW = 172, rowH = 84, nodeW = 152, nodeH = 48, padL = 20, padT = 24;
    var maxRow = 0; Object.keys(rowOf).forEach(function (id) { if (rowOf[id] + 1 > maxRow) maxRow = rowOf[id] + 1; });
    var W = padL + doms.length * colW + 20, H = padT + maxRow * rowH + 30;
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "mindsvg");
    function mk(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    function center(id) { return { x: padL + colOf[id] * colW + nodeW / 2, y: padT + rowOf[id] * rowH + nodeH / 2 }; }
    (mm.edges || []).forEach(function (e) {
      if (colOf[e.a] == null || colOf[e.b] == null) return;
      var A = center(e.a), B = center(e.b);
      var p = mk("path", { d: "M " + A.x + " " + A.y + " Q " + ((A.x + B.x) / 2) + " " + ((A.y + B.y) / 2 - 26) + " " + B.x + " " + B.y, "class": "mh-edge" + (pathSet[e.a] && pathSet[e.b] ? " mh-onpath" : "") });
      var ti = mk("title"); ti.textContent = shortName(e.a) + " —" + e.t + "→ " + shortName(e.b); p.appendChild(ti);
      svg.appendChild(p);
    });
    doms.forEach(function (d, i) {
      var tx = padL + i * colW + nodeW / 2;
      var lt = mk("text", { x: tx, y: 14, "class": "mh-domlabel", "text-anchor": "middle" }); lt.textContent = d; svg.appendChild(lt);
    });
    M.forEach(function (m) {
      var id = m.id; if (colOf[id] == null) return;
      var x = padL + colOf[id] * colW, y = padT + rowOf[id] * rowH;
      var g = mk("g", { "class": "mh-node" + (pathSet[id] ? " mh-onpath" : "") }); g.style.cursor = "pointer";
      g.appendChild(mk("rect", { x: x, y: y, width: nodeW, height: nodeH, rx: 10, fill: colorOf[id] }));
      var t = mk("text", { x: x + nodeW / 2, y: y + nodeH / 2 + 4, "class": "mh-node-t", "text-anchor": "middle" }); t.textContent = shortName(id);
      g.appendChild(t);
      var tt = mk("title"); tt.textContent = m.title; g.appendChild(tt);
      g.onclick = function () { location.href = id + ".html"; };
      svg.appendChild(g);
    });
    host.appendChild(svg);
    var pathEl = document.getElementById("mhpath");
    if (pathEl && path.length) {
      var steps = path.map(function (id, i) {
        return '<a class="mh-step" href="' + id + '.html"><b>' + (i + 1) + "</b> " + esc(shortName(id)) + "</a>";
      }).join('<span class="oarrow">→</span>');
      var br = Object.keys(mm.branches || {}).map(function (k) {
        return '<a class="mh-branch" href="' + k + '.html">' + esc(shortName(k)) + '</a>⟶<a href="' + esc(mm.branches[k]) + '.html">' + esc(shortName(mm.branches[k])) + "</a>";
      }).join("　");
      pathEl.innerHTML = '<div class="mm-chain">' + steps + "</div>" + (br ? '<div class="mh-branchrow">教材章挂靠：' + br + "</div>" : "");
    }
    var tgl = document.getElementById("mhpathtoggle");
    if (tgl) tgl.onclick = function () {
      var on = svg.classList.toggle("pathonly");
      tgl.classList.toggle("on", on);
      tgl.textContent = on ? "显示全部关系" : "只看学习路径";
    };
    var detailEl = document.getElementById("mhdetail");
    if (detailEl) {
      detailEl.innerHTML = Object.keys(mm.details || {}).map(function (d) {
        var dd = mm.details[d];
        var steps = (dd.steps || []).map(function (s) {
          var items = (s.items || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
          var inner = '<div class="mh-flow-t">' + esc(s.t) + "</div><ul>" + items + "</ul>";
          return s.link ? '<a class="mh-flow-step" href="' + esc(s.link) + '">' + inner + "</a>" : '<div class="mh-flow-step">' + inner + "</div>";
        }).join('<span class="oarrow">→</span>');
        return '<div class="mh-detail"><h4>' + esc(d) + "：" + esc(dd.q || "") + '</h4><div class="mh-flow">' + steps + "</div></div>";
      }).join("");
    }
    if (listEl) {
      listEl.innerHTML = (mm.edges || []).map(function (e) {
        return '<li><a href="' + esc(e.a) + '.html">' + esc(shortName(e.a)) + "</a> —" + esc(e.t) + "→ <a href=\"" + esc(e.b) + '.html">' + esc(shortName(e.b)) + "</a></li>";
      }).join("");
    }
  }

  /* ================= 802 真题（手写本整理） ================= */
  function renderZT802() {
    var host = document.getElementById("zt802host");
    if (!host || !window.ZT802) return;
    var d = window.ZT802;
    var introEl = document.getElementById("zt802intro");
    if (introEl) introEl.innerHTML = "<b>说明：</b>" + esc(d.intro);
    var cnt = document.getElementById("zt802count");
    if (cnt) cnt.textContent = d.items.length;
    var filterYear = false;
    function draw() {
      host.innerHTML = d.items.filter(function (it) { return !filterYear || (it.year && it.year.length); }).map(function (it) {
        var page = "";
        if (/^(ch|tb)\d+_s/.test(it.kp)) {
          var cid = it.kp.split("_s")[0];
          page = '<a class="navbtn" style="width:auto;margin:0;display:inline-block;text-decoration:none" href="' + cid + ".html#s_" + it.kp + '">📄 对应讲义页</a>';
        }
        return '<div class="q"><p class="qq">' + it.n + ". " + esc(it.q) + (it.year ? ' <span class="src">[' + esc(it.year) + "]</span>" : "") + "</p>" +
          '<details class="sol"><summary>查看答案</summary><div class="ansbox" style="white-space:pre-wrap">' + esc(it.ans) + "</div></details>" +
          (page ? '<div style="margin-top:8px">' + page + "</div>" : "") + "</div>";
      }).join("");
    }
    var bAll = document.getElementById("zt802all"), bY = document.getElementById("zt802year");
    if (bAll) bAll.onclick = function () { filterYear = false; bAll.classList.add("on"); if (bY) bY.classList.remove("on"); draw(); };
    if (bY) bY.onclick = function () { filterYear = true; bY.classList.add("on"); if (bAll) bAll.classList.remove("on"); draw(); };
    if (bAll) bAll.classList.add("on");
    draw();
    renderRecent();
  }

  /* ================= 近年考点（诺奖/新方法） ================= */
  function renderRecent() {
    var host = document.getElementById("recenthost");
    if (!host || !window.RECENT) return;
    var d = window.RECENT;
    var introEl = document.getElementById("recentintro");
    if (introEl) introEl.innerHTML = "<b>说明：</b>" + esc(d.intro);
    host.innerHTML = d.items.map(function (it) {
      var page = "";
      if (/^(ch|tb)\d+_s/.test(it.kp)) {
        var cid = it.kp.split("_s")[0];
        page = '<a class="navbtn" style="width:auto;margin:0;display:inline-block;text-decoration:none" href="' + cid + ".html#s_" + it.kp + '">📄 相关页</a>';
      }
      return '<div class="q"><p class="qq">' +
        (it.year && it.year !== "—" ? '<span class="src">[' + esc(it.year) + "]</span> " : "") +
        '<b>' + esc(it.t) + "</b> <span class=\"hint\">" + esc(it.kind) + (it.who ? " · " + esc(it.who) : "") + "</span></p>" +
        "<p style=\"margin:4px 0 6px;font-size:13.5px\">" + esc(it.point) + "</p>" +
        (it.ans ? '<details class="sol"><summary>查看参考答案</summary><div class="ansbox" style="white-space:pre-wrap">' + esc(it.ans) + "</div></details>" : "") +
        (page ? '<div style="margin-top:8px">' + page + "</div>" : "") + "</div>";
    }).join("");
  }

  /* ================= boot ================= */
  document.addEventListener("DOMContentLoaded", function () {
    if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(function () { }); } catch (e) { } }
    autoSnapshot();
    maybeRemind(); setInterval(maybeRemind, 60000);
    var page = document.body.dataset.page;
    if (page === "chapter") renderChapter(document.body.dataset.ch);
    else if (page === "index") renderIndex();
    else if (page === "wrong") renderWrongPage();
    else if (page === "glossary") renderGlossary();
    else if (page === "compare") renderCompare();
    else if (page === "mindmap") renderMindmap();
    else if (page === "review") renderReview();
    else if (page === "flashcards") renderFlashcards();
    else if (page === "exam") renderExam();
    else if (page === "textbook") renderTextbook();
    else if (page === "zhenti") renderZhenti();
    else if (page === "zt802") renderZT802();
    // 页面内容由 JS 动态渲染，加载时的 #hash 锚点目标此时尚不存在；渲染后再跳转
    function jumpHash() {
      try {
        var id = decodeURIComponent(String(location.hash || "").replace(/^#/, ""));
        if (!id) return;
        var t = document.getElementById(id);
        if (!t) return;
        var html = document.documentElement, prev = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        var y = t.getBoundingClientRect().top + (window.pageYOffset || 0) - 8;
        window.scrollTo(0, y < 0 ? 0 : y);
        html.style.scrollBehavior = prev || "";
      } catch (e) { }
    }
    jumpHash();
    requestAnimationFrame(jumpHash);
    setTimeout(jumpHash, 260);
    setTimeout(jumpHash, 760);
  });

  window.CELL = {
    backupAll: backupAll, restoreAll: restoreAll, exportChapterPDF: exportChapterPDF,
    exportAllPDF: exportAllPDF, buildChapterDoc: buildChapterDoc,
    srsRate: srsRate, srsDue: srsDue, srsCount: srsCount, srsGet: srsGet,
    kpRecord: kpRecord, kpMastery: kpMastery, streakCount: streakCount, taskState: taskState,
    autoSnapshot: autoSnapshot, autoInfo: autoInfo, restoreAuto: restoreAuto, cellbioKeys: cellbioKeys,
    PREFIX: PREFIX
  };
})();
