/* ============================================================================
   1919—1949 · 有些历史不该忘
   home.js —— 首页渲染：时间轴总览 / 三段式事件入口（学习路径已于 2026-09-22 下线）
   ---------------------------------------------------------------------------
   全部数据来自 data.js，避免在 HTML 里手写清单导致遗漏与死链。
   ========================================================================= */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     站内链接：统一走 site.js 的 SiteChrome.url()
     --------------------------------------------------------------------------
     ⚠ 2026-09-22 修。原先时间轴圆点与事件卡片直接输出 data.js 里的 e.file，
     不带构建号；而 workbuddy.host 的 CDN 对无查询参数的 HTML 路径会长时间
     命中旧副本 —— 首页点卡片会拿到上一版事件页。这里改为运行时取 SiteChrome，
     site.js 比本文件的 init 先执行完，取得到。
     -------------------------------------------------------------------------- */
  function url(u) {
    var sc = window.SiteChrome;
    return (sc && sc.url) ? sc.url(u) : u;
  }

  /* ==========================================================================
     一 · 时间轴总览
     ========================================================================== */

  function renderAxis() {
    var mount = document.getElementById('axis-ticks');
    if (!mount || !window.EVENTS) return;

    mount.innerHTML = window.EVENTS.map(function (e) {
      return '<a class="axis__tick axis__tick--' + e.stage + '" href="' + url(e.file) + '" ' +
        'title="' + e.title + ' · ' + e.date + '">' +
        '<span class="axis__dot" aria-hidden="true"></span>' +
        '<span class="axis__date">' + e.dateShort + '</span>' +
        '<span class="axis__name">' + e.title + '</span>' +
      '</a>';
    }).join('');
  }

  /* ==========================================================================
     二 · 事件卡片封面图（真实图片，2026-09-23 起）
     --------------------------------------------------------------------------
     ⚠ 2026-09-23 换图：首页 7 张事件卡封面由内联 SVG 版画换成真实图片。
     图片统一 1200×675（严格 16:9），与 .event-card__visual 的 aspect-ratio 一致，
     object-fit: cover 不裁切内容（若日后换图，必须仍按 16:9 出图）。
     路径经 SiteChrome.img() 附加构建号 —— 图片同样会踩 workbuddy.host 的
     路径级 CDN 缓存（2026-09-22 第13轮结论），不带版本号会出现"换了图还是旧的"。
     原内联 SVG 版画已下线，如需回退见 git 提交 e21231b。
     ========================================================================== */

  var COVERS = {
    wusi:      { src: 'img/cover-wusi.webp',      alt: '五四运动：学生汇聚天安门' },
    yida:      { src: 'img/cover-yida.webp',      alt: '中共一大：上海石库门与南湖红船' },
    nanchang:  { src: 'img/cover-nanchang.webp',  alt: '南昌起义：打响武装反抗第一枪' },
    '918':     { src: 'img/cover-918.webp',       alt: '九一八事变：东北沦陷' },
    '77':      { src: 'img/cover-77.webp',        alt: '七七事变：卢沟桥全民族抗战' },
    surrender: { src: 'img/cover-surrender.webp', alt: '日本投降：1945 年受降签字' },
    kaiguo:    { src: 'img/cover-kaiguo.webp',    alt: '开国大典：1949 年 10 月 1 日天安门' }
  };

  /* 封面图地址：走 SiteChrome.img() 带构建号；离线双击打开时退化为相对路径 */
  function coverSrc(p) {
    var sc = window.SiteChrome;
    return (sc && sc.img) ? sc.img(p) : 'assets/' + p;
  }


  /* ==========================================================================
     三 · 三段式事件入口
     ========================================================================== */

  function renderStages() {
    var mount = document.getElementById('stages-nav');
    if (!mount) return;

    mount.innerHTML = window.STAGES.map(function (st) {
      var items = window.SITE.eventsOfStage(st.key);
      var cards = items.map(function (e) {
        var cov = COVERS[e.id] || COVERS.wusi;
        return '<a class="event-card' + (e.grand ? ' event-card--grand' : '') + '" href="' + url(e.file) + '">' +
          '<div class="event-card__visual">' +
            '<img src="' + coverSrc(cov.src) + '" alt="' + cov.alt + '" ' +
              'width="1200" height="675" loading="lazy" decoding="async">' +
            '<span class="event-card__num">NO.' + pad(e.order) + '</span>' +
          '</div>' +
          '<div class="event-card__body">' +
            '<span class="event-card__date">' + e.date + '</span>' +
            '<h3 class="event-card__title">' + e.title + '</h3>' +
            '<p class="event-card__excerpt">' + e.excerpt + '</p>' +
            '<span class="event-card__go">进入事件页 →</span>' +
          '</div>' +
        '</a>';
      }).join('');

      return '<div class="stage-group stage-group--' + st.key + '">' +
        '<div class="stage-group__head">' +
          '<span class="stage-group__index">' + st.index + ' · ' + st.label + '</span>' +
          '<h3 class="stage-group__title">' + st.label + '：' + stageSubtitle(st.key) + '</h3>' +
          '<span class="stage-group__range">' + st.range + '</span>' +
        '</div>' +
        '<p class="stage-group__note">' + st.note + '</p>' +
        '<div class="event-cards">' + cards + '</div>' +
      '</div>';
    }).join('');
  }

  function stageSubtitle(key) {
    return { wake: '从思想先醒到政党诞生', fight: '从武装反抗到全民族抗战', found: '从抗战胜利到新中国成立' }[key] || '';
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ==========================================================================
     四 · 启动
     ========================================================================== */

  function init() {
    renderAxis();
    renderStages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
