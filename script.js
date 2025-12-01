// Simple Clicker Simulator
// Persisted with localStorage (key: clickerSave_v1)

const SAVE_KEY = "clickerSave_v1";
const TICK_MS = 100; // update every 100ms

// Default game state
const defaultState = {
  score: 0,
  rebirths: 0,
  multiplier: 1, // from rebirths
  upgrades: {
    power: { level: 0, cost: 10, costMul: 1.15, add: 1 },       // increases per-click base
    auto:  { level: 0, cost: 100, costMul: 1.18, add: 5 }       // each level adds +5 clicks/sec
  },
  lastTick: Date.now()
};

let state = loadState();

// UI elements
const scoreEl = document.getElementById("score");
const perClickEl = document.getElementById("perClick");
const cpsEl = document.getElementById("cps");
const rebirthEl = document.getElementById("rebirths");
const upgradesList = document.getElementById("upgradesList");
const bigClick = document.getElementById("bigClick");
const rebirthBtn = document.getElementById("rebirthBtn");
const resetBtn = document.getElementById("resetBtn");
const rebirthReqEl = document.getElementById("rebirthReq");

// ---------- Game logic helpers ----------
function getBasePerClick(){
  // base 1 + power upgrades
  const power = state.upgrades.power;
  return 1 + power.level * power.add;
}

function getAutoCPS(){
  const auto = state.upgrades.auto;
  return auto.level * auto.add;
}

function getTotalPerClick(){
  return getBasePerClick() * state.multiplier;
}

function rebirthRequirement(){
  // requirement grows with rebirths; easy to tune
  // base 10,000 and doubles each rebirth
  return 10000 * Math.pow(2, state.rebirths);
}

function formatNumber(n){
  // simple formatter for large numbers
  if (n >= 1e12) return (n/1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n/1e3).toFixed(2) + "k";
  return Math.round(n*100)/100;
}

function saveState(){
  state.lastTick = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch(e){}
}

function loadState(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // ensure keys exist
      return Object.assign({}, defaultState, parsed);
    }
  } catch(e){}
  return JSON.parse(JSON.stringify(defaultState));
}

function resetSave(){
  state = JSON.parse(JSON.stringify(defaultState));
  saveState();
  render();
}

// ---------- UI and actions ----------
function renderUpgrades(){
  upgradesList.innerHTML = "";
  const ups = state.upgrades;
  Object.keys(ups).forEach(key=>{
    const u = ups[key];
    const card = document.createElement("div");
    card.className = "upgrade-card";

    const title = document.createElement("div");
    title.className = "upgrade-title";

    const name = document.createElement("div");
    name.className = "upgrade-name";
    name.textContent = key === "power" ? "Power" : "Auto-Clicker";

    const level = document.createElement("div");
    level.style.fontWeight = "700";
    level.textContent = `Lv ${u.level}`;

    title.appendChild(name);
    title.appendChild(level);

    const desc = document.createElement("div");
    desc.className = "upgrade-desc";
    desc.textContent = key === "power" ? `Each level adds +${u.add} to base click.` : `Each level adds +${u.add} clicks/sec.`;

    const buyRow = document.createElement("div");
    buyRow.className = "upgrade-buy";

    const cost = Math.ceil(u.cost * Math.pow(u.costMul, u.level));
    const costLabel = document.createElement("div");
    costLabel.textContent = `Cost: ${formatNumber(cost)}`;

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.textContent = "Buy";
    btn.disabled = state.score < cost;
    btn.onclick = ()=>{
      buyUpgrade(key);
    };

    buyRow.appendChild(costLabel);
    buyRow.appendChild(btn);

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(buyRow);
    upgradesList.appendChild(card);
  });
}

function render(){
  scoreEl.textContent = formatNumber(state.score);
  perClickEl.textContent = formatNumber(getTotalPerClick());
  cpsEl.textContent = formatNumber(getAutoCPS() * state.multiplier);
  rebirthEl.textContent = `${state.rebirths} ×${formatNumber(state.multiplier)}`;
  rebirthReqEl.textContent = `Rebirth requirement: ${formatNumber(rebirthRequirement())} score`;
  renderUpgrades();
}

function buyUpgrade(key){
  const u = state.upgrades[key];
  const cost = Math.ceil(u.cost * Math.pow(u.costMul, u.level));
  if (state.score >= cost){
    state.score -= cost;
    u.level += 1;
    // immediate effect applied through getters
    saveState();
    render();
  }
}

function doClick(){
  state.score += getTotalPerClick();
  animateClick();
  render();
}

function animateClick(){
  bigClick.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.04)' },
    { transform: 'scale(1)' }
  ], { duration: 160, easing: 'ease-out' });
}

// rebirth: multiply multiplier, reset progress, but keep multiplier and rebirth count
function doRebirth(){
  const req = rebirthRequirement();
  if (state.score < req){
    alert(`You need ${formatNumber(req)} score to rebirth.`);
    return;
  }
  // Confirm
  if (!confirm(`Rebirth will reset your score and upgrades but permanently increase your multiplier. Proceed?`)) return;

  state.rebirths += 1;
  state.multiplier *= 2; // each rebirth doubles click power
  // reset progression
  state.score = 0;
  // reset upgrades
  Object.keys(state.upgrades).forEach(k => {
    state.upgrades[k].level = 0;
  });
  saveState();
  render();
}

// Game tick for auto-click and auto-save
function tick(){
  const now = Date.now();
  const dt = now - state.lastTick;
  state.lastTick = now;

  // add passive income from auto clicks (autoCPS * multiplier)
  const autoCPS = getAutoCPS() * state.multiplier;
  state.score += autoCPS * (dt / 1000);

  render();
  saveState();
}

// ---------- Event listeners ----------
bigClick.addEventListener("click", doClick);
rebirthBtn.addEventListener("click", doRebirth);
resetBtn.addEventListener("click", ()=>{
  if (confirm("Reset all progress and save?")) resetSave();
});

// keyboard shortcuts: space to click, R to rebirth, U to open upgrades focus
window.addEventListener("keydown", (e)=>{
  if (e.code === "Space") { e.preventDefault(); doClick(); }
  if (e.key.toLowerCase() === "r") { doRebirth(); }
});

// initial render and start game loop
render();
setInterval(tick, TICK_MS);
