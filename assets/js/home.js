/* ============================================================================
   1919—1949 · 有些历史不该忘
   home.js —— 首页渲染：时间轴总览 / 三段式事件入口 / 学习路径
   ---------------------------------------------------------------------------
   全部数据来自 data.js，避免在 HTML 里手写清单导致遗漏与死链。
   ========================================================================= */

(function () {
  'use strict';

  /* ==========================================================================
     一 · 时间轴总览
     ========================================================================== */

  function renderAxis() {
    var mount = document.getElementById('axis-ticks');
    if (!mount || !window.EVENTS) return;

    mount.innerHTML = window.EVENTS.map(function (e) {
      return '<a class="axis__tick axis__tick--' + e.stage + '" href="' + e.file + '" ' +
        'title="' + e.title + ' · ' + e.date + '">' +
        '<span class="axis__dot" aria-hidden="true"></span>' +
        '<span class="axis__date">' + e.dateShort + '</span>' +
        '<span class="axis__name">' + e.title + '</span>' +
      '</a>';
    }).join('');
  }

  /* ==========================================================================
     二 · 事件卡片视觉（内联 SVG 版画，纯代码不依赖图片，保证离线可用）
     每张图按事件语义定制，风格统一：赭红/靛青/墨色 + 网点纹理
     ========================================================================== */

  var VISUALS = {
    /* 五四：天安门 + 人群旗帜 */
    wusi: {
      bg: '#E8DCC4', accent: '#B33A1E', ink: '#2A211A',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="五四运动：学生汇聚天安门">' +
        '<rect width="320" height="180" fill="#E8DCC4"/>' +
        /* 天空光晕 */
        '<circle cx="160" cy="62" r="58" fill="#D9C9A8" opacity=".7"/>' +
        /* 城楼剪影 */
        '<g fill="#2A211A" opacity=".88">' +
        '<rect x="34" y="80" width="252" height="34"/>' +
        '<path d="M26 80 L294 80 L280 68 L40 68 Z"/>' +
        '<rect x="64" y="56" width="192" height="14"/>' +
        '<path d="M56 56 L264 56 L250 46 L70 46 Z"/>' +
        '<rect x="96" y="36" width="128" height="12"/>' +
        '<path d="M88 36 L232 36 L220 28 L100 28 Z"/>' +
        '</g>' +
        /* 券门 */
        '<path d="M144 114 L144 96 A16 16 0 0 1 176 96 L176 114 Z" fill="#E8DCC4" opacity=".8"/>' +
        /* 人群（前排剪影） */
        '<g fill="#2A211A">' +
        '<circle cx="42" cy="128" r="6"/><rect x="38" y="134" width="8" height="20" opacity=".9"/>' +
        '<circle cx="66" cy="124" r="7"/><rect x="61" y="131" width="10" height="24" opacity=".9"/>' +
        '<circle cx="94" cy="128" r="6"/><rect x="90" y="134" width="8" height="22" opacity=".9"/>' +
        '<circle cx="120" cy="122" r="7"/><rect x="115" y="129" width="10" height="26" opacity=".9"/>' +
        '<circle cx="150" cy="127" r="6"/><rect x="146" y="133" width="8" height="22" opacity=".9"/>' +
        '<circle cx="178" cy="121" r="7"/><rect x="173" y="128" width="10" height="27" opacity=".9"/>' +
        '<circle cx="206" cy="127" r="6"/><rect x="202" y="133" width="8" height="22" opacity=".9"/>' +
        '<circle cx="234" cy="124" r="7"/><rect x="229" y="131" width="10" height="24" opacity=".9"/>' +
        '<circle cx="260" cy="128" r="6"/><rect x="256" y="134" width="8" height="21" opacity=".9"/>' +
        '<circle cx="286" cy="126" r="6"/><rect x="282" y="132" width="8" height="23" opacity=".9"/>' +
        '</g>' +
        /* 旗帜 */
        '<g fill="#B33A1E">' +
        '<rect x="112" y="72" width="2" height="52"/>' +
        '<path d="M114 72 L142 78 L114 86 Z"/>' +
        '<rect x="196" y="66" width="2" height="58"/>' +
        '<path d="M198 66 L228 73 L198 82 Z"/>' +
        '</g>' +
        /* 网点纹理 */
        '<g fill="#2A211A" opacity=".14">' +
        dotRow(0, 160, 320, 4) +
        '</g>' +
        '</svg>'
    },

    /* 中共成立：石库门 + 南湖船 */
    yida: {
      bg: '#E4DAC4', accent: '#B33A1E', ink: '#2A211A',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="中国共产党成立：上海石库门与嘉兴南湖游船">' +
        '<rect width="320" height="180" fill="#E4DAC4"/>' +
        '<circle cx="96" cy="58" r="46" fill="#D6C5A3" opacity=".75"/>' +
        /* 石库门建筑 */
        '<g fill="#2A211A" opacity=".9">' +
        '<rect x="24" y="60" width="150" height="76"/>' +
        '<path d="M18 60 L180 60 L170 50 L28 50 Z"/>' +
        '<rect x="54" y="44" width="90" height="8"/>' +
        '</g>' +
        /* 门洞与窗 */
        '<path d="M80 136 L80 100 A18 18 0 0 1 116 100 L116 136 Z" fill="#E4DAC4"/>' +
        '<g fill="#E4DAC4" opacity=".72">' +
        '<rect x="38" y="76" width="22" height="20"/><rect x="134" y="76" width="22" height="20"/>' +
        '<rect x="38" y="108" width="22" height="20"/><rect x="134" y="108" width="22" height="20"/>' +
        '</g>' +
        /* 水面 */
        '<rect x="0" y="136" width="320" height="44" fill="#2C4A5E" opacity=".82"/>' +
        /* 游船 */
        '<g fill="#2A211A">' +
        '<path d="M186 152 L300 152 L288 164 L198 164 Z"/>' +
        '<rect x="238" y="126" width="2" height="26"/>' +
        '<path d="M240 126 L240 148 L262 148 Z" fill="#B33A1E"/>' +
        '<path d="M236 126 L236 148 L214 148 Z"/>' +
        '<rect x="210" y="148" width="76" height="4"/>' +
        '</g>' +
        /* 水波 */
        '<g stroke="#E4DAC4" stroke-width="1.2" opacity=".55" fill="none">' +
        '<path d="M8 168 Q28 162 48 168 T88 168"/>' +
        '<path d="M104 174 Q124 168 144 174 T184 174"/>' +
        '<path d="M196 168 Q216 162 236 168 T276 168"/>' +
        '</g>' +
        '<g fill="#2A211A" opacity=".14">' + dotRow(0, 12, 320, 4) + '</g>' +
        '</svg>'
    },

    /* 南昌起义：城头 + 枪焰 */
    nanchang: {
      bg: '#D9DCD8', accent: '#2C4A5E', ink: '#1E2529',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="南昌起义：凌晨城头的一声枪响">' +
        '<rect width="320" height="180" fill="#D9DCD8"/>' +
        '<circle cx="248" cy="44" r="26" fill="#BFC7C4" opacity=".85"/>' +
        /* 城墙 */
        '<g fill="#1E2529" opacity=".9">' +
        '<rect x="0" y="94" width="320" height="86"/>' +
        '<path d="M0 94 L14 82 L28 94 L42 82 L56 94 L70 82 L84 94 L98 82 L112 94 L126 82 L140 94 L154 82 L168 94 L182 82 L196 94 L210 82 L224 94 L238 82 L252 94 L266 82 L280 94 L294 82 L308 94 L320 86 L320 94 Z"/>' +
        '</g>' +
        /* 城楼门洞 */
        '<path d="M132 180 L132 138 A28 28 0 0 1 188 138 L188 180 Z" fill="#D9DCD8" opacity=".72"/>' +
        /* 枪焰：同心星芒 */
        '<g fill="#B33A1E">' +
        '<path d="M76 44 L84 60 L100 56 L88 70 L100 84 L82 78 L76 96 L70 78 L52 84 L64 70 L52 56 L68 60 Z" opacity=".95"/>' +
        '<circle cx="76" cy="70" r="9" fill="#FFD166"/>' +
        '</g>' +
        /* 士兵剪影 */
        '<g fill="#1E2529">' +
        '<circle cx="216" cy="122" r="7"/><rect x="211" y="130" width="11" height="26"/>' +
        '<rect x="203" y="112" width="28" height="4" transform="rotate(-24 217 114)"/>' +
        '<circle cx="252" cy="126" r="7"/><rect x="247" y="134" width="11" height="24"/>' +
        '<rect x="239" y="116" width="28" height="4" transform="rotate(-20 253 118)"/>' +
        '<circle cx="288" cy="130" r="7"/><rect x="283" y="138" width="11" height="22"/>' +
        '</g>' +
        /* 硝烟 */
        '<g fill="#1E2529" opacity=".18">' +
        '<circle cx="62" cy="36" r="16"/><circle cx="86" cy="26" r="13"/><circle cx="44" cy="24" r="12"/>' +
        '</g>' +
        '<g fill="#1E2529" opacity=".14">' + dotRow(0, 160, 320, 4) + '</g>' +
        '</svg>'
    },

    /* 九一八：铁轨断裂 + 夜色 */
    '918': {
      bg: '#25292B', accent: '#C05A24', ink: '#3A3F42',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="九一八事变：柳条湖附近被炸断的铁路">' +
        '<rect width="320" height="180" fill="#25292B"/>' +
        '<circle cx="252" cy="36" r="20" fill="#3A3F42"/>' +
        /* 地面 */
        '<rect x="0" y="120" width="320" height="60" fill="#1A1E20"/>' +
        /* 枕木 */
        '<g fill="#4A4B44">' +
        '<rect x="6" y="126" width="34" height="7"/><rect x="56" y="128" width="34" height="7"/>' +
        '<rect x="106" y="130" width="34" height="7"/><rect x="156" y="132" width="34" height="7"/>' +
        '<rect x="216" y="134" width="34" height="7"/><rect x="266" y="136" width="34" height="7"/>' +
        '</g>' +
        /* 钢轨（左段正常，右段被炸断翘起） */
        '<g stroke="#8E8B7E" stroke-width="4" fill="none" stroke-linecap="round">' +
        '<path d="M0 132 L150 138"/>' +
        '<path d="M154 140 L186 150"/>' +
        '<path d="M196 138 L240 132 L320 128"/>' +
        '<path d="M0 146 L150 152"/>' +
        '<path d="M154 154 L184 164"/>' +
        '<path d="M196 152 L240 146 L320 142"/>' +
        '</g>' +
        /* 爆炸火光 */
        '<g>' +
        '<circle cx="172" cy="146" r="26" fill="#C05A24" opacity=".55"/>' +
        '<circle cx="172" cy="146" r="14" fill="#FFD166" opacity=".85"/>' +
        '<path d="M172 108 L178 128 L198 122 L184 140 L204 148 L180 152 L186 172 L170 156 L156 174 L160 150 L136 152 L154 138 L136 124 L158 128 Z" fill="#C05A24" opacity=".8"/>' +
        '</g>' +
        /* 硝烟柱 */
        '<g fill="#5A5F62" opacity=".28">' +
        '<circle cx="170" cy="94" r="22"/><circle cx="152" cy="66" r="18"/><circle cx="186" cy="52" r="14"/>' +
        '</g>' +
        /* 北大营方向建筑剪影 */
        '<g fill="#111416" opacity=".9">' +
        '<rect x="0" y="86" width="72" height="38"/>' +
        '<path d="M0 86 L72 86 L64 78 L8 78 Z"/>' +
        '<rect x="256" y="92" width="64" height="32"/>' +
        '</g>' +
        '</svg>'
    },

    /* 七七事变：卢沟桥石狮与桥拱 */
    '77': {
      bg: '#E2D8C0', accent: '#B33A1E', ink: '#2A211A',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="七七事变：卢沟桥与石狮">' +
        '<rect width="320" height="180" fill="#E2D8C0"/>' +
        '<circle cx="70" cy="46" r="34" fill="#D3C09C" opacity=".7"/>' +
        /* 桥面 */
        '<rect x="0" y="86" width="320" height="12" fill="#2A211A" opacity=".9"/>' +
        /* 桥栏 */
        '<rect x="0" y="76" width="320" height="5" fill="#2A211A" opacity=".75"/>' +
        /* 三个桥拱 */
        '<g fill="#2A211A" opacity=".92">' +
        '<path d="M22 98 L22 132 A34 34 0 0 1 90 132 L90 98 Z"/>' +
        '<path d="M118 98 L118 136 A42 42 0 0 1 202 136 L202 98 Z"/>' +
        '<path d="M230 98 L230 132 A34 34 0 0 1 298 132 L298 98 Z"/>' +
        '</g>' +
        /* 桥墩 */
        '<g fill="#2A211A" opacity=".9">' +
        '<rect x="98" y="98" width="16" height="82"/><rect x="206" y="98" width="16" height="82"/>' +
        '</g>' +
        /* 水面 */
        '<rect x="0" y="150" width="320" height="30" fill="#2A211A" opacity=".72"/>' +
        /* 石狮（三只，桥栏上） */
        '<g fill="#2A211A">' +
        '<path d="M40 76 L40 66 Q40 58 48 58 Q56 58 56 66 L56 76 Z"/>' +
        '<circle cx="48" cy="54" r="6"/>' +
        '<path d="M42 50 Q48 44 54 50"/>' +
        '<path d="M152 76 L152 64 Q152 55 161 55 Q170 55 170 64 L170 76 Z"/>' +
        '<circle cx="161" cy="51" r="7"/>' +
        '<path d="M154 46 Q161 39 168 46"/>' +
        '<path d="M256 76 L256 66 Q256 58 264 58 Q272 58 272 66 L272 76 Z"/>' +
        '<circle cx="264" cy="54" r="6"/>' +
        '<path d="M258 50 Q264 44 270 50"/>' +
        '</g>' +
        /* 硝烟（远处） */
        '<g fill="#2A211A" opacity=".16">' +
        '<circle cx="292" cy="52" r="18"/><circle cx="274" cy="32" r="13"/>' +
        '</g>' +
        /* 水纹 */
        '<g stroke="#E2D8C0" stroke-width="1.2" opacity=".5" fill="none">' +
        '<path d="M24 162 Q44 156 64 162 T104 162"/>' +
        '<path d="M120 170 Q140 164 160 170 T200 170"/>' +
        '<path d="M216 162 Q236 156 256 162 T296 162"/>' +
        '</g>' +
        '<g fill="#2A211A" opacity=".13">' + dotRow(0, 8, 320, 4) + '</g>' +
        '</svg>'
    },

    /* 日本投降：降书 + 签字台 */
    surrender: {
      bg: '#DCE0D8', accent: '#5C7C4F', ink: '#242A26',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="日本投降：投降书签字仪式">' +
        '<rect width="320" height="180" fill="#DCE0D8"/>' +
        /* 背景横幅 */
        '<rect x="0" y="0" width="320" height="46" fill="#242A26" opacity=".9"/>' +
        '<g fill="#DCE0D8" opacity=".9">' +
        '<rect x="106" y="14" width="108" height="4"/><rect x="120" y="26" width="80" height="4"/>' +
        '</g>' +
        /* 长桌 */
        '<rect x="18" y="106" width="284" height="14" fill="#242A26" opacity=".92"/>' +
        '<rect x="34" y="120" width="10" height="46" fill="#242A26" opacity=".85"/>' +
        '<rect x="276" y="120" width="10" height="46" fill="#242A26" opacity=".85"/>' +
        /* 桌面文件（投降书） */
        '<g>' +
        '<rect x="104" y="88" width="60" height="18" fill="#F2EFE4" stroke="#242A26" stroke-width="1.4"/>' +
        '<g stroke="#242A26" stroke-width="1" opacity=".55">' +
        '<path d="M110 93 L158 93"/><path d="M110 98 L150 98"/>' +
        '</g>' +
        '</g>' +
        '<rect x="180" y="92" width="46" height="14" fill="#F2EFE4" stroke="#242A26" stroke-width="1.4"/>' +
        /* 笔与墨水瓶 */
        '<g fill="#242A26">' +
        '<rect x="230" y="94" width="34" height="3" transform="rotate(-14 247 95)"/>' +
        '<rect x="240" y="100" width="14" height="8"/>' +
        '</g>' +
        /* 站立人物：三方代表 */
        '<g fill="#242A26">' +
        '<circle cx="66" cy="62" r="9"/><rect x="58" y="72" width="17" height="36"/>' +
        '<circle cx="160" cy="58" r="9"/><rect x="152" y="68" width="17" height="40"/>' +
        '<circle cx="252" cy="62" r="9"/><rect x="244" y="72" width="17" height="36"/>' +
        '</g>' +
        /* 橄榄枝符号（胜利） */
        '<g fill="#5C7C4F" opacity=".9">' +
        '<path d="M290 40 Q300 48 292 60 Q284 52 290 40 Z"/>' +
        '<path d="M282 46 Q290 54 282 64 Q274 56 282 46 Z"/>' +
        '</g>' +
        '<g fill="#242A26" opacity=".12">' + dotRow(0, 168, 320, 4) + '</g>' +
        '</svg>'
    },

    /* 开国大典：天安门 + 红旗 + 华灯 */
    kaiguo: {
      bg: '#7E2A18', accent: '#FFD166', ink: '#3A140D',
      svg:
        '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="开国大典：天安门城楼与五星红旗">' +
        '<rect width="320" height="180" fill="#7E2A18"/>' +
        /* 天空光晕 */
        '<circle cx="160" cy="120" r="96" fill="#C05A24" opacity=".55"/>' +
        '<circle cx="160" cy="130" r="62" fill="#D97A2A" opacity=".5"/>' +
        /* 城楼 */
        '<g fill="#3A140D">' +
        '<rect x="28" y="76" width="264" height="40"/>' +
        '<path d="M20 76 L300 76 L286 62 L34 62 Z"/>' +
        '<rect x="60" y="48" width="200" height="16"/>' +
        '<path d="M52 48 L268 48 L254 36 L66 36 Z"/>' +
        '<rect x="94" y="24" width="132" height="14"/>' +
        '<path d="M86 24 L234 24 L222 14 L98 14 Z"/>' +
        '</g>' +
        /* 券门 */
        '<path d="M144 116 L144 96 A16 16 0 0 1 176 96 L176 116 Z" fill="#FFD166" opacity=".55"/>' +
        /* 华灯 */
        '<g fill="#FFD166">' +
        '<rect x="42" y="116" width="3" height="26"/><circle cx="43.5" cy="114" r="5"/>' +
        '<rect x="275" y="116" width="3" height="26"/><circle cx="276.5" cy="114" r="5"/>' +
        '</g>' +
        /* 五星红旗（大） */
        '<g>' +
        '<rect x="196" y="36" width="2" height="34" fill="#FFD166"/>' +
        '<rect x="198" y="38" width="60" height="40" fill="#D62617"/>' +
        '<g fill="#FFD166">' +
        '<path d="M210 46 L212 51 L217 51 L213 54 L214.5 59 L210 56 L205.5 59 L207 54 L203 51 L208 51 Z"/>' +
        '<path d="M224 44 L225.4 47.5 L229 47.5 L226 50 L227 53.5 L224 51.5 L221 53.5 L222 50 L219 47.5 L222.6 47.5 Z"/>' +
        '<path d="M232 51 L233.4 54.5 L237 54.5 L234 57 L235 60.5 L232 58.5 L229 60.5 L230 57 L227 54.5 L230.6 54.5 Z"/>' +
        '<path d="M232 63 L233.4 66.5 L237 66.5 L234 69 L235 72.5 L232 70.5 L229 72.5 L230 69 L227 66.5 L230.6 66.5 Z"/>' +
        '<path d="M224 70 L225.4 73.5 L229 73.5 L226 76 L227 79.5 L224 77.5 L221 79.5 L222 76 L219 73.5 L222.6 73.5 Z"/>' +
        '</g>' +
        '</g>' +
        /* 广场人群 */
        '<g fill="#2A0E08">' +
        '<circle cx="20" cy="146" r="5"/><rect x="16" y="151" width="8" height="20"/>' +
        '<circle cx="48" cy="142" r="6"/><rect x="43" y="148" width="10" height="24"/>' +
        '<circle cx="78" cy="146" r="5"/><rect x="74" y="151" width="8" height="20"/>' +
        '<circle cx="108" cy="140" r="6"/><rect x="103" y="146" width="10" height="26"/>' +
        '<circle cx="140" cy="145" r="5"/><rect x="136" y="150" width="8" height="22"/>' +
        '<circle cx="172" cy="140" r="6"/><rect x="167" y="146" width="10" height="26"/>' +
        '<circle cx="204" cy="145" r="5"/><rect x="200" y="150" width="8" height="22"/>' +
        '<circle cx="236" cy="141" r="6"/><rect x="231" y="147" width="10" height="25"/>' +
        '<circle cx="268" cy="146" r="5"/><rect x="264" y="151" width="8" height="20"/>' +
        '<circle cx="298" cy="143" r="6"/><rect x="293" y="149" width="10" height="23"/>' +
        '</g>' +
        '</svg>'
    }
  };

  /* 网点纹理辅助：生成一行小圆点（版画质感） */
  function dotRow(x0, y, w, gap) {
    var s = '';
    for (var x = x0; x < x0 + w; x += gap) {
      s += '<circle cx="' + x + '" cy="' + y + '" r="1"/>';
    }
    return s;
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
        var vis = VISUALS[e.id] || VISUALS.wusi;
        return '<a class="event-card' + (e.grand ? ' event-card--grand' : '') + '" href="' + e.file + '">' +
          '<div class="event-card__visual">' + vis.svg +
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

  /* ==========================================================================
     四 · 学习路径
     ========================================================================== */

  function renderPath() {
    var mount = document.getElementById('path-grid');
    if (!mount || !window.LEARNING_PATH) return;

    mount.innerHTML = window.LEARNING_PATH.map(function (p) {
      return '<div class="path-card">' +
        '<span class="path-card__step">' + p.step + '</span>' +
        '<h3 class="path-card__title">' + p.title + '</h3>' +
        '<p class="path-card__text">' + p.text + '</p>' +
      '</div>';
    }).join('');
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ==========================================================================
     启动
     ========================================================================== */

  function init() {
    renderAxis();
    renderStages();
    renderPath();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
