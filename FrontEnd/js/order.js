const API_BASE_URL = "/api";
let currentUser = null;

// ---------- Helpers ----------
async function apiFetch(path, options = {}) {
  const opts = Object.assign(
    {
      credentials: "include",
    },
    options
  );

  const res = await fetch(path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  if (!res.ok) {
    const err = new Error((data && data.message) || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function showGlobalMessage(msg, type = "info") {
  const el = document.getElementById("global-message");
  if (!el) return;
  el.textContent = msg;
  el.className = `message ${type} show`;
  setTimeout(() => el.classList.remove("show"), 4000);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();

  // Redirect if not customer
  if (!currentUser || currentUser.role !== "customer") {
    window.location.href = "/loginPage";
    return;
  }

  initLogout();
  setupFilters();
  loadOrders();
  setupModal();
});

// ---------- Auth ----------
async function loadCurrentUser() {
  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/me`);
    currentUser = data.user;
  } catch (err) {
    currentUser = null;
  }
}

function initLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (_) {}
    window.location.href = "/loginPage";
  });
}

// ---------- Filters ----------
function setupFilters() {
  const filterChips = document.querySelectorAll(".filter-chip");
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      // Remove active class from all chips
      filterChips.forEach((c) => c.classList.remove("active"));
      // Add active class to clicked chip
      chip.classList.add("active");
      // Load orders with the selected filter
      loadOrders();
    });
  });
}

// ---------- Load Orders ----------
async function loadOrders() {
  const container = document.getElementById("orders-container");
  const emptyMsg = document.getElementById("orders-empty-msg");
  if (!container) return;

  container.innerHTML = "<p>Loading orders...</p>";
  emptyMsg.textContent = "";

  // Get active filter chip's status
  const activeChip = document.querySelector(".filter-chip.active");
  const statusFilter = activeChip ? activeChip.dataset.status : "";
  const params = new URLSearchParams();
  params.set("limit", 50);
  params.set("sortBy", "created_at");
  params.set("order", "DESC");
  if (statusFilter) params.set("status", statusFilter);

  try {
    const data = await apiFetch(
      `${API_BASE_URL}/orders/my?${params.toString()}`
    );
    const orders = data.orders || [];

    container.innerHTML = "";

    if (!orders.length) {
      emptyMsg.textContent = "No orders found.";
      return;
    }

    orders.forEach((order) => {
      const card = createOrderCard(order);
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load orders.</p>";
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

// ---------- Create Order Card ----------
function createOrderCard(order) {
  const card = document.createElement("div");
  card.className = "order-card";

  const statusClass = getStatusClass(order.status);

  card.innerHTML = `
    <div class="order-header">
      <div>
        <h3>Order #${order.id}</h3>
        <span class="order-status ${statusClass}">${order.status}</span>
      </div>
      <div class="order-total">$${Number(order.total_amount).toFixed(2)}</div>
    </div>
    <div class="order-meta">
      <p><strong>Placed:</strong> ${new Date(
        order.created_at
      ).toLocaleString()}</p>
      ${order.driver_id ? `<p><strong>Driver Assigned:</strong> Yes</p>` : ""}
    </div>
    <button class="btn small" data-order-id="${order.id}">View Details</button>
  `;

  const btn = card.querySelector("button");
  btn.addEventListener("click", () => showOrderDetails(order.id));

  return card;
}

function getStatusClass(status) {
  const statusMap = {
    Pending: "status-pending",
    Preparing: "status-preparing",
    Ready: "status-ready",
    "On the way": "status-on-the-way",
    Delivered: "status-delivered",
    Cancelled: "status-cancelled",
  };
  return statusMap[status] || "";
}

// ---------- Order Details Modal ----------
function setupModal() {
  const modal = document.getElementById("order-modal");
  const closeBtn = document.getElementById("modal-close");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.hidden = true;
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.hidden = true;
    }
  });
}

async function showOrderDetails(orderId) {
  const modal = document.getElementById("order-modal");
  const content = document.getElementById("order-details-content");
  if (!modal || !content) return;

  content.innerHTML = "<p>Loading...</p>";
  modal.hidden = false;

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/${orderId}`);
    const order = data.order || data;

    if (!order || !order.items || !order.items.length) {
      content.innerHTML = "<p>No details available.</p>";
      return;
    }

    let html = `
      <div class="order-detail-header">
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Status:</strong> <span class="order-status ${getStatusClass(
          order.status
        )}">${order.status}</span></p>
        <p><strong>Total:</strong> $${Number(order.total_amount).toFixed(2)}</p>
        <p><strong>Created:</strong> ${new Date(
          order.created_at
        ).toLocaleString()}</p>
      </div>
      <h3>Items</h3>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
    `;

    order.items.forEach((item) => {
      const subtotal = Number(item.price) * Number(item.quantity);
      html += `
        <tr>
          <td>${item.product_name}</td>
          <td>$${Number(item.price).toFixed(2)}</td>
          <td>${item.quantity}</td>
          <td>$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    content.innerHTML = html;
  } catch (err) {
    console.error(err);
    content.innerHTML = "<p>Failed to load order details.</p>";
    showGlobalMessage(err.message || "Failed to load details", "error");
  }
}
