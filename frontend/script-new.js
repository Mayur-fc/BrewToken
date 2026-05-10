const API_BASE = 'http://127.0.0.1:5001/api';
const CART_KEY = 'brewtoken_cart';
const ORDER_TOKEN_KEY = 'brewtoken_last_token';
let cart = {};
let products = [];
let orders = [];
let currentOrder = null;
let selectedPayMethod = 'UPI';
let menuFilter = { cat: 'All', search: '' };
let isAdminLoggedIn = 
  sessionStorage.getItem('brewtoken_admin') === 'true' || 
  localStorage.getItem('brewtoken_admin') === 'true'; // ✅ check both storages
let orderPollInterval = null;
const STATUS_STEPS = ['Payment Verified', 'Order Accepted', 'Preparing', 'Ready for Pickup', 'Completed'];
const STATUS_ICONS = ['💳', '✅', '🍳', '🎉', '✔️'];

function loadCart() {
  try {
    const data = localStorage.getItem(CART_KEY);
    cart = data ? JSON.parse(data) : {};
  } catch (error) {
    cart = {};
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function saveOrderToken(token) {
  localStorage.setItem(ORDER_TOKEN_KEY, token);
}

function clearSavedOrder() {
  localStorage.removeItem(ORDER_TOKEN_KEY);
  currentOrder = null;
}

async function init() {
  loadCart();
  await fetchProducts();
  if (isAdminLoggedIn) {
    await fetchOrders();
  }
  await loadSavedOrder();
  renderCartDrawer();
  startPolling();
}

async function fetchProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to load products');
    products = data.products;
    renderFeatured();
    renderMenu();
    if (document.querySelector('.sidebar-link.active')?.textContent.toLowerCase().includes('menu')) {
      renderAdminMenu();
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Menu Error', 'Unable to load products.');
  }
}

async function fetchOrders() {
  try {
    const response = await fetch(`${API_BASE}/orders`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to load orders');
    orders = data.orders;
    if (document.querySelector('.sidebar-link.active')?.textContent.toLowerCase().includes('dashboard')) renderAdminDashboard();
    if (document.querySelector('.sidebar-link.active')?.textContent.toLowerCase().includes('live')) renderAdminOrders();
    if (document.querySelector('.sidebar-link.active')?.textContent.toLowerCase().includes('history')) renderAdminHistory();
    if (document.querySelector('.sidebar-link.active')?.textContent.toLowerCase().includes('payments')) renderAdminPayments();
  } catch (error) {
    console.error(error);
    showToast('error', 'Order Error', 'Unable to load orders.');
  }
}

async function loadSavedOrder() {
  const token = localStorage.getItem(ORDER_TOKEN_KEY);
  if (!token) return;
  await fetchOrderByToken(token, true);
}

function getProduct(id) {
  return products.find(product => product.id === id);
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product || !product.available) return;
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  updateCartUI();
  showToast('success', 'Added!', `${product.name} added to cart.`);
}

function removeFromCart(id) {
  if (!cart[id]) return;
  if (cart[id] > 1) cart[id] -= 1;
  else delete cart[id];
  saveCart();
  updateCartUI();
}

function deleteFromCart(id) {
  delete cart[id];
  saveCart();
  updateCartUI();
}

function getCartCount() {
  return Object.values(cart).reduce((total, qty) => total + qty, 0);
}

function getCartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = getProduct(id);
    return sum + (product ? product.price * qty : 0);
  }, 0);
}

function updateCartUI() {
  const count = getCartCount();
  const badge = document.getElementById('cartBadge');
  badge.style.display = count ? 'flex' : 'none';
  badge.textContent = count;
  renderCartDrawer();
}

function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsContainer');
  const summary = document.getElementById('cartSummary');
  if (getCartCount() === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>`;
    summary.innerHTML = '<p style="color:var(--text3);font-size:13px;text-align:center;">Add items to get started</p>';
    document.getElementById('payNowBtn').disabled = true;
    return;
  }
  document.getElementById('payNowBtn').disabled = false;
  container.innerHTML = Object.entries(cart).map(([id, qty]) => {
    const product = getProduct(id);
    if (!product) return '';
    return `
      <div class="cart-item-row">
        <img class="cart-item-img" src="${product.img}" alt="${product.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">₹${product.price * qty}</div>
        </div>
        <div class="cart-item-qty">
          <button onclick="removeFromCart('${id}')">−</button>
          <span>${qty}</span>
          <button onclick="addToCart('${id}')">+</button>
        </div>
        <button class="cart-remove" onclick="deleteFromCart('${id}')">🗑️</button>
      </div>`;
  }).join('');
  const total = getCartTotal();
  const gst = Math.round(total * 0.05);
  summary.innerHTML = `
    <div class="cart-row"><span>Subtotal</span><span>₹${total}</span></div>
    <div class="cart-row"><span>GST (5%)</span><span>₹${gst}</span></div>
    <div class="cart-row total"><span>Total Payable</span><span>₹${total + gst}</span></div>`;
}

function showView(name) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if (!target) return;
  target.classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'menu') renderMenu();
  if (name === 'home') renderFeatured();
  if (name === 'tracking') renderTracking();
  if (name === 'admin') {
    if (!isAdminLoggedIn) { showView('adminLogin'); return; }
    fetchOrders();
    renderAdminDashboard();
  }
}

function setActiveNav(element) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  element.classList.add('active');
}

function toggleMobileNav() {
  document.getElementById('navLinks').classList.toggle('open');
}

function renderMenu() {
  const categories = ['All', ...new Set(products.map(product => product.category))];
  document.getElementById('catTabs').innerHTML = categories.map(category => `
    <button class="cat-tab${menuFilter.cat === category ? ' active' : ''}" onclick="setCat('${category}')">${category}</button>`).join('');
  const filtered = products.filter(product => {
    const matchesCategory = menuFilter.cat === 'All' || product.category === menuFilter.cat;
    const matchesSearch = product.name.toLowerCase().includes(menuFilter.search.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  document.getElementById('menuGrid').innerHTML = filtered.map(product => {
    const qty = cart[product.id] || 0;
    return `
      <div class="product-card${product.available ? '' : ' out-of-stock'}">
        <img class="product-img" src="${product.img}" alt="${product.name}" loading="lazy" />
        <div class="product-body">
          <div class="product-top">
            <div class="product-name">${product.name}</div>
            <span class="veg-badge ${product.veg ? 'veg' : 'nonveg'}">${product.veg ? 'VEG' : 'EGG'}</span>
          </div>
          <div class="product-cat">${product.category}</div>
          <div class="product-footer">
            <div class="product-price">₹${product.price}<span> / item</span></div>
            ${qty === 0 ? `<button class="add-btn" onclick="addToCart('${product.id}')">+</button>` : `
              <div class="qty-ctrl">
                <button onclick="removeFromCart('${product.id}')">−</button>
                <span>${qty}</span>
                <button onclick="addToCart('${product.id}')">+</button>
              </div>`}
          </div>
          ${product.available ? '' : '<div style="text-align:center;padding:8px;font-size:12px;color:var(--red);">Out of Stock</div>'}
        </div>
      </div>`;
  }).join('');
}

function setCat(category) {
  menuFilter.cat = category;
  renderMenu();
}

function filterMenu() {
  menuFilter.search = document.getElementById('menuSearch').value;
  renderMenu();
}

function renderFeatured() {
  const featured = products.filter(product => product.available).slice(0, 4);
  document.getElementById('featuredItems').innerHTML = featured.map(product => `
    <div class="product-card" style="cursor:default">
      <img class="product-img" src="${product.img}" alt="${product.name}" loading="lazy" />
      <div class="product-body">
        <div class="product-top">
          <div class="product-name">${product.name}</div>
          <span class="veg-badge ${product.veg ? 'veg' : 'nonveg'}">${product.veg ? 'VEG' : 'EGG'}</span>
        </div>
        <div class="product-footer">
          <div class="product-price">₹${product.price}</div>
          <button class="add-btn" onclick="addToCart('${product.id}')">+</button>
        </div>
      </div>
    </div>`).join('');
}

function openPayment() {
  if (getCartCount() === 0) return;
  toggleCart();
  const total = getCartTotal();
  const gst = Math.round(total * 0.05);
  const grand = total + gst;
  document.getElementById('paymentModalContent').innerHTML = `
    <h3>💳 Checkout</h3>
    <p>Choose your payment method and complete the order.</p>
    <div class="modal-amount">
      <div class="lbl">Total Payable</div>
      <div class="amt">₹${grand}</div>
    </div>
    <div class="payment-methods">
      <button class="pm-btn active" onclick="selectPM(this,'UPI')">📱 UPI</button>
      <button class="pm-btn" onclick="selectPM(this,'Card')">💳 Card</button>
      <button class="pm-btn" onclick="selectPM(this,'Wallet')">👛 Wallet</button>
      <button class="pm-btn" onclick="selectPM(this,'NetBanking')">🏦 Net Banking</button>
    </div>
    <div class="demo-note">✅ Demo Mode — Click "Pay Now" to simulate payment success</div>
    <div class="modal-btns">
      <button class="modal-cancel" onclick="closeModal('paymentModal')">Cancel</button>
      <button class="modal-pay" onclick="processPayment(${grand})">Pay ₹${grand} →</button>
    </div>`;
  openModal('paymentModal');
}

function selectPM(button, method) {
  selectedPayMethod = method;
  button.closest('.payment-methods').querySelectorAll('.pm-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
}

function processPayment(amount) {
  document.getElementById('paymentModalContent').innerHTML = `
    <div class="processing-modal">
      <div class="processing-spinner"></div>
      <h3>Processing Payment...</h3>
      <p>Verifying your ${selectedPayMethod} payment of ₹${amount}</p>
    </div>`;
  setTimeout(() => confirmOrder(amount), 2200);
}

async function confirmOrder(amount) {
  const items = Object.entries(cart).map(([id, qty]) => {
    const product = getProduct(id);
    return { name: product.name, qty, price: product.price, total: product.price * qty };
  });
  
  try {
    console.log('Sending order to:', `${API_BASE}/orders`); // ✅ see exact URL
    console.log('Order payload:', { items, total: amount }); // ✅ see what's sent
    
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customer: 'Guest Customer', 
        items, 
        total: amount, 
        payMethod: selectedPayMethod 
      }),
    });
    
    console.log('Response status:', response.status); // ✅ see response code
    
    const data = await response.json();
    console.log('Response data:', data); // ✅ see full response
    
    if (!data.success) throw new Error(data.message || 'Order failed');
    
    // ... rest of your existing code stays the same
    currentOrder = data.order;
    cart = {};
    saveCart();
    saveOrderToken(currentOrder.token);
    if (data.order) await fetchOrders();
    updateCartUI();
    document.getElementById('paymentModalContent').innerHTML = `
      <div class="success-modal">
        <div class="success-check">✅</div>
        <h3>Payment Verified!</h3>
        <div class="token-display">
          <div class="token-lbl">Your Token Number</div>
          <div class="token-num">${currentOrder.token}</div>
        </div>
        <p class="token-info">Show this token at the counter to collect your order.<br/>Estimated wait: <strong>~10 minutes</strong></p>
        <button class="track-btn" onclick="closeModal('paymentModal');showView('tracking')">Track Order Live →</button>
      </div>`;
    showToast('success', 'Order Confirmed!', `Token ${currentOrder.token} — Track your order live`);
    startPolling();
    
  } catch (error) {
    console.error('ORDER FAILED REASON:', error.message); // ✅ exact failure reason
    showToast('error', 'Order Failed', error.message);    // ✅ show on screen too
    closeModal('paymentModal');
  }
}

async function fetchOrderByToken(token, silent = false) {
  if (!token) return;
  try {
    const response = await fetch(`${API_BASE}/orders/${token}`);
    const data = await response.json();
    if (!data.success) {
      if (!silent) showToast('error', 'Tracking Error', 'Order not found.');
      clearSavedOrder();
      return;
    }
    currentOrder = data.order;
    saveOrderToken(currentOrder.token);
    return currentOrder;
  } catch (error) {
    console.error(error);
    if (!silent) showToast('error', 'Network Error', 'Unable to fetch order status.');
  }
}

function startPolling() {
  if (orderPollInterval) return;
  orderPollInterval = setInterval(async () => {
    if (currentOrder && currentOrder.token) {
      await fetchOrderByToken(currentOrder.token, true);
      if (document.getElementById('view-tracking').classList.contains('active')) renderTracking();
    }
    if (isAdminLoggedIn) await fetchOrders();
  }, 6000);
}

function stopPolling() {
  if (orderPollInterval) {
    clearInterval(orderPollInterval);
    orderPollInterval = null;
  }
}

async function renderTracking() {
  const trackingEl = document.getElementById('trackingContent');
  const token = localStorage.getItem(ORDER_TOKEN_KEY);
  if (!currentOrder && token) {
    await fetchOrderByToken(token, true);
  }
  if (!currentOrder) {
    trackingEl.innerHTML = `
      <div class="order-card-track no-order">
        <div style="font-size:48px;margin-bottom:16px;">📦</div>
        <p>No active order found.</p>
        <p style="margin-top:8px;font-size:14px;">Place an order first to track it here.</p>
        <button class="btn-primary" style="margin-top:24px;" onclick="showView('menu')">Order Now →</button>
      </div>`;
    return;
  }
  const statusIndex = currentOrder.statusIndex || 0;
  const progressPct = statusIndex === 0 ? 10 : Math.round((statusIndex / (STATUS_STEPS.length - 1)) * 100);
  trackingEl.innerHTML = `
    <div class="order-card-track">
      <div class="track-token">
        <div class="track-token-badge">
          <div class="lbl">Token</div>
          <div class="tok">${currentOrder.token}</div>
        </div>
        <div class="track-info">
          <div class="track-time">${formatTime(currentOrder.createdAt)}</div>
          <div class="track-items">${currentOrder.items.length} item${currentOrder.items.length > 1 ? 's' : ''} · ₹${currentOrder.total}</div>
          <div class="live-dot" style="margin-top:4px;">Live Tracking</div>
        </div>
      </div>
      <div class="status-bar">
        <div class="status-progress" style="width:${progressPct}%"></div>
        ${STATUS_STEPS.map((step, index) => `
          <div class="status-step">
            <div class="status-dot ${index < statusIndex ? 'done' : index === statusIndex ? 'active' : ''}">${index <= statusIndex ? STATUS_ICONS[index] : '·'}</div>
            <div class="status-label ${index === statusIndex ? 'active' : ''}">${step.split(' ')[0]}</div>
          </div>`).join('')}
      </div>
      <div style="background:var(--card2);border-radius:10px;padding:12px;margin-bottom:16px;text-align:center;">
        <div style="font-size:13px;color:var(--text3);">Current Status</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px;color:var(--accent);">${STATUS_ICONS[statusIndex]} ${currentOrder.status}</div>
      </div>
      <div class="track-items-list">
        ${currentOrder.items.map(item => `<div class="track-item-row"><span>${item.name} ×${item.qty}</span><span style="color:var(--accent);font-family:var(--mono)">₹${item.total}</span></div>`).join('')}
      </div>
      ${statusIndex >= 3 ? `<div class="ready-banner"><h3>🎉 Order Ready!</h3><p>Please show token <strong style="color:var(--accent)">${currentOrder.token}</strong> at the counter to collect your order.</p></div>` : ''}
    </div>`;
}

// REPLACE the existing doLogin function
async function doLogin() {
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;
  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    
    isAdminLoggedIn = true;
    sessionStorage.setItem('brewtoken_admin', 'true');
    localStorage.setItem('brewtoken_admin', 'true'); // ✅ persist across refresh
    
    document.getElementById('loginError').style.display = 'none';
    await fetchOrders();
    showView('admin');
    renderAdminDashboard();
    showToast('success', 'Welcome back!', 'Admin dashboard loaded.');
  } catch (error) {
    document.getElementById('loginError').style.display = 'block';
  }
}

// REPLACE the existing adminLogout function
function adminLogout() {
  isAdminLoggedIn = false;
  sessionStorage.removeItem('brewtoken_admin');
  localStorage.removeItem('brewtoken_admin'); // ✅ clear both on logout
  showView('home');
  showToast('info', 'Logged out', 'See you next time!');
}

function showAdminPage(page, element) {
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  if (element) element.classList.add('active');
  if (page === 'dashboard') {
    renderAdminDashboard();
  } else if (page === 'orders') {
    renderAdminOrders();
  } else if (page === 'history') {
    renderAdminHistory();
  } else if (page === 'menu') {
    renderAdminMenu();
  } else if (page === 'payments') {
    renderAdminPayments();
  }
}

function renderAdminDashboard() {
  const total = orders.length;
  const active = orders.filter(order => order.status !== 'Completed').length;
  const completed = orders.filter(order => order.status === 'Completed').length;
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  document.getElementById('adminMain').innerHTML = `
    <div class="admin-page-title">Dashboard</div>
    <div class="admin-page-sub"><span class="live-dot">Live updates</span></div>
    <div class="stats-grid">
      <div class="stat-card accent">
        <div class="stat-icon">📋</div>
        <div class="stat-lbl">Total Orders</div>
        <div class="stat-val">${total}</div>
        <div class="stat-change">↑ Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-lbl">Active Orders</div>
        <div class="stat-val">${active}</div>
        <div class="stat-change" style="color:var(--gold)">In progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-lbl">Completed</div>
        <div class="stat-val">${completed}</div>
        <div class="stat-change">Done today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-lbl">Revenue</div>
        <div class="stat-val">₹${revenue}</div>
        <div class="stat-change">Today's earnings</div>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div class="orders-header"><h3>Recent Orders</h3><div class="live-dot">Auto-updating</div></div>
      <div class="order-cards-grid">${renderOrderCards()}</div>
      ${orders.length === 0 ? '<div style="text-align:center;padding:48px;color:var(--text3);background:var(--card);border-radius:16px;margin-top:16px;"><p style="font-size:32px;margin-bottom:12px;">📋</p><p>No orders yet. Waiting for customers...</p></div>' : ''}
    </div>`;
}

function renderAdminOrders() {
  document.getElementById('adminMain').innerHTML = `
    <div class="admin-page-title">Live Orders</div>
    <div class="admin-page-sub"><span class="live-dot">Real-time</span></div>
    <div class="order-cards-grid">${renderOrderCards(false)}</div>
    ${orders.filter(order => order.status !== 'Completed').length === 0 ? '<div style="text-align:center;padding:60px;color:var(--text3);background:var(--card);border-radius:16px;margin-top:8px;"><p style="font-size:40px;">☕</p><p style="margin-top:12px;">No active orders right now</p></div>' : ''}`;
}

function renderAdminHistory() {
  document.getElementById('adminMain').innerHTML = `
    <div class="admin-page-title">Order History</div>
    <div class="admin-page-sub">All orders including completed ones</div>
    <div class="order-cards-grid">${renderOrderCards(true, true)}</div>
    ${orders.length === 0 ? '<div style="text-align:center;padding:60px;color:var(--text3);background:var(--card);border-radius:16px;"><p>No orders yet.</p></div>' : ''}`;
}

function renderOrderCards(showAll = true, includeCompleted = false) {
  let list = [...orders];
  if (!showAll) list = list.filter(order => order.status !== 'Completed');
  if (!includeCompleted) list = list.slice(0, 6);
  return list.map(order => renderOrderCard(order)).join('');
}

function renderOrderCard(order) {
  return `
    <div class="admin-order-card ${order.statusIndex === 0 ? 'new' : ''}">
      <div class="admin-card-top">
        <div class="admin-card-token">${order.token}</div>
        <span class="status-badge ${order.status.toLowerCase().replace(/ /g, '-')}">${order.status}</span>
      </div>
      <div class="admin-card-time">${formatTime(order.createdAt)} · ${order.payMethod}</div>
      <div class="admin-card-items" style="margin-top:8px;">${order.items.map(item => `${item.name}×${item.qty}`).join(', ')}</div>
      <div class="admin-card-items" style="color:var(--accent);font-family:var(--mono);font-weight:700;">₹${order.total}</div>
      <div class="admin-card-footer">
        ${STATUS_STEPS.map((step, index) => index === 0 || order.statusIndex >= index ? '' : `<button class="status-update-btn${step === 'Ready for Pickup' ? ' ready-btn' : ''}" onclick="updateOrderStatus('${order.id}', '${step}', ${index})">${STATUS_ICONS[index]} ${step}</button>`).slice(0, 3).join('')}
        ${order.statusIndex < STATUS_STEPS.length - 1 ? `<button class="status-update-btn" onclick="advanceOrder('${order.id}')">→ Next Step</button>` : ''}
      </div>
    </div>`;
}

async function updateOrderStatus(orderId, status, index) {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, statusIndex: index }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Status update failed');
    await fetchOrders();
    if (currentOrder && currentOrder.id === orderId) {
      currentOrder.status = status;
      currentOrder.statusIndex = index;
      renderTracking();
    }
    showToast('info', 'Order Updated', `Status changed to ${status}`);
  } catch (error) {
    console.error(error);
    showToast('error', 'Update Failed', 'Could not update order status.');
  }
}

async function advanceOrder(orderId) {
  const order = orders.find(item => item.id === orderId);
  if (!order || order.statusIndex >= STATUS_STEPS.length - 1) return;
  const nextIndex = order.statusIndex + 1;
  await updateOrderStatus(orderId, STATUS_STEPS[nextIndex], nextIndex);
}

async function renderAdminMenu() {
  const content = products.map(product => `
      <div class="mgmt-card" id="mgmt-${product.id}">
        <img class="mgmt-card-img" src="${product.img}" alt="${product.name}" />
        <div class="mgmt-card-body">
          <div class="mgmt-card-name">${product.name}</div>
          <div class="mgmt-card-meta">₹${product.price} · ${product.category} · <span style="color:${product.veg ? 'var(--green)' : 'var(--red)'};">${product.veg ? 'Veg' : 'Non-veg'}</span></div>
          <div class="mgmt-card-footer">
            <button class="mgmt-btn edit" onclick="openProductForm('${product.id}')">✏️ Edit</button>
            <button class="mgmt-btn toggle ${product.available ? '' : 'off'}" onclick="toggleAvailability('${product.id}')">${product.available ? '✅ Active' : '⛔ Disabled'}</button>
            <button class="mgmt-btn del" onclick="deleteProduct('${product.id}')">🗑️</button>
          </div>
        </div>
      </div>`).join('');
  document.getElementById('adminMain').innerHTML = `
    <div class="admin-page-title">Menu Management</div>
    <div class="admin-page-sub">Add, edit, or disable menu items</div>
    <button class="add-product-btn" onclick="openProductForm()">+ Add New Item</button>
    <div class="menu-mgmt-grid">${content}</div>`;
}

async function toggleAvailability(id) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}/availability`, { method: 'PATCH' });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Toggle failed');
    await fetchProducts();
    renderAdminMenu();
    showToast(data.available ? 'success' : 'info', 'Availability Updated', `Product is now ${data.available ? 'available' : 'disabled'}`);
  } catch (error) {
    console.error(error);
    showToast('error', 'Update Failed', 'Unable to toggle availability.');
  }
}

async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Delete failed');
    await fetchProducts();
    renderAdminMenu();
    showToast('info', 'Product removed', 'Item deleted from menu.');
  } catch (error) {
    console.error(error);
    showToast('error', 'Delete Failed', 'Unable to remove product.');
  }
}

function openProductForm(id = null) {
  const product = id ? products.find(item => item.id === id) : null;
  document.getElementById('productModalContent').innerHTML = `
    <h3>${product ? 'Edit Item' : 'Add New Item'}</h3>
    <div class="pf-grid">
      <div class="pf-group pf-full">
        <label>Item Name</label>
        <input id="pf-name" value="${product ? product.name : ''}" placeholder="e.g. Masala Chai" />
      </div>
      <div class="pf-group">
        <label>Price (₹)</label>
        <input id="pf-price" type="number" value="${product ? product.price : ''}" placeholder="15" />
      </div>
      <div class="pf-group">
        <label>Category</label>
        <select id="pf-cat">
          ${['Beverages', 'Snacks', 'Meals', 'Desserts'].map(category => `<option${product && product.category === category ? ' selected' : ''}>${category}</option>`).join('')}
        </select>
      </div>
      <div class="pf-group">
        <label>Type</label>
        <select id="pf-veg">
          <option value="true"${product && product.veg ? ' selected' : ''}>Vegetarian</option>
          <option value="false"${product && !product.veg ? ' selected' : ''}>Non-Vegetarian</option>
        </select>
      </div>
      <div class="pf-group pf-full">
        <label>Image URL</label>
        <input id="pf-img" value="${product ? product.img : ''}" placeholder="https://..." />
      </div>
    </div>
    <div class="pf-btns">
      <button class="pf-cancel" onclick="closeModal('productModal')">Cancel</button>
      <button class="pf-save" onclick="saveProduct(${product ? `'${product.id}'` : 'null'})">${product ? 'Save Changes' : 'Add Item'}</button>
    </div>`;
  openModal('productModal');
}

async function saveProduct(id) {
  const name = document.getElementById('pf-name').value.trim();
  const price = +document.getElementById('pf-price').value;
  const category = document.getElementById('pf-cat').value;
  const veg = document.getElementById('pf-veg').value === 'true';
  const img = document.getElementById('pf-img').value.trim();
  if (!name || !price) return showToast('error', 'Missing Fields', 'Complete required inputs.');
  try {
    const body = { name, price, category, veg, img: img || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600', available: true };
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    const method = id ? 'PUT' : 'POST';
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Save failed');
    await fetchProducts();
    closeModal('productModal');
    renderAdminMenu();
    showToast('success', id ? 'Updated!' : 'Added!', id ? `${name} updated successfully` : `${name} added to menu`);
  } catch (error) {
    console.error(error);
    showToast('error', 'Save Failed', 'Unable to save product.');
  }
}

function renderAdminPayments() {
  const paidOrders = orders;
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  document.getElementById('adminMain').innerHTML = `
    <div class="admin-page-title">Payment Management</div>
    <div class="admin-page-sub">All payment transactions</div>
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card accent"><div class="stat-icon">💰</div><div class="stat-lbl">Total Revenue</div><div class="stat-val">₹${revenue}</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-lbl">Verified</div><div class="stat-val">${paidOrders.length}</div></div>
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-lbl">Avg Order</div><div class="stat-val">₹${paidOrders.length ? Math.round(revenue / paidOrders.length) : 0}</div></div>
    </div>
    <div class="orders-table">
      <div class="table-head" style="grid-template-columns:100px 140px 1fr 100px 120px;">
        <span>Token</span><span>Txn ID</span><span>Items</span><span>Method</span><span>Amount</span>
      </div>
      ${paidOrders.map(order => `
        <div class="order-row" style="grid-template-columns:100px 140px 1fr 100px 120px;">
          <span class="token-pill">${order.token}</span>
          <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">${order.transactionId || order.id}</span>
          <span class="order-items-cell">${order.items.map(item => item.name).join(', ')}</span>
          <span style="font-size:12px;color:var(--text2)">${order.payMethod}</span>
          <span style="color:var(--accent);font-family:var(--mono);font-weight:700">₹${order.total}</span>
        </div>`).join('') || '<div style="padding:32px;text-align:center;color:var(--text3);">No payments yet</div>'}
    </div>`;
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.getElementById('paymentModal').addEventListener('click', function (event) {
  if (event.target === this) closeModal('paymentModal');
});
document.getElementById('productModal').addEventListener('click', function (event) {
  if (event.target === this) closeModal('productModal');
});

function showToast(type, title, message) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', 'new-order': '🔔' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('exit'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

init();
