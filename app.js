const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 80;

let rowGap = 10;
let colGap = 10;

/* --- 初期読み込み --- */
async function loadDesks() {
  const saved = localStorage.getItem("desks");
  if (saved) {
    desks = JSON.parse(saved).map(normalizeDesk);
  } else {
    const res = await fetch("seats.json");
    desks = (await res.json()).map(normalizeDesk);
  }

  const savedGap = JSON.parse(localStorage.getItem("gridGap") || "{}");
  if (savedGap.rowGap !== undefined) rowGap = savedGap.rowGap;
  if (savedGap.colGap !== undefined) colGap = savedGap.colGap;

  render();
}

function normalizeDesk(desk, index = 0) {
  return {
    orientation: "horizontal",
    x: index % maxX,
    y: Math.floor(index / maxX),
    ...desk
  };
}

/* --- 保存 --- */
function save() {
  localStorage.setItem("desks", JSON.stringify(desks));
  localStorage.setItem("gridGap", JSON.stringify({ rowGap, colGap }));
}

/* --- render --- */
function render() {
  container.innerHTML = "";
  container.style.gridTemplateColumns = `repeat(${maxX}, ${deskWidth}px)`;
  container.style.gridTemplateRows = `repeat(${maxY}, ${deskHeight}px)`;
  container.style.columnGap = colGap + "px";
  container.style.rowGap = rowGap + "px";

  const map = Array.from({ length: maxY }, () => Array(maxX).fill(null));
  desks.forEach(d => {
    if (d.x < maxX && d.y < maxY) map[d.y][d.x] = d;
  });

  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const desk = map[y][x];
      if (desk) container.appendChild(createDeskElement(desk));
      else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        empty.dataset.x = x;
        empty.dataset.y = y;

        // 空席セルに drop 対応
        empty.addEventListener("dragover", e => e.preventDefault());
        empty.addEventListener("drop", e => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("id");
          const fromDesk = desks.find(d => d.id === fromId);
          if (!fromDesk) return;
          fromDesk.x = parseInt(empty.dataset.x, 10);
          fromDesk.y = parseInt(empty.dataset.y, 10);
          save();
          render();
        });

        container.appendChild(empty);
      }
    }
  }

  createGapBars();
}

/* --- デスク要素作成 --- */
function createDeskElement(desk) {
  const div = document.createElement("div");
  div.className = `desk ${desk.orientation}`;
  div.draggable = true;
  div.dataset.id = desk.id;

  div.style.gridColumn = desk.x + 1;
  div.style.gridRow = desk.y + 1;

  div.innerHTML = `
    <div class="desk-content">
      <strong>${desk.label}</strong><br>
      PC: ${desk.pc}<br>
      ${desk.user}
    </div>
    <button class="rotate-btn">↻</button>
  `;

  div.querySelector(".rotate-btn").addEventListener("click", e => {
    e.stopPropagation();
    desk.orientation = desk.orientation === "horizontal" ? "vertical" : "horizontal";
    save();
    render();
  });

  addDnD(div);
  return div;
}

/* --- DnD --- */
function addDnD(el) {
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("id", el.dataset.id);
  });

  el.addEventListener("dragover", e => e.preventDefault());
  el.addEventListener("drop", e => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("id");
    const fromDesk = desks.find(d => d.id === fromId);

    const toDeskId = el.dataset.id;
    if (toDeskId) {
      const toDesk = desks.find(d => d.id === toDeskId);
      [fromDesk.x, toDesk.x] = [toDesk.x, fromDesk.x];
      [fromDesk.y, toDesk.y] = [toDesk.y, fromDesk.y];
    } else if (el.classList.contains("empty-cell")) {
      fromDesk.x = parseInt(el.dataset.x, 10);
      fromDesk.y = parseInt(el.dataset.y, 10);
    }
    save();
    render();
  });
}

/* --- 行間・列間バー --- */
function createGapBars() {
  document.querySelectorAll(".resize-col, .resize-row").forEach(b => b.remove());

  // 列バー
  for (let i = 0; i < maxX - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.style.left = (deskWidth + colGap) * (i + 1) - colGap / 2 + "px";
    bar.addEventListener("mousedown", e => startColGapResize(e));
    container.appendChild(bar);
  }

  // 行バー
  for (let i = 0; i < maxY - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.style.top = (deskHeight + rowGap) * (i + 1) - rowGap / 2 + "px";
    bar.addEventListener("mousedown", e => startRowGapResize(e));
    container.appendChild(bar);
  }
}

function startColGapResize(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startGap = colGap;

  function onMove(ev) {
    colGap = Math.max(0, startGap + (ev.clientX - startX));
    container.style.columnGap = colGap + "px";
  }
  function onUp() {
    localStorage.setItem("gridGap", JSON.stringify({ rowGap, colGap }));
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function startRowGapResize(e) {
  e.preventDefault();
  const startY = e.clientY;
  const startGap = rowGap;

  function onMove(ev) {
    rowGap = Math.max(0, startGap + (ev.clientY - startY));
    container.style.rowGap = rowGap + "px";
  }
  function onUp() {
    localStorage.setItem("gridGap", JSON.stringify({ rowGap, colGap }));
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

/* --- 設定UI --- */
document.getElementById("applySize").addEventListener("click", () => {
  const newX = parseInt(document.getElementById("maxX").value, 10);
  const newY = parseInt(document.getElementById("maxY").value, 10);
  if (newX > 0 && newY > 0) {
    maxX = newX;
    maxY = newY;
    render();
  }
});

/* --- 初期ロード --- */
loadDesks();
