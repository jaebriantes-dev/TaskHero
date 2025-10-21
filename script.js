document.addEventListener("DOMContentLoaded", ()=>{

// TaskHero — Offline Fantasy RPG Final
const STORAGE = {
  TASKS: "th_tasks_offline",
  PROG: "th_progress_offline",
  ACH: "th_ach_offline"
};

let tasks = [], totalXP=0, level=1, achievements=[];
const XP_PER_TASK = 100, XP_PER_LEVEL = 1000, FILE_MAX_MB = 5;

// --- Elements ---
const taskListEl = document.getElementById("taskList");
const addTaskBtn = document.getElementById("addTaskBtn");
const titleInput = document.getElementById("taskTitle");
const descInput = document.getElementById("taskDesc");
const timerInput = document.getElementById("taskTimer");
const typeInput = document.getElementById("taskType");
const pendingCount = document.getElementById("pendingCount");

const xpFill = document.getElementById("xpFill");
const xpBar = document.getElementById("xpBar");
const levelNum = document.getElementById("levelNum");
const xpTotalEl = document.getElementById("xpTotal");
const xpProgressText = document.getElementById("xpProgressText");
const starIcon = document.getElementById("starIcon");
const sparkles = document.getElementById("sparkles");

const achGallery = document.getElementById("achGallery");
const achHistory = document.getElementById("achHistory");

const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalTimer = document.getElementById("modalTimer");
const startTimerBtn = document.getElementById("startTimerBtn");
const fileInput = document.getElementById("fileInput");
const fileListEl = document.getElementById("fileList");
const doneTaskBtn = document.getElementById("doneTaskBtn");
const closeSave = document.getElementById("closeSave");
const popup = document.getElementById("popup");

const levelUpBanner = document.getElementById("levelUpBanner");
const levelCanvas = document.getElementById("levelCanvas");
const newLevelSpan = document.getElementById("newLevel");

const btnExport = document.getElementById("btnExport");
const importFile = document.getElementById("importFile");
const btnClear = document.getElementById("btnClear");

const muteBtn = document.getElementById("muteBtn");
let muted = false;
let currentModalTaskId = null, timerInterval=null;

// --- Utility Functions ---
function uid(){ return 't_'+Math.random().toString(36).slice(2,9); }
function esc(s){ return (s||"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; } // New Utility

function initAchievements(){
  achievements = [];
  // New achievement tiers for a more RPG feel
  const tiers = [
    {level: 10, name: "Warrior"},
    {level: 20, name: "Knight"},
    {level: 30, name: "Paladin"},
    {level: 40, name: "Champion"},
    {level: 50, name: "Grand Master"},
    {level: 60, name: "Legendary Hero"},
    {level: 70, name: "Ascendant"},
    {level: 80, name: "Royal Vanguard"},
    {level: 90, name: "Sovereign"},
    {level: 100, name: "Mythical King"}
  ];

  tiers.forEach(t => {
    achievements.push({
      levelTrigger: t.level,
      title: `${t.name} Tier ${t.level}`,
      unlocked: false,
      unlockedAt: null
    });
  });
}

// --- Storage Helpers ---
function saveAll(){
  localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks));
  localStorage.setItem(STORAGE.PROG, JSON.stringify({ totalXP, level }));
  localStorage.setItem(STORAGE.ACH, JSON.stringify(achievements));
}

function loadAll(){
  tasks = JSON.parse(localStorage.getItem(STORAGE.TASKS) || "[]");
  const prog = JSON.parse(localStorage.getItem(STORAGE.PROG) || "null");
  if(prog){
    totalXP = prog.totalXP ?? 0;
    level = prog.level ?? (Math.floor(totalXP/XP_PER_LEVEL)+1);
  } else { totalXP=0; level=1; }
  achievements = JSON.parse(localStorage.getItem(STORAGE.ACH) || "[]");
  // Re-initialize achievements if stored data is missing or doesn't match the expected structure (for a safe update)
  if(!achievements || achievements.length===0 || achievements.length !== 10) initAchievements();
}

// --- RENDER ALL / UI Update ---
function renderTasks(){
  taskListEl.innerHTML="";
  const pending = tasks.filter(t=>!t.done).length;
  pendingCount.textContent = `(${pending} pending)`;
  if(tasks.length===0){ 
    taskListEl.innerHTML=`<li class="task-item" style="justify-content:center;color:var(--muted)">No quests yet — add your first quest!</li>`;
    return;
  }
  tasks.forEach(t=>{
    const li=document.createElement("li");
    li.className="task-item"; li.dataset.id=t.id;
    li.innerHTML=`<div><div class="task-title">${esc(t.title)}</div><div class="small">${t.timerMinutes?`${t.timerMinutes} min`:""} · ${esc(t.type||"General")}</div></div><div class="task-tag">${t.done?"Done":"Open"}</div>`;
    if(t.done) li.style.opacity="0.6";
    li.addEventListener("click", ()=>openTaskModal(t.id));
    taskListEl.appendChild(li);
  });
}

function renderProgressUI(){
  levelNum.textContent = level;
  xpTotalEl.textContent = totalXP;
  const toNext = totalXP % XP_PER_LEVEL;
  const pct = Math.min(100, Math.round((toNext/XP_PER_LEVEL)*100));
  xpFill.style.width=`${pct}%`;
  xpProgressText.textContent=`${toNext} / ${XP_PER_LEVEL} XP`;
  const barW = xpBar.clientWidth || 600;
  const left = Math.max(12,(pct/100)*(barW-36));
  starIcon.style.left=`${left}px`;
}

function renderAchievements(){
  achGallery.innerHTML="";
  achievements.forEach(a=>{
    const li=document.createElement("li");
    li.className=`ach-card ${a.unlocked?"":"locked"}`;
    li.innerHTML=`<div>${a.title}</div><small>${a.unlocked?"Unlocked":"Locked"}</small>`;
    achGallery.appendChild(li);
  });
}

function renderAchHistory(){
  achHistory.innerHTML="";
  const unlocked = achievements.filter(a=>a.unlocked).sort((a,b)=>b.unlockedAt-a.unlockedAt);
  if(unlocked.length===0) achHistory.innerHTML=`<li style="color:var(--muted)">No achievements yet.</li>`;
  unlocked.forEach(a=>{
    const li=document.createElement("li");
    li.textContent=`${a.title} • ${new Date(a.unlockedAt).toLocaleString()}`;
    achHistory.appendChild(li);
  });
}

// **New central rendering function**
function renderAll(){
  renderTasks();
  renderProgressUI();
  renderAchievements();
  renderAchHistory();
}

// --- Task CRUD ---
function addTaskObj(title, desc, timerMinutes, type){
  const t={id:uid(), title, desc, timerMinutes:timerMinutes||0, type, uploads:[], done:false, createdAt:Date.now(), doneAt:null};
  tasks.unshift(t);
  saveAll();
  renderAll(); // <--- RENDER FIX
}

// Event listener for adding a task
addTaskBtn.addEventListener("click", ()=>{
  const title = titleInput.value.trim();
  if (!title) { showPopup("Quest title is required!"); return; }
  addTaskObj(
    title,
    descInput.value.trim(),
    parseInt(timerInput.value) || 0,
    typeInput.value
  );
  titleInput.value = "";
  descInput.value = "";
  timerInput.value = "";
});


function updateTask(t){
  const i=tasks.findIndex(x=>x.id===t.id);
  if(i>=0){ tasks[i]=t; saveAll(); renderTasks(); } // Only renderTasks needed if just file list changes
}

function removeTaskById(id){
  tasks = tasks.filter(t=>t.id!==id); saveAll(); renderAll(); // <--- RENDER FIX
}

// --- Modal ---
function openTaskModal(id){
  const t = tasks.find(x=>x.id===id); if(!t) return;
  currentModalTaskId = id;
  modalTitle.textContent=t.title;
  modalDesc.textContent=t.desc||"(no description)";
  modalTimer.textContent=t.timerMinutes?`${t.timerMinutes} min`:"—";
  fileListEl.innerHTML="";
  t.uploads.forEach((f, idx)=> addFileListItem(f, idx));
  doneTaskBtn.textContent=t.done? "Completed":`Mark Done (+${XP_PER_TASK} XP)`;
  doneTaskBtn.disabled = t.done;
  modal.classList.remove("hidden");
}

function closeTaskModal(){ currentModalTaskId=null; modal.classList.add("hidden"); clearInterval(timerInterval); timerInterval=null; startTimerBtn.disabled=false; } // Added startTimerBtn.disabled=false;

// --- File handling ---
fileInput.addEventListener("change", async ev=>{
  const files = Array.from(ev.target.files);
  if(!currentModalTaskId){ alert("Open a quest first!"); fileInput.value=""; return; }
  const t = tasks.find(x=>x.id===currentModalTaskId);
  for(const f of files){
    if(f.size>FILE_MAX_MB*1024*1024){ alert(`File "${f.name}" too big. Max ${FILE_MAX_MB}MB.`); continue; }
    const data = await fileToBase64(f);
    t.uploads.push({ name:f.name, type:f.type, size:f.size, data });
  }
  updateTask(t); openTaskModal(currentModalTaskId); fileInput.value="";
});

function fileToBase64(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload=()=>res(reader.result);
    reader.onerror=()=>rej("read error");
    reader.readAsDataURL(file);
  });
}

function addFileListItem(fileObj, idx){
  const li=document.createElement("li");
  const sizeKB=Math.round((fileObj.size||0)/1024);
  li.innerHTML=`<div style="flex:1"><div style="font-weight:700">${esc(fileObj.name)}</div><div style="font-size:12px;color:var(--muted)">${fileObj.type || "file"} • ${sizeKB} KB</div></div><div style="display:flex;gap:8px;align-items:center">${fileObj.type&&fileObj.type.startsWith("image/")?`<button class="btn small preview">Preview</button>`:""}<button class="btn small remove">Remove</button></div>`;
  li.querySelectorAll(".remove").forEach(btn=>btn.addEventListener("click", ()=>{
    const t=tasks.find(x=>x.id===currentModalTaskId); t.uploads.splice(idx,1); updateTask(t); openTaskModal(currentModalTaskId);
  }));
  const prev = li.querySelector(".preview");
  if(prev){ prev.addEventListener("click", ()=>{ if(fileObj.data){ const w=window.open(); w.document.write(`<title>${esc(fileObj.name)}</title><img src="${fileObj.data}" style="max-width:100%"/>`); } else alert("No preview"); }); }
  fileListEl.appendChild(li);
}

// --- Timer ---
startTimerBtn.addEventListener("click", ()=>{
  const t=tasks.find(x=>x.id===currentModalTaskId);
  if(!t||!t.timerMinutes){ alert("This quest has no timer."); return; }
  let seconds = t.timerMinutes*60; modalTimer.textContent=formatTime(seconds); startTimerBtn.disabled=true;
  // Clear any existing interval just in case
  if(timerInterval) clearInterval(timerInterval);
  timerInterval=setInterval(()=>{ seconds--; modalTimer.textContent=formatTime(seconds); if(seconds<=0){ clearInterval(timerInterval); timerInterval=null; startTimerBtn.disabled=false; showPopup("⏱ Time's up!"); } },1000);
});
function formatTime(sec){ const m=Math.floor(sec/60).toString().padStart(2,"0"); const s=Math.floor(sec%60).toString().padStart(2,"0"); return `${m}:${s}`; }

// --- Quest Completion ---
doneTaskBtn.addEventListener("click", ()=>{
  if(!currentModalTaskId) return;
  const t = tasks.find(x=>x.id===currentModalTaskId); if(!t) return;
  if(t.done){ alert("Already completed."); return; }
  t.done=true; t.doneAt=Date.now();
  updateTask(t);
  gainXP(XP_PER_TASK); // gainXP handles saveAll and renderAll
  closeTaskModal();
  showPopup(`+${XP_PER_TASK} XP — Quest Complete!`);
});

// --- Modal close listeners ---
closeModal.addEventListener("click", closeTaskModal);
closeSave.addEventListener("click", closeTaskModal);
modal.addEventListener("click", e=>{ if(e.target===modal) closeTaskModal(); });

// --- Mute ---
muteBtn.addEventListener("click", ()=>{
  muted=!muted; muteBtn.textContent=muted?"🔇":"🔊";
  showPopup(muted?"Sound muted":"Sound enabled");
});

// --- Audio Engine ---
const AudioEngine=(function(){
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  let allowed=true;
  function playBeep(frequency=880,duration=0.12,type="sine",gain=0.06){
    if(muted||!allowed) return;
    // Check if context is suspended (common on initial page load before user interaction)
    if (ctx.state === 'suspended') { ctx.resume(); }
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.type=type; o.frequency.value=frequency; g.gain.value=0;
    o.connect(g); g.connect(ctx.destination);
    const now=ctx.currentTime;
    g.gain.linearRampToValueAtTime(gain, now+0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now+duration);
    o.stop(now+duration+0.02);
  }
  function playXp(){ playBeep(880,0.08,"sine",0.05); setTimeout(()=>playBeep(1200,0.06,"sine",0.04),90); }
  function playLevelUp(){ playBeep(520,0.18,"triangle",0.085); setTimeout(()=>playBeep(740,0.18,"triangle",0.085),180); setTimeout(()=>playBeep(980,0.25,"sawtooth",0.12),360); }
  return {playXp,playLevelUp};
})();

// --- Particles ---
let particles=[];
function spawnParticles(x,y){ const count=26; for(let i=0;i<count;i++){ particles.push({ x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.9)*6-2,life:800+Math.random()*700,size:6+Math.random()*8,color:`hsl(${30+Math.random()*30},90%,60%)`,born:performance.now() }); } animateCanvas(); }
let canvasAnimId=null;
function animateCanvas(){
  if(!levelCanvas) return;
  const ctx=levelCanvas.getContext("2d");
  const rect=levelCanvas.getBoundingClientRect();
  levelCanvas.width=rect.width; levelCanvas.height=rect.height;
  const now=performance.now();
  ctx.clearRect(0,0,levelCanvas.width,levelCanvas.height);
  particles=particles.filter(p=>now-p.born<p.life);
  particles.forEach(p=>{ const age=(now-p.born)/p.life; p.x+=p.vx; p.y+=p.vy+0.5*age; p.vy+=0.06; ctx.globalAlpha=1-age; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(1-age),0,Math.PI*2); ctx.fill(); });
  if(particles.length>0) canvasAnimId=requestAnimationFrame(animateCanvas);
  else { ctx.clearRect(0,0,levelCanvas.width,levelCanvas.height); if(canvasAnimId) cancelAnimationFrame(canvasAnimId); canvasAnimId=null; }
}

// --- XP & Leveling ---
function gainXP(amount){
  AudioEngine.playXp();
  starIcon.classList.remove("star-gain"); void starIcon.offsetWidth; starIcon.classList.add("star-gain");
  sparklesBurst();
  totalXP+=amount; const oldLevel=level;
  const newLevel=Math.floor(totalXP/XP_PER_LEVEL)+1;
  if(newLevel>oldLevel){ 
    for(let L=oldLevel+1;L<=newLevel;L++){ 
      if (L % 5 === 0) { // Check for every 5th level
        const bonusXP = getRandomInt(100, 300);
        totalXP += bonusXP; // Apply the bonus immediately
        showPopup(`✨ Level ${L} Bonus: +${bonusXP} XP!`);
      }
      unlockForLevel(L); 
      showLevelUp(L); 
    } 
    level=newLevel; 
    AudioEngine.playLevelUp(); 
  }
  saveAll();
  renderAll(); // <--- CRITICAL FIX: Ensure UI updates after XP gain
}

function unlockForLevel(L){
  // Check for achievements that trigger at this level or lower
  const ach=achievements.find(a=>a.levelTrigger===L && !a.unlocked);
  // In case of level skipping, we now check L instead of just a multiple of 10
  if(ach && !ach.unlocked){
    ach.unlocked=true;
    ach.unlockedAt=Date.now();
    saveAll();
    showPopup(`🏆 Achievement unlocked: ${ach.title}`);
  }
}

function sparklesBurst(){ sparkles.innerHTML=''; for(let i=0;i<8;i++){ const s=document.createElement('div'); s.className='spark'; s.style.left=`${Math.random()*100}%`; s.style.top=`${Math.random()*100}%`; sparkles.appendChild(s); setTimeout(()=>s.remove(),900); } }

function showLevelUp(L){
  newLevelSpan.textContent=L; levelUpBanner.classList.remove('hidden'); levelUpBanner.querySelector('.levelup-card').classList.add('show');
  // Ensure canvas size is updated before getting rect for particle positioning
  const rect=levelUpBanner.getBoundingClientRect();
  spawnParticles(rect.width/2,rect.height/2);
  setTimeout(()=>{ levelUpBanner.querySelector('.levelup-card').classList.remove('show'); levelUpBanner.classList.add('hidden'); },2200);
}

// --- Popup ---
let popupTimer=null;
function showPopup(text){ popup.textContent=text; popup.classList.remove('hidden'); clearTimeout(popupTimer); popupTimer=setTimeout(()=>popup.classList.add('hidden'),3200); }

// --- Export/Import ---
btnExport.addEventListener("click", ()=>{
  const payload={tasks,progress:{totalXP,level},achievements,exportedAt:Date.now()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`TaskHero_export.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
importFile.addEventListener("change", ev=>{
  const f=ev.target.files && ev.target.files[0]; if(!f) return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!confirm(`Import will overwrite current save. Continue?`)) return;
      tasks=data.tasks||[]; totalXP=data.progress?.totalXP??data.progress?.xp??0;
      level=data.progress?.level??Math.floor(totalXP/XP_PER_LEVEL)+1;
      achievements=data.achievements||achievements;
      saveAll(); renderAll(); showPopup("Import complete");
    }catch(err){ alert("Invalid file"); }
  };
  reader.readAsText(f); ev.target.value="";
});

// --- Clear all data ---
btnClear.addEventListener("click", ()=>{
  if(!confirm("Clear all saved app data? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE.TASKS); localStorage.removeItem(STORAGE.PROG); localStorage.removeItem(STORAGE.ACH);
  tasks=[]; totalXP=0; level=1; initAchievements(); saveAll(); renderAll(); showPopup("All data cleared");
});

// --- Example tasks ---
function addExample(){
  addTaskObj("Math — Chapter 2", "Solve practice problems 1–10. Attach your work.", 25, "academic");
  addTaskObj("History — Read pages 20–25", "Take notes and upload summary.", 0, "academic");
  addTaskObj("Personal — Clean desk", "Quick tidy session.", 10, "general");
}
const importExampleBtn = document.getElementById("importExample");
if(importExampleBtn) importExampleBtn.addEventListener("click", addExample);

// --- Boot ---
function boot(){
  loadAll();
  renderAll(); // <--- CRITICAL FIX: Render everything on load
}
boot();

// --- Debug ---
window.__TaskHero={tasks,saveAll,loadAll,gainXP};

}); // DOMContentLoaded end

// === Service Worker Registration ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log("✅ Service Worker registered"))
    .catch(err => console.log("❌ Service Worker failed:", err));
}




