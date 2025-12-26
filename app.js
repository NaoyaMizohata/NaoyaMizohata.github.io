

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

  // grid サイズ設定
  container.style.gridTemplateColumns = colSizes.map(v => v + "px").join(" ");
  container.style.gridTemplateRows = rowSizes.map(v => v + "px").join(" ");

  // container 幅・高さを desk サイズの合計で決定（gap は CSS に任せる）
  const totalWidth = colSizes.reduce((a, b) => a + b, 0);
  const totalHeight = rowSizes.reduce((a, b) => a + b, 0);
  container.style.width = totalWidth + "px";
  container.style.height = totalHeight + "px";

  // grid 用マップ
  const map = Array.from({ length: maxY }, () => Array(maxX).fill(null));
  desks.forEach(d => {
    if (d.x < maxX && d.y < maxY) map[d.y][d.x] = d;
  });

  // セル描画
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const desk = map[y][x];
      if (desk) {
        const deskEl = createDeskElement(desk);
        deskEl.style.gridColumnStart = x + 1;
        deskEl.style.gridRowStart = y + 1;
        container.appendChild(deskEl);
      } else {
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
          render();
        });
        // ＋ボタン（hover表示）
        const addBtn = document.createElement("button");
        addBtn.className = "add-desk-btn";
        addBtn.textContent = "+";
        
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          addDeskAt(x, y);
        });
        empty.appendChild(addBtn);
        empty.style.gridColumnStart = x + 1;
        empty.style.gridRowStart = y + 1;
        container.appendChild(empty);
      }
    }
  }

  createResizeBars(totalWidth, totalHeight);
}

/* --- デスク作成 --- */
function createDeskElement(desk) {
  const div = document.createElement("div");
  div.className = "desk " + desk.orientation;
  div.draggable = true;
  div.dataset.id = desk.id;

  if (desk.orientation === "horizontal") {
    div.style.width = deskWidth + "px";
    div.style.height = deskHeight + "px";
  } else {
    div.style.width = deskHeight + "px";
    div.style.height = deskWidth + "px";
  }

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
    render();
  });
  
  div.querySelector(".desk-content").addEventListener("contextmenu", (e) => {
    e.preventDefault(); // デフォルトのメニューをキャンセル
    openEditModal(desk); // 編集モーダルを開く
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
function createResizeBars(totalWidth, totalHeight) {
  document.querySelectorAll(".resize-col,.resize-row").forEach(b => b.remove());

  for (let i = 0; i < maxX - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.top = 0;
    bar.style.height = totalHeight + "px";
    bar.addEventListener("mousedown", e => startColResize(e, i));
    container.appendChild(bar);
  }

  for (let i = 0; i < maxY - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.style.top = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) - 5 + "px";
    bar.style.left = 0;
    bar.style.width = totalWidth + "px";
    bar.addEventListener("mousedown", e => startRowResize(e, i));
    container.appendChild(bar);
  }
}

/* --- 列・行サイズ変更 --- */
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
      
      document.getElementById("maxX").value = maxX;
      document.getElementById("maxY").value = maxY;
      
      render();
    } catch (err) {
      alert("JSON の読み込みに失敗しました");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

/* --- 列・行数適用 --- */
document.getElementById("applySize").addEventListener("click", () => {
  const newX = parseInt(document.getElementById("maxX").value, 10);
  const newY = parseInt(document.getElementById("maxY").value, 10);
  if (newX > 0 && newY > 0) {
    maxX = newX;
    maxY = newY;

    colSizes = colSizes.slice(0, maxX);
    while (colSizes.length < maxX) colSizes.push(deskWidth);
    rowSizes = rowSizes.slice(0, maxY);
    while (rowSizes.length < maxY) rowSizes.push(deskWidth);

    render();
  }
});

/* --- ボタンイベント --- */
document.getElementById("exportBtn").addEventListener("click", exportJSON);
document.getElementById("importInput").addEventListener("change", importJSON);

/* --- デスク追加 --- */
function addDeskAt(x, y) {
  // 念のためガード
  if (desks.some(d => d.x === x && d.y === y)) return;

  desks.push({
    id: "desk_" + Date.now(),
    x,
    y,
    orientation: "horizontal",
    label: "新しいデスク",
    pc: "",
    user: ""
  });

  render();
}

/* ---------- edit modal ---------- */
const modal = document.getElementById("edit-modal");
const labelInput = document.getElementById("edit-label");
const pcInput = document.getElementById("edit-pc");
const userInput = document.getElementById("edit-user");

function openEditModal(desk) {
  editingDeskId = desk.id;
  labelInput.value = desk.label;
  pcInput.value = desk.pc;
  userInput.value = desk.user;
}

document.getElementById("save-edit").onclick = () => {
  const desk = desks.find(d => d.id === editingDeskId);
  if (!desk) return;
  desk.label = labelInput.value;
  desk.pc = pcInput.value;
  desk.user = userInput.value;
  closeModal();
  render();
};

document.getElementById("delete-edit").onclick = () => {
  if (!confirm("削除しますか？")) return;
  desks = desks.filter(d => d.id !== editingDeskId);
  closeModal();
  render();
};

document.getElementById("cancel-edit").onclick = () => closeModal();

function closeModal() {
  editingDeskId = null;
  labelInput.value = "";
  pcInput.value = "";
  userInput.value = "";
}

/* --- 初期ロード --- */
loadDesks();
