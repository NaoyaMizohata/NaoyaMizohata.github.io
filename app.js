const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;
let colSizes = Array(maxX).fill(160); // px
let rowSizes = Array(maxY).fill(160); // px

/* グリッド情報 */
function updateGridTemplate() {
  container.style.gridTemplateColumns = colSizes.map(v => v + "px").join(" ");
  container.style.gridTemplateRows = rowSizes.map(v => v + "px").join(" ");
}


/* 初期データ読み込み */
async function loadDesks() {
  const saved = localStorage.getItem("desks");
  if (saved) {
    desks = JSON.parse(saved).map(normalizeDesk);
  } else {
    const res = await fetch("seats.json");
    desks = (await res.json()).map(normalizeDesk);
  }
  render();
}

function normalizeDesk(desk, index) {
  return {
    orientation: "horizontal",
    x: index % 6,
    y: Math.floor(index / 6),
    ...desk
  };
}

/* 描画 */
function render() {
  container.innerHTML = "";
  container.style.gridTemplateColumns = `repeat(${maxX}, 160px)`;
  container.style.gridAutoRows = `160px`;

  // 座席配置マップ作成
  const map = Array.from({ length: maxY }, () =>
    Array.from({ length: maxX }, () => null)
  );

  desks.forEach(d => {
    if (d.x < maxX && d.y < maxY) map[d.y][d.x] = d;
  });

  // 描画ループ
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      const desk = map[y][x];
      if (desk) {
        const div = createDeskElement(desk);
        container.appendChild(div);
      } else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        empty.dataset.x = x;
        empty.dataset.y = y;

        // 空セルへのドロップ対応
        empty.addEventListener("dragover", e => e.preventDefault());
        empty.addEventListener("drop", e => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData("id");
          const fromDesk = desks.find(d => d.id === fromId);
          [fromDesk.x, fromDesk.y] = [x, y];
          save();
          render();
        });

        container.appendChild(empty);
      }
    }
  }
}

/* ドラッグ＆ドロップ */
function addDnD(el) {
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("id", el.dataset.id);
  });

  el.addEventListener("dragover", e => e.preventDefault());

  el.addEventListener("drop", e => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("id");
    const fromDesk = desks.find(d => d.id === fromId);

    // ドロップ先が空席セルかデスクかを判定
    const toDeskId = el.dataset.id;

    if (toDeskId) {
      // デスク → デスク：座標をスワップ
      const toDesk = desks.find(d => d.id === toDeskId);
      [fromDesk.x, toDesk.x] = [toDesk.x, fromDesk.x];
      [fromDesk.y, toDesk.y] = [toDesk.y, fromDesk.y];
    } else if (el.classList.contains("empty-cell")) {
      // デスク → 空席セル：座標を移動
      fromDesk.x = parseInt(el.dataset.x, 10);
      fromDesk.y = parseInt(el.dataset.y, 10);
    }

    save();
    render();
  });
}

/* 保存関数 */
function save() {
  localStorage.setItem("desks", JSON.stringify(desks));
}

/* 座席数設定イベント */
document.getElementById("applySize").addEventListener("click", () => {
  const newX = parseInt(document.getElementById("maxX").value, 10);
  const newY = parseInt(document.getElementById("maxY").value, 10);

  if (newX > 0 && newY > 0) {
    maxX = newX;
    maxY = newY;
    render();
  }
});

/* デスク作成関数 */
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
    desk.orientation =
      desk.orientation === "horizontal" ? "vertical" : "horizontal";
    save();
    render();
  });

  addDnD(div);
  return div;
}

/* リサイズバー */
function createResizeBars() {
  // 列バー
  for (let i = 1; i < maxX; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.style.left = colSizes.slice(0,i).reduce((a,b)=>a+b,0) + "px";
    bar.addEventListener("mousedown", e => startColResize(e, i));
    container.appendChild(bar);
  }

  // 行バー
  for (let i = 1; i < maxY; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.style.top = rowSizes.slice(0,i).reduce((a,b)=>a+b,0) + "px";
    bar.addEventListener("mousedown", e => startRowResize(e, i));
    container.appendChild(bar);
  }
}

/* リサイズバーのドラッグ処理 */
function startColResize(e, index) {
  const startX = e.clientX;
  const startWidth = colSizes[index];

  function onMouseMove(ev) {
    const delta = ev.clientX - startX;
    colSizes[index] = Math.max(40, startWidth + delta);
    updateGridTemplate();
    createResizeBars();
  }

  function onMouseUp() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function startRowResize(e, index) {
  const startY = e.clientY;
  const startHeight = rowSizes[index];

  function onMouseMove(ev) {
    const delta = ev.clientY - startY;
    rowSizes[index] = Math.max(40, startHeight + delta);
    updateGridTemplate();
    createResizeBars();
  }

  function onMouseUp() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

loadDesks();
