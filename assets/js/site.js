/* ============================================================================
   1919—1949 · 有些历史不该忘
   site.js —— 全站公共组件：导航栏 / 上下篇切换 / 章节高亮 / 移动端菜单
   ---------------------------------------------------------------------------
   所有页面共用。数据来自 data.js，无需在各个 html 里手写导航，
   从根本上杜绝"新增事件后导航死链"的问题。
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SITE;
  if (!S) return;

  /* 判断当前是否在 events/ 子目录下，用于拼相对路径 */
  var inEventsDir = /\/events\//.test(window.location.pathname) ||
                    /^file:/.test(window.location.protocol) && /events[\\/]/.test(decodeURIComponent(window.location.pathname));

  function url(eventFile) {
    /* eventFile 形如 'events/01-wusi.html'；首页恒为 'index.html'
       规则：
         在 events/ 子目录下 → 事件页去掉 'events/' 前缀，首页回退到 '../index.html'
         在站点根目录下     → 事件页补上 'events/' 前缀，首页保持 'index.html' */
    var isHome = (eventFile === 'index.html' || eventFile === './index.html');

    if (inEventsDir) {
      if (isHome) return '../index.html';
      if (eventFile.indexOf('events/') === 0) return eventFile.slice('events/'.length);
      return eventFile;
    }

    if (isHome) return 'index.html';
    if (eventFile.indexOf('events/') !== 0) return 'events/' + eventFile;
    return eventFile;
  }

  function asset(p) {
    return (inEventsDir ? '../' : '') + 'assets/' + p;
  }

  /* 当前事件 id：由页面 <body data-event="wusi"> 声明 */
  var currentId = document.body.getAttribute('data-event') || '';

  /* ------------------------------------------------------------------------
     1. 渲染全站导航栏
     ---------------------------------------------------------------------- */

  function buildNav() {
    var mount = document.getElementById('site-nav');
    if (!mount) return;

    var links = window.EVENTS.map(function (e) {
      var cls = (e.id === currentId) ? ' class="is-current"' : '';
      return '<a href="' + url(e.file) + '"' + cls + ' title="' + e.title + ' · ' + e.date + '">'
           + e.title + '</a>';
    }).join('');

    var homeCls = (currentId === '') ? ' class="is-current"' : '';

    mount.className = 'site-nav';
    mount.innerHTML =
      '<div class="site-nav__inner">' +
        '<a class="site-nav__brand" href="' + url('index.html') + '">' +
          '<span class="brand-mark">1919—1949</span>' +
          '<span>' + S.title + '</span>' +
        '</a>' +
        '<nav class="site-nav__links" aria-label="关键事件导航">' +
          '<a href="' + url('index.html') + '"' + homeCls + '>首页</a>' +
          links +
        '</nav>' +
        '<button class="site-nav__toggle" type="button" aria-label="展开导航菜单" ' +
          'aria-expanded="false" aria-controls="site-nav-drawer">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
      '<div class="site-nav__drawer" id="site-nav-drawer"></div>';

    /* 移动端菜单内容：按三阶段分组 */
    var drawer = document.getElementById('site-nav-drawer');
    var html = '<div class="drawer-group">' +
      '<div class="drawer-label">首页</div>' +
      '<a href="' + url('index.html') + '"' + homeCls + '>' + S.title + '</a>' +
      '</div>';

    window.STAGES.forEach(function (st) {
      var items = window.SITE.eventsOfStage(st.key);
      if (!items.length) return;
      html += '<div class="drawer-group">' +
        '<div class="drawer-label">' + st.index + ' · ' + st.label + ' ' + st.range + '</div>' +
        items.map(function (e) {
          var cls = (e.id === currentId) ? ' class="is-current"' : '';
          return '<a href="' + url(e.file) + '"' + cls + '>' + e.dateShort + ' · ' + e.title + '</a>';
        }).join('') +
        '</div>';
    });
    drawer.innerHTML = html;

    /* 汉堡按钮 */
    var toggle = mount.querySelector('.site-nav__toggle');
    toggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '收起导航菜单' : '展开导航菜单');
    });

    /* 点击抽屉内链接后自动收起 */
    drawer.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'A') {
        drawer.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    /* 点击外部收起 */
    document.addEventListener('click', function (ev) {
      if (!drawer.classList.contains('is-open')) return;
      if (mount.contains(ev.target)) return;
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });

    /* Esc 收起 */
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && drawer.classList.contains('is-open')) {
        drawer.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     2. 渲染上一事件 / 下一事件切换
     ---------------------------------------------------------------------- */

  function buildPager() {
    var mount = document.getElementById('event-pager');
    if (!mount || !currentId) return;

    var nb = S.getNeighbors(currentId);

    function cell(e, dir, isNext) {
      if (!e) {
        return '<div class="pager__item--disabled' + (isNext ? ' pager__item--next' : '') + '">' +
          '<span class="pager__dir">' + dir + '</span>' +
          '<span class="pager__title">' + (isNext ? '已是最后一个事件' : '已是第一个事件') + '</span>' +
        '</div>';
      }
      return '<a class="pager__item' + (isNext ? ' pager__item--next' : '') + '" href="' + url(e.file) + '">' +
        '<span class="pager__dir">' + dir + '</span>' +
        '<span class="pager__title">' + e.title + '</span>' +
        '<span class="pager__date">' + e.dateShort + ' · 第 ' + e.order + ' 个关键事件</span>' +
      '</a>';
    }

    mount.className = 'pager';
    mount.innerHTML =
      '<div class="pager__inner">' +
        cell(nb.prev, '◂ 上一个关键事件', false) +
        cell(nb.next, '下一个关键事件 ▸', true) +
        '<div class="pager__home">' +
          '<a class="btn-ghost" href="' + url('index.html') + '">返回首页 · 时间轴总览</a>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------------
     3. 章节锚点高亮（事件页内）
     ---------------------------------------------------------------------- */

  function initSectionScrollSpy() {
    var bar = document.querySelector('.page-sections');
    if (!bar) return;
    var links = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    var targets = links.map(function (a) {
      var id = a.getAttribute('href').slice(1);
      return document.getElementById(id);
    });

    var navH = 58 + 42 + 8;   /* 两级 sticky 高度 */

    function onScroll() {
      var y = window.scrollY + navH + 24;
      var active = 0;
      targets.forEach(function (t, i) {
        if (t && t.offsetTop <= y) active = i;
      });
      links.forEach(function (a, i) {
        a.classList.toggle('is-current', i === active);
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });

    onScroll();
  }

  /* ------------------------------------------------------------------------
     4. 平滑滚动到锚点（补偿 sticky 高度，避免标题被遮住）
     ---------------------------------------------------------------------- */

  function initAnchorOffset() {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      ev.preventDefault();

      var offset = 58 + 42 + 12;
      var top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });

      /* 更新地址栏但不触发跳转 */
      if (history.replaceState) history.replaceState(null, '', '#' + id);

      el.setAttribute('tabindex', '-1');
      setTimeout(function () { el.focus({ preventScroll: true }); }, 320);
    });
  }

  /* ------------------------------------------------------------------------
     5. 页脚年份
     ---------------------------------------------------------------------- */

  function fillFooter() {
    var el = document.getElementById('footer-range');
    if (el) el.textContent = S.yearRange;
  }

  /* ------------------------------------------------------------------------
     启动
     ---------------------------------------------------------------------- */

  function init() {
    buildNav();
    buildPager();
    initSectionScrollSpy();
    initAnchorOffset();
    fillFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 供事件页按需使用 */
  window.SiteChrome = { url: url, asset: asset, inEventsDir: inEventsDir };
})();
