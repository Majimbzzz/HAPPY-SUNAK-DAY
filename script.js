document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  let candles = [];
  let audioContext;
  let analyser;
  let analyserLow; // finer analyser, used to hear a blow over the music
  let microphone;

  function updateCandleCount() {
    const activeCandles = candles.filter(
      (candle) => !candle.classList.contains("out")
    ).length;
    document.dispatchEvent(
      new CustomEvent("candlecountchange", { detail: activeCandles })
    );
  }

  // How many candles drop onto the cake (use 3 or 5)
  const CANDLE_COUNT = 5;

  function dropCandle(left, top, delay) {
    const candle = document.createElement("div");
    candle.className = "candle drop";
    candle.style.left = left + "px";
    candle.style.top = top + "px";
    candle.style.animationDelay = delay + "ms";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    cake.appendChild(candle);

    // count the candle once it has landed
    candle.addEventListener("animationend", function onLand(e) {
      if (e.target !== candle) return;
      candle.removeEventListener("animationend", onLand);
      candles.push(candle);
      updateCandleCount();
    });
  }

  function dropCandles() {
    for (let i = 0; i < CANDLE_COUNT; i++) {
      const t = CANDLE_COUNT === 1 ? 0.5 : i / (CANDLE_COUNT - 1);
      const left = 55 + t * 140; // spread across the icing
      const top = 8 + 14 * Math.sin(Math.PI * t); // gentle arc, middle candles in front
      dropCandle(left, top, 400 + i * 350);
    }
  }

  dropCandles();

  // put a fresh set of lit candles on the cake
  window.restartCandles = function () {
    candles.forEach(function (c) { c.remove(); });
    cake.querySelectorAll(".candle").forEach(function (c) { c.remove(); }); // ones still dropping
    candles = [];
    document.dispatchEvent(new Event("candlesreset"));
    dropCandles();
  };

  function isBlowing() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    let average = sum / bufferLength;

    return average > 40; //
  }

  // While the birthday song is playing, the speakers would trip the normal
  // check above. The song has no notes below ~390 Hz, while a blow into the
  // mic is a low rumble, so we only listen to the 60-300 Hz band.
  const LOW_BAND_THRESHOLD = 110; // lower = more sensitive
  function isBlowingOverMusic() {
    const bins = analyserLow.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyserLow.getByteFrequencyData(data);

    const binHz = audioContext.sampleRate / analyserLow.fftSize;
    const from = Math.max(1, Math.round(60 / binHz));
    const to = Math.max(from + 1, Math.round(300 / binHz));

    let sum = 0;
    for (let i = from; i <= to; i++) {
      sum += data[i];
    }
    return sum / (to - from + 1) > LOW_BAND_THRESHOLD;
  }

  function blowOutCandles() {
    let blownOut = 0;

    const blowing = window.birthdayMusicPlaying
      ? isBlowingOverMusic()
      : isBlowing();

    if (blowing) {
      candles.forEach((candle) => {
        if (!candle.classList.contains("out") && Math.random() > 0.5) {
          candle.classList.add("out");
          blownOut++;
        }
      });
    }

    if (blownOut > 0) {
      updateCandleCount();
    }
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

        analyserLow = audioContext.createAnalyser();
        analyserLow.fftSize = 1024;
        microphone.connect(analyserLow);

        // some browsers keep the mic paused until the first tap
        const wake = function () {
          if (audioContext.state === "suspended") audioContext.resume();
        };
        ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
          document.addEventListener(ev, wake);
        });

        setInterval(blowOutCandles, 200);
      })
      .catch(function (err) {
        console.log("Unable to access microphone: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }
});

/* ---------- Confetti ---------- */
(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "confetti";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const colors = ["#ff6b9d", "#ffd166", "#06d6a0", "#4cc9f0", "#ffffff", "#f78c6b", "#7b2cbf"];
  let pieces = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function makePiece(x, y, burst) {
    return {
      x: x,
      y: y,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: burst ? (Math.random() - 0.5) * 14 : (Math.random() - 0.5) * 1.5,
      vy: burst ? -6 - Math.random() * 10 : 1 + Math.random() * 2.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      sway: Math.random() * Math.PI * 2,
      burst: burst,
    };
  }

  // how many pieces per tick, scaled to the screen width
  function density() {
    return Math.max(4, Math.round(canvas.width / 80));
  }

  // fill the whole screen right away, not just from the top edge
  for (let i = 0; i < density() * 30; i++) {
    pieces.push(makePiece(Math.random() * canvas.width, Math.random() * canvas.height, false));
  }

  // continuous rain across the full width
  setInterval(function () {
    if (document.hidden) return;
    for (let i = 0; i < density(); i++) {
      pieces.push(makePiece(Math.random() * canvas.width, -10 - Math.random() * 30, false));
    }
  }, 120);

  // burst from all over the screen
  function burst() {
    const count = Math.max(300, Math.round(canvas.width * canvas.height / 2500));
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      pieces.push(makePiece(x, y, true));
    }
  }

  // burst when the last candle goes out
  let previous = 0;
  document.addEventListener("candlesreset", function () {
    previous = 0;
  });
  document.addEventListener("candlecountchange", function (e) {
    const now = e.detail;
    if (previous > 0 && now === 0) burst();
    previous = now;
  });

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter(function (p) {
      return p.y < canvas.height + 20;
    });
    pieces.forEach(function (p) {
      p.sway += 0.05;
      p.x += p.vx + (p.burst ? 0 : Math.sin(p.sway) * 0.6);
      p.y += p.vy;
      p.rot += p.vr;
      if (p.burst) {
        p.vy += 0.35; // gravity
        p.vx *= 0.985;
        if (p.vy > 3) p.burst = false;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    requestAnimationFrame(frame);
  }
  frame();
})();


/* ---------- Responsive cake size ---------- */
(function () {
  const stage = document.querySelector(".stage");

  function fitCake() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    // the cake needs about 270 x 270 units of space at scale 1
    const scale = Math.min(w / 290, h / 290);
    const clamped = Math.max(0.5, Math.min(scale, 2.6));
    document.body.style.setProperty("--s", clamped.toFixed(3));
  }

  window.addEventListener("resize", fitCake);
  window.addEventListener("load", fitCake);
  fitCake();
})();


/* ---------- Birthday music (synthesized, no audio file needed) ---------- */
(function () {
  const btn = document.getElementById("musicBtn");
  const BPM = 110;
  const beat = 60 / BPM;

  // [frequency in Hz, length in beats]
  const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33,
        E5 = 659.25, F5 = 698.46, G5 = 783.99;
  const melody = [
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [C5, 1], [B4, 2],
    [G4, 0.75], [G4, 0.25], [A4, 1], [G4, 1], [D5, 1], [C5, 2],
    [G4, 0.75], [G4, 0.25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 1],
    [F5, 0.75], [F5, 0.25], [E5, 1], [C5, 1], [D5, 1], [C5, 2],
  ];

  let ctx = null;
  let userPaused = false;

  function refresh() {
    const running = !!ctx && ctx.state === "running";
    // the mic ignores blowing while the song is audible
    window.birthdayMusicPlaying = running;
    btn.textContent = running ? "⏸ Pause" : "▶ Play";
  }

  function finish() {
    if (ctx) ctx.close();
    ctx = null;
    userPaused = false;
    refresh();
  }

  function start() {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    ctx = c;
    userPaused = false;
    c.onstatechange = function () {
      if (ctx === c) refresh();
    };

    const master = c.createGain();
    master.gain.value = 0.25;
    master.connect(c.destination);

    // schedule one full pass of the song, then queue the next pass
    // when it ends, so the song loops until paused
    function playOnce(startAt) {
      let t = startAt;
      let lastOsc = null;
      melody.forEach(function (note) {
        const freq = note[0];
        const dur = note[1] * beat;

        // music-box style: a soft triangle note plus a quiet octave above
        [[freq, 1], [freq * 2, 0.25]].forEach(function (voice) {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = "triangle";
          osc.frequency.value = voice[0];
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(voice[1], t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
          osc.connect(gain);
          gain.connect(master);
          osc.start(t);
          osc.stop(t + dur);
          lastOsc = osc;
        });

        t += dur;
      });
      lastOsc.onended = function () {
        if (ctx === c) playOnce(c.currentTime + 1.5); // short pause, then repeat
      };
    }

    playOnce(c.currentTime + 0.1);

    refresh();
  }

  // Browsers block sound until the visitor interacts with the page.
  // So we try to start right away, and if it is blocked the song begins
  // on the first tap, click or key press anywhere on the page.
  function unlockOnFirstTouch(e) {
    if (e.target.closest && e.target.closest("#musicBtn")) return;
    if (ctx && !userPaused && ctx.state === "suspended") ctx.resume();
    ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
      document.removeEventListener(ev, unlockOnFirstTouch);
    });
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    document.addEventListener(ev, unlockOnFirstTouch);
  });

  btn.addEventListener("click", function () {
    if (!ctx) {
      start(); // song finished earlier: play again
      if (ctx.state === "suspended") ctx.resume();
    } else if (ctx.state === "running") {
      userPaused = true;
      ctx.suspend();
    } else {
      userPaused = false;
      ctx.resume();
    }
  });

  // start the song again from the beginning
  window.restartBirthdayMusic = function () {
    if (ctx) {
      const old = ctx;
      ctx = null;
      old.close();
    }
    start();
    if (ctx.state === "suspended") ctx.resume();
  };

  start(); // autoplay attempt
})();


/* ---------- Restart button ---------- */
(function () {
  document.getElementById("restartBtn").addEventListener("click", function () {
    if (window.restartCandles) window.restartCandles();
    if (window.restartBirthdayMusic) window.restartBirthdayMusic();
  });
})();