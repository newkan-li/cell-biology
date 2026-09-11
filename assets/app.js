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

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]; }); }
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
  function renderMCQ(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题 " + esc(q.q) + (q.mod ? '<span class="src">[' + esc(q.mod) + "]</span>" : "")));
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
    return box;
  }

  function gradeMCQ(cid, q, box, chosen) {
    var correct = String(q.a).trim();
    var ok = chosen === correct;
    var store = mcqStore(cid);
    var rec = store[q.id] || { ok: 0, miss: 0 };
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
      '<div style="margin-top:4px">解析：' + esc(q.e || "") + "</div>";
    box._cause.style.display = ok ? "none" : "flex";
    if (!ok) {
      addWrong(cid, { id: q.id, type: "mcq", q: q.q, correct: correct, chosen: chosen, cause: "", ts: Date.now() });
    } else {
      clearWrong(cid, q.id);
    }
  }

  /* ================= 判断题 ================= */
  function renderJudge(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题（判断对错） " + esc(q.q)));
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
    return box;
  }
  function gradeJudge(cid, q, box, chosen) {
    var correct = String(q.a).trim();
    var ok = chosen === correct;
    var store = judgeStore(cid);
    var rec = store[q.id] || { ok: 0, miss: 0 };
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
      '<div style="margin-top:4px">解析：' + esc(q.e || "") + "</div>";
    box._cause.style.display = ok ? "none" : "flex";
    if (!ok) addWrong(cid, { id: q.id, type: "judge", q: q.q, correct: correct, chosen: chosen, cause: "", ts: Date.now() });
    else clearWrong(cid, q.id);
  }

  /* ================= fill ================= */
  function renderFill(cid, q, idx) {
    var box = el("div", "q"); box.id = "q_" + q.id;
    box.appendChild(el("p", "qq", "第 " + idx + " 题 " + esc(q.q)));
    var inp = el("input", "ans"); inp.placeholder = "输入答案（多个空用逗号分隔）"; box.appendChild(inp);
    var bar = el("div", "self");
    var bChk = el("button", "ok", "检查"), bShow = el("button", "", "显示答案");
    bar.appendChild(bChk); bar.appendChild(bShow); box.appendChild(bar);
    var det = el("details", "sol");
    det.innerHTML = '<summary>参考答案</summary><div class="ansbox"><b>' + esc(q.a) + "</b></div>";
    box.appendChild(det);
    var res = el("div", "mres"); res.style.display = "none"; box.appendChild(res);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box.appendChild(hwBox(cid, q.id));

    box._check = function () {
      var ok = fuzzyMatch(q.a, inp.value);
      var store = fillStore(cid); var rec = store[q.id] || { ok: 0, miss: 0 };
      rec.last = inp.value;
      if (ok) { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
      store[q.id] = rec; jset(skey(cid, "fill"), store); touch(cid);
      inp.classList.remove("right", "wrong"); inp.classList.add(ok ? "right" : "wrong");
      res.style.display = "block";
      res.innerHTML = ok ? '<span class="ok">✔ 正确</span>' : '<span class="no">✘ 与参考答案不完全一致</span>，可点“显示答案”核对。';
      cb.style.display = ok ? "none" : "flex";
      if (ok) { clearWrong(cid, q.id); } else { addWrong(cid, { id: q.id, type: "fill", q: q.q, correct: q.a, chosen: inp.value, cause: "", ts: Date.now() }); }
    };
    bChk.onclick = box._check;
    bShow.onclick = function () { det.open = true; };
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
      title = (kind === "short" ? "简答题 " : "论述/推导 ") + idx + "：" + esc(q.q);
      answerHTML = "<b>参考答案：</b><br>" + esc(kind === "calc" ? (q.steps || q.a) : q.a).replace(/\n/g, "<br>");
    }
    box.appendChild(el("p", "qq", title));
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
    var bOk = el("button", "ok", "✓ 我会（掌握）"), bNo = el("button", "no", "✗ 我不会");
    bar.appendChild(bOk); bar.appendChild(bNo); box.appendChild(bar);
    var cb = causeBox(cid, q.id); box.appendChild(cb);
    box.appendChild(hwBox(cid, q.id, kind !== "term"));

    function mark(state) {
      var store = selfStore(cid); var rec = store[q.id] || { ok: 0, miss: 0 };
      if (state === "ok") { rec.ok++; rec.miss = Math.max(0, rec.miss - 1); } else { rec.miss++; rec.ok = Math.max(0, rec.ok - 1); }
      rec.state = state; store[q.id] = rec; jset(skey(cid, "self"), store); touch(cid);
      bOk.classList.toggle("on", state === "ok"); bNo.classList.toggle("on", state === "no");
      cb.style.display = state === "no" ? "flex" : "none";
      if (state === "no") {
        addWrong(cid, { id: q.id, type: kind, q: (kind === "term" ? q.term : q.q), correct: (kind === "term" ? q.def : (kind === "calc" ? (q.a || q.steps) : q.a)), chosen: "(自评不会)", cause: "", ts: Date.now() });
      } else { clearWrong(cid, q.id); }
    }
    bOk.onclick = function () { mark("ok"); };
    bNo.onclick = function () { mark("no"); };
    var st = selfStore(cid)[q.id];
    if (st && st.state) { bOk.classList.toggle("on", st.state === "ok"); bNo.classList.toggle("on", st.state === "no"); if (st.state === "no") cb.style.display = "flex"; }
    return box;
  }

  /* ================= stats ================= */
  function chapterStats(cid, ch) {
    var seen = seenStore(cid);
    var totalSlides = 0; ch.modules.forEach(function (m) { totalSlides += m.slides.length; });
    var seenN = 0; ch.modules.forEach(function (m) { m.slides.forEach(function (s) { if (seen[cid + "_s" + m.i + "_" + s.i]) seenN++; }); });
    var mc = mcqStore(cid), fi = fillStore(cid), se = selfStore(cid);
    var ok = 0, miss = 0;
    [mc, judgeStore(cid), fi, se].forEach(function (st) { Object.keys(st).forEach(function (k) { ok += st[k].ok || 0; miss += st[k].miss || 0; }); });
    var wb = wrongList(cid);
    return { slides: totalSlides, seen: seenN, ok: ok, miss: miss, wrong: wb.length,
             rate: (ok + miss) ? Math.round(ok * 100 / (ok + miss)) : null };
  }

  function renderStats(cid, ch, host) {
    var s = chapterStats(cid, ch);
    host.innerHTML =
      '<h3 style="margin-top:0">📊 本章学习统计</h3>' +
      '<p><span class="pill">概念页 ' + s.seen + "/" + s.slides + '</span>' +
      '<span class="pill">答对 ' + s.ok + '</span>' +
      '<span class="pill">答错 ' + s.miss + '</span>' +
      '<span class="pill">正确率 ' + (s.rate == null ? "—" : s.rate + "%") + '</span>' +
      '<span class="pill">错题本 ' + s.wrong + " 题</span></p>";
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
      item.innerHTML = '<div class="wq">' + esc(e.q) + '<span class="pill">' + esc(e.type) + "</span>" +
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

  function printDoc(bodyHtml, title) {
    var html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + PRINT_CSS + '</style></head><body>' + bodyHtml + '</body></html>';
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

  /* ================= chapter page ================= */
  function renderChapter(cid) {
    var ch = window.CHAPTERS[cid];
    if (!ch) { document.getElementById("main").innerHTML = "<p>数据未加载。</p>"; return; }
    HW.init(cid);
    document.title = ch.title + " · 细胞生物学";
    var aside = document.getElementById("sidebar"), main = document.getElementById("main");
    aside.innerHTML = '<div class="ttl">' + esc(ch.title) + '</div><a href="index.html">← 返回首页</a><a href="glossary.html">📖 术语表</a>';
    aside.appendChild(el("div", "grp", "各模块（概念 + 考题）"));
    ch.modules.forEach(function (m) {
      var a = el("a", "", esc(m.name)); a.href = "#m" + m.i; aside.appendChild(a);
      var subs = [];
      if (m.mcq && m.mcq.length) subs.push(["m" + m.i + "-mcq", "选择题"]);
      if (m.judge && m.judge.length) subs.push(["m" + m.i + "-judge", "判断题"]);
      if (m.fill && m.fill.length) subs.push(["m" + m.i + "-fill", "填空题"]);
      if (m.short && m.short.length) subs.push(["m" + m.i + "-short", "简答题"]);
      if (m.calc && m.calc.length) subs.push(["m" + m.i + "-calc", "论述/推导"]);
      if (m.term && m.term.length) subs.push(["m" + m.i + "-term", "名词解释"]);
      subs.forEach(function (x) { var sa = el("a", "sub", "· " + x[1]); sa.href = "#" + x[0]; aside.appendChild(sa); });
    });
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
    function refreshProgress() { var s = chapterStats(cid, ch); pbar.firstChild.style.width = (s.slides ? Math.round(s.seen * 100 / s.slides) : 0) + "%"; ptxt.textContent = "概念页 " + s.seen + "/" + s.slides + " ｜ 错题 " + s.wrong; }

    // hero
    var hero = el("div", "hero");
    hero.innerHTML = "<h1>" + esc(ch.title) + '</h1><div class="tag">' + esc(ch.sub2 || "") + " ｜ 概念逐页 + 全题型练习 + 错题本 + 手写</div>";
    main.appendChild(hero);

    var statsbox = el("div", "statsbox"); statsbox.id = "statsbox"; renderStats(cid, ch, statsbox); main.appendChild(statsbox);

    // concept slides
    var seen = seenStore(cid);
    var animIO = window.IntersectionObserver ? new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { var f = en.target; if (!f.src) f.src = f.getAttribute("data-src"); animIO.unobserve(f); } });
    }, { rootMargin: "500px" }) : null;
    ch.modules.forEach(function (m) {
      var sec = el("section"); sec.id = "m" + m.i;
      sec.appendChild(el("h2", "", esc(m.name)));
      m.slides.forEach(function (s) {
        var key = cid + "_s" + m.i + "_" + s.i;
        var card = el("div", "slide"); card.id = "s_" + key;
        var lv = s.level || "掌握";
        var head = el("div", "sh");
        head.innerHTML = '<span class="t">' + esc(s.title) + '</span><span class="lv lv-' + esc(lv) + '">' + esc(lv) + "</span>";
        card.appendChild(head);
        var body = el("div", "body");
        var img = el("img"); img.src = s.img; img.loading = "lazy"; img.alt = s.title;
        img.onclick = function () { document.getElementById("lbimg").src = s.img; document.getElementById("lightbox").classList.add("on"); };
        body.appendChild(img);
        body.appendChild(el("div", "notes", esc(s.notes)));
        if (s.points && s.points.length) {
          var pb = el("div", "points");
          pb.innerHTML = '<div class="pt-h">📌 本页要点</div><ul>' +
            s.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
          body.appendChild(pb);
        }
        if (s.fig) {
          var fb = el("div", "fignote");
          fb.innerHTML = '<div class="fn-h">🔍 图注解读</div><p>' + esc(s.fig).replace(/\n/g, "<br>") + "</p>";
          body.appendChild(fb);
        }
        card.appendChild(body);
        if (s.anim) {
          var aw = el("div", "animwrap");
          aw.appendChild(el("div", "animhead", "🎬 动画演示（在老师原图下方）"));
          var ifr = document.createElement("iframe");
          ifr.className = "animframe"; ifr.loading = "lazy"; ifr.setAttribute("title", s.title);
          ifr.setAttribute("data-src", "anim/" + s.anim + ".html?embed=1&v=20260911f");
          aw.appendChild(ifr); card.appendChild(aw);
          if (animIO) animIO.observe(ifr); else ifr.src = ifr.getAttribute("data-src");
        }
        var db = el("button", "donebtn", seen[key] ? "✓ 已读" : "标记已读");
        if (seen[key]) { card.classList.add("done"); db.classList.add("on"); }
        db.onclick = function () {
          seen[key] = seen[key] ? 0 : 1; jset(skey(cid, "seen"), seen);
          card.classList.toggle("done", !!seen[key]); db.classList.toggle("on", !!seen[key]);
          db.textContent = seen[key] ? "✓ 已读" : "标记已读"; refreshProgress();
        };
        card.appendChild(db);
        sec.appendChild(card);
      });
      // 本模块考题：概念页后紧跟该模块的全部考题（选择/填空/简答/论述/名词）
      var qWrap = el("div", "modquiz");
      function qh(id, text) { var h = el("h3", "", text); h.id = id; return h; }
      if (m.mcq && m.mcq.length) {
        qWrap.appendChild(qh("m" + m.i + "-mcq", "📝 本模块考题 · 选择题（点选项即时判分）"));
        m.mcq.forEach(function (q, i) { qWrap.appendChild(renderMCQ(cid, q, i + 1)); });
      }
      if (m.judge && m.judge.length) {
        qWrap.appendChild(qh("m" + m.i + "-judge", "📝 本模块考题 · 判断题（点“对/错”即时判分）"));
        m.judge.forEach(function (q, i) { qWrap.appendChild(renderJudge(cid, q, i + 1)); });
      }
      if (m.fill && m.fill.length) {
        qWrap.appendChild(qh("m" + m.i + "-fill", "📝 本模块考题 · 填空题（输入答案，自动模糊判分）"));
        m.fill.forEach(function (q, i) { qWrap.appendChild(renderFill(cid, q, i + 1)); });
      }
      if (m.short && m.short.length) {
        qWrap.appendChild(qh("m" + m.i + "-short", "📝 本模块考题 · 简答题"));
        m.short.forEach(function (q, i) { qWrap.appendChild(renderSelf(cid, q, i + 1, "short")); });
      }
      if (m.calc && m.calc.length) {
        qWrap.appendChild(qh("m" + m.i + "-calc", "📝 本模块考题 · 论述 / 推导题"));
        m.calc.forEach(function (q, i) { qWrap.appendChild(renderSelf(cid, q, i + 1, "calc")); });
      }
      if (m.term && m.term.length) {
        qWrap.appendChild(qh("m" + m.i + "-term", "📝 本模块考题 · 名词解释（含踩分点）"));
        m.term.forEach(function (q, i) { qWrap.appendChild(renderSelf(cid, q, i + 1, "term")); });
      }
      if (qWrap.children.length) sec.appendChild(qWrap);
      main.appendChild(sec);
    });

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

  /* ================= glossary page ================= */
  function renderGlossary() {
    var data = window.GLOSSARY || [];
    var host = document.getElementById("glist");
    var chips = document.getElementById("gchips");
    var search = document.getElementById("gsearch");
    var cnt = document.getElementById("gcount");
    if (!host) return;
    if (cnt) cnt.textContent = data.length;
    var names = { ch01: "绪论", ch02: "质膜", ch03: "内膜系统", ch04: "蛋白质运输", ch05: "后翻译转运" };
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
      c.innerHTML =
        '<div class="row"><h2>' + esc(m.title) + '</h2><span class="badge">' + m.n_slides + " 页 · " + m.n_q + " 题</span></div>" +
        '<p class="topics">' + esc(m.sub2) + "</p>" +
        '<div class="prog"><i style="width:' + (s.slides ? Math.round(s.seen * 100 / s.slides) : 0) + '%"></i></div>' +
        '<p class="topics">概念已读 ' + s.seen + "/" + s.slides + " ｜ 正确率 " + (s.rate == null ? "—" : s.rate + "%") + " ｜ 错题 " + s.wrong + " 题</p>";
      var a = el("a", "go", "开始学习 →"); a.href = m.id + ".html"; c.appendChild(a);
      list.appendChild(c);
    });
    renderOverview();
    var bAll = document.getElementById("backupAll"), rAll = document.getElementById("restoreAll"), fAll = document.getElementById("fileAll");
    if (bAll) bAll.onclick = backupAll;
    var bExp = document.getElementById("exportAll");
    if (bExp) bExp.onclick = exportAllPDF;
    if (rAll && fAll) { rAll.onclick = function () { fAll.click(); }; fAll.onchange = function () { if (fAll.files[0]) restoreAll(fAll.files[0]); }; }
  }

  function renderOverview() {
    var host = document.getElementById("overview"); if (!host) return;
    var M = window.MANIFEST || [];
    var rows = "", tW = 0, tOK = 0, tMiss = 0, any = false;
    M.forEach(function (m) {
      var ch = window.CHAPTERS[m.id];
      var s = chapterStats(m.id, ch || { modules: [] });
      if (s.seen || s.ok || s.miss || s.wrong) any = true;
      tW += s.wrong; tOK += s.ok; tMiss += s.miss;
      rows += "<tr><td>" + esc(m.title) + "</td><td>" + s.seen + "/" + s.slides + "</td><td>" +
        (s.rate == null ? "—" : s.rate + "%") + "</td><td>" + s.wrong + "</td></tr>";
    });
    if (!any) { host.innerHTML = '<p class="empty">本设备还没有学习记录。打开任意一章开始学习，记录只存在这台设备。</p>'; return; }
    host.innerHTML = '<table class="tbl"><thead><tr><th>章节</th><th>概念已读</th><th>正确率</th><th>错题</th></tr></thead><tbody>' +
      rows + '<tr style="font-weight:700"><td>合计</td><td>—</td><td>' + ((tOK + tMiss) ? Math.round(tOK * 100 / (tOK + tMiss)) + "%" : "—") + "</td><td>" + tW + "</td></tr></tbody></table>";
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
    var total = 0;
    M.forEach(function (m) {
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
        item.innerHTML = '<div class="wq">' + esc(e.q) + '<span class="pill">' + esc(e.type) + "</span>" +
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

  /* ================= boot ================= */
  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.dataset.page;
    if (page === "chapter") renderChapter(document.body.dataset.ch);
    else if (page === "index") renderIndex();
    else if (page === "wrong") renderWrongPage();
    else if (page === "glossary") renderGlossary();
  });

  window.CELL = { backupAll: backupAll, restoreAll: restoreAll, exportChapterPDF: exportChapterPDF, exportAllPDF: exportAllPDF, buildChapterDoc: buildChapterDoc };
})();
