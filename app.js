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


function normalizeDesk(desk) {
  return {
    rotation: 0,
    ...desk
  };
}

/* 描画 */
function render() {
  container.innerHTML = "";
  desks.forEach((desk, index) => {
    const div = document.createElement("div");
    div.className = "desk";
    div.draggable = true;
    div.dataset.index = index;

    div.style.transform = `rotate(${desk.rotation}deg)`;

    div.innerHTML = `
      <strong>${desk.label}</strong><br>
      PC: ${desk.pc}<br>
      ${desk.user}<br>
      <button class="rotate-btn">回転</button>
    `;

    // 回転ボタン
    div.querySelector(".rotate-btn").addEventListener("click", e => {
      e.stopPropagation(); // DnDと干渉しないように
      desk.rotation = (desk.rotation + 90) % 360;
      render();
    });

    addDnD(div);
    container.appendChild(div);
  });

  localStorage.setItem("desks", JSON.stringify(desks));
}

/* ドラッグ＆ドロップ */
function addDnD(el) {
  el.addEventListener("dragstart", e => {
    el.classList.add("dragging");
    e.dataTransfer.setData("text/plain", el.dataset.index);
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
  });

  el.addEventListener("dragover", e => {
    e.preventDefault();
  });

  el.addEventListener("drop", e => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    const to = Number(el.dataset.index);

    if (from === to) return;

    const temp = desks[from];
    desks[from] = desks[to];
    desks[to] = temp;

    render();
  });
}

loadDesks();
