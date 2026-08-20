/* =========================================================
   「今晚的银河很美」P1 极简交互
   ---------------------------------------------------------
   1. 流星划过（幕 1 全屏银河之上）
   2. 平滑滚动锚点
   3. 分享按钮：复制 URL / 调起 Web Share / 兜底提示
   ========================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. 流星：每 1.5~3.5 秒随机生成一颗，自动渐隐
     ---------------------------------------------------------- */
  function spawnMeteor() {
    var container = document.querySelector('.meteors');
    if (!container) return;

    var meteor = document.createElement('span');
    meteor.className = 'meteor';

    // 起始位置：从屏幕上方 0~30%，水平 20%~85%
    var startLeft = 20 + Math.random() * 65;        // %
    var startTop  = -2 + Math.random() * 28;        // %
    var angle = 18 + Math.random() * 14;            // 与竖直方向的夹角 18~32°
    var duration = 1.2 + Math.random() * 1.0;       // 秒
    var size = 1.6 + Math.random() * 1.4;           // px
    var tailLen = 60 + Math.random() * 60;          // px

    meteor.style.left = startLeft + '%';
    meteor.style.top  = startTop + '%';
    meteor.style.width = size + 'px';
    meteor.style.height = size + 'px';
    meteor.style.transform = 'rotate(' + angle + 'deg)';
    meteor.style.animationDuration = duration + 's';

    // 让 ::after 伪元素的尾巴长度跟随随机数
    meteor.style.setProperty('--tail', tailLen + 'px');

    container.appendChild(meteor);

    // 用 animationend 兜底清理
    setTimeout(function () {
      if (meteor && meteor.parentNode) meteor.parentNode.removeChild(meteor);
    }, (duration + 0.3) * 1000);
  }

  // 通过 inline style 动态控制尾巴长度 —— 用一个样式补丁
  function ensureMeteorTailStyle() {
    if (document.getElementById('meteor-tail-style')) return;
    var css = '/* fallback tail length placeholder */';
    var style = document.createElement('style');
    style.id = 'meteor-tail-style';
    style.textContent =
      // 默认尾巴 80px；若自定义被覆盖则用 JS 设的宽度
      '.meteor::after { width: var(--tail, 80px); }';
    document.head.appendChild(style);
  }

  function startMeteorRain() {
    ensureMeteorTailStyle();
    // 第一颗稍等，让背景先淡入
    setTimeout(spawnMeteor, 1200);
    function loop() {
      spawnMeteor();
      var next = 1800 + Math.random() * 2200; // 1.8 ~ 4.0 秒
      setTimeout(loop, next);
    }
    setTimeout(loop, 1800);
  }

  /* ----------------------------------------------------------
     2. 平滑滚动（兼容老浏览器）
     ---------------------------------------------------------- */
  function smoothScrollTo(target) {
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      // 兜底：直接跳
      window.location.hash = '#' + (target.id || '');
    }
  }

  function bindAnchor() {
    var anchors = document.querySelectorAll('a[href^="#"]');
    Array.prototype.forEach.call(anchors, function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          ev.preventDefault();
          smoothScrollTo(target);
        }
      });
    });
  }

  /* ----------------------------------------------------------
     3. 分享：优先 Web Share，回落复制链接，再回落轻提示
     ---------------------------------------------------------- */
  function bindShare() {
    var btn = document.getElementById('share-btn');
    var tip = document.getElementById('share-tip');
    if (!btn) return;

    var url = window.location.href;
    var title = '今晚的银河很美';
    var text = '在七月初七的夜里，借一片星河，把传说还回星空本身。';

    function showTip(msg) {
      if (!tip) return;
      tip.textContent = msg;
      tip.style.opacity = '1';
      setTimeout(function () {
        tip.style.opacity = '0';
      }, 2200);
    }

    function fallbackCopy() {
      // 旧浏览器或非安全上下文：尝试 execCommand
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      showTip(ok ? '已复制链接，去分享给 TA 吧 ✦' : '请长按页面顶部地址栏复制');
    }

    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url })
          .catch(function () {
            // 用户取消或失败，回落到复制
            fallbackCopy();
          });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(function () { showTip('已复制链接 ✦'); })
          .catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  /* ----------------------------------------------------------
     入口
     ---------------------------------------------------------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    startMeteorRain();
    bindAnchor();
    bindShare();
  });
})();
