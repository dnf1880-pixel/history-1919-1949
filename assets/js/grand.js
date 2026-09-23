/* ============================================================================
   1919—1949 · 有些历史不该忘
   grand.js —— 开国大典氛围页控制器
   ---------------------------------------------------------------------------
   首屏为油画《开国大典》满版背景，不再有自绘旗面。
   负责三件事：
     1. 入场编排：画面渐显 → 那句话逐字浮现 → 落款浮现（+ 奏乐）
     2. 毛主席原声：播报历史录音（"中华人民共和国，中央人民政府，今天，成立啦！"）
     3. 重播按钮：重演一次宣告
   所有动画都用 class 切换驱动，关键教学参数集中在下方常量，便于调整。
   ========================================================================= */

(function () {
  'use strict';

  /* ---- 可调参数（教学节奏相关，集中在此） ---- */
  var VOICE = '中华人民共和国，中央人民政府，今天，成立啦！';
  /* 打字节奏与真实录音等长：录音 17.23s，文字 22 字（18 普通字 + 4 标点）
     目标 16.6s 读完，与录音基本同步 —— 文字成为「看得见的录音」 */
  var CHAR_MS = 780;          /* 每字间隔 */
  var PUNCT_MS = 620;         /* 标点停顿 */
  var CURTAIN_MS = 1500;      /* 画面渐显时长（与 CSS transition 对应） */
  var ANTHEM_DELAY = 700;     /* 画面渐显后多久起乐 */

  /* 毛主席原声：历史录音片段（离线内嵌，无网络依赖）
     若片段文件缺失，会自动降级为「仅文字 + 合成乐」，不阻塞页面。 */
  var VOICE_AUDIO = '../assets/audio/maozedong-1949.mp3';

  var stage = document.getElementById('grand-stage');
  var voiceText = document.getElementById('grand-voice-text');
  var caret = document.getElementById('grand-caret');
  var dateline = document.getElementById('grand-dateline');
  var note = document.getElementById('grand-note');   /* 配图说明：随落款一起浮现 */
  var hint = document.getElementById('grand-hint');
  /* ⚠ 2026-09-21 波哥要求精简首屏控件：
     原 #grand-audio / #grand-audio-label / #grand-replay 三个节点已从 HTML 删除，
     对应的监听与 syncAudioUI() 一并移除（节点取不到会导致 addEventListener 抛错、整个页面白屏）。
     现在只剩右下角 #grand-voice-btn 一个话筒图标负责「再听一遍这句话」。 */
  var voiceBtn = document.getElementById('grand-voice-btn');
  var voiceHint = document.getElementById('grand-voice-hint');

  if (!stage || !voiceText) return;

  var timers = [];
  var typing = false;

  /* ---- 原声自动播放兜底（⚠ 2026-09-22 第11轮补） ----------------------------
     症状：波哥反馈「毛主席那句话的声音没有了」。

     排查结论（文件 / 代码 / 按钮全部排除）：
       · 音频文件在线可达：200 · audio/mpeg · 207,663 字节
       · 源 WAV 真有语音：8kHz/16bit 17.6s，峰值 0.61
       · 话筒按钮 z-index 12、44×44、display:flex，可点
       · 自动化测试里「进视口自动播」与「点话筒重听」都成功

     真正的坑是**浏览器自动播放拦截**：07 页是独立页面，若用户直接打开该页或刷新
     （或从手机 / 微信进入），整份文档没有任何点击手势，带声 play() 会被拒绝。
     原实现被拒后只是 .catch 静默吞掉 —— 于是「没有声音」，而唯一的话筒又只有
     0.5 透明度缩在右下角，等于找不到。Playwright 测试环境强制允许自动播放，
     所以这个问题在自动化里永远测不出来。

     补两层保险：
       ① 首次任意手势（点击/触摸/按键/滚轮/滚动）自动补播一次 —— 用户滚到首屏时
          必然已产生手势，体感上仍然是"自动响"
       ② 被拦时话筒显形为金色呼吸态并挂出「点击听原声」，把入口交出去
     -------------------------------------------------------------------- */
  var voiceStarted = false;    /* 原声是否已成功起播 */
  var stageInView = false;     /* 首屏是否已进入视口（没进视口不该抢播） */
  var gestureHandler = null;   /* 等待手势的补播监听 */
  var GESTURES = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];

  /* ==========================================================================
     一、原声
     ========================================================================== */
  var voiceAudio = null;
  function initVoiceAudio() {
    voiceAudio = new Audio(VOICE_AUDIO);
    voiceAudio.preload = 'auto';
    /* 起播成功 → 收工：撤掉手势补播监听与提示态 */
    voiceAudio.addEventListener('playing', markVoiceStarted);
    voiceAudio.addEventListener('ended', function () {
      if (voiceBtn) voiceBtn.classList.remove('is-playing');
    });
    /* 若片段不可用，隐藏原声按钮，页面仍可正常阅读 */
    voiceAudio.addEventListener('error', function () {
      if (voiceBtn) voiceBtn.style.display = 'none';
      if (voiceHint) voiceHint.textContent = '（原声片段未随包提供，仅文字呈现）';
    });

    /* 提前把原声解码进 WebAudio 缓存：进入首屏时不必干等网络，
       且「解码」这一步不受自动播放策略限制，可以在没有任何手势时先做完。 */
    if (window.Sound && Sound.preloadVoiceFile) {
      Sound.preloadVoiceFile(VOICE_AUDIO).catch(function () {
        /* file:// 下 fetch 不可用 → 静默，后续自动回退到 <audio> */
      });
    }
  }

  /* ---- 起播成功：收工 ---- */
  function markVoiceStarted() {
    if (voiceStarted) return;
    voiceStarted = true;
    if (voiceBtn) voiceBtn.classList.remove('needs-tap');
    stopGestureRetry();
  }

  /* ---- 被拦后的手势补播 ---- */
  function stopGestureRetry() {
    if (!gestureHandler) return;
    GESTURES.forEach(function (t) { window.removeEventListener(t, gestureHandler); });
    gestureHandler = null;
  }

  function armGestureRetry() {
    /* 已成功播过、或已经在等手势 → 不重复挂 */
    if (gestureHandler || voiceStarted) return;
    gestureHandler = function () {
      if (voiceStarted || !stageInView) return;
      if (window.Sound && Sound.muted) Sound.setMuted(false);
      playVoice();
    };
    GESTURES.forEach(function (t) {
      window.addEventListener(t, gestureHandler, { passive: true });
    });
  }

  /* ---- 播报原声 ----
     ⚠ 2026-09-22 第12轮改：两条通道，优先 WebAudio。

     为什么不能只用 <audio>：波哥实测「奏乐响、原声不响」。奏乐走 OscillatorNode
     合成，原声走 <audio> 元素 —— 这两条通道的浏览器策略不一样：
     AudioContext 一旦被任意手势唤醒就永久可用，而 <audio> 元素还有一套更严的
     媒体元素自动播放策略。手机上尤其明显。

     所以：上下文醒着（= 奏乐能响）就走 AudioBufferSourceNode，绕开媒体元素策略；
     上下文没醒（file:// 下 fetch 不可用、或解码失败）才回退到 <audio>，
     由 armGestureRetry 等手势补播。
     ---------------------------------------------------------------------- */
  var voiceViaWebAudio = false;   /* 本次是否走 WebAudio 通道 */

  function playVoice(onEnd) {
    voiceViaWebAudio = false;

    /* ① WebAudio 通道 */
    if (window.Sound && Sound.isAwake && Sound.isAwake() && Sound.playVoiceFile) {
      voiceViaWebAudio = Sound.playVoiceFile(VOICE_AUDIO, {
        onStart: markVoiceStarted,
        onEnd: function () { if (onEnd) onEnd(); },
        onError: function () { playVoiceElement(onEnd); }
      });
      if (voiceViaWebAudio) return;
    }

    /* ② 回退：媒体元素。
       若这条也被拦，armGestureRetry 会在下一次手势重来一次 ——
       那时上下文多半已被手势唤醒，playVoice() 会自动改走 WebAudio。 */
    playVoiceElement(onEnd);
  }

  function playVoiceElement(onEnd) {
    if (!voiceAudio) return;
    if (onEnd) {
      voiceAudio.addEventListener('ended', onEnd, { once: true });
    }
    try {
      voiceAudio.currentTime = 0;
      var pr = voiceAudio.play();
      if (pr && pr.catch) {
        pr.catch(function () {
          /* 自动播放被拦：话筒显形提示 + 等下一次手势自动补播 */
          if (voiceBtn && !voiceStarted) voiceBtn.classList.add('needs-tap');
          armGestureRetry();
        });
      }
    } catch (e) {
      if (voiceBtn && !voiceStarted) voiceBtn.classList.add('needs-tap');
      armGestureRetry();
    }
  }

  function stopVoice() {
    if (window.Sound && Sound.stopVoiceFile) {
      try { Sound.stopVoiceFile(); } catch (e) {}
    }
    voiceViaWebAudio = false;
    if (!voiceAudio) return;
    try { voiceAudio.pause(); voiceAudio.currentTime = 0; } catch (e) {}
  }

  /* ---- 计时器集中管理，重播时一次性清空 ---- */
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearAll() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  /* ---- 逐字浮现 ---- */
  function typeVoice(done) {
    typing = true;
    voiceText.textContent = '';
    caret.classList.remove('is-hidden');

    var i = 0;
    (function step() {
      if (i >= VOICE.length) {
        typing = false;
        caret.classList.add('is-hidden');
        if (typeof done === 'function') done();
        return;
      }
      var ch = VOICE.charAt(i);
      voiceText.textContent += ch;
      i += 1;

      /* 标点处停顿更久，读起来有语气 */
      var gap = CHAR_MS;
      if ('，。！？、；：'.indexOf(ch) !== -1) gap = PUNCT_MS;
      later(step, gap);
    })();
  }

  /* ---- 完整编排 ---- */
  function play(opts) {
    opts = opts || {};
    clearAll();
    typing = false;
    stopVoice();

    /* 首屏已进入视口：此后手势补播才有意义 */
    stageInView = true;

    /* 复位 */
    stage.classList.remove('is-lit');
    voiceText.textContent = '';
    voiceText.classList.remove('is-locked');
    caret.classList.add('is-hidden');
    dateline.classList.remove('is-shown');
    if (note) note.classList.remove('is-shown');
    hint.classList.remove('is-hidden');
    if (voiceBtn) voiceBtn.classList.remove('is-playing', 'needs-tap');

    /* 1) 满版油画渐显 —— 画面先于文字交代场景 */
    later(function () {
      stage.classList.add('is-lit');
      /* 起乐：只在用户已开声音时才会真正发声 */
      if (!Sound.muted) {
        later(function () { Sound.playAnthem(); }, ANTHEM_DELAY);
      }
    }, 320);

    /* 2) 画面就位后开始打字 */
    later(function () {
      /* 打字与真实原声同起：文字是"看得见的录音" */
      if (!Sound.muted) playVoice();

      typeVoice(function () {
        /* 3) 宣告完毕 → 文字定格为确认帧，落款浮现 */
        voiceText.classList.add('is-locked');
        later(function () {
          dateline.classList.add('is-shown');
          if (note) note.classList.add('is-shown');   /* 图注与落款同步浮现 */
        }, 220);
      });
    }, 320 + CURTAIN_MS + 260);

    /* 4) 一段时间后隐藏滚动提示（用户已看到控制条） */
    later(function () { hint.classList.add('is-hidden'); }, 320 + CURTAIN_MS + 260 + 9000);
  }

  /* ---- 声音开关 ----
     ⚠ 2026-09-21：原「开启声音／声音已开启」按钮已取消。
     现在改用「首次点击话筒 = 解锁音频 + 重听」，不再需要显式的静音开关。
     若素材缺失，话筒直接隐藏（没有可听的东西，留着按钮是误导）。 */

  /* ---- 单独重放原声（学生想再听一遍那句话） ---- */
  if (voiceBtn) {
    voiceBtn.addEventListener('click', function () {
      Sound.unlock();
      /* 若此前处于静音态，这一下点击顺便把声音打开 */
      if (Sound.muted) Sound.setMuted(false);
      /* 图标呼吸：提示"正在播"。onEnd 由 playVoice 内部挂到实际使用的那条通道上 */
      voiceBtn.classList.add('is-playing');
      voiceBtn.setAttribute('aria-pressed', 'true');
      playVoice(function () {
        voiceBtn.classList.remove('is-playing');
        voiceBtn.setAttribute('aria-pressed', 'false');
      });
      /* 兜底：录音异常结束也要复位 */
      later(function () {
        voiceBtn.classList.remove('is-playing');
        voiceBtn.setAttribute('aria-pressed', 'false');
      }, 26000);
    });
  }

  /* ---- 进入视口时才自动播放一次（避免用户还在上面看不到） ---- */
  function boot() {
    initVoiceAudio();

    if ('IntersectionObserver' in window) {
      var fired = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!fired && en.isIntersecting && en.intersectionRatio > 0.35) {
            fired = true;
            play();
            io.disconnect();
          }
        });
      }, { threshold: [0.35, 0.6] });
      io.observe(stage);

      /* 兜底：3 秒后仍未触发（极窄屏或快速滚动）也开演 */
      later(function () {
        if (!fired) { fired = true; io.disconnect(); play(); }
      }, 3000);
    } else {
      play();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 离开页面时停止声音 */
  window.addEventListener('pagehide', function () {
    try { Sound.stopAnthem(); } catch (e) {}
    stopVoice();
  });
})();
