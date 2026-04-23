// ============================================================
// CONFIGURAÇÕES — altere antes de publicar
// ============================================================
const ADMIN_PASSWORD = "miranda2024"; // <- sua senha de acesso

// ============================================================
// FIREBASE — cole suas chaves após criar o projeto
// ============================================================
let FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQmUzQrvf-A7BOaDWEBWAgfvQHayhEJ_4",
  authDomain: "mercearia-miranda-e3874.firebaseapp.com",
  projectId: "mercearia-miranda-e3874",
  storageBucket: "mercearia-miranda-e3874.firebasestorage.app",
  messagingSenderId: "623113957946",
  appId: "1:623113957946:web:6e991a895a0fcae81f3b03"
}

let db = null;
let isFirebaseReady = false;

function loadFirebaseConfig() {
  const saved = localStorage.getItem("mm_firebase_config");
  if (saved) {
    try { FIREBASE_CONFIG = JSON.parse(saved); return true; }
    catch (e) { return false; }
  }
  return false;
}

async function initFirebase() {
  if (!FIREBASE_CONFIG) return false;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp }
      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    window._fb = { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp };
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
  const configLoaded = loadFirebaseConfig();
  if (configLoaded) {
    document.getElementById("config-banner").classList.add("hidden");
    const ok = await initFirebase();
    if (ok) {
      listenProducts();
    } else {
      showToast("Erro ao conectar ao Firebase.", "error");
      useLocalStorage();
    }
  } else {
    document.getElementById("config-banner").classList.remove("hidden");
    useLocalStorage();
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
// FIREBASE SETUP MODAL
// ============================================================
function openSetup() {
  document.getElementById("setup-modal").classList.remove("hidden");
}

function closeSetup() {
  document.getElementById("setup-modal").classList.add("hidden");
}

function saveFirebaseConfig() {
  const cfg = {
    apiKey:            document.getElementById("cfg-apiKey").value.trim(),
    authDomain:        document.getElementById("cfg-authDomain").value.trim(),
    projectId:         document.getElementById("cfg-projectId").value.trim(),
    storageBucket:     document.getElementById("cfg-storageBucket").value.trim(),
    messagingSenderId: document.getElementById("cfg-messagingSenderId").value.trim(),
    appId:             document.getElementById("cfg-appId").value.trim(),
  };
  if (!cfg.apiKey || !cfg.projectId) {
    showToast("Preencha pelo menos API Key e Project ID.", "error");
    return;
  }
  localStorage.setItem("mm_firebase_config", JSON.stringify(cfg));
  showToast("Configuração salva! Recarregando...", "success");
  setTimeout(() => location.reload(), 1200);
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
