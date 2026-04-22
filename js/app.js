// ============================================================
// CONFIGURAÇÕES
// ============================================================
const WHATSAPP_MERCEARIA = "5500000000000"; // <- número da mercearia: 55 + DDD + número

// ============================================================
// STATE
// ============================================================
let products      = [];
let cart          = {};
let config        = {};
let activeCategory = "Todos";
let editingProductId = null;
let adminClickCount  = 0;
let deliveryType     = "entrega";
let pendingImgData   = null;

// ============================================================
// INIT
// ============================================================
function init() {
  const sp = localStorage.getItem("mm_products");
  const sc = localStorage.getItem("mm_config");
  products = sp ? JSON.parse(sp) : JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  config   = sc ? JSON.parse(sc)  : Object.assign({}, DEFAULT_CONFIG);
  applyConfig();
  renderCategories();
  renderProducts();
  updateCartUI();
}

function applyConfig() {
  const name = config.name || DEFAULT_CONFIG.name;
  const titleEl = document.getElementById("store-name");
  const footerEl = document.getElementById("footer-name");
  if (titleEl)  titleEl.textContent = name;
  if (footerEl) footerEl.textContent = name;
  document.title = name + " — Pedidos Online";
}

// ============================================================
// CATEGORIES
// ============================================================
function getCategories() {
  return ["Todos", ...new Set(products.map(p => p.category))];
}

function renderCategories() {
  const nav = document.getElementById("nav-cats");
  if (!nav) return;
  nav.innerHTML = getCategories().map(cat =>
    `<button class="nav-cat-btn${cat === activeCategory ? " active" : ""}" onclick="setCategory('${cat.replace(/'/g, "\\'")}')">${cat}</button>`
  ).join("");
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategories();
  filterProducts();
}

// ============================================================
// PRODUCTS
// ============================================================
function filterProducts() {
  const q = document.getElementById("search").value.toLowerCase().trim();
  const visible = products.filter(p => {
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const matchQ   = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderProducts(visible);
}

function renderProducts(list) {
  const toShow = list !== undefined ? list : products;
  const grid   = document.getElementById("product-grid");
  const empty  = document.getElementById("empty-msg");
  const cnt    = document.getElementById("section-count");

  if (cnt) cnt.textContent = toShow.length + " " + (toShow.length === 1 ? "item" : "itens");

  if (toShow.length === 0) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = toShow.map(p => {
    const qty    = cart[p.id] || 0;
    const hasImg = !!p.img;
    return `
      <div class="product-card${!p.available ? " unavailable" : ""}" id="card-${p.id}">
        <div class="product-img-wrap">
          ${hasImg ? `<img src="${p.img}" alt="${p.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ""}
          <div class="product-img-fallback" style="display:${hasImg ? "none" : "flex"}">${p.emoji || "🛒"}</div>
          <span class="product-cat-badge">${p.category}</span>
        </div>
        <div class="product-body">
          <span class="product-name">${p.name}</span>
          ${p.unit ? `<span class="product-unit">${p.unit}</span>` : ""}
          <span class="product-price">R$ ${fmt(p.price)}</span>
        </div>
        <div class="product-actions" id="actions-${p.id}">
          ${qty === 0
            ? `<button class="add-to-cart-btn" onclick="addToCart(${p.id})">Adicionar</button>`
            : `<div class="qty-control">
                 <button class="qty-btn" onclick="removeFromCart(${p.id})">&#8722;</button>
                 <span class="qty-num">${qty}</span>
                 <button class="qty-btn" onclick="addToCart(${p.id})">+</button>
               </div>`
          }
        </div>
      </div>`;
  }).join("");
}

// ============================================================
// CART
// ============================================================
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  updateCartUI();
  updateProductActions(id);
  showToast("Adicionado ao carrinho ✓");
}

function removeFromCart(id) {
  if (!cart[id]) return;
  cart[id]--;
  if (cart[id] === 0) delete cart[id];
  updateCartUI();
  updateProductActions(id);
}

function updateProductActions(id) {
  const el  = document.getElementById(`actions-${id}`);
  if (!el) return;
  const qty = cart[id] || 0;
  el.innerHTML = qty === 0
    ? `<button class="add-to-cart-btn" onclick="addToCart(${id})">Adicionar</button>`
    : `<div class="qty-control">
         <button class="qty-btn" onclick="removeFromCart(${id})">&#8722;</button>
         <span class="qty-num">${qty}</span>
         <button class="qty-btn" onclick="addToCart(${id})">+</button>
       </div>`;
}

function updateCartUI() {
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
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
  let total = 0;

  container.innerHTML = ids.map(id => {
    const p   = products.find(x => x.id === parseInt(id));
    if (!p) return "";
    const qty = cart[id];
    const sub = p.price * qty;
    total += sub;
    const thumb = p.img
      ? `<img src="${p.img}" alt="${p.name}">`
      : (p.emoji || "🛒");
    return `
      <div class="cart-item">
        <div class="cart-item-img">${thumb}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">R$ ${fmt(p.price)} × ${qty} = R$ ${fmt(sub)}</div>
        </div>
        <div class="cart-item-qty">
          <button class="cqty-btn" onclick="removeFromCart(${id})">&#8722;</button>
          <span class="cqty-num">${qty}</span>
          <button class="cqty-btn" onclick="addToCart(${id})">+</button>
        </div>
      </div>`;
  }).join("");

  document.getElementById("cart-total-val").textContent = "R$ " + fmt(total);
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
  if (!Object.keys(cart).length) { showToast("Adicione produtos ao carrinho!"); return; }
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

  const storeName = config.name || DEFAULT_CONFIG.name;
  let msg = `🛒 *Novo Pedido — ${storeName}*\n\n`;
  msg += `👤 *Cliente:* ${nome}\n`;
  if (tel) msg += `📱 *Telefone:* ${tel}\n`;
  if (deliveryType === "entrega") {
    msg += `🛵 *Tipo:* Entrega\n`;
    if (end) msg += `📍 *Endereço:* ${end}\n`;
  } else {
    msg += `🏪 *Tipo:* Retirada na loja\n`;
  }
  msg += "\n📦 *Itens do pedido:*\n";

  let total = 0;
  Object.keys(cart).forEach(id => {
    const p = products.find(x => x.id === parseInt(id));
    if (!p) return;
    const qty = cart[id];
    const sub = p.price * qty;
    total += sub;
    msg += `• ${p.emoji} ${p.name} × ${qty} — R$ ${fmt(sub)}\n`;
  });
  msg += `\n💰 *Total: R$ ${fmt(total)}*`;
  if (obs) msg += `\n\n📝 *Obs:* ${obs}`;

  const number = (config.whatsapp || WHATSAPP_MERCEARIA).replace(/\D/g, "");
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, "_blank");
  cart = {};
  updateCartUI();
  filterProducts();
  closeCheckout();
  showToast("Pedido enviado! 🎉");
}

// ============================================================
// ADMIN
// ============================================================
function adminClick() {
  adminClickCount++;
  if (adminClickCount >= 5) { adminClickCount = 0; openAdmin(); }
}

function openAdmin() {
  document.getElementById("admin-overlay").classList.remove("hidden");
  renderAdminProducts();
  document.getElementById("cfg-name").value  = config.name || "";
  document.getElementById("cfg-whats").value = config.whatsapp || "";
}

function closeAdmin() {
  document.getElementById("admin-overlay").classList.add("hidden");
}

function showAdminTab(tab, btn) {
  document.querySelectorAll(".admin-tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(`admin-${tab}`).classList.remove("hidden");
  document.querySelectorAll(".atab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function renderAdminProducts() {
  const list = document.getElementById("admin-product-list");
  if (!products.length) {
    list.innerHTML = "<p style='color:var(--text-muted);font-size:14px;'>Nenhum produto cadastrado.</p>";
    return;
  }
  list.innerHTML = products.map(p => `
    <div class="admin-product-row">
      <div class="admin-product-thumb">
        ${p.img ? `<img src="${p.img}" alt="${p.name}">` : (p.emoji || "🛒")}
      </div>
      <div class="admin-product-info">
        <div class="admin-product-name">${p.name}${!p.available ? ' <span style="color:#b91c1c;font-size:11px;">(indisponível)</span>' : ""}</div>
        <div class="admin-product-meta">${p.category} · R$ ${fmt(p.price)} · ${p.unit || ""}</div>
      </div>
      <div class="admin-actions">
        <button class="admin-edit-btn" onclick="openEditProduct(${p.id})">Editar</button>
        <button class="admin-del-btn"  onclick="deleteProduct(${p.id})">Excluir</button>
      </div>
    </div>`
  ).join("");
}

function openAddProduct() {
  editingProductId = null;
  pendingImgData   = null;
  document.getElementById("prod-modal-title").textContent = "Adicionar produto";
  ["p-name", "p-price", "p-emoji", "p-unit"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("p-available").checked = true;
  document.getElementById("p-img-preview").classList.add("hidden");
  document.getElementById("p-img-placeholder").style.display = "block";
  document.getElementById("p-img-file").value = "";
  document.getElementById("prod-modal-overlay").classList.remove("hidden");
}

function openEditProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  pendingImgData   = p.img || null;
  document.getElementById("prod-modal-title").textContent = "Editar produto";
  document.getElementById("p-name").value      = p.name;
  document.getElementById("p-price").value     = p.price;
  document.getElementById("p-cat").value       = p.category;
  document.getElementById("p-emoji").value     = p.emoji || "";
  document.getElementById("p-unit").value      = p.unit || "";
  document.getElementById("p-available").checked = p.available;
  const prev = document.getElementById("p-img-preview");
  const ph   = document.getElementById("p-img-placeholder");
  if (p.img) { prev.src = p.img; prev.classList.remove("hidden"); ph.style.display = "none"; }
  else { prev.classList.add("hidden"); ph.style.display = "block"; }
  document.getElementById("prod-modal-overlay").classList.remove("hidden");
}

function closeProdModal() {
  document.getElementById("prod-modal-overlay").classList.add("hidden");
}

function previewProductImage(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingImgData = e.target.result;
    const prev = document.getElementById("p-img-preview");
    const ph   = document.getElementById("p-img-placeholder");
    prev.src = pendingImgData;
    prev.classList.remove("hidden");
    ph.style.display = "none";
  };
  reader.readAsDataURL(file);
}

function saveProduct() {
  const name      = document.getElementById("p-name").value.trim();
  const price     = parseFloat(document.getElementById("p-price").value);
  const category  = document.getElementById("p-cat").value;
  const emoji     = document.getElementById("p-emoji").value.trim() || "🛒";
  const unit      = document.getElementById("p-unit").value.trim();
  const available = document.getElementById("p-available").checked;
  if (!name || isNaN(price) || price < 0) { showToast("Preencha nome e preço corretamente."); return; }

  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) products[idx] = { ...products[idx], name, price, category, emoji, unit, available, img: pendingImgData };
  } else {
    const newId = Math.max(0, ...products.map(p => p.id)) + 1;
    products.push({ id: newId, name, price, category, emoji, unit, available, img: pendingImgData });
  }

  saveProducts();
  renderAdminProducts();
  renderCategories();
  filterProducts();
  closeProdModal();
  showToast(editingProductId ? "Produto atualizado!" : "Produto adicionado!");
}

function deleteProduct(id) {
  if (!confirm("Excluir este produto?")) return;
  products = products.filter(p => p.id !== id);
  if (cart[id]) { delete cart[id]; updateCartUI(); }
  saveProducts();
  renderAdminProducts();
  renderCategories();
  filterProducts();
  showToast("Produto excluído.");
}

function saveProducts() {
  localStorage.setItem("mm_products", JSON.stringify(products));
}

function saveConfig() {
  config.name      = document.getElementById("cfg-name").value.trim() || DEFAULT_CONFIG.name;
  config.whatsapp  = document.getElementById("cfg-whats").value.trim();
  localStorage.setItem("mm_config", JSON.stringify(config));
  applyConfig();
  showToast("Configurações salvas!");
}

// ============================================================
// UTILS
// ============================================================
function fmt(val) {
  return Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let toastTimeout;
function showToast(msg) {
  let t = document.getElementById("global-toast");
  if (!t) { t = document.createElement("div"); t.id = "global-toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove("show"), 2200);
}

// ============================================================
// START
// ============================================================
window.addEventListener("DOMContentLoaded", init);
