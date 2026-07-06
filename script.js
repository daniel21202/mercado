/* ================= DADOS SEED ================= */
const SEED_PRODUCTS = [
  { id: "p1", name: "Pão francês (unid.)", price: 0.9, emoji: "🥖", category: "Padaria", photo: null },
  { id: "p2", name: "Queijo mussarela (kg)", price: 34.9, emoji: "🧀", category: "Padaria", photo: null },
  { id: "p3", name: "Leite integral 1L", price: 5.49, emoji: "🥛", category: "Mercearia", photo: null },
  { id: "p4", name: "Café torrado 500g", price: 14.9, emoji: "☕", category: "Mercearia", photo: null },
  { id: "p5", name: "Arroz branco 5kg", price: 24.9, emoji: "🌾", category: "Mercearia", photo: null },
  { id: "p6", name: "Feijão carioca 1kg", price: 8.5, emoji: "🫘", category: "Mercearia", photo: null },
  { id: "p7", name: "Banana prata (kg)", price: 4.9, emoji: "🍌", category: "Hortifruti", photo: null },
  { id: "p8", name: "Tomate (kg)", price: 6.9, emoji: "🍅", category: "Hortifruti", photo: null },
  { id: "p9", name: "Refrigerante 2L", price: 8.9, emoji: "🥤", category: "Bebidas", photo: null },
  { id: "p10", name: "Cerveja (lata)", price: 4.5, emoji: "🍺", category: "Bebidas", photo: null },
  { id: "p11", name: "Detergente", price: 2.9, emoji: "🧴", category: "Limpeza", photo: null },
  { id: "p12", name: "Papel higiênico 4un", price: 9.9, emoji: "🧻", category: "Limpeza", photo: null },
];

/* ================= HELPERS ================= */
const brl = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const genCode = () => "M" + Math.floor(1000 + Math.random() * 9000);
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= STORAGE ================= */
async function saveOrder(order) {
  try {
    await window.storage.set(`order:${order.code}`, JSON.stringify(order), true);
    return true;
  } catch (e) {
    console.error("Erro ao salvar pedido", e);
    return false;
  }
}
async function fetchOrder(code) {
  try {
    const res = await window.storage.get(`order:${code}`, true);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}
async function listAllOrders() {
  try {
    const res = await window.storage.list("order:", true);
    if (!res || !res.keys.length) return [];
    const all = await Promise.all(
      res.keys.map(async (k) => {
        try {
          const r = await window.storage.get(k, true);
          return r ? JSON.parse(r.value) : null;
        } catch {
          return null;
        }
      })
    );
    return all.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (e) {
    return [];
  }
}
async function saveProduct(product) {
  try {
    await window.storage.set(`product:${product.id}`, JSON.stringify(product), true);
    return true;
  } catch (e) {
    console.error("Erro ao salvar produto", e);
    return false;
  }
}
async function deleteProductStorage(id) {
  try {
    await window.storage.delete(`product:${id}`, true);
    return true;
  } catch (e) {
    return false;
  }
}
async function listAllProducts() {
  try {
    const res = await window.storage.list("product:", true);
    if (!res || !res.keys.length) return [];
    const all = await Promise.all(
      res.keys.map(async (k) => {
        try {
          const r = await window.storage.get(k, true);
          return r ? JSON.parse(r.value) : null;
        } catch {
          return null;
        }
      })
    );
    return all.filter(Boolean);
  } catch (e) {
    return [];
  }
}
async function ensureSeeded() {
  try {
    const marker = await window.storage.get("catalog:seeded", true);
    if (marker) return;
  } catch (e) {
    /* not seeded yet */
  }
  await Promise.all(SEED_PRODUCTS.map((p) => saveProduct(p)));
  try {
    await window.storage.set("catalog:seeded", "true", true);
  } catch (e) {
    console.error(e);
  }
}
async function getPixConfig() {
  try {
    const r = await window.storage.get("config:pix", true);
    return r ? JSON.parse(r.value) : null;
  } catch (e) {
    return null;
  }
}
async function savePixConfig(cfg) {
  try {
    await window.storage.set("config:pix", JSON.stringify(cfg), true);
    return true;
  } catch (e) {
    return false;
  }
}

/* ================= IMAGEM ================= */
function fileToResizedDataURL(file, maxDim = 360, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ================= ESTADO GLOBAL ================= */
const state = {
  view: "home",
  appReady: false,
  customerName: "",
  basket: {}, // { productId: qty }
  order: null,
  marketAuth: false,
  products: [],
  loadingProducts: true,

  // efêmeros por tela
  marketTab: "retirada",
  allOrders: [],
  loadingOrders: true,
  loginError: "",
  productEditingId: null,
  productPhotoDraft: null,
  retiradaOrder: null,
  retiradaNotFound: false,
  retiradaLoading: false,
  retiradaCode: "",
  reportMonth: null,
  paymentMethod: "pix",
  paymentLoading: false,
  pixConfig: null,
  pixSaving: false,
  pixSaved: false,
};

const app = document.getElementById("app");

function render() {
  app.innerHTML = renderScreen();
  bindEvents();
  if (window.lucide) window.lucide.createIcons();
}

/* ================= COMPONENTES PEQUENOS ================= */
function icon(name, size = 18, extraClass = "") {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px" class="${extraClass}"></i>`;
}

function topBar(label, { back = false, logout = false } = {}) {
  return `
    <div class="topbar">
      <div class="topbar-left">
        ${back ? `<button class="icon-btn" data-action="back">${icon("arrow-left", 20)}</button>` : ""}
        ${icon("shopping-basket", 20)}
        <span class="topbar-title">${escapeHtml(label)}</span>
      </div>
      ${logout ? `<button class="icon-btn" data-action="logout">${icon("log-out", 19)}</button>` : ""}
    </div>`;
}

function thumbOrEmoji(product, size = 40) {
  if (product && product.photo) {
    return `<div class="thumb" style="width:${size}px;height:${size}px"><img src="${product.photo}" alt="${escapeHtml(product.name)}" /></div>`;
  }
  return `<div class="thumb" style="width:${size}px;height:${size}px;font-size:${size * 0.5}px">${(product && product.emoji) || "📦"}</div>`;
}

function fullLoader(label) {
  return `<div class="full-loader">${icon("loader-2", 28, "spin")}<p>${escapeHtml(label)}</p></div>`;
}

/* ================= ROTEAMENTO ================= */
function goto(view) {
  state.view = view;
  render();
}

function resetCustomer() {
  state.basket = {};
  state.order = null;
  state.customerName = "";
}

/* ================= RENDER POR TELA ================= */
function renderScreen() {
  if (!state.appReady) return fullLoader("Preparando o mercado...");
  switch (state.view) {
    case "home": return renderHome();
    case "customer-access": return renderCustomerAccess();
    case "catalog": return state.loadingProducts ? fullLoader("Carregando produtos...") : renderCatalog();
    case "basket": return renderBasketReview();
    case "payment": return renderPayment();
    case "receipt": return renderReceipt();
    case "market-login": return renderMarketLogin();
    case "market-dashboard":
      return state.marketAuth ? renderMarketDashboard() : renderMarketLogin();
    default: return renderHome();
  }
}

/* ---------- HOME ---------- */
function renderHome() {
  return `
    <div class="screen home">
      <div>
        <div class="home-emoji">🧺</div>
        <h1 class="home-title serif">Cesta Já</h1>
        <p class="home-sub">Monte a cesta, pague pelo site e retire no balcão sem fila.</p>
      </div>
      <div class="home-actions">
        <button class="btn btn-primary btn-lg" data-action="goto" data-view="customer-access">${icon("user", 19)} Sou cliente</button>
        <button class="btn btn-outline btn-lg" data-action="goto" data-view="market-login">${icon("store", 19)} Sou o mercado</button>
      </div>
    </div>`;
}

/* ---------- CUSTOMER ACCESS ---------- */
function renderCustomerAccess() {
  return `
    <div class="screen">
      ${topBar("Identifique-se", { back: true })}
      <div class="form-wrap">
        <p class="hint">Não é preciso senha. Só o seu nome para identificar a cesta na hora da retirada.</p>
        <label class="field">
          <span class="field-label">Nome</span>
          <input id="input-name" type="text" placeholder="Como podemos te chamar?" />
        </label>
        <label class="field">
          <span class="field-label">Telefone (opcional)</span>
          <input id="input-phone" type="tel" placeholder="(00) 00000-0000" />
        </label>
        <button class="btn btn-primary btn-lg" id="btn-enter-catalog" disabled>Entrar e montar cesta</button>
      </div>
    </div>`;
}

/* ---------- CATALOG ---------- */
function catalogTotals() {
  const itemCount = Object.values(state.basket).reduce((a, b) => a + b, 0);
  const total = Object.entries(state.basket).reduce((sum, [id, q]) => {
    const p = state.products.find((p) => p.id === id);
    return sum + (p ? q * p.price : 0);
  }, 0);
  return { itemCount, total };
}

function renderCatalog() {
  const { products, basket } = state;
  const categories = [...new Set(products.map((p) => p.category || "Outros"))];
  const { itemCount, total } = catalogTotals();

  const emptyMsg = products.length === 0 ? `<p class="empty-msg">O mercado ainda não cadastrou produtos.</p>` : "";

  const blocks = categories
    .map((cat) => {
      const cards = products
        .filter((p) => (p.category || "Outros") === cat)
        .map((p) => {
          const qty = basket[p.id] || 0;
          const control = qty === 0
            ? `<button class="add-btn" data-action="basket-inc" data-id="${p.id}">${icon("plus", 14)} Adicionar</button>`
            : `<div class="qty-stepper">
                 <button data-action="basket-dec" data-id="${p.id}">${icon("minus", 14)}</button>
                 <span>${qty}</span>
                 <button data-action="basket-inc" data-id="${p.id}">${icon("plus", 14)}</button>
               </div>`;
          return `
            <div class="product-card">
              ${thumbOrEmoji(p, 64)}
              <div class="w-full">
                <div class="product-name">${escapeHtml(p.name)}</div>
                <div class="product-price mono">${brl(p.price)}</div>
              </div>
              ${control}
            </div>`;
        })
        .join("");
      return `
        <div class="category-block">
          <h3 class="category-title">${escapeHtml(cat)}</h3>
          <div class="product-grid">${cards}</div>
        </div>`;
    })
    .join("");

  const floatingBar = itemCount > 0
    ? `<button class="floating-bar" data-action="goto" data-view="basket">
         <span class="left">${icon("shopping-basket", 18)} Ver cesta (${itemCount})</span>
         <span class="right mono">${brl(total)}</span>
       </button>`
    : "";

  return `
    <div class="screen">
      ${topBar(`Olá, ${escapeHtml((state.customerName || "").split(" ")[0])}`, { back: true })}
      <div class="catalog-body">${emptyMsg}${blocks}</div>
      ${floatingBar}
    </div>`;
}

/* ---------- BASKET REVIEW ---------- */
function basketItems() {
  return Object.entries(state.basket)
    .map(([id, q]) => {
      const p = state.products.find((p) => p.id === id);
      return p ? { ...p, qty: q } : null;
    })
    .filter(Boolean);
}

function renderBasketReview() {
  const items = basketItems();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const rows = items.length === 0
    ? `<p class="empty-msg">Sua cesta está vazia.</p>`
    : items
        .map(
          (it) => `
        <div class="basket-row">
          ${thumbOrEmoji(it, 44)}
          <div class="info">
            <div class="name">${escapeHtml(it.name)}</div>
            <div class="price mono">${brl(it.price)} x ${it.qty}</div>
          </div>
          <div class="controls">
            <button class="step-btn" data-action="basket-dec" data-id="${it.id}">${icon("minus", 14)}</button>
            <span class="step-qty">${it.qty}</span>
            <button class="step-btn" data-action="basket-inc" data-id="${it.id}">${icon("plus", 14)}</button>
            <button class="trash-btn" data-action="basket-remove" data-id="${it.id}">${icon("trash-2", 15)}</button>
          </div>
        </div>`
        )
        .join("");

  return `
    <div class="screen">
      ${topBar("Sua cesta", { back: true })}
      <div class="basket-body">${rows}</div>
      <div class="basket-footer">
        <div class="total-row">
          <span class="total-label">Total</span>
          <span class="total-value mono">${brl(total)}</span>
        </div>
        <button class="btn btn-primary btn-block btn-lg" id="btn-go-payment" ${items.length === 0 ? "disabled" : ""}>Ir para pagamento</button>
      </div>
    </div>`;
}

/* ---------- PAYMENT ---------- */
function renderPayment() {
  const items = basketItems();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const method = state.paymentMethod;
  const pixConfig = state.pixConfig;

  const methods = [
    { id: "pix", label: "Pix", emoji: "⚡" },
    { id: "card", label: "Cartão de crédito", emoji: "💳" },
  ]
    .map(
      (m) => `
      <button class="method-row ${method === m.id ? "active" : ""}" data-action="set-method" data-method="${m.id}">
        <span class="emoji">${m.emoji}</span>
        <span class="label">${m.label}</span>
        ${method === m.id ? icon("check", 18) : ""}
      </button>`
    )
    .join("");

  const pixNote = method === "pix"
    ? `<div class="pix-note">
         ${icon("qr-code", 18)}
         ${pixConfig && pixConfig.key
           ? `<div>Pagamento via Pix para <b>${escapeHtml(pixConfig.ownerName || "o mercado")}</b><div class="mono" style="font-size:12px;margin-top:4px;word-break:break-all">${escapeHtml(pixConfig.key)}</div></div>`
           : `<p>O mercado ainda não configurou a chave Pix. O pagamento simulado seguirá normalmente.</p>`}
       </div>`
    : "";

  return `
    <div class="screen">
      ${topBar("Pagamento", { back: true })}
      <div class="payment-body">
        <div class="pay-total-box">
          <span style="font-weight:600">Total a pagar</span>
          <span class="mono" style="font-weight:700;font-size:18px;color:var(--awning)">${brl(total)}</span>
        </div>
        <p class="section-label">Forma de pagamento</p>
        <div style="margin-bottom:16px">${methods}</div>
        ${pixNote}
        <button class="btn btn-danger btn-block btn-lg" id="btn-pay" ${state.paymentLoading ? "disabled" : ""}>
          ${state.paymentLoading ? icon("loader-2", 18, "spin") + " Processando..." : icon("check", 18) + " Confirmar pagamento"}
        </button>
        <p class="disclaimer">Pagamento simulado para fins de demonstração.</p>
      </div>
    </div>`;
}

/* ---------- RECEIPT ---------- */
function renderTicket(order) {
  const bars = Array.from({ length: 28 })
    .map((_, i) => `<div style="width:${(i * 7) % 3 === 0 ? 3 : 1.5}px"></div>`)
    .join("");
  const notch = Array.from({ length: 10 }).map(() => `<div></div>`).join("");
  const itemsHtml = order.items
    .map(
      (it) => `
      <div class="ticket-item-row">
        <span class="name">${it.emoji || "📦"} ${it.qty}x ${escapeHtml(it.name)}</span>
        <span class="mono">${brl(it.price * it.qty)}</span>
      </div>`
    )
    .join("");

  return `
    <div class="ticket-outer">
      <div class="ticket">
        <div class="ticket-head">
          <div>
            <div class="ticket-head-label">Comprovante</div>
            <div class="ticket-brand">Cesta Já</div>
          </div>
          <div class="stamp">PAGO</div>
        </div>
        <div class="ticket-code-wrap">
          <div class="ticket-code-label">Código de retirada</div>
          <div class="ticket-code mono">${order.code}</div>
        </div>
        <div class="barcode">${bars}</div>
        <div class="ticket-items">${itemsHtml}</div>
        <div class="ticket-total-row">
          <span>Total</span>
          <span class="value mono">${brl(order.total)}</span>
        </div>
        <p class="ticket-customer">Cliente: ${escapeHtml(order.customerName)}</p>
      </div>
      <div class="ticket-notch left">${notch}</div>
      <div class="ticket-notch right">${notch}</div>
    </div>`;
}

function renderReceipt() {
  if (!state.order) return renderHome();
  return `
    <div class="screen">
      ${topBar("Pedido confirmado", {})}
      <div class="receipt-wrap">
        <p class="receipt-note">Mostre este comprovante no caixa do mercado para retirar seus produtos.</p>
        ${renderTicket(state.order)}
        <button class="btn btn-primary btn-lg" id="btn-conclude" style="max-width:260px;margin:0 auto;width:100%">Concluir</button>
      </div>
    </div>`;
}

/* ---------- MARKET LOGIN ---------- */
function renderMarketLogin() {
  return `
    <div class="screen market-login-screen">
      ${topBar("Acesso do mercado", { back: true })}
      <div class="form-wrap">
        <div class="market-login-header">
          ${icon("store", 36)}
          <h2>Painel do mercado</h2>
        </div>
        <label class="field">
          <span class="field-label-light">Usuário</span>
          <input id="input-user" type="text" placeholder="mercado" />
        </label>
        <label class="field">
          <span class="field-label-light">Senha</span>
          <input id="input-pass" type="password" placeholder="••••" />
        </label>
        ${state.loginError ? `<p class="error-text">${escapeHtml(state.loginError)}</p>` : ""}
        <button class="btn btn-mustard btn-lg" id="btn-market-login">${icon("key-round", 18)} Entrar</button>
        <p class="demo-hint">Demonstração: usuário <b>mercado</b> · senha <b>1234</b></p>
      </div>
    </div>`;
}

/* ---------- MARKET DASHBOARD (shell) ---------- */
function renderMarketDashboard() {
  const tabs = [
    { id: "retirada", label: "Retirada", icon: "package-check" },
    { id: "produtos", label: "Produtos", icon: "camera" },
    { id: "relatorios", label: "Relatórios", icon: "trophy" },
    { id: "pix", label: "Pix", icon: "wallet" },
  ];
  const tabsHtml = tabs
    .map(
      (t) => `
      <button class="tab-btn ${state.marketTab === t.id ? "active" : ""}" data-action="set-tab" data-tab="${t.id}">
        ${icon(t.icon, 17)}
        <span>${t.label}</span>
      </button>`
    )
    .join("");

  let content;
  if (state.marketTab === "retirada") {
    content = state.loadingOrders ? fullLoader("Carregando pedidos...") : renderTabRetirada();
  } else if (state.marketTab === "produtos") {
    content = state.loadingProducts ? fullLoader("Carregando produtos...") : renderTabProdutos();
  } else if (state.marketTab === "relatorios") {
    content = state.loadingOrders ? fullLoader("Carregando pedidos...") : renderTabRelatorios();
  } else {
    content = state.loadingOrders ? fullLoader("Carregando...") : renderTabPix();
  }

  return `
    <div class="screen">
      ${topBar("Painel do mercado", { logout: true })}
      <div class="tabs-bar">${tabsHtml}</div>
      <div class="tab-content">${content}</div>
    </div>`;
}

/* ---------- TAB: RETIRADA ---------- */
function renderTabRetirada() {
  const order = state.retiradaOrder;
  const recent = state.allOrders.slice(0, 8);

  const orderCard = order
    ? `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="order-code mono">${order.code}</div>
          <div class="order-customer">${escapeHtml(order.customerName)}</div>
        </div>
        ${order.status === "retirado"
          ? `<span class="pill pill-green">${icon("package-check", 14)} Retirado</span>`
          : `<span class="pill pill-amber">Aguardando retirada</span>`}
      </div>
      <div class="order-items">
        ${order.items.map((it) => `
          <div class="order-item-row">
            <span>${it.emoji || "📦"} ${it.qty}x ${escapeHtml(it.name)}</span>
            <span class="mono">${brl(it.price * it.qty)}</span>
          </div>`).join("")}
      </div>
      <div class="order-total-row">
        <span>Total</span>
        <span class="value mono">${brl(order.total)}</span>
      </div>
      ${order.status !== "retirado" ? `<button class="btn btn-danger btn-block btn-lg" id="btn-confirm-pickup" style="margin-top:16px">${icon("check", 18)} Confirmar retirada</button>` : ""}
    </div>`
    : "";

  const recentHtml = recent.length === 0
    ? `<p class="hint" style="opacity:.5">Nenhum pedido ainda.</p>`
    : recent
        .map(
          (o) => `
        <button class="recent-row" data-action="search-order" data-code="${o.code}">
          <span class="left">
            ${icon("clock", 14, "opacity-60")}
            <span class="mono">${o.code}</span>
            <span class="name-dim">${escapeHtml(o.customerName)}</span>
          </span>
          <span class="pill ${o.status === "retirado" ? "pill-green" : "pill-amber"}">${o.status === "retirado" ? "Retirado" : "Pendente"}</span>
        </button>`
        )
        .join("");

  return `
    <div class="tab-pane">
      <div>
        <p class="section-label">Validar comprovante</p>
        <div class="search-row">
          <input id="input-retirada-code" type="text" placeholder="Ex: M4821" value="${escapeHtml(state.retiradaCode)}" />
          <button class="search-btn" id="btn-search-order">${state.retiradaLoading ? icon("loader-2", 18, "spin") : icon("search", 18)}</button>
        </div>
        ${state.retiradaNotFound ? `<p class="error-text" style="color:var(--tomato);margin-top:8px">Nenhum pedido encontrado com esse código.</p>` : ""}
      </div>
      ${orderCard}
      <div>
        <p class="section-label">Pedidos recentes</p>
        ${recentHtml}
      </div>
    </div>`;
}

/* ---------- TAB: PRODUTOS ---------- */
function renderTabProdutos() {
  const products = state.products;
  const categories = [...new Set(products.map((p) => p.category || "Outros"))];
  const editing = state.productEditingId;
  const editingProduct = editing ? products.find((p) => p.id === editing) : null;

  const photoDraft = state.productPhotoDraft !== null ? state.productPhotoDraft : (editingProduct ? editingProduct.photo : null);

  const photoBlock = photoDraft
    ? `<img src="${photoDraft}" alt="preview" />`
    : `<div class="photo-placeholder">${icon("camera", 18, "opacity-60")}<span>foto</span></div>`;

  const rows = products
    .map(
      (p) => `
      <div class="product-row">
        ${thumbOrEmoji(p, 40)}
        <div class="info">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="meta">${escapeHtml(p.category || "Outros")} · <span class="mono">${brl(p.price)}</span></div>
        </div>
        <button class="icon-square" data-action="edit-product" data-id="${p.id}">${icon("pencil", 14)}</button>
        <button class="icon-square danger" data-action="remove-product" data-id="${p.id}">${icon("trash-2", 14)}</button>
      </div>`
    )
    .join("");

  const datalistOptions = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");

  return `
    <div class="tab-pane">
      <div class="prod-form">
        <p class="section-label">${editing ? "Editar produto" : "Novo produto"}</p>
        <div class="prod-form-top">
          <label class="photo-picker">
            <input type="file" accept="image/*" id="input-product-photo" class="hidden" />
            ${photoBlock}
          </label>
          <div class="prod-form-fields">
            <input type="text" id="input-product-name" placeholder="Nome do produto" value="${escapeHtml(editingProduct ? editingProduct.name : "")}" />
            <div class="row">
              <input type="number" step="0.01" min="0" id="input-product-price" class="price-input" placeholder="Preço" value="${editingProduct ? editingProduct.price : ""}" />
              <input type="text" id="input-product-category" placeholder="Categoria" list="cats" value="${escapeHtml(editingProduct ? editingProduct.category || "" : "")}" />
              <datalist id="cats">${datalistOptions}</datalist>
            </div>
          </div>
        </div>
        <div class="prod-form-actions">
          <button class="btn btn-primary" style="flex:1" id="btn-save-product" ${state.pixSaving ? "disabled" : ""}>
            ${editing ? icon("pencil", 16) : icon("plus", 16)} ${editing ? "Salvar alterações" : "Adicionar produto"}
          </button>
          ${editing ? `<button class="btn btn-ghost-border" id="btn-cancel-edit">${icon("x", 16)}</button>` : ""}
        </div>
      </div>
      <div>
        <p class="section-label">Catálogo (${products.length})</p>
        ${rows}
      </div>
    </div>`;
}

/* ---------- TAB: RELATÓRIOS ---------- */
function renderTabRelatorios() {
  const allOrders = state.allOrders;
  const months = [...new Set(allOrders.map((o) => monthKey(o.createdAt)))].sort().reverse();
  if (!state.reportMonth && months.length) state.reportMonth = months[0];
  const month = state.reportMonth;

  if (months.length === 0) {
    return `<div class="tab-pane"><p class="empty-msg">Ainda não há vendas registradas.</p></div>`;
  }

  const filtered = allOrders.filter((o) => monthKey(o.createdAt) === month);

  const qtyByProduct = {};
  filtered.forEach((o) => o.items.forEach((it) => (qtyByProduct[it.name] = (qtyByProduct[it.name] || 0) + it.qty)));
  const topProduct = Object.entries(qtyByProduct).sort((a, b) => b[1] - a[1])[0];

  const spentByCustomer = {};
  const ordersByCustomer = {};
  filtered.forEach((o) => {
    spentByCustomer[o.customerName] = (spentByCustomer[o.customerName] || 0) + o.total;
    ordersByCustomer[o.customerName] = (ordersByCustomer[o.customerName] || 0) + 1;
  });
  const topCustomer = Object.entries(spentByCustomer).sort((a, b) => b[1] - a[1])[0];

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
  const productRanking = Object.entries(qtyByProduct).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const monthOptions = months.map((m) => `<option value="${m}" ${m === month ? "selected" : ""}>${monthLabel(m)}</option>`).join("");

  const rankingHtml = productRanking.length
    ? `<div>
        <p class="section-label">Ranking de produtos</p>
        ${productRanking
          .map(
            ([name, q], i) => `
          <div class="rank-row">
            <span class="rank-num mono">${i + 1}</span>
            <span class="rank-name">${escapeHtml(name)}</span>
            <span class="rank-qty mono">${q} un.</span>
          </div>`
          )
          .join("")}
      </div>`
    : "";

  return `
    <div class="tab-pane">
      <select id="month-select">${monthOptions}</select>
      <div class="stat-grid">
        <div class="stat-card">
          ${icon("trending-up", 18, "opacity-60")}
          <div class="stat-label" style="margin-top:8px">Arrecadado no mês</div>
          <div class="stat-value mono" style="color:var(--awning)">${brl(totalRevenue)}</div>
        </div>
        <div class="stat-card">
          ${icon("shopping-basket", 18, "opacity-60")}
          <div class="stat-label" style="margin-top:8px">Pedidos no mês</div>
          <div class="stat-value mono">${filtered.length}</div>
        </div>
      </div>
      <div class="highlight-card">
        <div class="highlight-icon amber">${icon("trophy", 20)}</div>
        <div class="min-w-0">
          <div class="highlight-title">Produto mais vendido</div>
          <div class="highlight-value">${topProduct ? `${escapeHtml(topProduct[0])} · ${topProduct[1]} un.` : "—"}</div>
        </div>
      </div>
      <div class="highlight-card">
        <div class="highlight-icon green">${icon("users", 20)}</div>
        <div class="min-w-0">
          <div class="highlight-title">Cliente que mais comprou</div>
          <div class="highlight-value">${topCustomer ? `${escapeHtml(topCustomer[0])} · ${brl(topCustomer[1])} (${ordersByCustomer[topCustomer[0]]} pedidos)` : "—"}</div>
        </div>
      </div>
      ${rankingHtml}
    </div>`;
}

/* ---------- TAB: PIX ---------- */
function renderTabPix() {
  const allOrders = state.allOrders;
  const form = state.pixConfig || { keyType: "email", key: "", ownerName: "" };

  const revenueByMonth = {};
  allOrders.forEach((o) => {
    const m = monthKey(o.createdAt);
    revenueByMonth[m] = (revenueByMonth[m] || 0) + o.total;
  });
  const months = Object.keys(revenueByMonth).sort().reverse();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = revenueByMonth[thisMonth] || 0;
  const maxMonth = Math.max(1, ...Object.values(revenueByMonth));

  const historyHtml = months.length === 0
    ? `<p class="hint" style="opacity:.5">Nenhuma venda registrada ainda.</p>`
    : months
        .map(
          (m) => `
      <div class="history-row">
        <div class="top">
          <span>${monthLabel(m)}</span>
          <span class="value">${brl(revenueByMonth[m])}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${(revenueByMonth[m] / maxMonth) * 100}%"></div></div>
      </div>`
        )
        .join("");

  const keyTypes = ["cpf", "cnpj", "email", "telefone", "aleatoria"];
  const keyLabels = { cpf: "CPF", cnpj: "CNPJ", email: "E-mail", telefone: "Telefone", aleatoria: "Chave aleatória" };

  return `
    <div class="tab-pane">
      <div class="pix-form">
        <p class="pix-form-title">${icon("wallet", 14)} Chave Pix para receber pagamentos</p>
        <select id="input-pix-type">
          ${keyTypes.map((t) => `<option value="${t}" ${form.keyType === t ? "selected" : ""}>${keyLabels[t]}</option>`).join("")}
        </select>
        <input type="text" id="input-pix-key" class="mono" placeholder="Digite a chave Pix" value="${escapeHtml(form.key || "")}" />
        <input type="text" id="input-pix-owner" placeholder="Nome do mercado (aparece pro cliente)" value="${escapeHtml(form.ownerName || "")}" />
        <button class="btn btn-primary" id="btn-save-pix" ${state.pixSaving ? "disabled" : ""}>
          ${state.pixSaving ? icon("loader-2", 16, "spin") : icon("check", 16)}
          ${state.pixSaved ? "Salvo!" : "Salvar chave Pix"}
        </button>
      </div>
      <div class="month-box">
        <div class="stat-label">Arrecadado este mês (${monthLabel(thisMonth)})</div>
        <div class="amount">${brl(thisMonthTotal)}</div>
      </div>
      <div>
        <p class="section-label">Histórico de arrecadação</p>
        ${historyHtml}
      </div>
    </div>`;
}

/* ================= AÇÕES DE CESTA (compartilhadas) ================= */
function basketChange(id, delta) {
  const next = { ...state.basket };
  const v = (next[id] || 0) + delta;
  if (v <= 0) delete next[id];
  else next[id] = v;
  state.basket = next;
  render();
}

/* ================= EVENTOS ================= */
function bindEvents() {
  // navegação genérica
  app.querySelectorAll("[data-action='goto']").forEach((el) =>
    el.addEventListener("click", () => goto(el.dataset.view))
  );
  const backBtn = app.querySelector("[data-action='back']");
  if (backBtn) backBtn.addEventListener("click", handleBack);
  const logoutBtn = app.querySelector("[data-action='logout']");
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    state.marketAuth = false;
    goto("home");
  });

  // cesta
  app.querySelectorAll("[data-action='basket-inc']").forEach((el) =>
    el.addEventListener("click", () => basketChange(el.dataset.id, 1))
  );
  app.querySelectorAll("[data-action='basket-dec']").forEach((el) =>
    el.addEventListener("click", () => basketChange(el.dataset.id, -1))
  );
  app.querySelectorAll("[data-action='basket-remove']").forEach((el) =>
    el.addEventListener("click", () => {
      const qty = state.basket[el.dataset.id] || 0;
      basketChange(el.dataset.id, -qty);
    })
  );

  switch (state.view) {
    case "customer-access": bindCustomerAccess(); break;
    case "basket": bindBasketReview(); break;
    case "payment": bindPayment(); break;
    case "receipt": bindReceipt(); break;
    case "market-login": bindMarketLogin(); break;
    case "market-dashboard":
      if (state.marketAuth) bindMarketDashboard();
      else bindMarketLogin();
      break;
  }
}

function handleBack() {
  const map = {
    "customer-access": "home",
    catalog: "home",
    basket: "catalog",
    payment: "basket",
    "market-login": "home",
  };
  goto(map[state.view] || "home");
}

function bindCustomerAccess() {
  const nameInput = document.getElementById("input-name");
  const btn = document.getElementById("btn-enter-catalog");
  const sync = () => (btn.disabled = !nameInput.value.trim());
  nameInput.addEventListener("input", sync);
  sync();
  btn.addEventListener("click", () => {
    state.customerName = nameInput.value.trim();
    goto("catalog");
  });
}

function bindBasketReview() {
  const btn = document.getElementById("btn-go-payment");
  if (btn) btn.addEventListener("click", () => goto("payment"));
}

function bindPayment() {
  app.querySelectorAll("[data-action='set-method']").forEach((el) =>
    el.addEventListener("click", () => {
      state.paymentMethod = el.dataset.method;
      render();
    })
  );
  const payBtn = document.getElementById("btn-pay");
  if (payBtn) payBtn.addEventListener("click", pay);
}

async function pay() {
  state.paymentLoading = true;
  render();

  const items = basketItems();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const order = {
    code: genCode(),
    customerName: state.customerName,
    items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty, emoji: i.emoji, photo: i.photo || null })),
    total,
    method: state.paymentMethod,
    status: "pago",
    createdAt: new Date().toISOString(),
    pickedUpAt: null,
  };
  let existing = await fetchOrder(order.code);
  while (existing) {
    order.code = genCode();
    existing = await fetchOrder(order.code);
  }
  await new Promise((r) => setTimeout(r, 1100));
  const ok = await saveOrder(order);
  state.paymentLoading = false;
  if (ok) {
    state.order = order;
    goto("receipt");
  } else {
    render();
  }
}

function bindReceipt() {
  const btn = document.getElementById("btn-conclude");
  if (btn)
    btn.addEventListener("click", () => {
      resetCustomer();
      goto("home");
    });
}

function bindMarketLogin() {
  const submit = () => {
    const user = document.getElementById("input-user").value;
    const pass = document.getElementById("input-pass").value;
    if (user.trim() === "mercado" && pass === "1234") {
      state.loginError = "";
      state.marketAuth = true;
      state.view = "market-dashboard";
      loadMarketData();
    } else {
      state.loginError = "Usuário ou senha incorretos.";
      render();
    }
  };
  document.getElementById("btn-market-login").addEventListener("click", submit);
  ["input-user", "input-pass"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  });
}

async function loadMarketData() {
  state.loadingOrders = true;
  state.loadingProducts = true;
  render();
  const [orders, products] = await Promise.all([listAllOrders(), listAllProducts()]);
  state.allOrders = orders;
  state.products = products;
  state.loadingOrders = false;
  state.loadingProducts = false;
  const pixConfig = await getPixConfig();
  state.pixConfig = pixConfig;
  render();
}

function bindMarketDashboard() {
  app.querySelectorAll("[data-action='set-tab']").forEach((el) =>
    el.addEventListener("click", () => {
      state.marketTab = el.dataset.tab;
      render();
    })
  );
  if (state.marketTab === "retirada") bindTabRetirada();
  if (state.marketTab === "produtos") bindTabProdutos();
  if (state.marketTab === "relatorios") bindTabRelatorios();
  if (state.marketTab === "pix") bindTabPix();
}

function bindTabRetirada() {
  const input = document.getElementById("input-retirada-code");
  const searchBtn = document.getElementById("btn-search-order");
  const doSearch = async (codeArg) => {
    const value = (codeArg ?? input.value).trim().toUpperCase();
    if (!value) return;
    state.retiradaLoading = true;
    state.retiradaNotFound = false;
    render();
    const found = await fetchOrder(value);
    state.retiradaLoading = false;
    if (found) {
      state.retiradaOrder = found;
      state.retiradaCode = value;
    } else {
      state.retiradaOrder = null;
      state.retiradaNotFound = true;
    }
    render();
  };
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }
  if (searchBtn) searchBtn.addEventListener("click", () => doSearch());

  app.querySelectorAll("[data-action='search-order']").forEach((el) =>
    el.addEventListener("click", () => doSearch(el.dataset.code))
  );

  const pickupBtn = document.getElementById("btn-confirm-pickup");
  if (pickupBtn)
    pickupBtn.addEventListener("click", async () => {
      const updated = { ...state.retiradaOrder, status: "retirado", pickedUpAt: new Date().toISOString() };
      const ok = await saveOrder(updated);
      if (ok) {
        state.retiradaOrder = updated;
        state.allOrders = await listAllOrders();
        render();
      }
    });
}

function bindTabProdutos() {
  const photoInput = document.getElementById("input-product-photo");
  if (photoInput) {
    photoInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToResizedDataURL(file);
        state.productPhotoDraft = dataUrl;
        render();
      } catch (err) {
        console.error(err);
      }
    });
  }

  app.querySelectorAll("[data-action='edit-product']").forEach((el) =>
    el.addEventListener("click", () => {
      state.productEditingId = el.dataset.id;
      state.productPhotoDraft = null;
      render();
    })
  );

  const cancelBtn = document.getElementById("btn-cancel-edit");
  if (cancelBtn)
    cancelBtn.addEventListener("click", () => {
      state.productEditingId = null;
      state.productPhotoDraft = null;
      render();
    });

  const saveBtn = document.getElementById("btn-save-product");
  if (saveBtn)
    saveBtn.addEventListener("click", async () => {
      const name = document.getElementById("input-product-name").value;
      const price = document.getElementById("input-product-price").value;
      const category = document.getElementById("input-product-category").value;
      if (!name.trim() || !price) return;

      const id = state.productEditingId || "c_" + Date.now();
      const existing = state.products.find((p) => p.id === id);
      const product = {
        id,
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim() || "Outros",
        photo: state.productPhotoDraft || (existing ? existing.photo : null),
        emoji: existing ? existing.emoji : null,
        updatedAt: new Date().toISOString(),
      };
      await saveProduct(product);
      state.productEditingId = null;
      state.productPhotoDraft = null;
      state.products = await listAllProducts();
      render();
    });

  app.querySelectorAll("[data-action='remove-product']").forEach((el) =>
    el.addEventListener("click", async () => {
      await deleteProductStorage(el.dataset.id);
      if (state.productEditingId === el.dataset.id) {
        state.productEditingId = null;
        state.productPhotoDraft = null;
      }
      state.products = await listAllProducts();
      render();
    })
  );
}

function bindTabRelatorios() {
  const select = document.getElementById("month-select");
  if (select)
    select.addEventListener("change", (e) => {
      state.reportMonth = e.target.value;
      render();
    });
}

function bindTabPix() {
  const saveBtn = document.getElementById("btn-save-pix");
  if (saveBtn)
    saveBtn.addEventListener("click", async () => {
      const keyType = document.getElementById("input-pix-type").value;
      const key = document.getElementById("input-pix-key").value;
      const ownerName = document.getElementById("input-pix-owner").value;
      if (!key.trim()) return;
      state.pixSaving = true;
      render();
      const cfg = { keyType, key, ownerName };
      const ok = await savePixConfig(cfg);
      state.pixSaving = false;
      if (ok) {
        state.pixConfig = cfg;
        state.pixSaved = true;
        render();
        setTimeout(() => {
          state.pixSaved = false;
          render();
        }, 2200);
      } else {
        render();
      }
    });
}

/* ================= INIT ================= */
async function init() {
  await ensureSeeded();
  state.products = await listAllProducts();
  state.loadingProducts = false;
  state.appReady = true;
  render
}

init();