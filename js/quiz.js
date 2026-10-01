/* =========================================================
   「你的想念，是什么型」测试逻辑 + 朋友圈海报生成
   ---------------------------------------------------------
   1. 三态视图：入口卡 → 答题 → 结果卡
   2. 计分：4 型计数，同分以第 6 题答案优先
   3. 海报：Canvas 1080×1440，银河底图 + 结果排版，可保存 PNG
   ========================================================= */

(function () {
  'use strict';

  var DATA = window.QUIZ_DATA;
  if (!DATA) return;

  var state = {
    step: 0,                     // 当前题号 0~5
    answers: [],                 // 每题选择的 type
    result: null                 // 最终类型 key
  };

  var els = {
    entry: document.getElementById('quiz-entry'),
    question: document.getElementById('quiz-question'),
    result: document.getElementById('quiz-result'),
    qText: document.getElementById('quiz-q-text'),
    qOptions: document.getElementById('quiz-q-options'),
    qProgress: document.getElementById('quiz-progress'),
    qDots: document.getElementById('quiz-dots'),
    rBadge: document.getElementById('quiz-r-badge'),
    rName: document.getElementById('quiz-r-name'),
    rTag: document.getElementById('quiz-r-tag'),
    rDesc: document.getElementById('quiz-r-desc'),
    rVerse: document.getElementById('quiz-r-verse'),
    rVerseFrom: document.getElementById('quiz-r-verse-from'),
    rModern: document.getElementById('quiz-r-modern'),
    posterBtn: document.getElementById('quiz-poster-btn'),
    retryBtn: document.getElementById('quiz-retry-btn'),
    modal: document.getElementById('poster-modal'),
    posterImg: document.getElementById('poster-img'),
    posterSave: document.getElementById('poster-save'),
    posterClose: document.getElementById('poster-close')
  };

  /* ----------------------------------------------------------
     视图切换
     ---------------------------------------------------------- */
  function show(view) {
    [els.entry, els.question, els.result].forEach(function (el) {
      if (el) el.hidden = true;
    });
    if (view) {
      view.hidden = false;
      // 触发入场动画
      view.classList.remove('is-enter');
      void view.offsetWidth;
      view.classList.add('is-enter');
    }
  }

  /* ----------------------------------------------------------
     答题
     ---------------------------------------------------------- */
  function renderQuestion() {
    var i = state.step;
    var q = DATA.questions[i];
    els.qText.textContent = q.q;
    els.qProgress.textContent = (i + 1) + ' / ' + DATA.questions.length;

    // 进度点
    els.qDots.innerHTML = '';
    DATA.questions.forEach(function (_, idx) {
      var dot = document.createElement('span');
      dot.className = 'quiz-dot' + (idx < i ? ' is-done' : '') + (idx === i ? ' is-now' : '');
      els.qDots.appendChild(dot);
    });

    // 选项
    els.qOptions.innerHTML = '';
    q.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-picked')) return;
        btn.classList.add('is-picked');
        state.answers[i] = opt.type;
        setTimeout(function () {
          if (state.step < DATA.questions.length - 1) {
            state.step++;
            renderQuestion();
          } else {
            finish();
          }
        }, 300);
      });
      els.qOptions.appendChild(btn);
    });
  }

  /* ----------------------------------------------------------
     计分 + 出结果
     ---------------------------------------------------------- */
  function finish() {
    var score = { zhinv: 0, niulang: 0, queqiao: 0, yinhe: 0 };
    state.answers.forEach(function (t) { if (t in score) score[t]++; });

    var lastAnswer = state.answers[state.answers.length - 1];

    // 同分时：优先第 6 题的答案，再按固定顺序
    var best = null;
    Object.keys(score).forEach(function (t) {
      if (best === null || score[t] > score[best]) { best = t; return; }
      if (score[t] === score[best]) {
        if (t === lastAnswer) { best = t; }
      }
    });

    state.result = best;
    var info = DATA.types[best];
    els.rBadge.textContent = info.badge;
    els.rName.textContent = info.name;
    els.rTag.textContent = info.tag;
    els.rDesc.textContent = info.desc;
    els.rVerse.textContent = info.verse;
    els.rVerseFrom.textContent = info.verseFrom;
    els.rModern.textContent = info.modern;
    show(els.result);
  }

  /* ----------------------------------------------------------
     海报生成（Canvas 1080×1440）
     ---------------------------------------------------------- */
  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var current = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawPoster(callback) {
    var W = 1080, H = 1440;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    var info = DATA.types[state.result];
    var KAI = '"LXGW WenKai", "Kaiti SC", "KaiTi", "STKaiti", serif';
    var SANS = '"PingFang SC", "Microsoft YaHei", sans-serif';

    // 字体预载（unicode-range 分片会按需拉取）
    var loadFonts = [
      document.fonts.load('400 110px "LXGW WenKai"', info.name),
      document.fonts.load('400 44px "LXGW WenKai"', info.verse),
      document.fonts.load('400 40px "LXGW WenKai"', '想起谁的时候，就抬头。')
    ];

    var img = new Image();
    var imgReady = new Promise(function (resolve) {
      img.onload = function () { resolve(); };
      img.onerror = function () { resolve(); };
      img.src = 'assets/milky-way.jpg';
    });

    Promise.all(loadFonts.concat([imgReady, document.fonts.ready])).then(function () {
      // 1. 银河底图（cover 裁切）
      if (img.width) {
        var scale = Math.max(W / img.width, H / img.height);
        var dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#0B1A35';
        ctx.fillRect(0, 0, W, H);
      }

      // 2. 深空压暗（上浅下深，保证下方文字可读）
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(5, 11, 27, 0.45)');
      grad.addColorStop(0.55, 'rgba(5, 11, 27, 0.72)');
      grad.addColorStop(1, 'rgba(5, 11, 27, 0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      var centerX = W / 2;
      ctx.textAlign = 'center';

      // 3. 顶部小字
      ctx.fillStyle = '#C9A55A';
      ctx.font = '400 34px ' + SANS;
      ctx.fillText('你 的 想 念 ，是 什 么 型', centerX, 128);

      // 4. 类型名
      ctx.fillStyle = '#F5F2EA';
      ctx.font = '400 150px ' + KAI;
      ctx.fillText(info.name, centerX, 430);

      // 5. 类型标语
      ctx.fillStyle = '#E8C36A';
      ctx.font = '400 52px ' + KAI;
      ctx.fillText(info.tag, centerX, 530);

      // 6. 分隔线（一弯细银河）
      ctx.strokeStyle = 'rgba(232, 195, 106, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 200, 610);
      ctx.quadraticCurveTo(W / 2, 630, W / 2 + 200, 610);
      ctx.stroke();

      // 7. 描述文字（自动换行）
      ctx.fillStyle = '#C9C7BD';
      ctx.font = '400 38px ' + SANS;
      var descLines = wrapText(ctx, info.desc, 860);
      var y = 730;
      descLines.forEach(function (line) {
        ctx.fillText(line, centerX, y);
        y += 62;
      });

      // 8. 诗句 + 出处
      ctx.fillStyle = '#F5F2EA';
      ctx.font = '400 44px ' + KAI;
      ctx.fillText(info.verse, centerX, y + 90);
      ctx.fillStyle = 'rgba(201, 199, 189, 0.75)';
      ctx.font = '400 28px ' + SANS;
      ctx.fillText(info.verseFrom, centerX, y + 140);

      // 9. 底部 slogan + 落款
      ctx.fillStyle = '#E8C36A';
      ctx.font = '400 40px ' + KAI;
      ctx.fillText('想起谁的时候，就抬头。', centerX, H - 150);
      ctx.fillStyle = 'rgba(201, 199, 189, 0.6)';
      ctx.font = '400 26px ' + SANS;
      ctx.fillText('Designed by Daka', centerX, H - 76);

      callback(canvas);
    });
  }

  function openPoster() {
    // 微信内置浏览器：download 属性无效，改用「长按图片保存」
    var isWeChat = /MicroMessenger/i.test(navigator.userAgent || '');

    drawPoster(function (canvas) {
      try {
        var url = canvas.toDataURL('image/png');
        els.posterImg.src = url;

        if (isWeChat) {
          // 微信内：展示图 + 长按保存引导
          els.posterSave.textContent = '长按上方海报保存';
          els.posterSave.onclick = function () {
            // 再点一次也只是提醒，不尝试 download
            if (!els.modal.hidden) {
              var tipEl = els.modal.querySelector('.poster-wechat-tip');
              if (tipEl) {
                tipEl.style.opacity = '1';
              }
            }
          };
          // 插入/显示微信提示行（放在海报图和按钮之间）
          var tipEl = els.modal.querySelector('.poster-wechat-tip');
          if (!tipEl) {
            tipEl = document.createElement('p');
            tipEl.className = 'poster-wechat-tip';
            tipEl.textContent = '长按海报图片 → 保存到相册';
            var actions = els.modal.querySelector('.poster-modal-actions');
            els.modal.insertBefore(tipEl, actions);
          }
          tipEl.style.display = '';
        } else {
          // 外部浏览器：正常 download
          els.posterSave.textContent = '保存海报';
          var tipHide = els.modal.querySelector('.poster-wechat-tip');
          if (tipHide) tipHide.style.display = 'none';
          els.posterSave.onclick = function () {
            var a = document.createElement('a');
            a.href = url;
            a.download = '你的想念是什么型-' + DATA.types[state.result].name + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
        }

        // 锁定背景滚动（微信内弹层滚动穿透）
        document.body.classList.add('modal-open');
        els.modal.hidden = false;
      } catch (e) {
        // toDataURL 失败（极旧浏览器）：直接展示 canvas
        canvas.style.maxWidth = '100%';
        els.modal.innerHTML = '';
        els.modal.appendChild(canvas);
        document.body.classList.add('modal-open');
        els.modal.hidden = false;
      }
    });
  }

  /* ----------------------------------------------------------
     入口绑定
     ---------------------------------------------------------- */
  function bind() {
    var startBtn = document.getElementById('quiz-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        state.step = 0;
        state.answers = [];
        state.result = null;
        renderQuestion();
        show(els.question);
      });
    }

    if (els.retryBtn) {
      els.retryBtn.addEventListener('click', function () {
        state.step = 0;
        state.answers = [];
        state.result = null;
        renderQuestion();
        show(els.question);
      });
    }

    if (els.posterBtn) els.posterBtn.addEventListener('click', openPoster);

    if (els.posterClose) {
      els.posterClose.addEventListener('click', function () {
        els.modal.hidden = true;
        document.body.classList.remove('modal-open');
      });
    }
    if (els.modal) {
      // 点遮罩关闭
      els.modal.addEventListener('click', function (ev) {
        if (ev.target === els.modal) {
          els.modal.hidden = true;
          document.body.classList.remove('modal-open');
        }
      });
    }
  }

  if (document.readyState !== 'loading') bind();
  else document.addEventListener('DOMContentLoaded', bind);
})();
