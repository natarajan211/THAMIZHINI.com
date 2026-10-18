/**
 * VOGUE & CO - Modern E-Commerce Application Frontend Logic
 */

// Application State
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('vogue_cart') || '[]'),
  token: localStorage.getItem('vogue_token') || null,
  user: JSON.parse(localStorage.getItem('vogue_user') || 'null'),
  currentCategory: 'All',
  searchQuery: '',
  currentSort: 'newest',
  storeSettings: null
};

// API Base URL
const API_BASE = '/api';

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  renderAuthUI();
  updateCartBadge();
  fetchProducts();
  fetchStoreSettings();
  setupEventListeners();

  // If user token exists, verify profile
  if (state.token) {
    checkCurrentUser();
  }
});

// Setup click and window listeners
function setupEventListeners() {
  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
      const drawer = document.getElementById('cartDrawer');
      if (drawer && drawer.classList.contains('active')) {
        toggleCartDrawer();
      }
    }
  });

  // Close user dropdown if clicked outside
  document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userDropdownMenu');
    const userBtn = document.getElementById('userDropdownBtn');
    if (userMenu && !userMenu.contains(e.target) && !userBtn.contains(e.target)) {
      userMenu.classList.remove('show');
    }
  });
}

/* ==========================================================
   PRODUCTS FETCHING & RENDERING
   ========================================================== */

async function fetchProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <p>Loading curated fashion styles...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (state.currentCategory && state.currentCategory !== 'All') {
      params.append('category', state.currentCategory);
    }
    if (state.searchQuery && state.searchQuery.trim() !== '') {
      params.append('search', state.searchQuery.trim());
    }
    if (state.currentSort) {
      params.append('sort', state.currentSort);
    }

    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.products = data.products;
      renderProducts(data.products);
      updateFilterStatus();
    } else {
      grid.innerHTML = `<div class="loader-container"><p>Unable to load products. Please try again.</p></div>`;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    grid.innerHTML = `<div class="loader-container"><p>Server connection error. Make sure MySQL & Node server are running.</p></div>`;
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  const countLabel = document.getElementById('productCountLabel');

  if (countLabel) {
    countLabel.innerText = `Showing ${products.length} item${products.length === 1 ? '' : 's'}`;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="loader-container" style="padding: 40px 0;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; color: #d1d5db; margin-bottom: 12px;"></i>
        <h3>No matching fashion products found</h3>
        <p style="color: #6b7280; margin-top: 6px;">Try adjusting your search terms or category filter.</p>
        <button class="btn btn-outline-dark btn-sm mt-3" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(prod => {
    const isSale = prod.original_price && parseFloat(prod.original_price) > parseFloat(prod.price);
    const discount = isSale 
      ? Math.round(((parseFloat(prod.original_price) - parseFloat(prod.price)) / parseFloat(prod.original_price)) * 100) 
      : 0;

    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-thumb">
          <img src="${escapeHtml(prod.image_url)}" alt="${escapeHtml(prod.name)}" loading="lazy">
          ${prod.is_featured ? '<span class="product-badge">Featured</span>' : ''}
          ${isSale ? `<span class="product-badge sale" style="${prod.is_featured ? 'left: auto; right: 12px;' : ''}">${discount}% OFF</span>` : ''}
          <button class="quick-view-overlay-btn" onclick="openQuickView(${prod.id})">
            <i class="fa-regular fa-eye"></i> Quick View
          </button>
        </div>

        <div class="product-details">
          <span class="product-category-name">${escapeHtml(prod.category)}</span>
          <h3 class="product-title" onclick="openQuickView(${prod.id})">${escapeHtml(prod.name)}</h3>
          
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <strong>${prod.rating || 4.5}</strong>
            <span class="rating-count">(${Math.floor((prod.id * 17) % 60 + 12)} reviews)</span>
          </div>

          <div style="font-size: 0.75rem; font-weight: 600; color: ${parseFloat(prod.shipping_cost) > 0 ? '#4338ca' : '#16a34a'}; margin-bottom: 6px;">
            <i class="fa-solid fa-truck"></i> ${parseFloat(prod.shipping_cost) > 0 ? `Delivery: ₹${formatCurrency(prod.shipping_cost)}` : 'Free Delivery'}
          </div>

          <div class="product-bottom">
            <div class="price-box">
              <span class="current-price">₹${formatCurrency(prod.price)}</span>
              ${isSale ? `<span class="original-price">₹${formatCurrency(prod.original_price)}</span>` : ''}
            </div>

            <button class="btn-add-cart" title="Add to Cart" onclick="addToCart(${prod.id})">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Filter by category
function filterByCategory(category) {
  state.currentCategory = category;

  // Update pills UI
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-category').toLowerCase() === category.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  fetchProducts();

  // Scroll to shop section smoothly
  const shopEl = document.getElementById('shop');
  if (shopEl) {
    shopEl.scrollIntoView({ behavior: 'smooth' });
  }
}

// Search handling with debounce
let searchDebounceTimer;
function handleSearch(val) {
  clearTimeout(searchDebounceTimer);
  const clearBtn = document.getElementById('clearSearchBtn');
  
  if (val.trim()) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  searchDebounceTimer = setTimeout(() => {
    state.searchQuery = val;
    fetchProducts();
  }, 350);
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  state.searchQuery = '';
  fetchProducts();
}

function handleSortChange(sortVal) {
  state.currentSort = sortVal;
  fetchProducts();
}

function resetFilters() {
  state.currentCategory = 'All';
  state.searchQuery = '';
  state.currentSort = 'newest';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  document.getElementById('sortSelect').value = 'newest';

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-category') === 'All');
  });

  fetchProducts();
}

function updateFilterStatus() {
  const bar = document.getElementById('filterStatus');
  const text = document.getElementById('filterStatusText');

  let filtersApplied = [];
  if (state.currentCategory !== 'All') {
    filtersApplied.push(`Category: "${state.currentCategory}"`);
  }
  if (state.searchQuery) {
    filtersApplied.push(`Search: "${state.searchQuery}"`);
  }

  if (filtersApplied.length > 0) {
    bar.classList.remove('hidden');
    text.innerText = `Filtered by: ${filtersApplied.join(' • ')}`;
  } else {
    bar.classList.add('hidden');
  }
}

/* ==========================================================
   SHOPPING CART LOGIC
   ========================================================== */

function saveCart() {
  localStorage.setItem('vogue_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  const drawerCount = document.getElementById('drawerCount');
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (badge) badge.innerText = totalCount;
  if (drawerCount) drawerCount.innerText = totalCount;
}

function addToCart(productId, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found.', 'error');
    return;
  }

  const existingItemIndex = state.cart.findIndex(item => item.id === productId);

  if (existingItemIndex > -1) {
    state.cart[existingItemIndex].quantity += quantity;
    state.cart[existingItemIndex].shipping_cost = parseFloat(product.shipping_cost) || 0;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      shipping_cost: parseFloat(product.shipping_cost) || 0,
      image_url: product.image_url,
      category: product.category,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`Added "${product.name}" to your bag!`, 'success');
  openCartDrawer();
}

function updateCartQuantity(productId, delta) {
  const itemIndex = state.cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    state.cart[itemIndex].quantity += delta;
    if (state.cart[itemIndex].quantity <= 0) {
      state.cart.splice(itemIndex, 1);
    }
    saveCart();
  }
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.id !== productId);
  saveCart();
  showToast('Item removed from bag.', 'info');
}

function clearCart() {
  state.cart = [];
  saveCart();
  showToast('Shopping bag cleared.', 'info');
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const isOpen = drawer.classList.contains('active');

  if (isOpen) {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
  } else {
    renderCartDrawer();
    drawer.classList.add('active');
    overlay.classList.add('active');
  }
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  renderCartDrawer();
  drawer.classList.add('active');
  overlay.classList.add('active');
}

function renderCartDrawer() {
  const container = document.getElementById('drawerCartItems');
  const subtotalEl = document.getElementById('drawerSubtotal');
  const shippingEl = document.getElementById('drawerShipping');
  const totalEl = document.getElementById('drawerTotal');
  const progressText = document.getElementById('shippingProgressText');
  const progressBar = document.getElementById('shippingProgressBar');
  const footer = document.getElementById('drawerFooter');

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-view">
        <i class="fa-solid fa-bag-shopping"></i>
        <h3>Your shopping bag is empty</h3>
        <p>Explore our latest arrivals and discover your signature look.</p>
        <button class="btn btn-primary btn-sm mt-3" onclick="toggleCartDrawer()">Start Shopping</button>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.innerText = 'Add ₹1,999 for FREE Delivery!';
    return;
  }

  if (footer) footer.style.display = 'block';

  let subtotal = 0;
  let totalShipping = 0;
  container.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    const itemShipping = (parseFloat(item.shipping_cost) || 0) * item.quantity;
    totalShipping += itemShipping;

    return `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
        </div>
        <div class="cart-item-info">
          <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
          <span class="cart-item-price">₹${formatCurrency(item.price)}</span>
          <span style="font-size:0.75rem; color:#64748b; margin-top:2px;">
            ${itemShipping > 0 ? `Delivery: <strong>₹${formatCurrency(itemShipping)}</strong>` : '<span style="color:#16a34a; font-weight:600;">Free Delivery</span>'}
          </span>
          
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
            </div>
            <button class="btn-remove-item" onclick="removeFromCart(${item.id})" title="Remove item">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Total includes subtotal and product shipping costs
  const total = subtotal + totalShipping;

  subtotalEl.innerText = `₹${formatCurrency(subtotal)}`;
  if (shippingEl) {
    shippingEl.innerText = totalShipping > 0 ? `₹${formatCurrency(totalShipping)}` : 'FREE';
    shippingEl.style.color = totalShipping > 0 ? '#4338ca' : '#16a34a';
  }
  totalEl.innerText = `₹${formatCurrency(total)}`;

  const progressBox = document.querySelector('.shipping-progress-box');
  if (progressBox) progressBox.style.display = 'none';
}

/* ==========================================================
   QUICK VIEW MODAL
   ========================================================== */

function openQuickView(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const content = document.getElementById('quickViewContent');
  const isSale = prod.original_price && parseFloat(prod.original_price) > parseFloat(prod.price);

  content.innerHTML = `
    <div class="qv-img-box">
      <img src="${escapeHtml(prod.image_url)}" alt="${escapeHtml(prod.name)}">
    </div>
    <div class="qv-details-box">
      <span class="qv-category">${escapeHtml(prod.category)}</span>
      <h2 class="qv-title">${escapeHtml(prod.name)}</h2>
      
      <div class="product-rating mb-2">
        <i class="fa-solid fa-star"></i>
        <strong>${prod.rating || 4.5}</strong>
        <span class="rating-count">(${Math.floor((prod.id * 17) % 60 + 12)} customer reviews)</span>
      </div>

      <div class="qv-price-row">
        <span class="curr">₹${formatCurrency(prod.price)}</span>
        ${isSale ? `<span class="orig">₹${formatCurrency(prod.original_price)}</span>` : ''}
      </div>

      <p class="qv-desc">${escapeHtml(prod.description || 'Crafted with premium grade fabrics offering superior fit and everyday comfort.')}</p>

      <div class="qv-stock in-stock">
        <i class="fa-solid fa-circle-check"></i>
        <span>In Stock & Ready to Ship (${prod.stock || 25} available)</span>
      </div>

      <div style="font-size: 0.85rem; font-weight: 700; color: ${parseFloat(prod.shipping_cost) > 0 ? '#4338ca' : '#16a34a'}; margin-bottom: 14px;">
        <i class="fa-solid fa-truck-fast"></i> Delivery / Shipping: ${parseFloat(prod.shipping_cost) > 0 ? `₹${formatCurrency(prod.shipping_cost)}` : 'FREE (No Extra Charge)'}
      </div>

      <div class="qv-actions">
        <button class="btn btn-primary btn-block btn-lg" onclick="addToCart(${prod.id}); closeModal('quickViewModal');">
          <i class="fa-solid fa-bag-shopping"></i> Add to Shopping Bag
        </button>
      </div>
    </div>
  `;

  openModal('quickViewModal');
}

/* ==========================================================
   AUTHENTICATION & USER PROFILE
   ========================================================== */

function renderAuthUI() {
  const authContainer = document.getElementById('authActions');
  if (!authContainer) return;

  if (state.token && state.user) {
    const isAdmin = state.user.role === 'admin';
    authContainer.innerHTML = `
      <div class="user-menu-wrapper">
        <button class="user-dropdown-btn" id="userDropdownBtn" onclick="toggleUserDropdown()">
          <i class="fa-regular fa-circle-user"></i>
          <span>${escapeHtml(state.user.name.split(' ')[0])}</span>
          <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem;"></i>
        </button>
        <div class="user-dropdown-menu" id="userDropdownMenu">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--color-border);">
            <strong style="display:block; font-size: 0.9rem;">${escapeHtml(state.user.name)}</strong>
            <small style="color: #6b7280;">${escapeHtml(state.user.email)}</small>
            ${isAdmin ? '<span class="badge-featured" style="margin-top: 4px; display:inline-block;">Admin</span>' : ''}
          </div>
          ${isAdmin ? `<a href="/admin.html" class="dropdown-item"><i class="fa-solid fa-shield-halved"></i> Admin Dashboard</a>` : ''}
          <a href="javascript:void(0)" class="dropdown-item" onclick="viewMyOrders()"><i class="fa-solid fa-receipt"></i> Order History</a>
          <div class="dropdown-divider"></div>
          <a href="javascript:void(0)" class="dropdown-item" onclick="handleLogout()" style="color: var(--color-danger);"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sign Out</a>
        </div>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-outline-dark btn-sm" onclick="openAuthModal('login')">
        <i class="fa-regular fa-user"></i> <span>Login</span>
      </button>
    `;
  }
}

function toggleUserDropdown() {
  const menu = document.getElementById('userDropdownMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  openModal('authModal');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  const formLogin = document.getElementById('loginForm');
  const formReg = document.getElementById('registerForm');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.classList.remove('hidden');
    formReg.classList.add('hidden');
  } else {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('vogue_token', data.token);
      localStorage.setItem('vogue_user', JSON.stringify(data.user));

      closeModal('authModal');
      renderAuthUI();
      showToast(`Welcome back, ${data.user.name}!`, 'success');

      // Auto redirect to admin if admin logged in from login modal
      if (data.user.role === 'admin') {
        setTimeout(() => {
          if (confirm('You are logged in as Admin. Would you like to open the Admin Dashboard?')) {
            window.location.href = '/admin.html';
          }
        }, 600);
      }
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to authentication server.', 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('vogue_token', data.token);
      localStorage.setItem('vogue_user', JSON.stringify(data.user));

      closeModal('authModal');
      renderAuthUI();
      showToast(`Account created! Welcome, ${data.user.name}.`, 'success');
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showToast('Registration error occurred.', 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('vogue_token');
  localStorage.removeItem('vogue_user');
  renderAuthUI();
  showToast('Logged out successfully.', 'info');
}

async function checkCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (data.success) {
      state.user = data.user;
      localStorage.setItem('vogue_user', JSON.stringify(data.user));
      renderAuthUI();
    } else {
      handleLogout();
    }
  } catch (err) {
    console.warn('User profile check failed.');
  }
}

/* ==========================================================
   CHECKOUT & PLACE ORDER
   ========================================================== */

function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your shopping bag is empty!', 'error');
    return;
  }

  // If user is not logged in, prompt login
  if (!state.token) {
    toggleCartDrawer();
    openAuthModal('login');
    showToast('Please sign in or create an account to complete checkout.', 'info');
    return;
  }

  toggleCartDrawer(); // Close cart drawer
  renderCheckoutSummary();
  
  // Pre-fill user name if available
  if (state.user) {
    const shipName = document.getElementById('shipName');
    if (shipName && !shipName.value) {
      shipName.value = state.user.name;
    }
  }

  // Reset payment selection to Cash On Delivery
  const codRadio = document.querySelector('input[name="paymentMethod"][value="Cash On Delivery"]');
  if (codRadio) codRadio.checked = true;
  togglePaymentMethod('cod');

  openModal('checkoutModal');
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkoutItemsList');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const shippingEl = document.getElementById('checkoutShipping');
  const grandTotalEl = document.getElementById('checkoutGrandTotal');
  const payBtnAmount = document.getElementById('checkoutPayAmount');

  let subtotal = 0;
  let totalShipping = 0;
  container.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    const itemShipping = (parseFloat(item.shipping_cost) || 0) * item.quantity;
    totalShipping += itemShipping;
    return `
      <div class="c-item">
        <span>${escapeHtml(item.name)} × ${item.quantity} ${itemShipping > 0 ? `<small style="color:#4338ca; font-weight:600;">(+₹${formatCurrency(itemShipping)} Delivery)</small>` : '<small style="color:#16a34a; font-weight:600;">(Free Delivery)</small>'}</span>
        <strong>₹${formatCurrency(itemTotal)}</strong>
      </div>
    `;
  }).join('');

  const grandTotal = subtotal + totalShipping;

  subtotalEl.innerText = `₹${formatCurrency(subtotal)}`;
  if (shippingEl) {
    shippingEl.innerText = totalShipping > 0 ? `₹${formatCurrency(totalShipping)}` : 'FREE';
    shippingEl.style.color = totalShipping > 0 ? '#4338ca' : '#16a34a';
  }
  grandTotalEl.innerText = `₹${formatCurrency(grandTotal)}`;
  if (payBtnAmount) payBtnAmount.innerText = `₹${formatCurrency(grandTotal)}`;

  // Update dynamic UPI payment details & QR Code
  updateUpiDetails(grandTotal);
}

// Toggle between COD and UPI Payment views
function togglePaymentMethod(method) {
  const upiBox = document.getElementById('upiPaymentBox');
  const utrInput = document.getElementById('upiUtrNumber');
  if (!upiBox) return;

  if (method === 'upi') {
    upiBox.classList.remove('hidden');
    if (utrInput) {
      utrInput.required = true;
      setTimeout(() => utrInput.focus(), 150);
    }
  } else {
    upiBox.classList.add('hidden');
    if (utrInput) {
      utrInput.required = false;
    }
  }
}

// Generate dynamic UPI URI and QR code
function updateUpiDetails(amount) {
  const upiId = (state.storeSettings && state.storeSettings.upi_id) ? state.storeSettings.upi_id : 'natarajanamsavalli348-2@okaxis';
  const merchantName = (state.storeSettings && state.storeSettings.upi_merchant_name) ? state.storeSettings.upi_merchant_name : 'Thamizhini Boutique';

  const upiPayAmount = document.getElementById('upiPayAmount');
  if (upiPayAmount) upiPayAmount.innerText = `₹${formatCurrency(amount)}`;

  const displayUpiId = document.getElementById('displayUpiId');
  if (displayUpiId) displayUpiId.innerText = upiId;

  // Standard NPCI UPI URI Scheme
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=Thamizhini%20Order`;

  const upiDeepLink = document.getElementById('upiDeepLink');
  if (upiDeepLink) {
    upiDeepLink.href = upiUri;
  }

  const qrImg = document.getElementById('upiQrImage');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;
  }
}

// Copy store UPI ID to clipboard
function copyUpiId() {
  const upiId = (state.storeSettings && state.storeSettings.upi_id) ? state.storeSettings.upi_id : (document.getElementById('displayUpiId')?.innerText || 'natarajanamsavalli348-2@okaxis');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(upiId).then(() => {
      showToast(`UPI ID "${upiId}" copied!`, 'success');
    }).catch(() => {
      fallbackCopyText(upiId);
    });
  } else {
    fallbackCopyText(upiId);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`UPI ID "${text}" copied!`, 'success');
  } catch (e) {
    showToast(`Store UPI ID: ${text}`, 'info');
  }
  document.body.removeChild(ta);
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnPlaceOrder');

  const shipping_name = document.getElementById('shipName').value.trim();
  const phone = document.getElementById('shipPhone').value.trim();
  const shipping_address = document.getElementById('shipAddress').value.trim();
  const city = document.getElementById('shipCity').value.trim();
  const postal_code = document.getElementById('shipPostal').value.trim();
  const payment_method = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Cash On Delivery';
  const utrInput = document.getElementById('upiUtrNumber');
  let payment_ref = null;

  if (payment_method === 'UPI') {
    payment_ref = utrInput ? utrInput.value.trim() : '';
    if (!payment_ref || payment_ref.length < 6) {
      showToast('Please enter your 12-digit UPI Reference / UTR Number to confirm payment.', 'error');
      if (utrInput) utrInput.focus();
      return;
    }
  }

  const orderPayload = {
    items: state.cart.map(i => ({ id: i.id, quantity: i.quantity })),
    shipping_name,
    phone,
    shipping_address,
    city,
    postal_code,
    payment_method,
    payment_ref
  };

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...`;

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json();

    if (data.success) {
      // Clear cart & UTR input
      state.cart = [];
      saveCart();
      if (utrInput) utrInput.value = '';
      closeModal('checkoutModal');

      // Celebration modal
      alert(`🎉 Congratulations! Your order #${data.orderId} for ₹${formatCurrency(data.totalAmount)} has been placed successfully!\n\nYou can track this anytime under your "Order History".`);
      
      // Refresh inventory
      fetchProducts();
      
      // Open order history
      viewMyOrders();
    } else {
      showToast(data.message || 'Failed to place order.', 'error');
    }
  } catch (err) {
    showToast('Network error while placing order.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `Confirm & Place Order`;
  }
}

/* ==========================================================
   VIEW ORDER HISTORY (WITH STATUS FILTERING & ADDRESS)
   ========================================================== */

state.userOrders = [];
state.userOrderFilter = 'All';

async function viewMyOrders() {
  if (!state.token) {
    openAuthModal('login');
    showToast('Please login to view your order history.', 'info');
    return;
  }

  const container = document.getElementById('userOrdersList');
  container.innerHTML = `
    <div class="loader-container">
      <div class="spinner"></div>
      <p>Loading your past orders...</p>
    </div>
  `;

  openModal('ordersModal');

  try {
    const res = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    const data = await res.json();

    if (data.success) {
      state.userOrders = data.orders || [];
      updateUserOrderCounts();
      applyUserOrderFilter();
    } else {
      container.innerHTML = `<p style="color:red; text-align:center;">Error loading orders: ${data.message}</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p style="color:red; text-align:center;">Server error loading order history.</p>`;
  }
}

// Update badges on customer status tabs
function updateUserOrderCounts() {
  const orders = state.userOrders || [];
  const setBadge = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.innerText = count;
  };

  setBadge('userCountAll', orders.length);
  setBadge('userCountPending', orders.filter(o => o.status === 'Pending').length);
  setBadge('userCountShipped', orders.filter(o => o.status === 'Shipped' || o.status === 'Processing').length);
  setBadge('userCountDelivered', orders.filter(o => o.status === 'Delivered').length);
  setBadge('userCountCancelled', orders.filter(o => o.status === 'Cancelled').length);
}

// Filter customer orders by status tab
function filterUserOrders(status) {
  state.userOrderFilter = status;

  document.querySelectorAll('.u-order-pill').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  applyUserOrderFilter();
}

function applyUserOrderFilter() {
  const filter = state.userOrderFilter;
  let filtered = state.userOrders || [];

  if (filter === 'Pending') {
    filtered = filtered.filter(o => o.status === 'Pending');
  } else if (filter === 'Shipped') {
    filtered = filtered.filter(o => o.status === 'Shipped' || o.status === 'Processing');
  } else if (filter === 'Delivered') {
    filtered = filtered.filter(o => o.status === 'Delivered');
  } else if (filter === 'Cancelled') {
    filtered = filtered.filter(o => o.status === 'Cancelled');
  }

  renderUserOrders(filtered);
}

function renderUserOrders(orders) {
  const container = document.getElementById('userOrdersList');

  if (orders.length === 0) {
    const filterName = state.userOrderFilter;
    container.innerHTML = `
      <div class="empty-cart-view" style="padding: 30px 0;">
        <i class="fa-regular fa-clipboard" style="font-size: 2.5rem; color: #d1d5db; margin-bottom: 10px;"></i>
        <h3>No ${filterName === 'All' ? '' : filterName} orders found</h3>
        <p>You do not have any orders under "${filterName}" status.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;

    return `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <span class="order-id-label">Order #${order.id}</span>
            <div class="order-date-label">${orderDate}</div>
          </div>
          <span class="order-status-pill ${statusClass}">${escapeHtml(order.status)}</span>
        </div>

        <!-- Ordered Items -->
        <div class="order-items-grid">
          ${(order.items || []).map(item => `
            <div class="order-item-row">
              <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.product_name)}">
              <div style="flex:1;">
                <strong>${escapeHtml(item.product_name)}</strong>
                <div style="color: #6b7280; font-size: 0.8rem;">Qty: ${item.quantity} × ₹${formatCurrency(item.price)}</div>
              </div>
              <strong>₹${formatCurrency(item.price * item.quantity)}</strong>
            </div>
          `).join('')}
        </div>

        <!-- Customer Delivery Address Details -->
        <div class="order-delivery-details">
          <i class="fa-solid fa-truck-ramp-box" style="color: var(--color-accent);"></i>
          <div>
            <strong>Delivering to:</strong> ${escapeHtml(order.shipping_name)}, ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.city)} - ${escapeHtml(order.postal_code)} | <i class="fa-solid fa-phone"></i> ${escapeHtml(order.phone)}
          </div>
        </div>

        <div class="order-card-footer">
          <div>
            <span>Payment: <strong>${escapeHtml(order.payment_method)}</strong>${order.payment_ref ? ` <span style="font-size:0.75rem; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-family:monospace; margin-left:6px;"><i class="fa-solid fa-receipt"></i> UTR: ${escapeHtml(order.payment_ref)}</span>` : ''}</span>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 3px;">
              Items Subtotal: <strong>₹${formatCurrency(order.items_total || (order.total_amount - (order.shipping_fee || 0)))}</strong> | 
              Delivery Fee: ${parseFloat(order.shipping_fee) > 0 ? `<strong style="color: #4338ca;">₹${formatCurrency(order.shipping_fee)}</strong>` : '<span style="color:#16a34a; font-weight:600;">FREE / ₹0</span>'}
            </div>
          </div>
          <span style="font-size: 1.05rem;">Total: <strong>₹${formatCurrency(order.total_amount)}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================
   MODAL & TOAST HELPERS
   ========================================================== */

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = 'auto';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Utility: Format currency to Indian Numbering Format
function formatCurrency(num) {
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Escape HTML for XSS prevention
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================
   DYNAMIC STORE SETTINGS & ADDRESS
   ========================================================== */

async function fetchStoreSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    if (data.success && data.settings) {
      state.storeSettings = data.settings;
      const s = data.settings;

      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.innerText = val;
      };

      setText('storeDisplayTitle', `${s.store_name} Silks & Couture`);
      setText('storeDisplayTagline', s.tagline);

      const addrEl = document.getElementById('storeDisplayAddress');
      if (addrEl) {
        addrEl.innerHTML = `${escapeHtml(s.address_line1)}, ${escapeHtml(s.city)} - ${escapeHtml(s.pincode)}, ${escapeHtml(s.state)}.<br><span style="color: #64748b; font-size: 0.85rem;">Landmark: ${escapeHtml(s.address_line2 || 'Near City Center')}</span>`;
      }

      setText('storeDisplayHours', s.opening_hours);
      setText('storeDisplayPhone', s.phone);
      setText('storeDisplayEmail', s.email);

      const phoneLink = document.getElementById('storeDisplayPhone');
      if (phoneLink && s.phone) {
        phoneLink.href = `tel:${s.phone.replace(/[^0-9+]/g, '')}`;
      }

      const mapBtn = document.getElementById('storeDisplayMapsBtn');
      if (mapBtn && s.google_maps_link) {
        mapBtn.href = s.google_maps_link;
      }

      const waBtn = document.getElementById('storeDisplayWhatsappBtn');
      if (waBtn && (s.whatsapp || s.phone)) {
        const waNum = (s.whatsapp || s.phone).replace(/[^0-9]/g, '');
        waBtn.href = `https://wa.me/${waNum}?text=Hello%20Thamizhini%20Boutique`;
      }

      // Update Footer Address Elements
      setText('footerStoreAddress', `${s.address_line1}, ${s.city} - ${s.pincode}, ${s.state}.`);
      setText('footerStorePhone', s.phone);
      setText('footerStoreHours', s.opening_hours);
    }
  } catch (err) {
    console.warn('Could not fetch store settings:', err);
  }
}

