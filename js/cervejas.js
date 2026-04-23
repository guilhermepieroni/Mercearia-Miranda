// ============================================================
// CONFIGURAÇÕES
// ============================================================
const WHATSAPP    = "5500000000000"; // <- número da mercearia: 55 + DDD + número
const FLASH_DISCOUNT = 0.10;         // 10% de desconto
const FLASH_DAYS     = [5, 6];       // 5 = sexta-feira, 6 = sábado

// ============================================================
// FIREBASE — mesmas chaves do admin.js
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQmUzQrvf-A7BOaDWEBWAgfvQHayhEJ_4",
  authDomain: "mercearia-miranda-e3874.firebaseapp.com",
  projectId: "mercearia-miranda-e3874",
  storageBucket: "mercearia-miranda-e3874.firebasestorage.app",
  messagingSenderId: "623113957946",
  appId: "1:623113957946:web:6e991a895a0fcae81f3b03"
};

// ============================================================
// PRODUTOS — editados via painel admin ou Firebase
// ============================================================
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
// STATE
// ============================================================
let BEERS         = [];
let cart          = {};
let activeFilter  = "Todas";
let deliveryType  = "entrega";
let isFirebaseReady = false;

// ============================================================
// FIREBASE — leitura em tempo real
// ============================================================
async function initFirebase() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, collection, onSnapshot }
      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = initializeApp(FIREBASE_CONFIG);
    const db  = getFirestore(app);
    isFirebaseReady = true;
    onSnapshot(collection(db, "cervejas"), (snap) => {
      BEERS = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.available !== false);
      BEERS.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      renderFilters();
      renderBeers();
    }, (err) => {
      console.warn("Firebase erro:", err);
      loadLocalBeers();
    });
  } catch (e) {
    console.warn("Firebase indisponível, usando localStorage:", e);
    loadLocalBeers();
  }
}

function loadLocalBeers() {
  const saved = localStorage.getItem("mm_beers");
  const all   = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_BEERS));
  BEERS = all.filter(b => b.available !== false);
  renderFilters();
  renderBeers();
}

// ============================================================
// FLASH PROMO
// ============================================================
function isFlashActive() {
  return FLASH_DAYS.includes(new Date().getDay());
}

function getEffectivePrice(beer) {
  return isFlashActive()
    ? +(beer.price * (1 - FLASH_DISCOUNT)).toFixed(2)
    : beer.price;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateFlashUI() {
  const active   = isFlashActive();
  const statusEl = document.getElementById("flash-status");
  const cdEl     = document.getElementById("flash-countdown");
  const ctaEl    = document.getElementById("flash-cta");
  if (!statusEl) return;

  if (active) {
    statusEl.innerHTML = `<div class="flash-live"><span class="dot"></span>AO VIVO AGORA</div>`;
    ctaEl.classList.remove("disabled");
    ctaEl.textContent = "Ver cervejas com desconto →";
    const now  = new Date();
    const end  = new Date(now);
    end.setDate(now.getDate() + (now.getDay() === 5 ? 2 : 1));
    end.setHours(0, 0, 0, 0);
    const diff = end - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    cdEl.textContent = `⏱ Termina em ${h}h ${pad(m)}m ${pad(s)}s`;
  } else {
    statusEl.innerHTML = `<div class="flash-inactive">⚡ PRÓXIMA: SEXTA-FEIRA</div>`;
    ctaEl.classList.add("disabled");
    ctaEl.textContent = "Disponível sexta e sábado";
    const now = new Date();
    const day = now.getDay();
    let daysUntil = (5 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    next.setHours(0, 0, 0, 0);
    const ms = next - now;
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    cdEl.textContent = `⏳ Começa em ${h}h ${pad(m)}m`;
  }
}

// ============================================================
// FILTERS & RENDER
// ============================================================
function getFilters() {
  return ["Todas", ...new Set(BEERS.map(b => b.brand).filter(Boolean))];
}

function renderFilters() {
  const el = document.getElementById("filter-tabs");
  if (!el) return;
  el.innerHTML = getFilters().map(f =>
    `<button class="filter-tab${f === activeFilter ? " active" : ""}" onclick="setFilter('${f}')">${f}</button>`
  ).join("");
}

function setFilter(f) {
  activeFilter = f;
  renderFilters();
  renderBeers();
}

function renderBeers() {
  const flash = isFlashActive();
  const list  = activeFilter === "Todas" ? BEERS : BEERS.filter(b => b.brand === activeFilter);
  const grid  = document.getElementById("beer-grid");
  if (!grid) return;

  grid.innerHTML = list.map(b => {
    const qty      = cart[b.id] || 0;
    const eff      = getEffectivePrice(b);
    const imgTag   = b.img ? `<img src="${b.img}" alt="${b.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : "";
    const fallback = `<div class="beer-img-fallback" style="display:${b.img ? "none" : "flex"}">${b.emoji || "🍺"}</div>`;
    const badge    = flash ? `<span class="flash-badge show">⚡ -10%</span>` : "";
    const origTag  = flash ? `<span class="beer-price-original" style="display:inline">R$ ${fmt(b.price)}</span>` : "";
    const promoTag = flash ? `<span class="beer-promo-tag" style="display:inline">⚡ Promoção relâmpago</span>` : "";
    const action   = qty === 0
      ? `<button class="add-beer-btn" onclick="addToCart('${b.id}')">Adicionar</button>`
      : `<div class="qty-control">
           <button class="qty-btn" onclick="removeFromCart('${b.id}')">&#8722;</button>
           <span class="qty-num">${qty}</span>
           <button class="qty-btn" onclick="addToCart('${b.id}')">+</button>
         </div>`;

    return `
      <div class="beer-card">
        <div class="beer-img-wrap">
          ${imgTag}${fallback}
          <span class="beer-brand-badge">${b.brand || ""}</span>
          ${badge}
        </div>
        <div class="beer-body">
          <span class="beer-name">${b.name || ""}</span>
          <span class="beer-volume">${b.unit || ""}</span>
          <div class="beer-price-row">
            <span class="beer-price">R$ ${fmt(eff)}</span>
            ${origTag}
          </div>
          ${promoTag}
        </div>
        <div class="beer-actions" id="ba-${b.id}">${action}</div>
      </div>`;
  }).join("");
}

// ============================================================
// CART
// ============================================================
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  updateCartUI();
  updateBeerAction(id);
  showToast("🍺 Adicionado!");
}

function removeFromCart(id) {
  if (!cart[id]) return;
  cart[id]--;
  if (cart[id] === 0) delete cart[id];
  updateCartUI();
  updateBeerAction(id);
}

function updateBeerAction(id) {
  const el  = document.getElementById("ba-" + id);
  if (!el) return;
  const qty = cart[id] || 0;
  el.innerHTML = qty === 0
    ? `<button class="add-beer-btn" onclick="addToCart('${id}')">Adicionar</button>`
    : `<div class="qty-control">
         <button class="qty-btn" onclick="removeFromCart('${id}')">&#8722;</button>
         <span class="qty-num">${qty}</span>
         <button class="qty-btn" onclick="addToCart('${id}')">+</button>
       </div>`;
}

function calcTotal() {
  let base = 0, final = 0;
  Object.keys(cart).forEach(id => {
    const b = BEERS.find(x => x.id === id);
    if (!b) return;
    base  += b.price * cart[id];
    final += getEffectivePrice(b) * cart[id];
  });
  return { base, discount: +(base - final).toFixed(2), final: +final.toFixed(2) };
}

function totalQty() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function updateCartUI() {
  const count = totalQty();
  const el    = document.getElementById("cart-count");
  el.textContent = count;
  count > 0 ? el.classList.remove("hidden") : el.classList.add("hidden");
  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById("cart-items");
  const footer    = document.getElementById("cart-footer");
  const empty     = document.getElementById("cart-empty");
  const ids       = Object.keys(cart);

  if (!ids.length) {
    container.innerHTML = "";
    footer.style.display = "none";
    empty.style.display  = "flex";
    return;
  }

  empty.style.display  = "none";
  footer.style.display = "block";

  container.innerHTML = ids.map(id => {
    const b   = BEERS.find(x => x.id === id);
    if (!b) return "";
    const qty = cart[id];
    const eff = getEffectivePrice(b);
    const sub = eff * qty;
    const thumb = b.img
      ? `<img src="${b.img}" alt="${b.name}">`
      : (b.emoji || "🍺");
    return `
      <div class="cart-item">
        <div class="cart-item-thumb">${thumb}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${b.name}</div>
          <div class="cart-item-price">R$ ${fmt(eff)} × ${qty} = R$ ${fmt(sub)}</div>
        </div>
        <div class="cqty-wrap">
          <button class="cqty-btn" onclick="removeFromCart('${id}')">&#8722;</button>
          <span class="cqty-num">${qty}</span>
          <button class="cqty-btn" onclick="addToCart('${id}')">+</button>
        </div>
      </div>`;
  }).join("");

  const { discount, final } = calcTotal();
  const promoEl = document.getElementById("cart-promo-info");
  promoEl.textContent = (isFlashActive() && discount > 0)
    ? `⚡ Desconto relâmpago aplicado: -R$ ${fmt(discount)}`
    : "";
  document.getElementById("cart-total-val").textContent = "R$ " + fmt(final);
}

function openCart() {
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("overlay").classList.remove("hidden");
}
function closeCart() {
  document.getElementById("cart-drawer").classList.remove("open");
  document.getElementById("overlay").classList.add("hidden");
}
function openCheckout() {
  if (!totalQty()) { showToast("Adicione cervejas ao carrinho!"); return; }
  closeCart();
  document.getElementById("modal-overlay").classList.remove("hidden");
}
function closeCheckout() {
  document.getElementById("modal-overlay").classList.add("hidden");
}
function selectDelivery(btn) {
  deliveryType = btn.dataset.val;
  document.querySelectorAll(".delivery-opt").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// ============================================================
// WHATSAPP
// ============================================================
function sendWhatsApp() {
  const nome = document.getElementById("f-nome").value.trim();
  const tel  = document.getElementById("f-tel").value.trim();
  const end  = document.getElementById("f-end").value.trim();
  const obs  = document.getElementById("f-obs").value.trim();
  if (!nome) { showToast("Por favor, informe seu nome."); return; }

  const { discount, final } = calcTotal();
  const flash = isFlashActive();
  let msg = "🍺 *Pedido de Cervejas — Mercearia Miranda*\n";
  if (flash) msg += "⚡ *PROMOÇÃO RELÂMPAGO — 10% OFF*\n";
  msg += `\n👤 *Cliente:* ${nome}\n`;
  if (tel) msg += `📱 *Telefone:* ${tel}\n`;
  if (deliveryType === "entrega") {
    msg += `🛵 *Tipo:* Entrega\n`;
    if (end) msg += `📍 *Endereço:* ${end}\n`;
  } else {
    msg += `🏪 *Tipo:* Retirada na loja\n`;
  }
  msg += "\n🍺 *Itens:*\n";
  Object.keys(cart).forEach(id => {
    const b = BEERS.find(x => x.id === id);
    if (!b) return;
    const eff = getEffectivePrice(b);
    msg += `• ${b.name} × ${cart[id]} — R$ ${fmt(eff * cart[id])}\n`;
  });
  if (flash && discount > 0) msg += `\n⚡ *Desconto relâmpago (10%):* -R$ ${fmt(discount)}\n`;
  msg += `\n💰 *Total: R$ ${fmt(final)}*`;
  if (obs) msg += `\n\n📝 *Obs:* ${obs}`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  cart = {};
  updateCartUI();
  renderBeers();
  closeCheckout();
  showToast("Pedido enviado! 🎉");
}

// ============================================================
// UTILS
// ============================================================
function scrollToCervejas() {
  document.getElementById("cervejas").scrollIntoView({ behavior: "smooth" });
}

function openComboInfo() {
  showToast("🎉 Adicione 6+ cervejas e mencione 'Kit Festa' nas observações!");
  scrollToCervejas();
}

function fmt(v) {
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let toastTO;
function showToast(msg) {
  let t = document.getElementById("gt");
  if (!t) { t = document.createElement("div"); t.id = "gt"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTO);
  toastTO = setTimeout(() => t.classList.remove("show"), 2600);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  updateFlashUI();
  setInterval(updateFlashUI, 1000);
});