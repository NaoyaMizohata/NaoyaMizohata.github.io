const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 70;
const initialCellSize = Math.max(deskWidth, deskHeight);

let colSizes = Array(maxX).fill(initialCellSize);
let rowSizes = Array(maxY).fill(initialCellSize);

/* --- 初期読み込み --- */
async function loadDesks() {
  const res = await fetch("seats.json");
  desks = (await res.json()).map(normalizeDesk);
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

/* --- render --- */
function render() {
  container.innerHTML = "";
  container.style.display = "grid";
  container.style.gridTemplateColumns = colSizes.map(v => v + "px").join(" ");
  container.style.gridTemplateRows = rowSizes.map(v => v + "px").join(" ");
  container.style.position = "relative";

  // マップ作成
  const map = Array.from({ length: maxY }, () => Array(maxX).fill(null));
  desks.forEach(d => {
    if (d.x < maxX && d.y < maxY) map[d.y][d.x] = d;
  });

  // セル描画
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const desk = map[y][x];
      if (desk) {
        container.appendChild(createDeskElement(desk));
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        empty.dataset.x = x;
        empty.dataset.y = y;
        empty.style.position = "relative";
        empty.style.width = "100%";
        empty.style.height = "100%";

        empty.addEventListener("dragover", e => e.preventDefault());
        empty.addEventListener("drop", e => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("id");
          const fromDesk = desks.find(d => d.id === fromId);
          if (!fromDesk) return;
          fromDesk.x = parseInt(empty.dataset.x, 10);
          fromDesk.y = parseInt(empty.dataset.y, 10);
          render();
        });

        container.appendChild(empty);
      }
    }
  }

  createResizeBars();
}

/* --- デスク作成 --- */
function createDeskElement(desk) {
  const div = document.createElement("div");
  div.className = "desk";
  div.draggable = true;
  div.dataset.id = desk.id;

  if (desk.orientation === "horizontal") {
    div.style.width = deskWidth + "px";
    div.style.height = deskHeight + "px";
  } else {
    div.style.width = deskHeight + "px";
    div.style.height = deskWidth + "px";
  }

  div.style.position = "relative";
  div.style.zIndex = 10;

  div.innerHTML = `
    <div class="desk-content" style="padding:8px;">
      <strong>${desk.label}</strong><br>
      PC: ${desk.pc}<br>
      ${desk.user}
    </div>
    <button class="rotate-btn" style="
      position:absolute;
      top:0;
      left:0;
      z-index:20;
      width:24px;
      height:24px;
      padding:0;
      margin:0;
    ">↻</button>
  `;

  div.querySelector(".rotate-btn").addEventListener("click", e => {
    e.stopPropagation();
    desk.orientation = desk.orientation === "horizontal" ? "vertical" : "horizontal";
    render();
  });

  addDnD(div);
  return div;
}

/* --- DnD --- */
function addDnD(el) {
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("id", el.dataset.id);
    el.style.zIndex = 100;
  });
  el.addEventListener("dragend", e => {
    el.style.zIndex = 10;
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
    }
    render();
  });
}

/* --- 行・列バー --- */
function createResizeBars() {
  document.querySelectorAll(".resize-col,.resize-row").forEach(b => b.remove());

  const totalWidth = colSizes.reduce((a, b) => a + b, 0);
  const totalHeight = rowSizes.reduce((a, b) => a + b, 0);

  // 列バー
  for (let i = 0; i < maxX - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.dataset.col = i;
    bar.style.position = "absolute";
    bar.style.width = "10px";
    bar.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.top = "0";
    bar.style.height = totalHeight + "px";
    bar.style.background = "transparent";
    bar.style.cursor = "col-resize";
    bar.style.zIndex = 20;
    bar.addEventListener("mousedown", e => startColResize(e, i));
    container.appendChild(bar);
  }

  // 行バー
  for (let i = 0; i < maxY - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.dataset.row = i;
    bar.style.position = "absolute";
    bar.style.height = "10px";
    bar.style.top = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.left = "0";
    bar.style.width = totalWidth + "px";
    bar.style.background = "transparent";
    bar.style.cursor = "row-resize";
    bar.style.zIndex = 20;
    bar.addEventListener("mousedown", e => startRowResize(e, i));
    container.appendChild(bar);
  }
}

/* --- 列・行幅変更 --- */
function startColResize(e, colIndex) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = colSizes[colIndex];
  function onMove(ev) {
    colSizes[colIndex] = Math.max(30, startWidth + (ev.clientX - startX));
    render();
  }
  function onUp() { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function startRowResize(e, rowIndex) {
  e.preventDefault();
  const startY = e.clientY;
  const startHeight = rowSizes[rowIndex];
  function onMove(ev) {
    rowSizes[rowIndex] = Math.max(30, startHeight + (ev.clientY - startY));
    render();
  }
  function onUp() { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

/* --- JSON 書き出し --- */
function exportJSON() {
  const data = { maxX, maxY, colSizes, rowSizes, desks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "seating.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* --- JSON インポート --- */
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.desks || !data.maxX || !data.maxY || !data.colSizes || !data.rowSizes) {
        alert("JSON の形式が正しくありません");
        return;
      }
      maxX = data.maxX;
      maxY = data.maxY;
      colSizes = data.colSizes;
      rowSizes = data.rowSizes;
      desks = data.desks.map(normalizeDesk);
      render();
    } catch (err) {
      alert("JSON の読み込みに失敗しました");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

/* --- 設定UI --- */
document.getElementById("applySize").addEventListener("click", () => {
  const newX = parseInt(document.getElementById("maxX").value, 10);
  const newY = parseInt(document.getElementById("maxY").value, 10);
  if (newX > 0 && newY > 0) {
    maxX = newX;
    maxY = newY;
    while (colSizes.length < maxX) colSizes.push(initialCellSize);
    while (rowSizes.length < maxY) rowSizes.push(initialCellSize);
    render();
  }
});

/* --- JSON 書き出しボタン --- */
document.getElementById("exportBtn").addEventListener("click", exportJSON);

/* --- JSON インポートボタン --- */
document.getElementById("importInput").addEventListener("change", importJSON);

/* --- 初期ロード --- */
loadDesks();
