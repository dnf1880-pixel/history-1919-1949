/* ============================================================================
   1919—1949 · 有些历史不该忘
   interact.js —— 轻量互动组件（事件页共用）
   ---------------------------------------------------------------------------
   两个组件，都对应明确的探究问题，不是装饰性点击：

     1. Locator 时间轴定位器（点选式）
        探究问题：「这件事在整个 1919—1949 的链条上处于什么位置？」
        学生点选站点，画面同步给出该时点的状态描述，建立时序感。

     2. Quiz 随堂小测
        探究问题：「你是否真的理解了这件事的因果关系？」
        单选，逐题判定，答对/答错均给出解析，可重做。
   ========================================================================= */

(function () {
  'use strict';

  /* ==========================================================================
     组件一 · 时间轴定位器（点选式，不用拖拽）
     ----------------------------------------------------------------------
     设计取舍：原生 range 滑块在移动端命中区小、精度差、很难停在想要的刻度上，
     对"教学演示"这个场景是反人性的。改为：
       · 一排可点选的刻度圆点 + 当前项的完整标签，点哪儿跳哪儿
       · 左右两个大按钮（≥44px 触控靶）做上一步/下一步
       · 键盘 ← → 同样可操作，带 role="radiogroup" 语义
     用法：<div class="locator" data-locator="wusi"></div>
     数据：window.LOCATORS = { wusi: { prompt, stops: [{ date, dateShort?, text, current? }] } }
     ========================================================================== */

  function initLocators() {
    var data = window.LOCATORS || {};
    var hosts = document.querySelectorAll('[data-locator]');
    if (!hosts.length) return;

    Array.prototype.forEach.call(hosts, function (host) {
      var key = host.getAttribute('data-locator');
      var cfg = data[key];
      if (!cfg || !cfg.stops || cfg.stops.length < 2) return;

      var stops = cfg.stops;
      var last = stops.length - 1;

      /* 默认落在关键帧（current:true），没有就落第一个 */
      var startAt = 0;
      stops.forEach(function (s, i) { if (s.current) startAt = i; });

      /* 短标签：优先用 dateShort，退化为取日期里最靠前的 "数字.数字" 片段 */
      function shortOf(s) {
        if (s.dateShort) return s.dateShort;
        var m = String(s.date).match(/(\d{4})\s*年(?:\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?)?/);
        if (!m) return String(s.date);
        return m[1] + (m[2] ? '.' + m[2] : '') + (m[3] ? '.' + m[3] : '');
      }

      /* ---- 结构 ---- */
      var dots = stops.map(function (s, i) {
        return '<button type="button" role="radio" aria-checked="false" ' +
          'class="locator__dot' + (s.current ? ' is-key' : '') + '" ' +
          'style="--i:' + i + '" data-i="' + i + '" ' +
          'aria-label="第 ' + (i + 1) + ' 站：' + s.date + '">' +
          '<span class="locator__dot-mark" aria-hidden="true"></span>' +
          '<span class="locator__dot-label">' + shortOf(s) + '</span>' +
        '</button>';
      }).join('');

      host.innerHTML =
        (cfg.prompt ? '<p class="locator__prompt">' + cfg.prompt + '</p>' : '') +
        '<div class="locator__head">' +
          '<span class="locator__count"><b class="locator__now">' + (startAt + 1) + '</b>' +
            '<i>/' + stops.length + '</i></span>' +
          '<span class="locator__hint">点圆点跳转 · 左右方向键逐站推进</span>' +
        '</div>' +
        '<div class="locator__rail" role="radiogroup" aria-label="时间轴站点">' +
          '<div class="locator__rail-line" aria-hidden="true"></div>' +
          '<div class="locator__rail-fill" aria-hidden="true"></div>' +
          dots +
        '</div>' +
        '<div class="locator__readout">' +
          '<div class="locator__date"></div>' +
          '<div class="locator__text"></div>' +
        '</div>';

      var dotEls = host.querySelectorAll('.locator__dot');
      var fillEl = host.querySelector('.locator__rail-fill');
      var nowEl = host.querySelector('.locator__now');
      var dateEl = host.querySelector('.locator__date');
      var textEl = host.querySelector('.locator__text');
      var readoutEl = host.querySelector('.locator__readout');
      var idx = startAt;

      function render(animate) {
        var s = stops[idx];
        var pct = last === 0 ? 0 : (idx / last) * 100;

        fillEl.style.width = pct + '%';
        nowEl.textContent = idx + 1;
        dateEl.textContent = s.date;
        textEl.textContent = s.text;

        Array.prototype.forEach.call(dotEls, function (d, i) {
          var on = i === idx;
          d.classList.toggle('is-active', on);
          d.setAttribute('aria-checked', on ? 'true' : 'false');
          /* 已走过的站点标记为 seen，视觉上形成"进度" */
          d.classList.toggle('is-seen', i <= idx);
          /* radiogroup 键盘可达性：只有当前项可 Tab 进入 */
          d.setAttribute('tabindex', on ? '0' : '-1');
        });

        /* 切换时给读出一段轻微的淡入，提示内容已更新 */
        if (animate) {
          readoutEl.classList.remove('is-swap');
          /* 强制重排以重启动画 */
          void readoutEl.offsetWidth;
          readoutEl.classList.add('is-swap');
        }
      }

      function goTo(i, animate) {
        var n = Math.max(0, Math.min(last, i));
        if (n === idx && animate) return;
        idx = n;
        render(animate);
        /* 让当前圆点始终在可视区内（站点多时横向可滚） */
        var d = dotEls[idx];
        if (d && d.scrollIntoView) {
          d.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }

      /* 点圆点直接跳转 */
      Array.prototype.forEach.call(dotEls, function (d) {
        d.addEventListener('click', function () {
          goTo(parseInt(d.getAttribute('data-i'), 10), true);
          d.focus();
        });
      });

      /* 键盘：← → 在圆点组内移动（方向键语义符合 radiogroup 习惯）
         ⚠ 2026-09-21：上一站/下一站按钮已按波哥要求取消，
         方向键成为唯一的逐站推进方式，因此把监听挂到整套圆点上而非 host，
         并在焦点转入时直接落到当前站点。 */
      Array.prototype.forEach.call(dotEls, function (d) {
        d.addEventListener('keydown', function (ev) {
          if (ev.key === 'ArrowLeft')  { ev.preventDefault(); goTo(idx - 1, true); dotEls[idx].focus(); }
          if (ev.key === 'ArrowRight') { ev.preventDefault(); goTo(idx + 1, true); dotEls[idx].focus(); }
          if (ev.key === 'Home')       { ev.preventDefault(); goTo(0, true); dotEls[0].focus(); }
          if (ev.key === 'End')        { ev.preventDefault(); goTo(last, true); dotEls[last].focus(); }
        });
      });

      render(false);
    });
  }

  /* ==========================================================================
     组件二 · 随堂小测
     用法：<div class="quiz" data-quiz="wusi"></div>
     数据：window.QUIZZES = { wusi: { intro, questions: [...] } }
     ========================================================================== */

  function initQuizzes() {
    var data = window.QUIZZES || {};
    var hosts = document.querySelectorAll('[data-quiz]');
    if (!hosts.length) return;

    Array.prototype.forEach.call(hosts, function (host) {
      var key = host.getAttribute('data-quiz');
      var cfg = data[key];
      if (!cfg || !cfg.questions || !cfg.questions.length) return;

      var qs = cfg.questions;

      /* ---- 结构：题干 + 选项 ---- */
      var html = '';
      if (cfg.intro) html += '<p class="quiz__intro">' + cfg.intro + '</p>';

      qs.forEach(function (q, qi) {
        html += '<div class="quiz__q" data-q="' + qi + '">';
        html += '<p class="quiz__stem"><span class="quiz__idx">' + pad(qi + 1) + '</span><span>' + q.stem + '</span></p>';
        html += '<div class="quiz__opts">';
        q.options.forEach(function (op, oi) {
          html += '<label class="quiz__opt" data-o="' + oi + '">' +
            '<input type="radio" name="' + key + '-q' + qi + '" value="' + oi + '" />' +
            '<span>' + op + '</span>' +
          '</label>';
        });
        html += '</div>';
        html += '<div class="quiz__feedback" hidden></div>';
        html += '</div>';
      });

      html += '<div class="quiz__actions">' +
        '<button type="button" class="btn-primary" data-act="submit">' +
          '<span>提交答案</span><span class="btn-arrow">→</span>' +
        '</button>' +
        '<button type="button" class="btn-ghost" data-act="reset">重做</button>' +
        '<span class="quiz__score" aria-live="polite"></span>' +
      '</div>';

      host.innerHTML = html;

      var submitBtn = host.querySelector('[data-act="submit"]');
      var resetBtn = host.querySelector('[data-act="reset"]');
      var scoreEl = host.querySelector('.quiz__score');
      var locked = false;

      /* ---- 选项点击即时反馈 ---- */
      host.addEventListener('change', function (ev) {
        if (locked) return;
        var input = ev.target;
        if (!input || input.type !== 'radio') return;
        var qEl = input.closest('.quiz__q');
        if (!qEl) return;
        var qi = parseInt(qEl.getAttribute('data-q'), 10);
        var q = qs[qi];
        /* 点击后锁定该题，立即判定 */
        lockQuestion(qEl, q, input.value);
      });

      function lockQuestion(qEl, q, chosen) {
        var opts = qEl.querySelectorAll('.quiz__opt');
        Array.prototype.forEach.call(opts, function (op, oi) {
          var inp = op.querySelector('input');
          inp.disabled = true;
          op.classList.add('is-locked');
          if (oi === q.answer) op.classList.add('is-correct');
          if (String(oi) === String(chosen) && oi !== q.answer) op.classList.add('is-wrong');
        });
        showFeedback(qEl, q, String(chosen) === String(q.answer), chosen);
        if (window.Sound) window.Sound.bell(String(chosen) === String(q.answer));
      }

      function showFeedback(qEl, q, ok, chosen) {
        var fb = qEl.querySelector('.quiz__feedback');
        var head = ok ? '✓ 答对了' : '✕ 再想一想';
        var body = q.explanation || '';
        if (!ok && q.wrongHint) body = q.wrongHint + ' ' + body;
        fb.className = 'quiz__feedback ' + (ok ? 'is-correct' : 'is-wrong');
        fb.innerHTML = '<span class="fb-head">' + head + '</span>' + body;
        fb.hidden = false;
        fb.classList.add('fade-in');
      }

      /* ---- 提交：统计得分（已答的题保留判定） ---- */
      submitBtn.addEventListener('click', function () {
        if (locked) return;
        var answered = 0, correct = 0;
        qs.forEach(function (q, qi) {
          var qEl = host.querySelector('.quiz__q[data-q="' + qi + '"]');
          var checked = qEl.querySelector('input:checked');
          if (!checked) return;
          answered++;
          if (String(checked.value) === String(q.answer)) correct++;

          /* 未锁定的题（理论上不会出现，保险起见）补判定 */
          if (!qEl.querySelector('.quiz__opt.is-locked')) {
            lockQuestion(qEl, q, checked.value);
          }
        });

        if (answered < qs.length) {
          scoreEl.textContent = '还有 ' + (qs.length - answered) + ' 题未作答（已答 ' + answered + ' 题，对 ' + correct + ' 题）';
          return;
        }

        locked = true;
        submitBtn.disabled = true;
        scoreEl.textContent = '得分 ' + correct + ' / ' + qs.length;
      });

      /* ---- 重做 ---- */
      resetBtn.addEventListener('click', function () {
        locked = false;
        submitBtn.disabled = false;
        scoreEl.textContent = '';
        Array.prototype.forEach.call(host.querySelectorAll('.quiz__q'), function (qEl) {
          var opts = qEl.querySelectorAll('.quiz__opt');
          Array.prototype.forEach.call(opts, function (op) {
            op.className = 'quiz__opt';
            var inp = op.querySelector('input');
            inp.disabled = false;
            inp.checked = false;
          });
          var fb = qEl.querySelector('.quiz__feedback');
          fb.hidden = true;
          fb.className = 'quiz__feedback';
          fb.innerHTML = '';
        });
        host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ==========================================================================
     启动
     ========================================================================== */

  function init() {
    initLocators();
    initQuizzes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
