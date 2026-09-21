/* ============================================================================
   1919—1949 · 有些历史不该忘
   flipbook.js —— 「事件经过」翻书动效组件
   ---------------------------------------------------------------------------
   探究问题：「这件事是怎么一步一步发生的？」
   ---------------------------------------------------------------------------
   设计取舍：
     · 把原来摊平的长段落 + 时间轴定位器，合并成一册可翻的「史册」
     · 左侧是配图（油画），右侧是这一页的时间、地点与叙述
     · 翻页用 3D 翻转 + 阴影，模拟真实翻书的手感
     · 页脚有页码指示与「上一页 / 下一页」，移动端上下堆叠、按钮变大

   用法：
     <div class="flipbook" data-flipbook="wusi"></div>

   数据契约（window.FLIPBOOKS）：
     {
       key: {
         title:   '长卷标题',
         prompt:  '引导语',
         pages: [
           {
             date:    '1919 年 5 月 4 日',
             dateShort: '05.04',          // 可选，页码条上的短标签
             place:   '北京 · 天安门',
             title:   '天安门前 · 八字惊雷',
             text:    '这一页的叙述……',
             note:    '可选：一句史料旁注',
             img:     '../assets/img/p01-wusi-jihui.webp',
             alt:     '图片描述（无障碍）',
             credit:  '示意图 · 依据史料复原'
           }, ...
         ]
       }
     }
   ========================================================================= */

(function () {
  'use strict';

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initFlipbooks() {
    var data = window.FLIPBOOKS || {};
    var hosts = document.querySelectorAll('[data-flipbook]');
    if (!hosts.length) return;

    Array.prototype.forEach.call(hosts, function (host) {
      var key = host.getAttribute('data-flipbook');
      var cfg = data[key];
      if (!cfg || !cfg.pages || cfg.pages.length < 2) return;

      var pages = cfg.pages;
      var last = pages.length - 1;
      var idx = 0;
      var animating = false;

      /* ---- 构建骨架 ---- */
      var tabs = pages.map(function (p, i) {
        return '<button type="button" class="flipbook__tab" role="tab" aria-selected="false" ' +
          'data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 页：' + esc(p.date) + '">' +
          '<span class="flipbook__tab-num">' + ('0' + (i + 1)).slice(-2) + '</span>' +
          '<span class="flipbook__tab-date">' + esc(p.dateShort || p.date) + '</span>' +
        '</button>';
      }).join('');

      host.innerHTML =
        '<div class="flipbook__head">' +
          (cfg.prompt ? '<p class="flipbook__prompt">' + cfg.prompt + '</p>' : '') +
          '<div class="flipbook__meta">' +
            '<span class="flipbook__title">' + esc(cfg.title || '事件经过') + '</span>' +
            '<span class="flipbook__count">' +
              '<b class="flipbook__now">1</b><i>/' + pages.length + '</i>' +
            '</span>' +
          '</div>' +
        '</div>' +

        '<div class="flipbook__stage" role="tablist" aria-label="事件经过分页">' +
          '<div class="flipbook__book">' +
            '<article class="flipbook__page" data-side="recto"></article>' +
          '</div>' +
          '<div class="flipbook__tabs" role="tablist">' + tabs + '</div>' +
        '</div>' +

        '<div class="flipbook__nav">' +
          '<button type="button" class="flipbook__step" data-step="-1">' +
            '<span class="flipbook__chev" aria-hidden="true">◂</span>上一页' +
          '</button>' +
          '<span class="flipbook__hint">点上方页签直接跳页 · 或用左右按钮翻页</span>' +
          '<button type="button" class="flipbook__step flipbook__step--next" data-step="1">' +
            '下一页<span class="flipbook__chev" aria-hidden="true">▸</span>' +
          '</button>' +
        '</div>';

      var pageEl = host.querySelector('.flipbook__page');
      var bookEl = host.querySelector('.flipbook__book');
      var nowEl = host.querySelector('.flipbook__now');
      var tabEls = host.querySelectorAll('.flipbook__tab');
      var prevBtn = host.querySelector('[data-step="-1"]');
      var nextBtn = host.querySelector('[data-step="1"]');

      /* ---- 渲染某一页的内容 ---- */
      function renderPage(i) {
        var p = pages[i];
        /* 没有配图时整页走文字单栏（不留空列，版式不塌） */
        pageEl.classList.toggle('is-textonly', !p.img);
        pageEl.innerHTML =
          (p.img
            ? '<figure class="flipbook__figure">' +
                '<img class="flipbook__img" src="' + esc(p.img) + '" alt="' + esc(p.alt || p.title || '') + '" loading="lazy" />' +
                (p.credit ? '<figcaption class="flipbook__credit">' + esc(p.credit) + '</figcaption>' : '') +
              '</figure>'
            : '') +
          '<div class="flipbook__body">' +
            '<div class="flipbook__stamp">' +
              (p.date ? '<span class="flipbook__date">' + esc(p.date) + '</span>' : '') +
              (p.place ? '<span class="flipbook__place">' + esc(p.place) + '</span>' : '') +
            '</div>' +
            (p.title ? '<h3 class="flipbook__pagetitle">' + esc(p.title) + '</h3>' : '') +
            '<p class="flipbook__text">' + p.text + '</p>' +
            (p.note ? '<p class="flipbook__note">' + p.note + '</p>' : '') +
          '</div>';
      }

      /* ---- 同步状态（页码、页签、按钮） ---- */
      function syncState() {
        nowEl.textContent = idx + 1;
        Array.prototype.forEach.call(tabEls, function (t, i) {
          var on = i === idx;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.classList.toggle('is-seen', i <= idx);
        });
        prevBtn.disabled = idx === 0;
        nextBtn.disabled = idx === last;
        /* 当前页签滚动到可视区 */
        var t = tabEls[idx];
        if (t && t.scrollIntoView) {
          try { t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (e) {}
        }
      }

      /* ---- 翻页 ---- */
      function goTo(i, dir) {
        if (animating) return;
        var n = Math.max(0, Math.min(last, i));
        if (n === idx) return;

        var forward = (typeof dir === 'number') ? dir > 0 : n > idx;

        if (reduce) {
          idx = n;
          renderPage(idx);
          syncState();
          return;
        }

        animating = true;
        /* 翻页动画：当前页向翻动方向轻微倒伏 → 换内容 → 从另一侧立起 */
        bookEl.classList.add(forward ? 'is-flipping-next' : 'is-flipping-prev');

        setTimeout(function () {
          idx = n;
          renderPage(idx);
          syncState();
          bookEl.classList.remove('is-flipping-next', 'is-flipping-prev');
          bookEl.classList.add(forward ? 'is-landing-next' : 'is-landing-prev');
          setTimeout(function () {
            bookEl.classList.remove('is-landing-next', 'is-landing-prev');
            animating = false;
          }, 300);
        }, 280);
      }

      /* ---- 事件绑定 ---- */
      Array.prototype.forEach.call(tabEls, function (t) {
        t.addEventListener('click', function () {
          goTo(parseInt(t.getAttribute('data-i'), 10));
        });
      });

      Array.prototype.forEach.call(host.querySelectorAll('.flipbook__step'), function (btn) {
        btn.addEventListener('click', function () {
          goTo(idx + parseInt(btn.getAttribute('data-step'), 10));
        });
      });

      /* 键盘：← → 翻页（焦点在书本区域内时） */
      host.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); goTo(idx - 1, -1); }
        if (ev.key === 'ArrowRight') { ev.preventDefault(); goTo(idx + 1, 1); }
      });

      /* 触屏左右滑动翻页 */
      var tx = 0, ty = 0, tracking = false;
      bookEl.addEventListener('touchstart', function (ev) {
        if (!ev.touches || ev.touches.length !== 1) return;
        tx = ev.touches[0].clientX;
        ty = ev.touches[0].clientY;
        tracking = true;
      }, { passive: true });
      bookEl.addEventListener('touchend', function (ev) {
        if (!tracking) return;
        tracking = false;
        var t = (ev.changedTouches && ev.changedTouches[0]) || null;
        if (!t) return;
        var dx = t.clientX - tx;
        var dy = t.clientY - ty;
        /* 横向位移足够大、且明显大于纵向，才算翻页手势 */
        if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          goTo(idx + (dx < 0 ? 1 : -1));
        }
      }, { passive: true });

      /* ---- 首次渲染 ---- */
      renderPage(0);
      syncState();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlipbooks);
  } else {
    initFlipbooks();
  }
})();
