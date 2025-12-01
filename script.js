// Simple Clicker Simulator with Codes (robust version)
// Persisted with localStorage (key: clickerSave_v1)

document.addEventListener("DOMContentLoaded", () => {
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

  // ------------ helpers for storage and merging ------------
  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return deepCopy(defaultState);
      const parsed = JSON.parse(raw);
      // merge top-level safely
      const merged = Object.assign({}, defaultState, parsed);
      // deep-merge nested upgrades to ensure keys exist
      merged.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades || {});
      merged.upgrades.power = Object.assign({}, defaultState.upgrades.power, (parsed.upgrades && parsed.upgrades.power) || {});
      merged.upgrades.auto = Object.assign({}, defaultState.upgrades.auto, (parsed.upgrades && parsed.upgrades.auto) || {});
      // ensure redeemedCodes exists as array
      if (!Array.isArray(merged.redeemedCodes)) merged.redeemedCodes = (parsed.redeemedCodes && Array.isArray(parsed.redeemedCodes)) ? parsed.redeemedCodes : [];
      return merged;
    } catch (err) {
      console.error("Failed to load state, using default. Error:", err);
      return deepCopy(defaultState);
    }
  }

  function saveState() {
    try {
      state.lastTick = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save state:", err);
    }
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // safe numeric multiply with cap
  function safeMultiply(a, b) {
    const result = a * b;
    if (!isFinite(result) || Math.abs(result) > Number.MAX_VALUE / 10) return Number.MAX_VALUE;
    return result;
  }

  // ---------- initial state ----------
  let state = loadState();
  console.log("Loaded game state:", state);

  // ---------- DOM queries (validate exist) ----------
  const q = (id) => document.getElementById(id);
  const scoreEl = q("score");
  const perClickEl = q("perClick");
  const cpsEl = q("cps");
  const rebirthEl = q("rebirths");
  const upgradesList = q("upgradesList");
  const bigClick = q("bigClick");
  const rebirthBtn = q("rebirthBtn");
  const resetBtn = q("resetBtn");
  const rebirthReqEl = q("rebirthReq");

  const codesToggle = q("codesToggle");
  const codesPanel = q("codesPanel");
  const codeInput = q("codeInput");
  const redeemBtn = q("redeemBtn");
  const codesFeedback = q("codesFeedback");
  const redeemedListEl = q("redeemedList");
  const toastEl = q("toastMessage");

  const missing = [];
  [scoreEl, perClickEl, cpsEl, rebirthEl, upgradesList, bigClick, rebirthBtn, resetBtn, rebirthReqEl,
   codesToggle, codesPanel, codeInput, redeemBtn, codesFeedback, redeemedListEl, toastEl].forEach((el, i) => {
    if (!el) missing.push(i);
  });

  if (missing.length) {
    console.error("One or more required DOM elements are missing. Ensure index.html includes the updated Codes UI and correct IDs. Missing count:", missing.length);
    // still continue but handlers may fail silently — show user message
  }

  // ---------- game logic helpers ----------
  function getBasePerClick(){
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
    return 10000 * Math.pow(2, state.rebirths);
  }

  function formatNumber(n){
    if (typeof n !== "number" || !isFinite(n)) return "∞";
    if (n >= 1e12) return (n/1e12).toFixed(2) + "T";
    if (n >= 1e9) return (n/1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n/1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n/1e3).toFixed(2) + "k";
    return Math.round(n*100)/100;
  }

  // ---------- rendering ----------
  function renderUpgrades(){
    if (!upgradesList) return;
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
    if (!redeemedListEl) return;
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
    if (scoreEl) scoreEl.textContent = formatNumber(state.score);
    if (perClickEl) perClickEl.textContent = formatNumber(getTotalPerClick());
    if (cpsEl) cpsEl.textContent = formatNumber(getAutoCPS());
    if (rebirthEl) rebirthEl.textContent = `${state.rebirths} ×${formatNumber(state.multiplier)}`;
    if (rebirthReqEl) rebirthReqEl.textContent = `Rebirth requirement: ${formatNumber(rebirthRequirement())} score`;
    renderUpgrades();
    renderCodesPanel();
  }

  // ---------- actions ----------
  function buyUpgrade(key){
    const u = state.upgrades[key];
    const cost = Math.ceil(u.cost * Math.pow(u.costMul, u.level));
    if (state.score >= cost){
      state.score -= cost;
      u.level += 1;
      saveState();
      render();
    } else {
      showToast("Not enough score to buy.");
    }
  }

  function doClick(){
    state.score += getTotalPerClick();
    animateClick();
    render();
  }

  function animateClick(){
    if (!bigClick) return;
    bigClick.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.04)' },
      { transform: 'scale(1)' }
    ], { duration: 160, easing: 'ease-out' });
  }

  function doRebirth(){
    const req = rebirthRequirement();
    if (state.score < req){
      alert(`You need ${formatNumber(req)} score to rebirth.`);
      return;
    }
    if (!confirm(`Rebirth will reset your score and upgrades but permanently increase your multiplier. Proceed?`)) return;

    state.rebirths += 1;
    state.multiplier = safeMultiply(state.multiplier, 2);
    state.score = 0;
    Object.keys(state.upgrades).forEach(k => {
      state.upgrades[k].level = 0;
    });
    saveState();
    render();
  }

  // ---------- codes ----------
  function isCodeRedeemed(codeLower){
    return Array.isArray(state.redeemedCodes) && state.redeemedCodes.indexOf(codeLower) !== -1;
  }

  function addRedeemed(codeLower){
    if (!Array.isArray(state.redeemedCodes)) state.redeemedCodes = [];
    state.redeemedCodes.push(codeLower);
  }

  function setCodesFeedback(msg){
    if (codesFeedback) codesFeedback.textContent = msg || "";
    console.log("Codes feedback:", msg);
  }

  let toastTimer = null;
  function showToast(msg, duration = 3000){
    if (toastEl) {
      toastEl.textContent = msg;
      toastEl.classList.remove("hidden");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(()=>{
        toastEl.classList.add("hidden");
        toastTimer = null;
      }, duration);
    } else {
      console.log("Toast:", msg);
    }
  }

  function redeemCode(rawCode){
    const code = String(rawCode || "").trim().toLowerCase();
    console.log("Attempting redeem for code:", code);
    if (!code){
      setCodesFeedback("Enter a code.");
      return;
    }
    if (isCodeRedeemed(code)){
      setCodesFeedback("Code already redeemed.");
      showToast("Code already redeemed.", 2000);
      return;
    }

    if (code === "heem"){
      state.rebirths += 100;
      // increasing multiplier by 2^100 may be enormous; use safeMultiply
      const factor = Math.pow(2, 100);
      state.multiplier = safeMultiply(state.multiplier, factor);
      addRedeemed(code);
      setCodesFeedback("Redeemed HEEM — +100 rebirths applied!");
      showToast("HEEM redeemed: +100 rebirths", 4000);
      saveState();
      render();
      return;
    }

    if (code === "rxchh"){
      state.permanentClickBoost = safeMultiply(state.permanentClickBoost, 50);
      addRedeemed(code);
      setCodesFeedback("Redeemed rxchh — permanent 50× click boost!");
      showToast("rxchh redeemed: permanent 50× click boost", 4000);
      saveState();
      render();
      return;
    }

    if (code === "booty"){
      state.permanentAutoBoost = safeMultiply(state.permanentAutoBoost, 1000000);
      addRedeemed(code);
      setCodesFeedback("Redeemed booty — permanent 1000000× auto-click boost!");
      showToast("heem was here :D", 5000);
      saveState();
      render();
      return;
    }

    setCodesFeedback("Invalid code.");
    showToast("Invalid code.", 2000);
  }

  // ---------- tick ----------
  function tick(){
    const now = Date.now();
    const dt = now - (state.lastTick || now);
    state.lastTick = now;

    const autoCPS = getAutoCPS();
    state.score += autoCPS * (dt / 1000);

    render();
    saveState();
  }

  // ---------- event listeners ----------
  if (bigClick) bigClick.addEventListener("click", doClick);
  if (rebirthBtn) rebirthBtn.addEventListener("click", doRebirth);
  if (resetBtn) resetBtn.addEventListener("click", ()=>{
    if (confirm("Reset all progress and save?")) {
      state = deepCopy(defaultState);
      saveState();
      render();
      showToast("Save reset", 1500);
    }
  });

  if (codesToggle) codesToggle.addEventListener("click", ()=>{
    if (!codesPanel) return;
    codesPanel.classList.toggle("hidden");
    if (!codesPanel.classList.contains("hidden")){
      if (codeInput) codeInput.value = "";
      setCodesFeedback("");
    }
  });

  if (redeemBtn && codeInput) {
    redeemBtn.addEventListener("click", ()=>{
      redeemCode(codeInput.value);
      codeInput.value = "";
    });
    codeInput.addEventListener("keydown", (e)=>{
      if (e.key === "Enter") redeemBtn.click();
    });
  } else {
    console.warn("Redeem button or code input missing.");
  }

  window.addEventListener("keydown", (e)=>{
    if (e.code === "Space") { e.preventDefault(); doClick(); }
    if (e.key.toLowerCase() === "r") { doRebirth(); }
  });

  // ---------- start ----------
  render();
  setInterval(tick, TICK_MS);
  saveState();
});
