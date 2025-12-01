// Simple Clicker Simulator with Codes
// Persisted with localStorage (key: clickerSave_v1)

const SAVE_KEY = "clickerSave_v1";
const TICK_MS = 100; // update every 100ms

// Default game state
const defaultState = {
  score: 0,
  rebirths: 0,
  multiplier: 1, // from rebirths
  permanentClickBoost: 1, // from codes like rxchh
  permanentAutoBoost: 1,  // from codes like booty
  redeemedCodes: [],      // list of redeemed code strings (lowercase)
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

const codesToggle = document.getElementById("codesToggle");
const codesPanel = document.getElementById("codesPanel");
const codeInput = document.getElementById("codeInput");
const redeemBtn = document.getElementById("redeemBtn");
const codesFeedback = document.getElementById("codesFeedback");
const redeemedListEl = document.getElementById("redeemedList");
const toastEl = document.getElementById("toastMessage");

// ---------- Game logic helpers ----------
function getBasePerClick(){
  // base 1 + power upgrades
  const power = state.upgrades.power;
  return 1 + power.level * power.add;
}

function getAutoCPS(){
  const auto = state.upgrades.auto;
  return auto.level * auto.add * state.permanentAutoBoost;
}

function getTotalPerClick(){
  return getBasePerClick() * state.multiplier * state.permanentClickBoost;
}

function rebirthRequirement(){
  // requirement grows with rebirths; easy to tune
  // base 10,000 and doubles each rebirth
  return 10000 * Math.pow(2, state.rebirths);
}

function formatNumber(n){
  // handle special cases
  if (typeof n !== "number" || !isFinite(n)) return "∞";
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
      // merge with defaults to ensure new fields exist
      const merged = Object.assign({}, defaultState, parsed);
      // ensure nested upgrades exist
      merged.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades || {});
      // ensure inner upgrade keys
      merged.upgrades.power = Object.assign({}, defaultState.upgrades.power, (parsed.upgrades && parsed.upgrades.power) || {});
      merged.upgrades.auto = Object.assign({}, defaultState.upgrades.auto, (parsed.upgrades && parsed.upgrades.auto) || {});
      return merged;
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

function renderCodesPanel(){
  // show redeemed codes
  redeemedListEl.innerHTML = "";
  if (!state.redeemedCodes || state.redeemedCodes.length === 0){
    const li = document.createElement("li");
    li.textContent = "None yet";
    redeemedListEl.appendChild(li);
  } else {
    state.redeemedCodes.forEach(c=>{
      const li = document.createElement("li");
      li.textContent = c.toUpperCase();
      redeemedListEl.appendChild(li);
    });
  }
}

function render(){
  scoreEl.textContent = formatNumber(state.score);
  perClickEl.textContent = formatNumber(getTotalPerClick());
  cpsEl.textContent = formatNumber(getAutoCPS());
  rebirthEl.textContent = `${state.rebirths} ×${formatNumber(state.multiplier)}`;
  rebirthReqEl.textContent = `Rebirth requirement: ${formatNumber(rebirthRequirement())} score`;
  renderUpgrades();
  renderCodesPanel();
}

function buyUpgrade(key){
  const u = state.upgrades[key];
  const cost = Math.ceil(u.cost * Math.pow(u.costMul, u.level));
  if (state.score >= cost){
    state.score -= cost;
    u.level += 1;
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
  if (!confirm(`Rebirth will reset your score and upgrades but permanently increase your multiplier. Proceed?`)) return;

  state.rebirths += 1;
  // each rebirth doubles click power
  state.multiplier = safeMultiply(state.multiplier, 2);
  state.score = 0;
  Object.keys(state.upgrades).forEach(k => {
    state.upgrades[k].level = 0;
  });
  saveState();
  render();
}

// safe multiply with cap to avoid Infinity
function safeMultiply(a, b){
  const result = a * b;
  if (!isFinite(result) || result > Number.MAX_VALUE / 10) return Number.MAX_VALUE;
  return result;
}

// ---------- Codes handling ----------
function isCodeRedeemed(codeLower){
  return state.redeemedCodes && state.redeemedCodes.indexOf(codeLower) !== -1;
}

function redeemCode(rawCode){
  const code = String(rawCode || "").trim().toLowerCase();
  if (!code){
    setCodesFeedback("Enter a code.");
    return;
  }
  if (isCodeRedeemed(code)){
    setCodesFeedback("Code already redeemed.");
    return;
  }

  // handle codes
  if (code === "heem"){
    // give +100 rebirths
    state.rebirths += 100;
    // increase multiplier accordingly: doubling per rebirth; cap to avoid Infinity
    const factor = Math.pow(2, 100);
    state.multiplier = safeMultiply(state.multiplier, factor);
    setCodesFeedback("Redeemed HEEM — +100 rebirths applied!");
    addRedeemed(code);
    saveState();
    render();
    showToast("HEEM redeemed: +100 rebirths", 4000);
    return;
  }

  if (code === "rxchh"){
    // permanent 50x click boost
    state.permanentClickBoost = safeMultiply(state.permanentClickBoost, 50);
    setCodesFeedback("Redeemed rxchh — permanent 50× click boost!");
    addRedeemed(code);
    saveState();
    render();
    showToast("rxchh redeemed: permanent 50× click boost", 4000);
    return;
  }

  if (code === "booty"){
    // permanent 10x auto boost and show message "heem was here :D" for 5s
    state.permanentAutoBoost = safeMultiply(state.permanentAutoBoost, 10);
    setCodesFeedback("Redeemed booty — permanent 10× auto-click boost!");
    addRedeemed(code);
    saveState();
    render();
    showToast("heem was here :D", 5000);
    return;
  }

  setCodesFeedback("Invalid code.");
}

function addRedeemed(codeLower){
  if (!state.redeemedCodes) state.redeemedCodes = [];
  state.redeemedCodes.push(codeLower);
}

// small helper to show feedback under codes panel
function setCodesFeedback(msg){
  codesFeedback.textContent = msg || "";
}

// toast display
let toastTimer = null;
function showToast(msg, duration = 3000){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    toastEl.classList.add("hidden");
    toastTimer = null;
  }, duration);
}

// Game tick for auto-click and auto-save
function tick(){
  const now = Date.now();
  const dt = now - state.lastTick;
  state.lastTick = now;

  // add passive income from auto clicks (autoCPS)
  const autoCPS = getAutoCPS();
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

codesToggle.addEventListener("click", ()=>{
  codesPanel.classList.toggle("hidden");
  // clear input and feedback when opening
  if (!codesPanel.classList.contains("hidden")){
    codeInput.value = "";
    setCodesFeedback("");
  }
});

redeemBtn.addEventListener("click", ()=>{
  redeemCode(codeInput.value);
  codeInput.value = "";
});

// allow Enter to submit code
codeInput.addEventListener("keydown", (e)=>{
  if (e.key === "Enter") {
    redeemBtn.click();
  }
});

// keyboard shortcuts: space to click, R to rebirth, U to open upgrades focus
window.addEventListener("keydown", (e)=>{
  if (e.code === "Space") { e.preventDefault(); doClick(); }
  if (e.key.toLowerCase() === "r") { doRebirth(); }
});

// initial render and start game loop
render();
setInterval(tick, TICK_MS);
saveState();
