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

  /* --------------------------------------------------------------------------
     构建号：给站内跳转统一带上 ?v=，用于绕开 CDN 的路径级旧缓存。
     --------------------------------------------------------------------------
     ⚠ 2026-09-22 立。原因：workbuddy.host 的 CDN 对「无查询参数」的 HTML 路径
     会长时间命中旧副本 —— 实测 04-jiuyiba.html 重新发布后，
     直接访问该路径仍返回旧版（15675 字节 / 16 条名词），
     而带任意 query（?x=1）即刻返回新版（19527 字节 / 6 条名词）。
     即：新文件确实已上传，是路径级缓存未失效。

     对策：站内所有跨页链接统一附加 BUILD 号。链接形态变化 → 缓存键变化 →
     用户总是拿到最新版。首页 `index.html` 是入口，靠外部链接直连，
     无法从这里控制，故同步在页面里给它加 query（见 index.html 的入口链接）。

     每次改动站点内容时把 BUILD 递增即可。
     -------------------------------------------------------------------------- */
  var BUILD = '20260923b';

  function withBuild(u) {
    if (!BUILD) return u;
    /* file:// 本地双击打开时不需要（也没有 CDN 缓存问题），保持干净 */
    if (/^file:/.test(window.location.protocol)) return u;
    if (u.indexOf('//') !== -1) return u;
    return u + (u.indexOf('?') === -1 ? '?' : '&') + 'v=' + BUILD;
  }

  function url(eventFile) {
    /* eventFile 形如 'events/01-wusi.html'；首页恒为 'index.html'
       规则：
         在 events/ 子目录下 → 事件页去掉 'events/' 前缀，首页回退到 '../index.html'
         在站点根目录下     → 事件页补上 'events/' 前缀，首页保持 'index.html' */
    var isHome = (eventFile === 'index.html' || eventFile === './index.html');

    if (inEventsDir) {
      if (isHome) return withBuild('../index.html');
      if (eventFile.indexOf('events/') === 0) return withBuild(eventFile.slice('events/'.length));
      return withBuild(eventFile);
    }

    if (isHome) return withBuild('index.html');
    if (eventFile.indexOf('events/') !== 0) return withBuild('events/' + eventFile);
    return withBuild(eventFile);
  }

  function asset(p) {
    return (inEventsDir ? '../' : '') + 'assets/' + p;
  }

  /* 图片资源：assets/ 路径 + 构建号
     ----------------------------------------------------------------------
     ⚠ 2026-09-23 新增。图片和 CSS/JS 一样会踩 CDN 的**路径级缓存**：
     换了 assets/img/xxx.webp 的内容但文件名不变，裸路径会长时间命中旧图，
     表现为"图换了但页面还是旧的"。所以图片引用一律走这里。
     bump_build.py 只处理 HTML 里的 css/js 引用，图片靠 BUILD 运行时拼接。 */
  function img(p) {
    return withBuild(asset(p));
  }

  /* 当前事件 id：由页面 <body data-event="wusi"> 声明 */
  var currentId = document.body.getAttribute('data-event') || '';

  /* ------------------------------------------------------------------------
     0. 跨页跳转的滚动位置归零
     ----------------------------------------------------------------------
     ⚠ 2026-09-21 修 bug：从首页点进 01-06 事件页时，页面会停在中间而不是顶部。
     实测：首页滚到 y=3000 → 进入 01-wusi 后 scrollY=751。

     根因：浏览器 history.scrollRestoration 默认为 'auto'，同源导航（含
     前后退）时会把上一个文档的滚动位置延续给新文档。本站是「长首页 → 长事件页」
     的结构，延续过来的偏移量落在事件页中部，看起来就是"一进来就在中间"。

     解法：'manual' 关掉浏览器自动恢复，再显式归零。
     例外：URL 带 #hash 时说明用户是冲着某个锚点来的，交给浏览器/锚点逻辑处理。
     ---------------------------------------------------------------------- */

  function resetScrollOnEnter() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    /* 带锚点进入 → 尊重锚点，不强行归零 */
    if (window.location.hash && window.location.hash.length > 1) return;

    window.scrollTo(0, 0);
    /* 部分浏览器在 load 后才应用滚动恢复，补两次确保生效 */
    if (document.readyState !== 'complete') {
      window.addEventListener('load', function () { window.scrollTo(0, 0); }, { once: true });
    }
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }

  /* ------------------------------------------------------------------------
     1. 渲染全站导航栏
     ---------------------------------------------------------------------- */

  function buildNav() {
    var mount = document.getElementById('site-nav');
    if (!mount) return;

    var links = window.EVENTS.map(function (e) {
      var cls = (e.id === currentId) ? ' class="is-current"' : '';
      var name = e.navTitle || e.title;    /* 导航条可用短名，见 data.js 的 navTitle */
      return '<a href="' + url(e.file) + '"' + cls + ' title="' + e.title + ' · ' + e.date + '">'
           + name + '</a>';
    }).join('');

    var homeCls = (currentId === '') ? ' class="is-current"' : '';

    /* 卷首语入口：只有存在 #intro 浮层（即首页）时才给。
       ⚠ 2026-09-22 波哥要求：把进入网页时那段卷首语做成导航条上的常驻入口，
       方便随时回看。点击后由 intro.js 的 IntroChrome.replay() 重新播一遍。 */
    var introLink = document.getElementById('intro')
      ? '<a href="#" data-intro-replay="1">卷首语</a>'
      : '';

    mount.className = 'site-nav';
    mount.innerHTML =
      '<div class="site-nav__inner">' +
        '<a class="site-nav__brand" href="' + url('index.html') + '">' +
          '<span class="brand-mark">1919—1949</span>' +
          '<span>' + S.title + '</span>' +
        '</a>' +
        '<nav class="site-nav__links" aria-label="关键事件导航">' +
          '<a href="' + url('index.html') + '"' + homeCls + '>首页</a>' +
          introLink +
          links +
        '</nav>' +
        '<button class="site-nav__toggle" type="button" aria-label="展开导航菜单" ' +
          'aria-expanded="false" aria-controls="site-nav-drawer">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>' +
      '<div class="site-nav__drawer" id="site-nav-drawer"></div>';

    /* ---- 移动端抽屉 ----
       ⚠ 2026-09-22 第12轮 波哥要求简化（原版带阶段标题 + 日期在前，太复杂）：
         · 只保留 9 个入口：首页 / 卷首语 / 七个事件
         · 去掉「壹 · 觉醒 1919—1921」这类阶段标题，阶段之间只靠间距 + 一条细线区分
         · 日期改成 19190504 这种年月日编号，小字号挂在文字右边
       PC 端导航条（.site-nav__links）不受影响。 */
    function ymd(e) {
      /* '1919年5月4日' / '1919.5.4' → '19190504' */
      var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(e.date || '') ||
              /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(e.dateShort || '');
      if (!m) return '';
      return m[1] + ('0' + m[2]).slice(-2) + ('0' + m[3]).slice(-2);
    }

    var drawer = document.getElementById('site-nav-drawer');

    function drawerLink(href, name, date, isCurrent, extraAttr) {
      var cls = 'drawer-link' + (isCurrent ? ' is-current' : '');
      return '<a class="' + cls + '" href="' + href + '"' + (extraAttr || '') + '>' +
        '<span class="drawer-name">' + name + '</span>' +
        (date ? '<span class="drawer-date">' + date + '</span>' : '') +
      '</a>';
    }

    var html = '<div class="drawer-group">' +
      drawerLink(url('index.html'), '首页', '', currentId === '', '') +
      (introLink ? drawerLink('#', '卷首语', '', false, ' data-intro-replay="1"') : '') +
      '</div>';

    window.STAGES.forEach(function (st) {
      var items = window.SITE.eventsOfStage(st.key);
      if (!items.length) return;
      html += '<div class="drawer-group">' +
        items.map(function (e) {
          return drawerLink(url(e.file), e.navTitle || e.title, ymd(e), e.id === currentId, '');
        }).join('') +
        '</div>';
    });
    drawer.innerHTML = html;

    /* 卷首语重放 */
    mount.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('[data-intro-replay]') : null;
      if (!a || !mount.contains(a)) return;
      ev.preventDefault();
      drawer.classList.remove('is-open');
      if (window.IntroChrome && window.IntroChrome.replay) window.IntroChrome.replay();
    });

    /* 汉堡按钮 */
    var toggle = mount.querySelector('.site-nav__toggle');
    toggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '收起导航菜单' : '展开导航菜单');
    });

    /* 点击抽屉内链接后自动收起。
       ⚠ 用 closest('a')：抽屉链接里现在还有 <span> 子节点，
       直接判 ev.target.tagName 会点中 span 而不收起。 */
    drawer.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('a') : null;
      if (a && drawer.contains(a)) {
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

  /* 把页面里手写的站内直链补上构建号（目前只有首页那句「从第一个事件开始读」）。
     这些链接不走 url()，必须单独处理，否则首页这个入口会一直落在 CDN 旧缓存上。 */
  function applyBuildToStaticLinks() {
    if (!BUILD || /^file:/.test(window.location.protocol)) return;
    var links = document.querySelectorAll('a[data-buildlink]');
    Array.prototype.forEach.call(links, function (a) {
      var h = a.getAttribute('href');
      if (!h || h.indexOf('//') !== -1 || h.charAt(0) === '#') return;
      a.setAttribute('href', withBuild(h));
    });
  }

  function init() {
    resetScrollOnEnter();
    buildNav();
    buildPager();
    initSectionScrollSpy();
    initAnchorOffset();
    applyBuildToStaticLinks();
    fillFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 供事件页按需使用 */
  window.SiteChrome = { url: url, asset: asset, img: img, build: BUILD, inEventsDir: inEventsDir };
})();
