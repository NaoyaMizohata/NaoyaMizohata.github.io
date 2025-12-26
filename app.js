const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 70;

let colSizes = Array(maxX).fill(deskWidth);
let rowSizes = Array(maxY).fill(deskHeight);

/* --- 初期読み込み --- */
async function loadDesks() {
  const saved = localStorage.getItem("desks");
  if (saved) desks = JSON.parse(saved).map(normalizeDesk);
  else {
    const res = await fetch("seats.json");
    desks = (await res.json()).map(normalizeDesk);
  }

  const savedSizes = JSON.parse(localStorage.getItem("gridSizes") || "{}");
  if (savedSizes.colSizes) colSizes = savedSizes.colSizes;
  if (savedSizes.rowSizes) rowSizes = savedSizes.rowSizes;

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
  localStorage.setItem("gridSizes", JSON.stringify({ colSizes, rowSizes }));
}

/* --- render --- */
function render() {
  container.innerHTML = "";
  container.style.gridTemplateColumns = colSizes.map(v => v + "px").join(" ");
  container.style.gridTemplateRows = rowSizes.map(v => v + "px").join(" ");

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

  createResizeBars();
}

/* --- デスク要素作成 --- */
function createDeskElement(desk) {
  const div = document.createElement("div");
  div.className = "desk";
  div.draggable = true;
  div.dataset.id = desk.id;

  div.style.gridColumn = desk.x + 1;
  div.style.gridRow = desk.y + 1;
  div.style.width = deskWidth + "px";
  div.style.height = deskHeight + "px";
  div.style.position = "relative";

  // transform 回転で縦向きにする
  if (desk.orientation === "vertical") {
    div.style.transform = "rotate(90deg)";
    div.style.transformOrigin = "center";
  } else {
    div.style.transform = "none";
  }

  div.innerHTML = `
    <div class="desk-content" style="padding:8px;">
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

/* --- 列・行バー作成 --- */
function createResizeBars() {
  document.querySelectorAll(".resize-col, .resize-row").forEach(b => b.remove());

  // 列バー
  for (let i = 0; i < maxX - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.dataset.col = i;
    bar.style.width = "10px";
    bar.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.top = "0";
    bar.style.height = container.offsetHeight + "px";
    bar.style.background = "transparent";
    bar.style.position = "absolute";
    bar.style.cursor = "col-resize";
    bar.addEventListener("mousedown", e => startColResize(e, i));
    container.appendChild(bar);
  }

  // 行バー
  for (let i = 0; i < maxY - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.dataset.row = i;
    bar.style.height = "10px";
    bar.style.top = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.left = "0";
    bar.style.width = container.offsetWidth + "px";
    bar.style.background = "transparent";
    bar.style.position = "absolute";
    bar.style.cursor = "row-resize";
    bar.addEventListener("mousedown", e => startRowResize(e, i));
    container.appendChild(bar);
  }
}

/* --- 列幅変更 --- */
function startColResize(e, colIndex) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = colSizes[colIndex];

  function onMove(ev) {
    colSizes[colIndex] = Math.max(30, startWidth + (ev.clientX - startX));
    container.style.gridTemplateColumns = colSizes.map(v => v + "px").join(" ");
    updateColBars();
  }

  function onUp() {
    save();
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function updateColBars() {
  document.querySelectorAll(".resize-col").forEach(b => {
    const i = parseInt(b.dataset.col, 10);
    b.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
  });
}

/* --- 行幅変更 --- */
function startRowResize(e, rowIndex) {
  e.preventDefault();
  const startY = e.clientY;
  const startHeight = rowSizes[rowIndex];

  function onMove(ev) {
    rowSizes[rowIndex] = Math.max(30, startHeight + (ev.clientY - startY));
    container.style.gridTemplateRows = rowSizes.map(v => v + "px").join(" ");
    updateRowBars();
  }

  function onUp() {
    save();
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function updateRowBars() {
  document.querySelectorAll(".resize-row").forEach(b => {
    const i = parseInt(b.dataset.row, 10);
    b.style.top = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
  });
}

/* --- 設定UI --- */
document.getElementById("applySize").addEventListener("click", () => {
  const newX = parseInt(document.getElementById("maxX").value, 10);
  const newY = parseInt(document.getElementById("maxY").value, 10);
  if (newX > 0 && newY > 0) {
    maxX = newX;
    maxY = newY;

    while (colSizes.length < maxX) colSizes.push(deskWidth);
    while (rowSizes.length < maxY) rowSizes.push(deskHeight);

    render();
  }
});

/* --- 初期化ボタン --- */
document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("本当に保存データを初期化しますか？")) return;

  localStorage.removeItem("desks");
  localStorage.removeItem("gridSizes");

  colSizes = Array(maxX).fill(deskWidth);
  rowSizes = Array(maxY).fill(deskHeight);
  desks = desks.map(normalizeDesk);
  render();
});

/* --- 初期ロード --- */
loadDesks();
