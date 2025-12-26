const container = document.getElementById("desk-container");
let desks = [];
let maxX = 6;
let maxY = 4;
let colSizes = Array(maxX).fill(160);
let rowSizes = Array(maxY).fill(160);

/* --- 初期読み込み --- */
async function loadDesks() {
  const saved = localStorage.getItem("desks");
  if (saved) {
    desks = JSON.parse(saved).map(normalizeDesk);
  } else {
    const res = await fetch("seats.json");
    desks = (await res.json()).map(normalizeDesk);
  }

  // 幅・高さをLocalStorageから読み込む
  const savedSizes = JSON.parse(localStorage.getItem("gridSizes") || "{}");
  if (savedSizes.colSizes) colSizes = savedSizes.colSizes;
  if (savedSizes.rowSizes) rowSizes = savedSizes.rowSizes;

  render();
}

function normalizeDesk(desk, index=0) {
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

  // グリッドテンプレート
  container.style.gridTemplateColumns = colSizes.map(v=>v+"px").join(" ");
  container.style.gridTemplateRows = rowSizes.map(v=>v+"px").join(" ");

  // マップ作成
  const map = Array.from({ length: maxY }, ()=>Array(maxX).fill(null));
  desks.forEach(d => {
    if (d.x < maxX && d.y < maxY) map[d.y][d.x] = d;
  });

  // 描画
  for (let y=0; y<maxY; y++) {
    for (let x=0; x<maxX; x++) {
      const desk = map[y][x];
      if (desk) container.appendChild(createDeskElement(desk));
      else {
        const empty = document.createElement("div");
        empty.className = "empty-cell";
        empty.dataset.x = x;
        empty.dataset.y = y;
        container.appendChild(empty);
      }
    }
  }

  createResizeBars();
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

  div.querySelector(".rotate-btn").addEventListener("click", e=>{
    e.stopPropagation();
    desk.orientation = desk.orientation==="horizontal"?"vertical":"horizontal";
    save();
    render();
  });

  addDnD(div);
  return div;
}

/* --- DnD --- */
function addDnD(el){
  el.addEventListener("dragstart", e=>{
    e.dataTransfer.setData("id", el.dataset.id);
  });

  el.addEventListener("dragover", e=>e.preventDefault());
  el.addEventListener("drop", e=>{
    e.preventDefault();
    const fromId = e.dataTransfer.getData("id");
    const fromDesk = desks.find(d=>d.id===fromId);

    const toDeskId = el.dataset.id;
    if(toDeskId){
      const toDesk = desks.find(d=>d.id===toDeskId);
      [fromDesk.x, toDesk.x] = [toDesk.x, fromDesk.x];
      [fromDesk.y, toDesk.y] = [toDesk.y, fromDesk.y];
    } else if(el.classList.contains("empty-cell")){
      fromDesk.x = parseInt(el.dataset.x,10);
      fromDesk.y = parseInt(el.dataset.y,10);
    }
    save();
    render();
  });
}

/* --- グリッドリサイズバー --- */
function createResizeBars(){
  // remove old bars
  document.querySelectorAll(".resize-col, .resize-row").forEach(b=>b.remove());

  // 列バー
  for(let i=1;i<maxX;i++){
    const bar = document.createElement("div");
    bar.className="resize-col";
    bar.style.left = colSizes.slice(0,i).reduce((a,b)=>a+b,0)+"px";
    bar.addEventListener("mousedown", e=>startColResize(e,i));
    container.appendChild(bar);
  }

  // 行バー
  for(let i=1;i<maxY;i++){
    const bar = document.createElement("div");
    bar.className="resize-row";
    bar.style.top = rowSizes.slice(0,i).reduce((a,b)=>a+b,0)+"px";
    bar.addEventListener("mousedown", e=>startRowResize(e,i));
    container.appendChild(bar);
  }
}

function startColResize(e,index){
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = colSizes[index];

  function onMove(ev){
    const delta = ev.clientX - startX;
    colSizes[index] = Math.max(40,startWidth + delta);

    // renderは呼ばず、バー位置のみ更新
    const bar = document.querySelectorAll(".resize-col")[index-1];
    if(bar) bar.style.left = colSizes.slice(0,index).reduce((a,b)=>a+b,0)+"px";

    // デスクは grid-column で自動追従するので問題なし
    container.style.gridTemplateColumns = colSizes.map(v=>v+"px").join(" ");
  }

  function onUp(){
    save();
    render(); // ドラッグ終了時に正確な描画
    window.removeEventListener("mousemove",onMove);
    window.removeEventListener("mouseup",onUp);
  }

  window.addEventListener("mousemove",onMove);
  window.addEventListener("mouseup",onUp);
}

function startRowResize(e,index){
  e.preventDefault();
  const startY = e.clientY;
  const startHeight = rowSizes[index];

  function onMove(ev){
    const delta = ev.clientY - startY;
    rowSizes[index] = Math.max(40,startHeight+delta);

    const bar = document.querySelectorAll(".resize-row")[index-1];
    if(bar) bar.style.top = rowSizes.slice(0,index).reduce((a,b)=>a+b,0)+"px";

    container.style.gridTemplateRows = rowSizes.map(v=>v+"px").join(" ");
  }

  function onUp(){
    save();
    render();
    window.removeEventListener("mousemove",onMove);
    window.removeEventListener("mouseup",onUp);
  }

  window.addEventListener("mousemove",onMove);
  window.addEventListener("mouseup",onUp);
}

/* --- 設定UI --- */
document.getElementById("applySize").addEventListener("click",()=>{
  const newX = parseInt(document.getElementById("maxX").value,10);
  const newY = parseInt(document.getElementById("maxY").value,10);
  if(newX>0 && newY>0){
    maxX = newX;
    maxY = newY;

    // 配列を拡張
    while(colSizes.length<maxX) colSizes.push(160);
    while(rowSizes.length<maxY) rowSizes.push(160);

    render();
  }
});

/* --- 初期ロード --- */
loadDesks();
