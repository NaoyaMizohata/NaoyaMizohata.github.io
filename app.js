const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 70;
const initialColSize = deskWidth;
const initialRowSize = deskHeight;

let colSizes = Array(maxX).fill(initialColSize);
let rowSizes = Array(maxY).fill(initialRowSize);

const gapX = 10;
const gapY = 10;

/* --- 初期読み込み --- */
async function loadDesks() {
  try {
    const res = await fetch("seats.json");
    desks = (await res.json()).map(normalizeDesk);
  } catch {
    desks = [];
  }
  render();
}

function normalizeDesk(desk, index = 0) {
  return {
    orientation: "horizontal",
    anchorX: "left",
    anchorY: "top",
    x: index % maxX,
    y: Math.floor(index / maxX),
    id: desk.id || `desk${index}`,
    label: desk.label || `Desk${index + 1}`,
    pc: desk.pc || "",
    user: desk.user || "",
    ...desk
  };
}

/* --- render --- */
function render() {
  container.innerHTML = "";
  container.style.position = "relative"; // 親を relative に

  // 背景セル（灰色）
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const cell = document.createElement("div");
      cell.className = "empty-cell";
      cell.style.position = "absolute";
      cell.style.left = colSizes.slice(0, x).reduce((a, b) => a + b, 0) + x * gapX + "px";
      cell.style.top  = rowSizes.slice(0, y).reduce((a, b) => a + b, 0) + y * gapY + "px";
      cell.style.width = colSizes[x] + "px";
      cell.style.height = rowSizes[y] + "px";
      container.appendChild(cell);
    }
  }

  // デスク描画
  desks.forEach(desk => {
    const div = document.createElement("div");
    div.className = "desk " + desk.orientation;
    div.dataset.id = desk.id;

    const w = desk.orientation === "horizontal" ? deskWidth : deskHeight;
    const h = desk.orientation === "horizontal" ? deskHeight : deskWidth;
    div.style.width = w + "px";
    div.style.height = h + "px";
    div.style.position = "absolute";

    const cellLeft = colSizes.slice(0, desk.x).reduce((a, b) => a + b, 0) + desk.x * gapX;
    const cellTop  = rowSizes.slice(0, desk.y).reduce((a, b) => a + b, 0) + desk.y * gapY;

    div.style.left = desk.anchorX === "left" ? `${cellLeft}px` : `${cellLeft + colSizes[desk.x] - w}px`;
    div.style.top  = desk.anchorY === "top"  ? `${cellTop}px`  : `${cellTop + rowSizes[desk.y] - h}px`;

    div.innerHTML = `
      <div class="desk-content">
        <strong>${desk.label}</strong><br>
        PC: ${desk.pc}<br>
        ${desk.user}
      </div>
      <button class="rotate-btn">↻</button>
      <button class="flip-x-btn">↔</button>
      <button class="flip-y-btn">↕</button>
    `;

    // 回転
    div.querySelector(".rotate-btn").addEventListener("click", e => {
      e.stopPropagation();
      desk.orientation = desk.orientation === "horizontal" ? "vertical" : "horizontal";
      render();
    });

    // 左右（セル内角）
    div.querySelector(".flip-x-btn").addEventListener("click", e => {
      e.stopPropagation();
      desk.anchorX = desk.anchorX === "left" ? "right" : "left";
      render();
    });

    // 上下（セル内角）
    div.querySelector(".flip-y-btn").addEventListener("click", e => {
      e.stopPropagation();
      desk.anchorY = desk.anchorY === "top" ? "bottom" : "top";
      render();
    });

    addDnD(div);
    container.appendChild(div);
  });

  createResizeBars();
}

/* --- DnD --- */
function addDnD(el) {
  el.draggable = true;
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("id", el.dataset.id);
    el.style.zIndex = 100;
  });
  el.addEventListener("dragend", e => {
    el.style.zIndex = 10;
  });
}

/* --- 行・列バー --- */
function createResizeBars() {
  document.querySelectorAll(".resize-col,.resize-row").forEach(b => b.remove());

  const totalWidth = colSizes.reduce((a,b)=>a+b,0) + (maxX-1)*gapX;
  const totalHeight= rowSizes.reduce((a,b)=>a+b,0) + (maxY-1)*gapY;

  for (let i = 0; i < maxX-1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.style.left = colSizes.slice(0,i+1).reduce((a,b)=>a+b,0) + i*gapX - 5 + "px";
    bar.style.top = 0;
    bar.style.height = totalHeight + "px";
    bar.addEventListener("mousedown", e => startColResize(e,i));
    container.appendChild(bar);
  }

  for (let i = 0; i < maxY-1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.style.top = rowSizes.slice(0,i+1).reduce((a,b)=>a+b,0) + i*gapY - 5 + "px";
    bar.style.left = 0;
    bar.style.width = totalWidth + "px";
    bar.addEventListener("mousedown", e => startRowResize(e,i));
    container.appendChild(bar);
  }
}

/* --- 列・行リサイズ --- */
function startColResize(e, i) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = colSizes[i];
  function onMove(ev) {
    colSizes[i] = Math.max(30, startWidth + (ev.clientX - startX));
    render();
  }
  function onUp(){ window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp);}
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}
function startRowResize(e, i) {
  e.preventDefault();
  const startY = e.clientY;
  const startHeight = rowSizes[i];
  function onMove(ev) {
    rowSizes[i] = Math.max(30, startHeight + (ev.clientY - startY));
    render();
  }
  function onUp(){ window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp);}
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

/* --- JSON --- */
function exportJSON() {
  const data = { maxX,maxY,colSizes,rowSizes,desks };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download="seating.json";
  a.click();
}
function importJSON(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      maxX = data.maxX; maxY = data.maxY;
      colSizes = data.colSizes; rowSizes = data.rowSizes;
      desks = data.desks.map(normalizeDesk);
      render();
    } catch(err){ alert("JSON読み込み失敗"); console.error(err);}
  };
  reader.readAsText(file);
}

/* --- 初期ロード --- */
loadDesks();
