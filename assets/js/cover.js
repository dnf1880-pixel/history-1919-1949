/* ============================================================================
   1919—1949 · 有些历史不该忘
   cover.js —— 封面页的动态质感（粒子 + 流光）
   ---------------------------------------------------------------------------
   原则：动态只服务于「氛围」，不承载信息。
         · 粒子缓慢上浮，像旧纸页间的浮尘 / 星火
         · 数量有限（≤ 60），帧率无关，尊重 prefers-reduced-motion
   封面与卷首语都复用这一套氛围，视觉语言统一。
   ========================================================================= */

(function () {
  'use strict';

  var canvas = document.getElementById('cover-dust');
  if (!canvas) return;

  /* 尊重用户的"减少动态效果"偏好 */
  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var parts = [];
  var rafId = null;
  var t0 = 0;

  /* 粒子配色：朱砂、暖金、宣纸白 */
  var COLORS = [
    { r: 214, g: 92,  b: 58,  a: 0.85 },   /* 朱砂（提亮，保证在深场上可见） */
    { r: 226, g: 168, b: 88,  a: 0.78 },   /* 暖金 */
    { r: 246, g: 238, b: 214, a: 0.72 },   /* 宣纸白 */
    { r: 190, g: 108, b: 72,  a: 0.68 }    /* 赭石 */
  ];

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    /* 元素还处于 hidden 时尺寸为 0 —— 此时不量，等可见后再量 */
    if (w < 2 || h < 2) return false;
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    return true;
  }

  function seed() {
    /* 粒子数量随面积走，但设上限，避免大屏耗性能 */
    var n = Math.round(Math.min(96, (W * H) / 15000));
    n = Math.max(30, n);
    parts = [];
    for (var i = 0; i < n; i++) parts.push(makeParticle(true));
  }

  function makeParticle(anywhere) {
    var c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * W,
      /* anywhere=true 时从整屏随机起始，否则从底部之外升起 */
      y: anywhere ? Math.random() * H : H + Math.random() * 60,
      r: 0.7 + Math.random() * 2.1,
      vy: -(0.10 + Math.random() * 0.32),        /* 缓慢上浮 */
      vx: (Math.random() - 0.5) * 0.16,          /* 轻微横向漂移 */
      wob: Math.random() * Math.PI * 2,          /* 摆动相位 */
      wobSpd: 0.004 + Math.random() * 0.010,
      col: c,
      tw: Math.random() * Math.PI * 2,           /* 闪烁相位 */
      twSpd: 0.008 + Math.random() * 0.020
    };
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];

      p.wob += p.wobSpd * dt;
      p.tw += p.twSpd * dt;
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(p.wob) * 0.18;

      /* 出界回收：从底部重新升起 */
      if (p.y < -12 || p.x < -20 || p.x > W + 20) {
        parts[i] = makeParticle(false);
        continue;
      }

      var twinkle = 0.55 + 0.45 * Math.sin(p.tw);
      var alpha = p.col.a * twinkle;

      /* 光晕 */
      var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grd.addColorStop(0, 'rgba(' + p.col.r + ',' + p.col.g + ',' + p.col.b + ',' + (alpha * 0.9) + ')');
      grd.addColorStop(1, 'rgba(' + p.col.r + ',' + p.col.g + ',' + p.col.b + ',0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();

      /* 核心亮点 */
      ctx.fillStyle = 'rgba(' + p.col.r + ',' + p.col.g + ',' + p.col.b + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  var last = 0;
  function loop(ts) {
    if (!last) last = ts;
    /* 归一化到 60fps 的"帧当量"，保证不同刷新率下速度一致 */
    var dt = Math.min(3, (ts - last) / 16.667);
    last = ts;
    draw(dt);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId) return;
    /* 尺寸还没量到（封面仍隐藏）就先等等 */
    if ((W < 2 || H < 2) && !resize()) {
      setTimeout(function () {
        if (!document.getElementById('cover').hidden) start();
      }, 120);
      return;
    }
    if (reduce) { draw(1); return; }   /* 只画一帧静态的，不做动画 */
    last = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* 窗口尺寸变化：重算画布 */
  var rtimer = null;
  window.addEventListener('resize', function () {
    if (rtimer) clearTimeout(rtimer);
    rtimer = setTimeout(resize, 180);
  });

  /* 页面不可见时暂停，省电 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!document.getElementById('cover').hidden) start();
  });

  /* 封面开始淡出即停止动画（省资源）；封面由隐藏变可见时启动 */
  var coverEl = document.getElementById('cover');
  if (coverEl) {
    var ob = new MutationObserver(function () {
      if (coverEl.classList.contains('is-gone') || coverEl.hidden) {
        stop();
      } else {
        /* 变为可见：此时才有真实尺寸，重新量并启动 */
        if (resize()) start();
      }
    });
    ob.observe(coverEl, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  /* 启动：封面若已经可见就立刻跑，否则等 MutationObserver 唤醒 */
  if (coverEl && !coverEl.hidden) {
    if (resize()) start();
  }
})();
