const container = document.getElementById("desk-container");
let desks = [];

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

  desks.forEach((desk, index) => {
    const div = document.createElement("div");
    div.className = `desk ${desk.orientation}`;
    div.draggable = true;

    div.style.gridColumn = desk.x + 1;
    div.style.gridRow = desk.y + 1;

    div.dataset.id = desk.id;

    div.innerHTML = `
      <div class="desk-content">
        <strong>${desk.label}</strong><br>
        PC: ${desk.pc}<br>
        ${desk.user}
      </div>
      <button class="rotate-btn">↻</button>
    `;

    // 向き切り替え
    div.querySelector(".rotate-btn").addEventListener("click", e => {
      e.stopPropagation();
      desk.orientation =
        desk.orientation === "horizontal" ? "vertical" : "horizontal";
      save();
      render();
    });

    addDnD(div);
    container.appendChild(div);
  });
}

/* ドラッグ＆ドロップ */
function addDnD(el) {
  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData("id", el.dataset.id);
  });

  el.addEventListener("dragover", e => {
    e.preventDefault();
  });

  el.addEventListener("drop", e => {
    e.preventDefault();

    const fromId = e.dataTransfer.getData("id");
    const toId = el.dataset.id;

    if (fromId === toId) return;

    const from = desks.find(d => d.id === fromId);
    const to = desks.find(d => d.id === toId);

    // 座標をスワップ
    [from.x, to.x] = [to.x, from.x];
    [from.y, to.y] = [to.y, from.y];

    save();
    render();
  });
}

/* 保存関数 */
function save() {
  localStorage.setItem("desks", JSON.stringify(desks));
}


loadDesks();
