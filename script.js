document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  let candles = [];
  let audioContext;
  let analyser;
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

  function blowOutCandles() {
    let blownOut = 0;

    if (isBlowing()) {
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