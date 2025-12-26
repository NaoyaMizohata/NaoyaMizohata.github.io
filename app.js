const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 80;

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

  if (desk.orientation === "horizontal") {
    div.style.width = deskWidth + "px";
    div.style.height = deskHeight + "px";
    div.classList.add("horizontal");
    div.classList.remove("vertical");
  } else {
    div.style.width = deskHeight + "px";
    div.style.height = deskWidth + "px";
    div.classList.add("vertical");
    div.classList.remove("horizontal");
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

  for (let i = 0; i < maxX - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-col";
    bar.dataset.col = i;
    bar.style.width = colSizes[i] + "px";
    bar.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) + "px";
    bar.addEventListener("mousedown", e => startColResize(e, i));
    container.appendChild(bar);
  }

  for (let i = 0; i < maxY - 1; i++) {
    const bar = document.createElement("div");
    bar.className = "resize-row";
    bar.dataset.row = i;
    bar.style.height = rowSizes[i] + "px";
    bar.style.top = rowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) + "px";
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
    colSizes[colIndex] = Math.max(40, startWidth + (ev.clientX - startX));
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
    b.style.width = colSizes[i] + "px";
    b.style.left = colSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) + "px";
  });
}
