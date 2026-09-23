/* ============================================================================
   版本自愈（2026-09-23）
   ----------------------------------------------------------------------------
   要解决的问题
     上游 EdgeOne 会缓存 HTML，且**重新部署不失效该缓存** → 裸地址（不带 ?v=）
     长期返回旧副本。用户从分享链接/书签/微信打开时，看到的是过期页面，
     而且这种"旧"是 CDN 层的，页面内代码无法自我纠正。

   本脚本的做法
     仅当**不带 ?v= 进入**时（= 可能命中旧缓存），探测一次最新构建号；
     若线上已经更新 → 自动 replace 到带新版本号的地址。
     用户无需手动加尾巴，地址栏会平滑落在最新版上。

   边界与安全
     · 仅在本页存在 <meta name="site-build"> 时生效 —— 更早的页面没有该标记，
       不会被误伤（它们连自己是什么版本都无从判断，只能靠 CDN/本地缓存过期）。
     · sessionStorage 记一次，避免"探测→跳转→再探测"的死循环。
     · file:// 双击打开时完全跳过。
     · 探测走 build.json + 随机 query：该 URL 每次都是新的 → 必回源，不会读到缓存。

   配套
     assets/build.json 由 bump_build.py 与 site.js 的 BUILD 同步维护。
   ========================================================================= */
(function () {
  'use strict';

  if (/^file:/.test(window.location.protocol)) return;
  /* 已带版本号 → 说明拿到的是最新入口，不必探测（避免无谓请求） */
  if (/[?&]v=/.test(window.location.search)) return;

  var meta = document.querySelector('meta[name="site-build"]');
  var mine = meta && meta.getAttribute('content');
  if (!mine) return;                    /* 旧版页面：无从判断，跳过 */

  var KEY = 'wb-build-healed';
  try {
    if (sessionStorage.getItem(KEY) === mine) return;   /* 本会话已纠正过 */
  } catch (e) { /* 隐私模式等，继续但不记 */ }

  /* 用页面里 base.css 的 href 反推 assets/ 前缀 —— 首页是 'assets/'，
     事件页是 '../assets/'，两种层级都自动适配，无需绝对路径。 */
  var link = document.querySelector('link[href*="assets/css/base.css"]');
  var base = link
    ? link.getAttribute('href').replace(/css\/base\.css.*$/, '')
    : 'assets/';

  var probe = new XMLHttpRequest();
  probe.open('GET', base + 'build.json?t=' + Date.now(), true);
  probe.onload = function () {
    var latest = '';
    try { latest = (JSON.parse(probe.responseText) || {}).build || ''; } catch (e) {}
    if (!latest || latest === mine) return;             /* 已是最新 */
    try { sessionStorage.setItem(KEY, latest); } catch (e) {}
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('v', latest);
      window.location.replace(u.toString());
    } catch (e) { /* URL 构造失败则安静放弃 */ }
  };
  try { probe.send(); } catch (e) { /* 网络异常静默 */ }
})();
