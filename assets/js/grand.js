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
  var audioBtn = document.getElementById('grand-audio');
  var audioLabel = document.getElementById('grand-audio-label');
  var replayBtn = document.getElementById('grand-replay');
  var hint = document.getElementById('grand-hint');
  var voiceBtn = document.getElementById('grand-voice-btn');
  var voiceHint = document.getElementById('grand-voice-hint');

  if (!stage || !voiceText) return;

  var timers = [];
  var typing = false;

  /* ==========================================================================
     一、原声
     ========================================================================== */
  var voiceAudio = null;
  function initVoiceAudio() {
    voiceAudio = new Audio(VOICE_AUDIO);
    voiceAudio.preload = 'auto';
    /* 若片段不可用，隐藏原声按钮，页面仍可正常阅读 */
    voiceAudio.addEventListener('error', function () {
      if (voiceBtn) voiceBtn.style.display = 'none';
      if (voiceHint) voiceHint.textContent = '（原声片段未随包提供，仅文字呈现）';
    });
  }

  function playVoice() {
    if (!voiceAudio) return;
    try {
      voiceAudio.currentTime = 0;
      var pr = voiceAudio.play();
      if (pr && pr.catch) pr.catch(function () { /* 自动播放被拦截，等用户点击 */ });
    } catch (e) {}
  }
  function stopVoice() {
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

    /* 复位 */
    stage.classList.remove('is-lit');
    voiceText.textContent = '';
    voiceText.classList.remove('is-locked');
    caret.classList.add('is-hidden');
    dateline.classList.remove('is-shown');
    hint.classList.remove('is-hidden');

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
        later(function () { dateline.classList.add('is-shown'); }, 220);
      });
    }, 320 + CURTAIN_MS + 260);

    /* 4) 一段时间后隐藏滚动提示（用户已看到控制条） */
    later(function () { hint.classList.add('is-hidden'); }, 320 + CURTAIN_MS + 260 + 9000);
  }

  /* ---- 声音开关 ---- */
  function syncAudioUI() {
    var on = !Sound.muted;
    audioBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    audioLabel.textContent = on ? '声音已开启' : '开启声音';
  }

  audioBtn.addEventListener('click', function () {
    Sound.unlock();
    Sound.setMuted(!Sound.muted);
    syncAudioUI();
    /* 刚开启声音 → 顺手放一次乐，让用户确认生效 */
    if (!Sound.muted) Sound.playAnthem();
  });

  /* ---- 单独重放原声（学生想再听一遍那句话） ---- */
  if (voiceBtn) {
    voiceBtn.addEventListener('click', function () {
      Sound.unlock();
      playVoice();
    });
  }

  /* ---- 重播 ---- */
  replayBtn.addEventListener('click', function () {
    Sound.unlock();
    if (!Sound.muted) Sound.stopAnthem();
    play();
  });

  /* ---- 进入视口时才自动播放一次（避免用户还在上面看不到） ---- */
  function boot() {
    initVoiceAudio();
    syncAudioUI();

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
