/**
 * THAMIZHINI - Admin Dashboard Management Logic
 */

const API_BASE = '/api';

const adminState = {
  token: localStorage.getItem('vogue_token') || null,
  user: JSON.parse(localStorage.getItem('vogue_user') || 'null'),
  products: [],
  orders: [],
  settings: null
};

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await verifyAdminAuth();
  if (!isAuth) return;

  loadAdminStats();
  loadAdminProducts();
  loadAdminOrders();
  loadAdminSettings();
});

// Verify Admin Privileges
async function verifyAdminAuth() {
  if (!adminState.token) {
    promptAdminLogin();
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await res.json();

    if (!data.success || data.user.role !== 'admin') {
      alert('⚠️ Access Denied: You must be logged in as an Administrator to view this dashboard.');
      window.location.href = '/';
      return false;
    }

    adminState.user = data.user;
    const nameEl = document.getElementById('adminUserName');
    if (nameEl) nameEl.innerText = data.user.name;

    return true;
  } catch (err) {
    console.error('Auth verification error:', err);
    promptAdminLogin();
    return false;
  }
}

function promptAdminLogin() {
  openModal('adminLoginModal');
}

async function handleAdminDirectLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmailInput').value.trim();
  const password = document.getElementById('adminPassInput').value;
  const btn = document.getElementById('btnAdminDirectLogin');

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success && data.user.role === 'admin') {
      localStorage.setItem('vogue_token', data.token);
      localStorage.setItem('vogue_user', JSON.stringify(data.user));
      adminState.token = data.token;
      adminState.user = data.user;
      closeModal('adminLoginModal');

      const nameEl = document.getElementById('adminUserName');
      if (nameEl) nameEl.innerText = data.user.name;

      showToast('Welcome back, Admin!', 'success');
      initDashboard();
    } else if (data.success && data.user.role !== 'admin') {
      showToast('Access denied. This account does not have Admin privileges.', 'error');
    } else {
      showToast(data.message || 'Invalid email or password.', 'error');
    }
  } catch (err) {
    showToast('Network error during login.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Dashboard`;
  }
}

function adminLogout() {
  localStorage.removeItem('vogue_token');
  localStorage.removeItem('vogue_user');
  window.location.href = '/';
}

// Switch between Products, Orders, and Settings Tabs
function switchAdminTab(tab) {
  const prodSec = document.getElementById('adminProductsSection');
  const ordSec = document.getElementById('adminOrdersSection');
  const setSec = document.getElementById('adminSettingsSection');

  const btnProd = document.getElementById('tabBtnProducts');
  const btnOrd = document.getElementById('tabBtnOrders');
  const btnSet = document.getElementById('tabBtnSettings');

  // Deactivate all
  prodSec.classList.remove('active');
  ordSec.classList.remove('active');
  if (setSec) setSec.classList.remove('active');

  btnProd.classList.remove('active');
  btnOrd.classList.remove('active');
  if (btnSet) btnSet.classList.remove('active');

  if (tab === 'products') {
    prodSec.classList.add('active');
    btnProd.classList.add('active');
    loadAdminProducts();
  } else if (tab === 'orders') {
    ordSec.classList.add('active');
    btnOrd.classList.add('active');
    loadAdminOrders();
  } else if (tab === 'settings') {
    if (setSec) setSec.classList.add('active');
    if (btnSet) btnSet.classList.add('active');
    loadAdminSettings();
  }
}

/* ==========================================================
   DASHBOARD STATS
   ========================================================== */

async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('statRevenue').innerText = `₹${formatCurrency(data.stats.totalRevenue)}`;
      document.getElementById('statOrders').innerText = data.stats.totalOrders;
      document.getElementById('statPending').innerText = data.stats.pendingOrders;
      document.getElementById('statProducts').innerText = data.stats.totalProducts;
    }
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

/* ==========================================================
   PRODUCT MANAGEMENT (FILE UPLOAD & CRUD)
   ========================================================== */

async function loadAdminProducts() {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px;">Loading catalog...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();

    if (data.success) {
      adminState.products = data.products;
      renderAdminProducts(data.products);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error fetching products.</td></tr>`;
  }
}

function renderAdminProducts(products) {
  const tbody = document.getElementById('productsTableBody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px;">No products found. Add your first fashion item!</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(prod => `
    <tr>
      <td>
        <img src="${escapeHtml(prod.image_url)}" class="table-thumb" alt="${escapeHtml(prod.name)}">
      </td>
      <td>
        <strong>${escapeHtml(prod.name)}</strong>
        <div style="font-size: 0.75rem; color: #64748b;">ID: #${prod.id}</div>
      </td>
      <td><span class="badge-featured">${escapeHtml(prod.category)}</span></td>
      <td><strong>₹${formatCurrency(prod.price)}</strong></td>
      <td>
        ${parseFloat(prod.shipping_cost) > 0 
          ? `<span style="font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">+₹${formatCurrency(prod.shipping_cost)}</span>` 
          : '<span style="font-weight: 700; color: #16a34a; background: #dcfce7; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">FREE</span>'}
      </td>
      <td>
        <span style="color: ${prod.stock < 10 ? 'red' : 'green'}; font-weight: 600;">
          ${prod.stock} in stock
        </span>
      </td>
      <td>
        ${prod.is_featured ? '<span class="badge-featured" style="background:#dcfce7; color:#15803d;">Yes</span>' : 'No'}
      </td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" title="Edit" onclick="openProductModal('edit', ${prod.id})">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete-btn" title="Delete" onclick="deleteProduct(${prod.id})">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openProductModal(mode, productId = null) {
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');
  const previewBox = document.getElementById('prodImgPreviewBox');
  const preview = document.getElementById('prodImgPreview');
  const fileLabel = document.getElementById('fileChosenLabel');

  form.reset();
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodImageFile').value = '';
  document.getElementById('prodShippingCost').value = '0';
  if (fileLabel) fileLabel.innerText = 'No file chosen (PNG, JPG, WEBP)';

  if (mode === 'edit' && productId) {
    const prod = adminState.products.find(p => p.id === productId);
    if (!prod) return;

    title.innerText = 'Edit Fashion Product';
    document.getElementById('prodEditId').value = prod.id;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodCategory').value = prod.category;
    document.getElementById('prodStock').value = prod.stock;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodOriginalPrice').value = prod.original_price || '';
    document.getElementById('prodShippingCost').value = prod.shipping_cost !== undefined ? prod.shipping_cost : 0;
    document.getElementById('prodImage').value = prod.image_url;
    document.getElementById('prodDesc').value = prod.description || '';
    document.getElementById('prodFeatured').checked = !!prod.is_featured;

    preview.src = prod.image_url;
    previewBox.style.display = 'block';
  } else {
    title.innerText = 'Add New Fashion Product';
    previewBox.style.display = 'none';
  }

  openModal('productModal');
}

// Preview uploaded file from computer
function previewUploadedFile(input) {
  const file = input.files && input.files[0];
  const previewBox = document.getElementById('prodImgPreviewBox');
  const preview = document.getElementById('prodImgPreview');
  const fileLabel = document.getElementById('fileChosenLabel');

  if (file) {
    fileLabel.innerText = `📁 ${file.name} (${Math.round(file.size / 1024)} KB)`;

    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      previewBox.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Clear URL input
    document.getElementById('prodImage').value = '';
  } else {
    fileLabel.innerText = 'No file chosen (PNG, JPG, WEBP)';
  }
}

// Preview direct URL if user types URL
function previewModalImage(url) {
  const previewBox = document.getElementById('prodImgPreviewBox');
  const preview = document.getElementById('prodImgPreview');
  const fileInput = document.getElementById('prodImageFile');
  const fileLabel = document.getElementById('fileChosenLabel');

  if (url && (url.startsWith('http') || url.startsWith('/'))) {
    preview.src = url;
    previewBox.style.display = 'block';
    fileInput.value = '';
    if (fileLabel) fileLabel.innerText = 'No file chosen (using URL)';
  } else if (!fileInput.files || fileInput.files.length === 0) {
    previewBox.style.display = 'none';
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const btn = document.getElementById('btnSaveProduct');

  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const stock = document.getElementById('prodStock').value;
  const price = document.getElementById('prodPrice').value;
  const original_price = document.getElementById('prodOriginalPrice').value;
  const shipping_cost = document.getElementById('prodShippingCost').value;
  const description = document.getElementById('prodDesc').value.trim();
  const is_featured = document.getElementById('prodFeatured').checked ? '1' : '0';

  const fileInput = document.getElementById('prodImageFile');
  const urlInput = document.getElementById('prodImage');

  // Check if image is provided
  if (!editId && (!fileInput.files || fileInput.files.length === 0) && !urlInput.value.trim()) {
    showToast('Please choose an image file from your computer or enter an image URL.', 'error');
    return;
  }

  // Construct FormData to support file upload
  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('stock', stock);
  formData.append('price', price);
  formData.append('shipping_cost', shipping_cost !== '' ? shipping_cost : 0);
  if (original_price) formData.append('original_price', original_price);
  if (description) formData.append('description', description);
  formData.append('is_featured', is_featured);

  if (fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  } else if (urlInput.value.trim()) {
    formData.append('image_url', urlInput.value.trim());
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const url = editId ? `${API_BASE}/admin/products/${editId}` : `${API_BASE}/admin/products`;
    const method = editId ? 'PUT' : 'POST';

    // Note: No 'Content-Type' header when sending FormData! Browser automatically sets boundary
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      },
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      showToast(editId ? 'Product updated successfully!' : 'New product created with image!', 'success');
      closeModal('productModal');
      loadAdminProducts();
      loadAdminStats();
    } else {
      showToast(data.message || 'Operation failed.', 'error');
    }
  } catch (err) {
    showToast('Failed to save product.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Save Product';
  }
}

async function deleteProduct(id) {
  if (!confirm(`Are you sure you want to delete Product #${id}? This cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Product deleted.', 'info');
      loadAdminProducts();
      loadAdminStats();
    } else {
      showToast(data.message || 'Failed to delete product.', 'error');
    }
  } catch (err) {
    showToast('Error deleting product.', 'error');
  }
}

/* ==========================================================
   ORDER MANAGEMENT (STATUS FILTERS & DELIVERY ADDRESS)
   ========================================================== */

adminState.allOrders = [];
adminState.currentOrderFilter = 'All';

async function loadAdminOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px;">Loading customer orders...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await res.json();

    if (data.success) {
      adminState.allOrders = data.orders || [];
      updateOrderFilterCounts();
      applyAdminOrderFilter();
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: red;">Error loading orders.</td></tr>`;
  }
}

// Update count numbers on each status filter pill
function updateOrderFilterCounts() {
  const orders = adminState.allOrders || [];
  const countAll = orders.length;
  const countPending = orders.filter(o => o.status === 'Pending').length;
  const countProcessing = orders.filter(o => o.status === 'Processing').length;
  const countShipped = orders.filter(o => o.status === 'Shipped').length;
  const countDelivered = orders.filter(o => o.status === 'Delivered').length;
  const countCancelled = orders.filter(o => o.status === 'Cancelled').length;

  const setBadge = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.innerText = count;
  };

  setBadge('countAll', countAll);
  setBadge('countPending', countPending);
  setBadge('countProcessing', countProcessing);
  setBadge('countShipped', countShipped);
  setBadge('countDelivered', countDelivered);
  setBadge('countCancelled', countCancelled);
}

// Filter orders by status tab (Pending, Processing, Shipped, Delivered, Cancelled)
function filterAdminOrders(status) {
  adminState.currentOrderFilter = status;

  // Update active pill button
  document.querySelectorAll('.order-pill').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  applyAdminOrderFilter();
}

function applyAdminOrderFilter() {
  const filter = adminState.currentOrderFilter;
  let filtered = adminState.allOrders || [];

  if (filter !== 'All') {
    filtered = filtered.filter(o => o.status === filter);
  }

  renderAdminOrders(filtered);
}

function renderAdminOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (orders.length === 0) {
    const filterName = adminState.currentOrderFilter;
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 40px; color: #64748b;">
          <i class="fa-regular fa-clipboard" style="font-size: 2rem; color: #cbd5e1; display: block; margin-bottom: 8px;"></i>
          No orders found with status <strong>"${escapeHtml(filterName)}"</strong>.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(ord => {
    const orderDate = new Date(ord.created_at).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusLower = (ord.status || 'Pending').toLowerCase();

    // Full customer delivery address formatted
    const deliveryAddressHtml = `
      <div class="delivery-address-box">
        <div class="addr-recipient">
          <i class="fa-solid fa-user" style="color: var(--color-primary); font-size: 0.8rem;"></i>
          <strong>${escapeHtml(ord.shipping_name || ord.customer_name)}</strong>
        </div>
        <div class="addr-street">
          <i class="fa-solid fa-location-dot" style="color: #dc2626; font-size: 0.85rem;"></i>
          <span>${escapeHtml(ord.shipping_address || 'Address not specified')}</span>
        </div>
        <div class="addr-city-pin">
          <strong>${escapeHtml(ord.city || '')} - ${escapeHtml(ord.postal_code || '')}</strong>
        </div>
        <div class="addr-phone">
          <i class="fa-solid fa-phone" style="color: #16a34a; font-size: 0.8rem;"></i>
          <a href="tel:${escapeHtml(ord.phone)}" style="font-weight: 700; color: #1e293b;">${escapeHtml(ord.phone)}</a>
        </div>
      </div>
    `;

    return `
      <tr>
        <td>
          <strong style="font-size: 0.95rem;">#ORD-${ord.id}</strong>
        </td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${escapeHtml(ord.customer_name)}</div>
          <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(ord.customer_email)}</div>
        </td>
        <td>
          ${deliveryAddressHtml}
        </td>
        <td>
          <div class="ordered-items-list" style="font-size: 0.85rem; max-width: 240px;">
            ${(ord.items || []).map(i => `
              <div style="margin-bottom: 4px; display:flex; align-items:center; gap:6px;">
                ${i.image_url ? `<img src="${escapeHtml(i.image_url)}" style="width:24px; height:28px; border-radius:3px; object-fit:cover;">` : ''}
                <span>${escapeHtml(i.product_name)} <strong>(×${i.quantity})</strong></span>
              </div>
            `).join('')}
          </div>
        </td>
        <td>
          <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 3px;">
            Items: <strong>₹${formatCurrency(ord.items_total !== undefined && ord.items_total !== null && parseFloat(ord.items_total) > 0 ? parseFloat(ord.items_total) : (parseFloat(ord.total_amount) - parseFloat(ord.shipping_fee || 0)))}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin: 4px 0;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #475569;">Delivery: ₹</span>
            <input type="number" min="0" step="1" id="orderDeliveryInput_${ord.id}" value="${ord.shipping_fee !== undefined && ord.shipping_fee !== null ? parseFloat(ord.shipping_fee) : 0}" style="width: 70px; padding: 3px 6px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700;">
            <button type="button" class="btn btn-sm" onclick="saveOrderDeliveryFee(${ord.id})" title="Save Delivery Fee" style="padding: 4px 8px; font-size: 0.75rem; background: #4f46e5; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
              <i class="fa-solid fa-check"></i>
            </button>
          </div>
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--color-primary);">
            Total: <span id="orderTotalDisplay_${ord.id}">₹${formatCurrency(ord.total_amount)}</span>
          </div>
        </td>
        <td>
          ${ord.payment_method === 'UPI' ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 8px; font-size: 0.8rem;">
              <div style="font-weight: 700; color: #1d4ed8; display:flex; align-items:center; gap:4px;">
                <i class="fa-solid fa-qrcode"></i> UPI Payment
              </div>
              ${ord.payment_ref ? `<div style="font-size: 0.72rem; color: #475569; margin-top: 2px;">UTR: <code style="font-weight: 700; color: #0f172a; font-family: monospace;">${escapeHtml(ord.payment_ref)}</code></div>` : '<div style="font-size: 0.72rem; color: #b45309;">Ref Not Provided</div>'}
            </div>
          ` : `
            <span style="font-size: 0.8rem; font-weight: 600; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #475569; display:inline-flex; align-items:center; gap:4px;">
              <i class="fa-solid fa-money-bill-wave"></i> COD
            </span>
          `}
        </td>
        <td>
          <select class="status-select ${statusLower}" onchange="changeOrderStatus(${ord.id}, this.value, this)">
            <option value="Pending" ${ord.status === 'Pending' ? 'selected' : ''}>Pending (நிலுவை)</option>
            <option value="Processing" ${ord.status === 'Processing' ? 'selected' : ''}>Processing (செயலில்)</option>
            <option value="Shipped" ${ord.status === 'Shipped' ? 'selected' : ''}>Shipped (அனுப்பப்பட்டது)</option>
            <option value="Delivered" ${ord.status === 'Delivered' ? 'selected' : ''}>Delivered (முடிந்தது)</option>
            <option value="Cancelled" ${ord.status === 'Cancelled' ? 'selected' : ''}>Cancelled (ரத்து)</option>
          </select>
        </td>
        <td style="font-size: 0.8rem; color: #64748b; white-space: nowrap;">${orderDate}</td>
      </tr>
    `;
  }).join('');
}

async function changeOrderStatus(orderId, newStatus, selectEl) {
  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
      
      // Update local state and counters
      const targetOrder = (adminState.allOrders || []).find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.status = newStatus;
      }

      selectEl.className = `status-select ${newStatus.toLowerCase()}`;
      updateOrderFilterCounts();
      applyAdminOrderFilter();
      loadAdminStats();
    } else {
      showToast(data.message || 'Failed to update order status.', 'error');
    }
  } catch (err) {
    showToast('Network error updating status.', 'error');
  }
}

/* ==========================================================
   STORE SETTINGS & SHOP ADDRESS MANAGEMENT
   ========================================================== */

async function loadAdminSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();

    if (data.success && data.settings) {
      adminState.settings = data.settings;
      const s = data.settings;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };

      setVal('setStoreName', s.store_name);
      setVal('setTagline', s.tagline);
      setVal('setAddress1', s.address_line1);
      setVal('setAddress2', s.address_line2);
      setVal('setCity', s.city);
      setVal('setState', s.state);
      setVal('setPin', s.pincode);
      setVal('setPhone', s.phone);
      setVal('setSecondaryPhone', s.secondary_phone);
      setVal('setWhatsapp', s.whatsapp);
      setVal('setEmail', s.email);
      setVal('setHours', s.opening_hours);
      setVal('setMapsLink', s.google_maps_link);
      setVal('setUpiId', s.upi_id || 'natarajanamsavalli348-2@okaxis');
      setVal('setUpiNumber', s.upi_number || '9962998657');
      setVal('setUpiName', s.upi_merchant_name || 'Thamizhini Couture');
      setVal('setDeliveryFee', s.delivery_fee !== undefined ? s.delivery_fee : 0);
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function handleSettingsFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveSettings');

  const payload = {
    store_name: document.getElementById('setStoreName').value.trim(),
    tagline: document.getElementById('setTagline').value.trim(),
    address_line1: document.getElementById('setAddress1').value.trim(),
    address_line2: document.getElementById('setAddress2').value.trim(),
    city: document.getElementById('setCity').value.trim(),
    state: document.getElementById('setState').value.trim(),
    pincode: document.getElementById('setPin').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    secondary_phone: document.getElementById('setSecondaryPhone').value.trim(),
    whatsapp: document.getElementById('setWhatsapp').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    opening_hours: document.getElementById('setHours').value.trim(),
    google_maps_link: document.getElementById('setMapsLink').value.trim(),
    upi_id: document.getElementById('setUpiId').value.trim(),
    upi_number: document.getElementById('setUpiNumber').value.trim(),
    upi_merchant_name: document.getElementById('setUpiName').value.trim(),
    delivery_fee: parseFloat(document.getElementById('setDeliveryFee')?.value) || 0
  };

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving Settings...`;

  try {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast('Shop address and delivery fee settings saved successfully!', 'success');
      adminState.settings = data.settings;
    } else {
      showToast(data.message || 'Failed to save settings.', 'error');
    }
  } catch (err) {
    showToast('Network error saving settings.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Shop Address & Details`;
  }
}

// Admin: Save custom manual delivery fee for an order
async function saveOrderDeliveryFee(orderId) {
  const inputEl = document.getElementById(`orderDeliveryInput_${orderId}`);
  if (!inputEl) return;

  const fee = parseFloat(inputEl.value);
  if (isNaN(fee) || fee < 0) {
    showToast('Please enter a valid delivery fee (0 or greater).', 'error');
    inputEl.focus();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/delivery-fee`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.token}`
      },
      body: JSON.stringify({ shipping_fee: fee })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');

      // Update local state
      const targetOrder = (adminState.allOrders || []).find(o => o.id === orderId);
      if (targetOrder) {
        targetOrder.shipping_fee = data.shipping_fee;
        targetOrder.items_total = data.items_total;
        targetOrder.total_amount = data.total_amount;
      }

      const totalDisplay = document.getElementById(`orderTotalDisplay_${orderId}`);
      if (totalDisplay) {
        totalDisplay.innerText = `₹${formatCurrency(data.total_amount)}`;
      }

      // Refresh admin stats since total revenue changed
      loadDashboardStats();
    } else {
      showToast(data.message || 'Failed to update delivery fee.', 'error');
    }
  } catch (err) {
    showToast('Network error updating delivery fee.', 'error');
  }
}

/* ==========================================================
   HELPERS
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

function formatCurrency(num) {
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
