/* ============================================================================
   1919—1949 · 有些历史不该忘
   intro.js —— 封面页 + 沉浸式卷首语
   ---------------------------------------------------------------------------
   流程（三段式）：

     壹 · 封面（#cover）
          静态封面：标题、年份、一句引子，背景有流动的粒子与光带。
          用户点击「开启历史画卷」→ 这是用户手势，可解锁 WebAudio。

     贰 · 卷首语（#intro）
          一条一条地"逐字打印"。每打印完一条，整条淡出，再打下一条。
          （不是一路堆叠到屏幕满；屏幕上同一时刻只有一条。）

     叁 · 结束
          出现「进入展馆」按钮，点击后幕布上移，露出正式页面。

   一句话说明：不是「长文滚动」，而是「一句一句，说完就走」。
   ========================================================================= */

(function () {
  'use strict';

  var cover = document.getElementById('cover');
  var overlay = document.getElementById('intro');
  if (!overlay) return;

  var startBtn = document.getElementById('cover-start');

  var lineWrap = document.getElementById('intro-lines');
  var caretEl = document.getElementById('intro-caret');
  var enterWrap = document.getElementById('intro-enter');
  var skipBtn = document.getElementById('intro-skip');
  var progEl = document.getElementById('intro-progress-bar');

  var paragraphs = window.PREFACE || [];

  /* ---- 打字速度（毫秒/字） ---- */
  var SPEED = 78;          /* 每字间隔 */
  var PUNCT_PAUSE = 210;   /* 句末标点额外停顿 */
  var LINE_HOLD = 1250;    /* 一条打完后的停留时长（然后淡出） */
  var LINE_FADE = 620;     /* 淡出动画时长，需与 CSS 保持一致 */
  var FIRST_DELAY = 420;   /* 进入卷首语后的首字延迟 */

  /* 每条对应一个"历史节点"，用于打字音色与节奏 */
  var idx = 0;             /* 当前第几条 */
  var charIdx = 0;         /* 当前条内第几字 */
  var timer = null;
  var skipped = false;
  var finished = false;
  var lineEl = null;       /* 当前正在打印的行元素 */

  /* ---- 进度条：按「条」推进，而不是按字 ---- */
  function updateProgress() {
    if (!progEl) return;
    var total = paragraphs.length || 1;
    var pct = ((idx - 1) / total) * 100;
    if (idx >= total && finished) pct = 100;
    progEl.style.width = Math.max(0, Math.min(100, pct)).toFixed(2) + '%';
  }

  /* ---- 每字的停顿时长 ---- */
  function delayFor(ch) {
    if ('。！？'.indexOf(ch) !== -1) return SPEED + PUNCT_PAUSE + 120;
    if ('，、；：'.indexOf(ch) !== -1) return SPEED + PUNCT_PAUSE * 0.55;
    if ('「」\u201C\u201D\u2018\u2019《》'.indexOf(ch) !== -1) return SPEED * 0.5;
    return SPEED;
  }

  /* ---- 创建一条新行 ---- */
  function makeLine() {
    var wrap = document.createElement('div');
    wrap.className = 'intro-line-wrap';
    var p = document.createElement('span');
    p.className = 'intro-line';
    wrap.appendChild(p);
    /* 光标内联在文字之后，随打字一起右移 */
    if (caretEl) wrap.appendChild(caretEl);
    if (lineWrap) lineWrap.appendChild(wrap);
    p._wrap = wrap;
    return p;
  }

  /* ---- 打印一条中的下一个字 ---- */
  function typeChar() {
    if (skipped) return;

    /* 所有条都已打完 */
    if (idx >= paragraphs.length) {
      finishTyping();
      return;
    }

    var text = paragraphs[idx];

    /* 本条尚未开始：先建行 */
    if (!lineEl) {
      lineEl = makeLine();
      charIdx = 0;
      /* 段落起首给一次轻一点的泛音，作为"起句"提示 */
      if (window.Sound) window.Sound.typeSoft();
    }

    /* 本条已打完：停留 → 淡出 → 打下一条 */
    if (charIdx >= text.length) {
      timer = setTimeout(fadeOutLine, LINE_HOLD);
      return;
    }

    var ch = text.charAt(charIdx);
    charIdx++;

    /* 用追加文本节点的方式，避免 innerText 反复重排 */
    lineEl.appendChild(document.createTextNode(ch));

    if (window.Sound && ch !== ' ' && ch !== '\u3000') {
      /* 标点用轻击，文字用正常击键声——更接近真实打字机 */
      if ('。！？，、；：「」\u201C\u201D《》'.indexOf(ch) !== -1) {
        window.Sound.typeSoft();
      } else {
        window.Sound.type();
      }
    }

    if (charIdx === 1) updateProgress();

    timer = setTimeout(typeChar, delayFor(ch));
  }

  /* ---- 本条淡出，然后进入下一条 ---- */
  function fadeOutLine() {
    if (skipped) return;
    if (!lineEl) { typeChar(); return; }

    var el = lineEl;
    var wrap = el._wrap || el.parentNode;
    if (wrap && wrap.classList) wrap.classList.add('is-out');

    setTimeout(function () {
      /* 淡出后从 DOM 移除，保证屏幕上同一时刻只有一条 */
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      lineEl = null;
      charIdx = 0;
      idx++;
      updateProgress();

      if (idx >= paragraphs.length) {
        finishTyping();
      } else {
        /* 条与条之间留一次呼吸的空档 */
        timer = setTimeout(typeChar, 340);
      }
    }, LINE_FADE);
  }

  /* ---- 打字结束 ---- */
  function finishTyping() {
    if (finished) return;
    finished = true;
    if (caretEl) caretEl.classList.add('is-hidden');
    if (progEl) progEl.style.width = '100%';
    if (enterWrap) enterWrap.hidden = false;
    if (skipBtn) skipBtn.hidden = true;
    /* 收束：一声悠长的泛音，把情绪沉下来 */
    if (window.Sound) window.Sound.chime(110);
  }

  /* ---- 跳过：直接进入结束态 ---- */
  function skip() {
    skipped = true;
    if (timer) clearTimeout(timer);
    /* 清掉所有行，只留最后一条作为收束 */
    if (lineWrap) lineWrap.innerHTML = '';
    lineEl = null;
    if (lineWrap && paragraphs.length) {
      var p = makeLine();
      p.textContent = paragraphs[paragraphs.length - 1];
      if (caretEl) caretEl.classList.add('is-hidden');
    }
    idx = paragraphs.length;
    charIdx = 0;
    finishTyping();
    if (enterWrap) enterWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---- 进入正式页面 ---- */
  function enter() {
    if (window.Sound) {
      window.Sound.stopAnthem();
      window.Sound.stopVoice();
    }
    overlay.classList.add('is-done');
    document.body.classList.remove('intro-locked');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}

    /* 幕布落下后把焦点交给主内容，便于键盘用户 */
    setTimeout(function () {
      var main = document.getElementById('main-content');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }, 950);

    /* 允许从地址栏 #anchor 进入时定位 */
    if (window.location.hash) {
      var el = document.getElementById(window.location.hash.slice(1));
      if (el) {
        setTimeout(function () {
          var top = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }, 1000);
      }
    }
  }

  /* ========================================================================
     封面 → 卷首语 的启动
     ====================================================================== */

  var started = false;

  function startScroll() {
    if (started) return;
    started = true;

    /* 用户手势：解锁音频，开启声音（封面按钮即"开启历史画卷"，
       语义上等同于"我要听这个故事"，因此直接开声） */
    if (window.Sound) {
      window.Sound.unlock();
      window.Sound.setMuted(false);
      window.Sound.chime(146.83);       /* D3 庄严泛音 */
      setTimeout(function () { window.Sound.swell(); }, 420);
    }

    /* 封面淡出 */
    if (cover) {
      cover.classList.add('is-gone');
      setTimeout(function () {
        cover.hidden = true;
        cover.classList.add('is-hidden');
      }, 900);
    }

    /* 卷首语登场 */
    overlay.classList.add('is-active');
    setTimeout(function () {
      updateProgress();
      if (caretEl) caretEl.classList.remove('is-hidden');
      timer = setTimeout(typeChar, FIRST_DELAY);
    }, 900);
  }

  if (startBtn) startBtn.addEventListener('click', startScroll);

  /* 若封面不存在（例如从其他页返回、或旧版本缓存），直接启动卷首语 */
  if (!cover) {
    started = true;
    overlay.classList.add('is-active');
    if (window.Sound) window.Sound.unlock();
    updateProgress();
    timer = setTimeout(typeChar, FIRST_DELAY);
  }

  /* ---- 跳过 / 进入 ---- */
  if (skipBtn) skipBtn.addEventListener('click', skip);
  if (enterWrap) {
    var enterBtn = enterWrap.querySelector('button');
    if (enterBtn) enterBtn.addEventListener('click', enter);
  }

  /* ---- 键盘 ---- */
  document.addEventListener('keydown', function (ev) {
    /* 封面阶段：回车/Space 直接开启画卷 */
    if (cover && !cover.hidden && !started) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        startScroll();
      }
      return;
    }
    if (overlay.classList.contains('is-done')) return;
    if (ev.key === 'Escape') { skip(); return; }
    if (ev.key === 'Enter' && finished) { enter(); }
  });

  /* ========================================================================
     启动判定
     ====================================================================== */

  function boot() {
    /* 若本次会话已看过开场、或带 hash 定位进入，直接跳过整个开场 */
    var seen = false;
    try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}

    if (seen || window.location.hash) {
      if (cover) { cover.hidden = true; cover.classList.add('is-hidden'); }
      overlay.classList.add('is-done', 'is-active');
      if (lineWrap) {
        lineWrap.innerHTML = '';
        if (paragraphs.length) {
          var p = makeLine();
          p.textContent = paragraphs[paragraphs.length - 1];
          p.classList.add('is-static');
          if (caretEl) caretEl.classList.add('is-hidden');
        }
      }
      if (caretEl) caretEl.classList.add('is-hidden');
      if (enterWrap) enterWrap.hidden = false;
      if (skipBtn) skipBtn.hidden = true;
      if (progEl) progEl.style.width = '100%';
      return;
    }

    /* 正常开场：锁滚动，显示封面，等用户点击 */
    document.body.classList.add('intro-locked');
    if (cover) cover.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
