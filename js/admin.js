// ============================================================
// CONFIGURAÇÕES — altere antes de publicar
// ============================================================
const ADMIN_PASSWORD = "miranda2024"; // <- sua senha de acesso

// ============================================================
// FIREBASE — cole suas chaves aqui (sem aspas nos valores)
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "COLE_SUA_API_KEY_AQUI",
  authDomain:        "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId:         "COLE_SEU_PROJECT_ID_AQUI",
  storageBucket:     "COLE_SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId:             "COLE_SEU_APP_ID_AQUI",
};

let db = null;
let isFirebaseReady = false;

async function initFirebase() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp }
      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    window._fb = { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp };
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    isFirebaseReady = true;
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
}

// ============================================================
// AUTH
// ============================================================
function checkLogin() {
  return sessionStorage.getItem("mm_admin_logged") === "true";
}

function doLogin() {
  const pwd = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem("mm_admin_logged", "true");
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app").classList.add("visible");
    startApp();
  } else {
    errEl.textContent = "Senha incorreta. Tente novamente.";
    document.getElementById("login-password").value = "";
  }
}

function doLogout() {
  sessionStorage.removeItem("mm_admin_logged");
  location.reload();
}

// ============================================================
// STATE
// ============================================================
let products = [];
let filteredProducts = [];
let activeFilter = "Todas";
let searchQuery = "";
let editingId = null;
let pendingImg = null;

const DEFAULT_BEERS = [
  { id: "1",  name: "Skol Lata 350ml",     brand: "Skol",       price: 4.50,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "2",  name: "Brahma Lata 350ml",   brand: "Brahma",     price: 4.50,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "3",  name: "Antarctica 350ml",    brand: "Antarctica", price: 4.50,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "4",  name: "Skol 600ml",          brand: "Skol",       price: 7.50,  emoji: "🍺", unit: "garrafa",  available: true, img: null },
  { id: "5",  name: "Brahma 600ml",        brand: "Brahma",     price: 7.50,  emoji: "🍺", unit: "garrafa",  available: true, img: null },
  { id: "6",  name: "Heineken Lata 350ml", brand: "Heineken",   price: 7.90,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "7",  name: "Heineken 600ml",      brand: "Heineken",   price: 12.90, emoji: "🍺", unit: "garrafa",  available: true, img: null },
  { id: "8",  name: "Budweiser 350ml",     brand: "Budweiser",  price: 7.50,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "9",  name: "Budweiser 600ml",     brand: "Budweiser",  price: 12.50, emoji: "🍺", unit: "garrafa",  available: true, img: null },
  { id: "10", name: "Stella Artois 350ml", brand: "Stella",     price: 7.90,  emoji: "🍺", unit: "lata",     available: true, img: null },
  { id: "11", name: "Corona 330ml",        brand: "Corona",     price: 10.90, emoji: "🍺", unit: "long neck",available: true, img: null },
  { id: "12", name: "Skol Fardo 12un",     brand: "Skol",       price: 48.00, emoji: "📦", unit: "fardo",    available: true, img: null },
];

// ============================================================
// APP START
// ============================================================
async function startApp() {
  document.getElementById("config-banner").classList.add("hidden");
  const ok = await initFirebase();
  if (ok) {
    listenProducts();
    listenCombos();
  } else {
    showToast("Erro ao conectar ao Firebase. Verifique as chaves em js/admin.js", "error");
    useLocalStorage();
    loadCombos();
  }
}

// ============================================================
// FIREBASE LISTENER
// ============================================================
function listenProducts() {
  const { collection, onSnapshot } = window._fb;
  onSnapshot(collection(db, "cervejas"), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    applyFilter();
    updateStats();
    renderProducts();
  }, (err) => {
    showToast("Erro ao sincronizar: " + err.message, "error");
  });
}

// ============================================================
// LOCAL STORAGE FALLBACK
// ============================================================
function useLocalStorage() {
  const saved = localStorage.getItem("mm_beers");
  products = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_BEERS));
  applyFilter();
  updateStats();
  renderProducts();
}

function saveLocal() {
  localStorage.setItem("mm_beers", JSON.stringify(products));
}

// ============================================================
// FILTER & SEARCH
// ============================================================
function getBrands() {
  return ["Todas", ...new Set(products.map(p => p.brand).filter(Boolean))];
}

function renderFilterTabs() {
  document.getElementById("filter-row").innerHTML = getBrands().map(b =>
    `<button class="ftab${b === activeFilter ? " active" : ""}" onclick="setFilter('${b}')">${b}</button>`
  ).join("");
}

function setFilter(f) {
  activeFilter = f;
  applyFilter();
  renderProducts();
  renderFilterTabs();
}

function applyFilter() {
  const q = searchQuery.toLowerCase();
  filteredProducts = products.filter(p => {
    const mf = activeFilter === "Todas" || p.brand === activeFilter;
    const mq = !q || (p.name || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q);
    return mf && mq;
  });
  renderFilterTabs();
}

function onSearch(e) {
  searchQuery = e.target.value;
  applyFilter();
  renderProducts();
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
  const total = products.length;
  const avail = products.filter(p => p.available).length;
  const brands = new Set(products.map(p => p.brand)).size;
  const avg = total ? (products.reduce((s, p) => s + (p.price || 0), 0) / total).toFixed(2) : "0.00";
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-avail").textContent = avail;
  document.getElementById("stat-brands").textContent = brands;
  document.getElementById("stat-avg").textContent = "R$ " + Number(avg).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  document.getElementById("prod-count").textContent = filteredProducts.length + " produto" + (filteredProducts.length !== 1 ? "s" : "");
}

// ============================================================
// RENDER
// ============================================================
function renderProducts() {
  const container = document.getElementById("product-list");
  document.getElementById("loading").classList.add("hidden");

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍺</div>
        <div class="empty-text">Nenhum produto encontrado</div>
        <div class="empty-sub">Adicione cervejas pelo botão acima</div>
      </div>`;
    updateStats();
    return;
  }

  container.innerHTML = filteredProducts.map(p => `
    <div class="product-row${!p.available ? " unavailable" : ""}" id="row-${p.id}">
      <div class="prod-thumb">
        ${p.img ? `<img src="${p.img}" alt="${p.name || ""}">` : (p.emoji || "🍺")}
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name || ""}</div>
        <div class="prod-meta">${p.unit || ""}${p.brand ? " &bull; " + p.brand : ""}</div>
      </div>
      <div class="prod-brand">${p.brand || ""}</div>
      <div class="prod-price">R$ ${fmt(p.price || 0)}</div>
      <div class="toggle-wrap">
        <span class="toggle-label">${p.available ? "Disponível" : "Indisponível"}</span>
        <label class="toggle">
          <input type="checkbox" ${p.available ? "checked" : ""} onchange="toggleAvailable('${p.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="action-btns">
        <button class="edit-btn" onclick="openEdit('${p.id}')">Editar</button>
        <button class="del-btn" onclick="confirmDelete('${p.id}')">Excluir</button>
      </div>
    </div>`
  ).join("");
  updateStats();
}

// ============================================================
// TOGGLE AVAILABLE
// ============================================================
async function toggleAvailable(id, val) {
  if (isFirebaseReady) {
    try {
      const { doc, updateDoc } = window._fb;
      await updateDoc(doc(db, "cervejas", id), { available: val });
      showToast(val ? "Marcado como disponível" : "Marcado como indisponível", "info");
    } catch (e) {
      showToast("Erro ao atualizar: " + e.message, "error");
    }
  } else {
    const p = products.find(x => x.id === id);
    if (p) { p.available = val; saveLocal(); renderProducts(); }
    showToast(val ? "Disponível" : "Indisponível", "info");
  }
}

// ============================================================
// ADD / EDIT MODAL
// ============================================================
function openAdd() {
  editingId = null;
  pendingImg = null;
  document.getElementById("modal-title").textContent = "Adicionar Cerveja";
  ["f-name", "f-brand", "f-price", "f-unit"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("f-emoji").value = "🍺";
  document.getElementById("f-available").checked = true;
  document.getElementById("img-preview").classList.add("hidden");
  document.getElementById("img-placeholder").style.display = "block";
  document.getElementById("f-img").value = "";
  document.getElementById("prod-modal").classList.remove("hidden");
}

function openEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  pendingImg = p.img || null;
  document.getElementById("modal-title").textContent = "Editar Cerveja";
  document.getElementById("f-name").value = p.name || "";
  document.getElementById("f-brand").value = p.brand || "";
  document.getElementById("f-price").value = p.price || "";
  document.getElementById("f-unit").value = p.unit || "";
  document.getElementById("f-emoji").value = p.emoji || "🍺";
  document.getElementById("f-available").checked = p.available !== false;
  const prev = document.getElementById("img-preview");
  const ph = document.getElementById("img-placeholder");
  if (p.img) { prev.src = p.img; prev.classList.remove("hidden"); ph.style.display = "none"; }
  else { prev.classList.add("hidden"); ph.style.display = "block"; }
  document.getElementById("prod-modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("prod-modal").classList.add("hidden");
}

function previewImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingImg = e.target.result;
    const prev = document.getElementById("img-preview");
    const ph = document.getElementById("img-placeholder");
    prev.src = pendingImg;
    prev.classList.remove("hidden");
    ph.style.display = "none";
  };
  reader.readAsDataURL(file);
}

async function saveProduct() {
  const name  = document.getElementById("f-name").value.trim();
  const brand = document.getElementById("f-brand").value.trim();
  const price = parseFloat(document.getElementById("f-price").value);
  const unit  = document.getElementById("f-unit").value.trim();
  const emoji = document.getElementById("f-emoji").value.trim() || "🍺";
  const available = document.getElementById("f-available").checked;

  if (!name || isNaN(price) || price < 0) {
    showToast("Preencha nome e preço corretamente.", "error");
    return;
  }

  const data = { name, brand, price, unit, emoji, available, img: pendingImg || null };

  if (isFirebaseReady) {
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = window._fb;
      if (editingId) {
        await updateDoc(doc(db, "cervejas", editingId), { ...data, updatedAt: serverTimestamp() });
        showToast("Produto atualizado!", "success");
      } else {
        await addDoc(collection(db, "cervejas"), { ...data, createdAt: serverTimestamp() });
        showToast("Produto adicionado!", "success");
      }
    } catch (e) {
      showToast("Erro ao salvar: " + e.message, "error");
      return;
    }
  } else {
    if (editingId) {
      const idx = products.findIndex(p => p.id === editingId);
      if (idx !== -1) products[idx] = { ...products[idx], ...data };
    } else {
      products.push({ id: String(Date.now()), ...data });
    }
    saveLocal();
    applyFilter();
    renderProducts();
    showToast(editingId ? "Produto atualizado!" : "Produto adicionado!", "success");
  }
  closeModal();
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
  deleteProduct(id);
}

async function deleteProduct(id) {
  if (isFirebaseReady) {
    try {
      const { doc, deleteDoc } = window._fb;
      await deleteDoc(doc(db, "cervejas", id));
      showToast("Produto excluído.", "info");
    } catch (e) {
      showToast("Erro ao excluir: " + e.message, "error");
    }
  } else {
    products = products.filter(p => p.id !== id);
    saveLocal();
    applyFilter();
    renderProducts();
    showToast("Produto excluído.", "info");
  }
}



// ============================================================
// UTILS
// ============================================================
function fmt(v) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let toastTO;
function showToast(msg, type = "info") {
  let t = document.getElementById("gt");
  if (!t) { t = document.createElement("div"); t.id = "gt"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = "toast " + type + " show";
  clearTimeout(toastTO);
  toastTO = setTimeout(() => t.classList.remove("show"), 2600);
}

// ============================================================
// MAIN TABS — Cervejas / Combos
// ============================================================
function switchMainTab(tab) {
  document.getElementById("section-cervejas").style.display = tab === "cervejas" ? "block" : "none";
  document.getElementById("section-combos").style.display   = tab === "combos"   ? "block" : "none";
  document.getElementById("tab-cervejas").classList.toggle("active", tab === "cervejas");
  document.getElementById("tab-combos").classList.toggle("active",   tab === "combos");
  if (tab === "combos") renderCombosAdmin();
}

// ============================================================
// COMBOS STATE
// ============================================================
let combos       = [];
let editingCombo = null;
let pendingComboImg = null;
let selectedCor  = "#f5a623";

const DEFAULT_COMBOS = [
  { id: "c1", nome: "Kit Raquete",   tag: "O favorito do finde",   desc: "Skol Lata 350ml x12 + Rufus Ondulado + Doritos Nacho",          preco: 79.90,  economia: "Economize R$ 12,00", itens: ["Skol Lata 350ml x12","Rufus Ondulado","Doritos Nacho"],                       cor: "#f5a623", available: true, img: null },
  { id: "c2", nome: "Kit Brahma",    tag: "Classico brasileiro",    desc: "Brahma Lata 350ml x12 + Coca-Cola 2L",                          preco: 69.90,  economia: "Economize R$ 8,00",  itens: ["Brahma Lata 350ml x12","Coca-Cola 2L"],                                       cor: "#3b82f6", available: true, img: null },
  { id: "c3", nome: "Kit Premium",   tag: "Para impressionar",      desc: "Heineken 600ml x6 + Whisky + Gelo Sabor + Energetico",          preco: 149.90, economia: "Economize R$ 25,00", itens: ["Heineken 600ml x6","Whisky 1L","Gelo Sabor","Energetico"],                    cor: "#22c55e", available: true, img: null },
  { id: "c4", nome: "Kit Churrasco", tag: "Chama o pessoal",        desc: "Brahma 600ml x6 + Skol Lata x6 + Amendoim + Carvao",           preco: 89.90,  economia: "Economize R$ 15,00", itens: ["Brahma 600ml x6","Skol Lata x6","Amendoim","Carvao"],                         cor: "#ef4444", available: true, img: null },
  { id: "c5", nome: "Kit Casal",     tag: "Perfeito para dois",     desc: "Heineken Lata x6 + Vinho Tinto + Batata Lays + Tacas",          preco: 99.90,  economia: "Economize R$ 18,00", itens: ["Heineken Lata x6","Vinho Tinto","Batata Lays","Tacas"],                       cor: "#a855f7", available: true, img: null },
  { id: "c6", nome: "Kit Economia",  tag: "Mais por menos",         desc: "Antarctica x12 + Skol Lata x12 + Doritos + Rufus",             preco: 119.90, economia: "Economize R$ 30,00", itens: ["Antarctica x12","Skol Lata x12","Doritos","Rufus"],                           cor: "#f97316", available: true, img: null },
];

// ============================================================
// COMBOS FIREBASE / LOCAL
// ============================================================
function loadCombos() {
  const saved = localStorage.getItem("mm_combos");
  combos = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_COMBOS));
  renderCombosAdmin();
}

function saveCombosLocal() {
  localStorage.setItem("mm_combos", JSON.stringify(combos));
}

async function listenCombos() {
  if (!isFirebaseReady) { loadCombos(); return; }
  const { collection, onSnapshot } = window._fb;
  onSnapshot(collection(db, "combos"), (snap) => {
    if (snap.empty) { loadCombos(); return; }
    combos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCombosAdmin();
  }, () => loadCombos());
}

// ============================================================
// RENDER COMBOS ADMIN
// ============================================================
function renderCombosAdmin() {
  const grid = document.getElementById("combos-grid-admin");
  const cnt  = document.getElementById("combo-count");
  if (cnt) cnt.textContent = combos.length + " combo" + (combos.length !== 1 ? "s" : "");
  if (!combos.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎁</div><div class="empty-text">Nenhum combo cadastrado</div><div class="empty-sub">Clique em "Novo Combo" para adicionar</div></div>`;
    return;
  }
  grid.innerHTML = combos.map(c => `
    <div class="combo-admin-card${!c.available ? " unavailable" : ""}">
      <div class="combo-admin-color-bar" style="background:${c.cor || "#f5a623"}"></div>
      <div class="combo-admin-body">
        <div class="combo-admin-img">
          ${c.img ? `<img src="${c.img}" alt="${c.nome}">` : `<span style="font-size:28px">🎁</span>`}
        </div>
        <div class="combo-admin-info">
          <div class="combo-admin-name">${c.nome}</div>
          <div class="combo-admin-tag">${c.tag || ""}</div>
          <div class="combo-admin-desc">${c.desc || ""}</div>
          <div class="combo-admin-price">R$ ${fmt(c.preco || 0)}</div>
        </div>
        <div class="combo-admin-actions">
          <div class="toggle-wrap" style="margin-bottom:8px">
            <span class="toggle-label">${c.available ? "Ativo" : "Inativo"}</span>
            <label class="toggle">
              <input type="checkbox" ${c.available ? "checked" : ""} onchange="toggleCombo('${c.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <button class="edit-btn" onclick="openEditCombo('${c.id}')">Editar</button>
          <button class="del-btn"  onclick="confirmDeleteCombo('${c.id}')">Excluir</button>
        </div>
      </div>
    </div>`).join("");
}

// ============================================================
// TOGGLE COMBO
// ============================================================
async function toggleCombo(id, val) {
  if (isFirebaseReady) {
    try {
      const { doc, updateDoc } = window._fb;
      await updateDoc(doc(db, "combos", id), { available: val });
      showToast(val ? "Combo ativado" : "Combo desativado", "info");
    } catch(e) { showToast("Erro: " + e.message, "error"); }
  } else {
    const c = combos.find(x => x.id === id);
    if (c) { c.available = val; saveCombosLocal(); renderCombosAdmin(); }
    showToast(val ? "Combo ativado" : "Combo desativado", "info");
  }
}

// ============================================================
// ADD / EDIT COMBO MODAL
// ============================================================
function openAddCombo() {
  editingCombo   = null;
  pendingComboImg = null;
  selectedCor    = "#f5a623";
  document.getElementById("combo-modal-title").textContent = "Novo Combo";
  ["c-name","c-tag","c-desc","c-saving"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("c-price").value   = "";
  document.getElementById("c-items").value   = "";
  document.getElementById("c-available").checked = true;
  document.getElementById("combo-img-preview").classList.add("hidden");
  document.getElementById("combo-img-placeholder").style.display = "block";
  document.getElementById("c-img").value = "";
  document.querySelectorAll(".color-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.cor === selectedCor);
  });
  document.getElementById("combo-modal").classList.remove("hidden");
}

function openEditCombo(id) {
  const c = combos.find(x => x.id === id);
  if (!c) return;
  editingCombo    = id;
  pendingComboImg = c.img || null;
  selectedCor     = c.cor || "#f5a623";
  document.getElementById("combo-modal-title").textContent = "Editar Combo";
  document.getElementById("c-name").value    = c.nome    || "";
  document.getElementById("c-tag").value     = c.tag     || "";
  document.getElementById("c-desc").value    = c.desc    || "";
  document.getElementById("c-price").value   = c.preco   || "";
  document.getElementById("c-saving").value  = c.economia || "";
  document.getElementById("c-items").value   = (c.itens || []).join("\n");
  document.getElementById("c-available").checked = c.available !== false;
  document.querySelectorAll(".color-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.cor === selectedCor);
  });
  const prev = document.getElementById("combo-img-preview");
  const ph   = document.getElementById("combo-img-placeholder");
  if (c.img) { prev.src = c.img; prev.classList.remove("hidden"); ph.style.display = "none"; }
  else { prev.classList.add("hidden"); ph.style.display = "block"; }
  document.getElementById("combo-modal").classList.remove("hidden");
}

function closeComboModal() {
  document.getElementById("combo-modal").classList.add("hidden");
}

function previewComboImg(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingComboImg = e.target.result;
    const prev = document.getElementById("combo-img-preview");
    const ph   = document.getElementById("combo-img-placeholder");
    prev.src = pendingComboImg; prev.classList.remove("hidden"); ph.style.display = "none";
  };
  reader.readAsDataURL(file);
}

function selectCor(btn) {
  selectedCor = btn.dataset.cor;
  document.querySelectorAll(".color-opt").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

async function saveCombo() {
  const nome      = document.getElementById("c-name").value.trim();
  const tag       = document.getElementById("c-tag").value.trim();
  const desc      = document.getElementById("c-desc").value.trim();
  const preco     = parseFloat(document.getElementById("c-price").value);
  const economia  = document.getElementById("c-saving").value.trim();
  const itensRaw  = document.getElementById("c-items").value.trim();
  const available = document.getElementById("c-available").checked;
  const itens     = itensRaw.split("\n").map(s => s.trim()).filter(Boolean);

  if (!nome || isNaN(preco) || preco < 0) {
    showToast("Preencha nome e preco corretamente.", "error"); return;
  }

  const data = { nome, tag, desc, preco, economia, itens, available, cor: selectedCor, img: pendingComboImg || null };

  if (isFirebaseReady) {
    try {
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = window._fb;
      if (editingCombo) {
        await updateDoc(doc(db, "combos", editingCombo), { ...data, updatedAt: serverTimestamp() });
        showToast("Combo atualizado!", "success");
      } else {
        await addDoc(collection(db, "combos"), { ...data, createdAt: serverTimestamp() });
        showToast("Combo adicionado!", "success");
      }
    } catch(e) { showToast("Erro ao salvar: " + e.message, "error"); return; }
  } else {
    if (editingCombo) {
      const idx = combos.findIndex(c => c.id === editingCombo);
      if (idx !== -1) combos[idx] = { ...combos[idx], ...data };
    } else {
      combos.push({ id: "c" + Date.now(), ...data });
    }
    saveCombosLocal();
    renderCombosAdmin();
    showToast(editingCombo ? "Combo atualizado!" : "Combo adicionado!", "success");
  }
  closeComboModal();
}

// ============================================================
// DELETE COMBO
// ============================================================
function confirmDeleteCombo(id) {
  const c = combos.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Excluir o combo "${c.nome}"? Esta acao nao pode ser desfeita.`)) return;
  deleteCombo(id);
}

async function deleteCombo(id) {
  if (isFirebaseReady) {
    try {
      const { doc, deleteDoc } = window._fb;
      await deleteDoc(doc(db, "combos", id));
      showToast("Combo excluido.", "info");
    } catch(e) { showToast("Erro ao excluir: " + e.message, "error"); }
  } else {
    combos = combos.filter(c => c.id !== id);
    saveCombosLocal();
    renderCombosAdmin();
    showToast("Combo excluido.", "info");
  }
}

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  if (checkLogin()) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app").classList.add("visible");
    startApp();
  }
  document.getElementById("login-password").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });
});
