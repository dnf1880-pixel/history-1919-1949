/* ============================================================================
   1919—1949 · 有些历史不该忘
   sound.js —— WebAudio 音效引擎（零音频文件，纯合成，可离线）
   ---------------------------------------------------------------------------
   设计取舍：不引用任何 mp3/ogg 外链，避免死链与版权问题；全部用
   OscillatorNode + 白噪声 Buffer 合成，体积为 0，双击打开即可发声。

   提供音效：
     type()      打字机单字音（短促的机械"嗒"）
     typeSoft()  打字机轻击（句读处，音更轻更闷）
     chime()     开场/进场的提示泛音（庄严、悠长）
     swell()     低沉的呼吸声（封面页氛围，非炮火）
     bell()      小测对错提示音
     playAnthem() 《义勇军进行曲》前奏主旋律
     playVoice() 播放开国大典原声片段（<audio> 元素，非合成）

   注：本版本已移除「炮火」音效——卷首语不再需要它，
      改用更克制的合成低音铺底，避免喧宾夺主。

   浏览器策略：AudioContext 必须在用户手势后创建/恢复，因此所有播放
   都经过 ensure()，并对外暴露 muted 开关。
   ========================================================================= */

(function () {
  'use strict';

  var ctx = null;
  var noiseBuffer = null;
  var muted = false;         // 由封面按钮显式开启（用户手势后）
  var masterGain = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);

    /* 预生成 2 秒白噪声，供打字音复用 */
    var len = Math.floor(ctx.sampleRate * 2);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  /* ---- 内部：噪声源 ---- */
  function noiseSrc() {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    return src;
  }

  /* ---- 打字机单字音 ---- */
  function typeSound(soft) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t = c.currentTime;
    var k = soft ? 0.55 : 1;          /* 轻击缩放 */
    var vol = 0.085 * k;

    /* 机械敲击：极短噪声脉冲 */
    var n = noiseSrc();
    var nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = soft ? 1900 : 2600;
    nf.Q.value = 1.4;
    var ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.04 : 0.055));
    n.connect(nf); nf.connect(ng); ng.connect(masterGain);
    n.start(t); n.stop(t + 0.07);

    /* 金属回弹：低频三角波短音，让"嗒"更有实体感 */
    var o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(soft ? 480 : 620, t);
    o.frequency.exponentialRampToValueAtTime(soft ? 260 : 320, t + 0.045);
    var og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.045 * k, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(og); og.connect(masterGain);
    o.start(t); o.stop(t + 0.06);
  }

  /* ------------------------------------------------------------------------
     chime() —— 庄严泛音
     用于封面页点击「开启历史画卷」、以及卷首语段落切换的时刻。
     构成：一个低八度基音 + 一个五度泛音，缓慢衰减，像钟磬余韵。
     ---------------------------------------------------------------------- */
  function chimeSound(base) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t = c.currentTime;
    var f0 = base || 146.83;                 /* D3 */
    var parts = [f0, f0 * 1.5, f0 * 2.0];    /* 基音 + 五度 + 八度 */
    parts.forEach(function (f, i) {
      var o = c.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      var g = c.createGain();
      var st = t + i * 0.045;
      var peak = (i === 0 ? 0.20 : 0.075) / (1 + i * 0.6);
      var dur = 2.4 - i * 0.5;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(peak, st + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.connect(g); g.connect(masterGain);
      o.start(st); o.stop(st + dur + 0.05);
    });
  }

  /* ------------------------------------------------------------------------
     swell() —— 低沉的气息铺底（替代原「炮火」）
     用于卷首语开场，营造"翻开一部厚书"的沉重感，不抢打字机音。
     ---------------------------------------------------------------------- */
  function swellSound() {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t = c.currentTime;

    /* 低频涌动：缓慢滑落的正弦，音量很小 */
    var o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(74, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 2.6);
    var og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.075, t + 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    o.connect(og); og.connect(masterGain);
    o.start(t); o.stop(t + 3.0);

    /* 极轻的气流噪声，制造"空气在动"的空间感 */
    var n = noiseSrc();
    var nf = c.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(420, t);
    nf.frequency.linearRampToValueAtTime(180, t + 2.6);
    var ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.022, t + 1.1);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    n.connect(nf); nf.connect(ng); ng.connect(masterGain);
    n.start(t); n.stop(t + 2.9);
  }

  /* ---- 提示音（小测对错） ---- */
  function bellSound(ok) {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    var t = c.currentTime;
    var freqs = ok ? [660, 880] : [330, 247];
    freqs.forEach(function (f, i) {
      var o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      var g = c.createGain();
      var st = t + i * 0.11;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.13, st + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.42);
      o.connect(g); g.connect(masterGain);
      o.start(st); o.stop(st + 0.45);
    });
  }

  /* ------------------------------------------------------------------------
     《义勇军进行曲》主旋律
     ------------------------------------------------------------------------
     说明：只合成歌曲开头最广为人知的一段主旋律（"起来！不愿做奴隶的人们"），
     作为开国大典页的氛围引导。音色采用铜管感的锯齿波 + 低通滤波。
     用户必须主动点击播放按钮才会发声，符合浏览器自动播放策略。
     ---------------------------------------------------------------------- */

  /* 简谱 → 频率。以 G4=392Hz 为基准，按半音阶排布 */
  var NOTE = {
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
    'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
    'A5': 880.00, 'B5': 987.77
  };

  /* 旋律：[[音名, 拍数], ...]，一拍 = 0.5s。
     严格只取《义勇军进行曲》开篇乐句（5 5 5 | 1 - …） */
  var ANTHEM = [
    ['G4', 0.5], ['G4', 0.5], ['G4', 1.0],
    ['C5', 2.0],
    ['G4', 0.5], ['G4', 0.5], ['G4', 1.0],
    ['C5', 2.0],
    ['G4', 0.5], ['G4', 0.5], ['C5', 1.0],
    ['E5', 1.0], ['E5', 1.0],
    ['D5', 1.0], ['C5', 1.0],
    ['D5', 2.0]
  ];

  var anthemNodes = [];

  function stopAnthem() {
    anthemNodes.forEach(function (n) {
      try { n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    anthemNodes = [];
  }

  function playAnthem(onEnd) {
    var c = ensure();
    if (!c) return;
    stopAnthem();

    var start = c.currentTime + 0.06;
    var beat = 0.5;            /* 一拍时长（秒），约 ♩=120 */
    var cursor = start;

    ANTHEM.forEach(function (item) {
      var f = NOTE[item[0]];
      var dur = item[1] * beat;
      if (!f) { cursor += dur; return; }

      /* 铜管音色：锯齿波 + 低通 + 轻微失谐叠加 */
      var o1 = c.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = f;

      var o2 = c.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.value = f * 1.005;   /* 轻微失谐，制造厚度 */

      var sub = c.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = f / 2;      /* 低八度补底 */

      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, cursor);
      lp.frequency.linearRampToValueAtTime(2400, cursor + dur * 0.5);
      lp.frequency.linearRampToValueAtTime(1100, cursor + dur);
      lp.Q.value = 0.8;

      var g = c.createGain();
      var peak = 0.15;
      g.gain.setValueAtTime(0.0001, cursor);
      g.gain.exponentialRampToValueAtTime(peak, cursor + 0.035);
      g.gain.setValueAtTime(peak, cursor + dur * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, cursor + dur * 0.98);

      o1.connect(lp); o2.connect(lp); sub.connect(lp);
      lp.connect(g); g.connect(masterGain);

      o1.start(cursor); o1.stop(cursor + dur);
      o2.start(cursor); o2.stop(cursor + dur);
      sub.start(cursor); sub.stop(cursor + dur);
      anthemNodes.push(o1, o2, sub);

      cursor += dur;
    });

    if (typeof onEnd === 'function') {
      setTimeout(function () {
        if (anthemNodes.length) onEnd();
      }, (cursor - c.currentTime) * 1000 + 150);
    }
  }

  /* ------------------------------------------------------------------------
     playVoice() —— 历史原声（开国大典毛主席宣告）
     ------------------------------------------------------------------------
     使用 <audio> 元素播放 assets/audio/ 下的真实历史录音，
     而非合成音。若文件缺失或加载失败，静默降级（不报错、不中断氛围）。
     ---------------------------------------------------------------------- */
  var voiceEl = null;

  function playVoice(src, opts) {
    opts = opts || {};
    try {
      if (!voiceEl) {
        voiceEl = new Audio();
        voiceEl.preload = 'auto';
      }
      voiceEl.src = src;
      voiceEl.volume = (typeof opts.volume === 'number') ? opts.volume : 1;
      voiceEl.currentTime = 0;
      var p = voiceEl.play();
      if (p && p.catch) {
        p.catch(function () {
          /* 自动播放被拦截或文件缺失：静默降级 */
          if (typeof opts.onError === 'function') opts.onError();
        });
      }
      if (typeof opts.onEnd === 'function') {
        voiceEl.onended = function () { opts.onEnd(); };
      }
      return voiceEl;
    } catch (e) {
      if (typeof opts.onError === 'function') opts.onError();
      return null;
    }
  }

  function stopVoice() {
    if (!voiceEl) return;
    try { voiceEl.pause(); voiceEl.currentTime = 0; } catch (e) {}
  }

  /* ------------------------------------------------------------------------
     playVoiceFile() —— 历史原声的 WebAudio 通道
     ------------------------------------------------------------------------
     ⚠ 2026-09-22 第12轮补。为什么必须加这一条：

     波哥的实测症状是「奏乐响、毛主席原声不响」。奏乐是 OscillatorNode 合成，
     原声是 <audio> 元素 —— 这两条通道的浏览器策略**不一样**：

       · AudioContext  只要被任意一次用户手势唤醒，就永久可用
       · <audio> 元素  走的是另一套更严的「媒体元素自动播放策略」，
                       直接打开页面 / 刷新后没有手势，带声 play() 会被拒

     所以「合成音能响、音频文件不响」不是文件坏了，是通道差异。

     这里把原声也解码成 AudioBuffer、用 AudioBufferSourceNode 播出去 ——
     只要上下文醒着，就不再受媒体元素策略约束。
     失败时（file:// 下 fetch 不可用、解码不支持）由调用方回退到 <audio>。
     ---------------------------------------------------------------------- */
  var voiceBuffer = {};        /* src -> AudioBuffer（已解码完成） */
  var voicePending = {};       /* src -> Promise（解码进行中） */
  var voiceNodes = [];         /* 正在播的 BufferSource */
  var voiceGain = null;
  var voiceSeq = 0;            /* 用于丢弃「已停止之后才解码完」的旧请求 */

  /* ⚠ 两个缓存必须分开：已解码的 AudioBuffer 上没有 .then，
     若与 Promise 共用同一个槽，第二次调用就会挂在 `x.then is not a function` 上。
     （2026-09-22 第12轮踩过这个坑 —— 预解码成功后正式起播时必炸。） */
  function decodeVoiceFile(src) {
    if (voiceBuffer[src]) return Promise.resolve(voiceBuffer[src]);
    if (voicePending[src]) return voicePending[src];

    var c = ensure();
    if (!c || typeof fetch !== 'function') {
      return Promise.reject(new Error('no-audiocontext-or-fetch'));
    }
    var pr = fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        return new Promise(function (res, rej) {
          /* 老 Safari 只有回调式 decodeAudioData */
          var ret = c.decodeAudioData(ab, res, rej);
          if (ret && ret.then) ret.then(res, rej);
        });
      })
      .then(function (buf) {
        voiceBuffer[src] = buf;
        delete voicePending[src];
        return buf;
      })
      .catch(function (e) {
        delete voicePending[src];
        throw e;
      });
    voicePending[src] = pr;
    return pr;
  }

  function stopVoiceFile() {
    voiceSeq += 1;
    voiceNodes.forEach(function (n) {
      try { n.onended = null; } catch (e) {}
      try { n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    voiceNodes = [];
  }

  /* 返回 true = 已接受这次播放请求（异步解码后起播）；
     返回 false = 这条通道不可用，调用方应回退到 <audio> */
  function playVoiceFile(src, opts) {
    opts = opts || {};
    if (!src) return false;
    var c = ensure();
    if (!c) return false;

    stopVoiceFile();
    var myToken = voiceSeq;

    decodeVoiceFile(src).then(function (buf) {
      if (myToken !== voiceSeq) return;          /* 已被 stop，丢弃 */
      if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
      if (!voiceGain) {
        voiceGain = c.createGain();
        voiceGain.gain.value = 1;
        voiceGain.connect(masterGain);
      }
      var node = c.createBufferSource();
      node.buffer = buf;
      node.connect(voiceGain);
      node.onended = function () {
        if (opts.onEnd) { try { opts.onEnd(); } catch (e) {} }
      };
      node.start(0);
      voiceNodes.push(node);
      if (opts.onStart) { try { opts.onStart(); } catch (e) {} }
    }).catch(function (e) {
      if (myToken !== voiceSeq) return;
      if (opts.onError) { try { opts.onError(e); } catch (err) {} }
    });

    return true;
  }

  /* ---- 对外接口 ---- */
  window.Sound = {
    get muted() { return muted; },

    setMuted: function (v) {
      muted = !!v;
      if (!muted) ensure();
    },

    /** 首次用户手势时调用，解锁 AudioContext */
    unlock: function () { ensure(); },

    type: function () { typeSound(false); },
    typeSoft: function () { typeSound(true); },
    chime: chimeSound,
    swell: swellSound,
    bell: bellSound,
    playAnthem: playAnthem,
    stopAnthem: stopAnthem,
    playVoice: playVoice,
    stopVoice: stopVoice,

    /** 音频上下文是否已经真正跑起来 —— 跑起来 = WebAudio 通道不再需要手势 */
    isAwake: function () {
      var c = ensure();
      return !!c && c.state === 'running';
    },
    /** 预解码原声（可提前缓存，起播时不必等网络） */
    preloadVoiceFile: decodeVoiceFile,
    playVoiceFile: playVoiceFile,
    stopVoiceFile: stopVoiceFile
  };
})();
