const container = document.getElementById("desk-container");

let maxX = 6;
let maxY = 4;

const deskWidth = 140;
const deskHeight = 70;
const gapX = 10;
const gapY = 10;

let colSizes = Array(maxX).fill(deskWidth);
let rowSizes = Array(maxY).fill(deskHeight);

let desks = [];
let editingDeskId = null;

/* ---------- render ---------- */
function render() {
  container.innerHTML = "";

  const totalWidth =
    colSizes.reduce((a, b) => a + b, 0) + (maxX - 1) * gapX;
  const totalHeight =
    rowSizes.reduce((a, b) => a + b, 0) + (maxY - 1) * gapY;

  container.style.width = totalWidth + "px";
  container.style.height = totalHeight + "px";

  // 空きセル
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < maxX; x++) {
      if (desks.some(d => d.x === x && d.y === y)) continue;

      const cell = document.createElement("div");
      cell.className = "empty-cell";
      cell.style.left = calcX(x) + "px";
      cell.style.top = calcY(y) + "px";
      cell.style.width = colSizes[x] + "px";
      cell.style.height = rowSizes[y] + "px";

      const btn = document.createElement("button");
      btn.className = "add-desk-btn";
      btn.textContent = "+";
      btn.onclick = e => {
        e.stopPropagation();
        addDeskAt(x, y);
      };

      cell.appendChild(btn);
      container.appendChild(cell);
    }
  }

  // デスク
  desks.forEach(desk => {
    const div = document.createElement("div");
    div.className = "desk";
    div.style.left = calcX(desk.x) + "px";
    div.style.top = calcY(desk.y) + "px";

    if (desk.orientation === "vertical") {
      div.style.width = deskHeight + "px";
      div.style.height = deskWidth + "px";
    } else {
      div.style.width = deskWidth + "px";
      div.style.height = deskHeight + "px";
    }

    div.innerHTML = `
      <button class="rotate-btn">↻</button>
      <div class="desk-content">
        <strong>${desk.label}</strong><br>
        PC:${desk.pc}<br>
        ${desk.user}
      </div>
    `;

    div.querySelector(".rotate-btn").onclick = e => {
      e.stopPropagation();
      desk.orientation =
        desk.orientation === "horizontal" ? "vertical" : "horizontal";
      render();
    };

    div.ondblclick = e => {
      e.stopPropagation();
      openEditModal(desk);
    };

    container.appendChild(div);
  });
}

/* ---------- helpers ---------- */
function calcX(x) {
  return colSizes.slice(0, x).reduce((a, b) => a + b, 0) + x * gapX;
}

function calcY(y) {
  return rowSizes.slice(0, y).reduce((a, b) => a + b, 0) + y * gapY;
}

/* ---------- desk add ---------- */
function addDeskAt(x, y) {
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
  modal.style.display = "flex";
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

document.getElementById("cancel-edit").onclick = closeModal;

function closeModal() {
  modal.style.display = "none";
  editingDeskId = null;
}

/* ---------- JSON ---------- */
document.getElementById("exportBtn").onclick = () => {
  const data = { maxX, maxY, colSizes, rowSizes, desks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "seating.json";
  a.click();
};

document.getElementById("importInput").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    maxX = data.maxX;
    maxY = data.maxY;
    colSizes = data.colSizes;
    rowSizes = data.rowSizes;
    desks = data.desks;
    render();
  };
  reader.readAsText(file);
};

/* ---------- init ---------- */
render();
