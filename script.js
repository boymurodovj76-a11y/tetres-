
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nctx = nextCanvas.getContext("2d");

const COLS = 10, ROWS = 20, SIZE = 30;

const shapes = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1],[1,0,1]],
  [[1,0,1],[1,1,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1],[1,0,0],[1,0,0]],
  [[1,1,1],[0,0,1],[0,0,1]],
  [[1,0,0],[1,1,0],[0,1,1]],
  [[0,1,0],[1,1,1],[0,1,0]],
  [[1,1,1],[1,1,1]]
];

const colors = [
  "#00d9ff", "#ffe600", "#bd5cff", "#ff8c00",
  "#4488ff", "#48e36c", "#ff4568", "#f472b6",
  "#a3e635", "#fb7185", "#2dd4bf", "#c084fc",
  "#facc15", "#60a5fa", "#f97316"
];

let board, piece, nextPiece;
let score = 0, running = false, paused = false;
let gameOver = false, lastTime = 0, timer = 0;
let best = Number(localStorage.getItem("winstonBest") || 0);

document.getElementById("best").textContent = best;

function randomPiece() {
  const i = Math.floor(Math.random() * shapes.length);
  return {
    matrix: shapes[i].map(row => row.slice()),
    color: colors[i],
    x: 0,
    y: 0
  };
}

function spawn() {
  piece = nextPiece;
  piece.x = Math.floor((COLS - piece.matrix[0].length) / 2);
  piece.y = 0;
  nextPiece = randomPiece();
  drawNext();

  if (collision(0, 0)) {
    running = false;
    gameOver = true;
    document.getElementById("message").textContent =
      "O‘yin tugadi! Qayta boshlang.";
  }
}

function collision(dx, dy, matrix = piece.matrix) {
  return matrix.some((row, y) =>
    row.some((v, x) => {
      if (!v) return false;
      const nx = piece.x + x + dx;
      const ny = piece.y + y + dy;

      return nx < 0 || nx >= COLS || ny >= ROWS ||
        (ny >= 0 && board[ny][nx]);
    })
  );
}

function drawCell(context, x, y, size, color) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = "#ffffff40";
  context.fillRect(x * size + 3, y * size + 3, size - 6, 4);
}

function drawNext() {
  nctx.clearRect(0, 0, 120, 120);
  nctx.fillStyle = "#080b18";
  nctx.fillRect(0, 0, 120, 120);

  const m = nextPiece.matrix;
  const size = 24;
  const ox = (120 - m[0].length * size) / 2;
  const oy = (120 - m.length * size) / 2;

  m.forEach((row, y) => row.forEach((v, x) => {
    if (v) {
      nctx.fillStyle = nextPiece.color;
      nctx.fillRect(ox + x * size + 1, oy + y * size + 1,
        size - 2, size - 2);
    }
  }));
}

function draw() {
  ctx.fillStyle = "#080b18";
  ctx.fillRect(0, 0, 300, 600);

  board.forEach((row, y) => row.forEach((v, x) => {
    if (v) drawCell(ctx, x, y, SIZE, v);
  }));

  if (piece) {
    piece.matrix.forEach((row, y) => row.forEach((v, x) => {
      if (v) drawCell(ctx, piece.x + x, piece.y + y,
        SIZE, piece.color);
    }));
  }

  ctx.strokeStyle = "#ffffff18";
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * SIZE, 0);
    ctx.lineTo(x * SIZE, 600);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * SIZE);
    ctx.lineTo(300, y * SIZE);
    ctx.stroke();
  }
}

function lockPiece() {
  piece.matrix.forEach((row, y) => row.forEach((v, x) => {
    if (v && piece.y + y >= 0) {
      board[piece.y + y][piece.x + x] = piece.color;
    }
  }));

  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      lines++;
      y++;
    }
  }

  score += [0, 100, 300, 500, 800][lines] || lines * 200;
  document.getElementById("score").textContent = score;

  if (score > best) {
    best = score;
    localStorage.setItem("winstonBest", best);
    document.getElementById("best").textContent = best;
  }

  spawn();
}

function move(dx, dy) {
  if (!running || paused || gameOver) return;

  if (!collision(dx, dy)) {
    piece.x += dx;
    piece.y += dy;
  } else if (dy > 0) {
    lockPiece();
  }
  draw();
}

function rotate() {
  if (!running || paused || gameOver) return;

  const m = piece.matrix[0].map((_, i) =>
    piece.matrix.map(row => row[i]).reverse()
  );

  if (!collision(0, 0, m)) piece.matrix = m;
  draw();
}

function action(a) {
  if (a === "left") move(-1, 0);
  if (a === "right") move(1, 0);
  if (a === "down") move(0, 1);
  if (a === "rotate") rotate();

  if (a === "drop" && running && !paused && !gameOver) {
    while (!collision(0, 1)) piece.y++;
    lockPiece();
    draw();
  }
}

document.querySelectorAll("[data-m]").forEach(button => {
  button.addEventListener("click", () => action(button.dataset.m));
});

document.addEventListener("keydown", e => {
  const keys = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    " ": "drop"
  };
  if (keys[e.key]) {
    e.preventDefault();
    action(keys[e.key]);
  }
});

let startX = 0, startY = 0;

canvas.addEventListener("pointerdown", e => {
  startX = e.clientX;
  startY = e.clientY;
});

canvas.addEventListener("pointerup", e => {
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
    rotate();
  } else if (Math.abs(dx) > Math.abs(dy)) {
    action(dx < 0 ? "left" : "right");
  } else if (dy > 25) {
    action("down");
  } else if (dy < -25) {
    rotate();
  }
});

document.getElementById("start").onclick = () => {
  board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  score = 0;
  running = true;
  paused = false;
  gameOver = false;
  timer = 0;
  nextPiece = randomPiece();
  document.getElementById("score").textContent = "0";
  document.getElementById("message").textContent = "O‘yin boshlandi!";
  spawn();
  draw();
};

document.getElementById("pause").onclick = () => {
  if (!running || gameOver) return;
  paused = !paused;
  document.getElementById("message").textContent =
    paused ? "Pauza" : "O‘yin davom etmoqda";
};

document.querySelectorAll("[data-theme]").forEach(button => {
  button.addEventListener("click", () => {
    document.body.classList.remove("classic", "neon", "colorful");
    document.body.classList.add(button.dataset.theme);
  });
});

function loop(time = 0) {
  const delta = Math.min(time - lastTime, 100);
  lastTime = time;

  if (running && !paused && !gameOver) {
    timer += delta;
    if (timer > Math.max(120, 600 - Math.floor(score / 500) * 35)) {
      move(0, 1);
      timer = 0;
    }
  }

  requestAnimationFrame(loop);
}

board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
nextPiece = randomPiece();
drawNext();
draw();
requestAnimationFrame(loop);

/* ===== TETRIS OVOZLARI ===== */

let soundEnabled = true;
let audioContext;

function playSound(type) {
  if (!soundEnabled) return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const notes = {
      move:   [220, 0.045],
      rotate: [440, 0.08],
      drop:   [110, 0.15],
      clear:  [660, 0.22],
      over:   [150, 0.4],
      start:  [523, 0.12]
    };

    const [frequency, duration] = notes[type] || notes.move;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type === "clear" ? "sine" : "square";
    oscillator.frequency.setValueAtTime(
      frequency, audioContext.currentTime
    );

    if (type === "clear") {
      oscillator.frequency.linearRampToValueAtTime(
        880, audioContext.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(0.12, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001, audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log("Ovoz ishga tushmadi:", error);
  }
}

/* OVOZNI YOQISH VA O‘CHIRISH */
const soundButton = document.createElement("button");
soundButton.textContent = "🔊 Ovoz yoqilgan";
soundButton.id = "soundToggle";
soundButton.style.margin = "8px";
document.querySelector(".controls").after(soundButton);

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled
    ? "🔊 Ovoz yoqilgan"
    : "🔇 Ovoz o‘chirilgan";

  if (soundEnabled) playSound("start");
});
