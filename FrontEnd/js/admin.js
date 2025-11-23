const API_BASE_URL = "/api";
let currentAdmin = null;
let driversList = [];

const messageEl = document.getElementById("message");
const logoutBtn = document.getElementById("logout-btn");
const adminEmailSpan = document.getElementById("admin-email");

// Tabs
const tabButtons = document.querySelectorAll(".tab-btn");
const sections = document.querySelectorAll(".admin-section");

// Products
const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const productNameInput = document.getElementById("product-name");
const productDescInput = document.getElementById("product-description");
const productPriceInput = document.getElementById("product-price");
const productStockInput = document.getElementById("product-stock");
const productCategoryInput = document.getElementById("product-category");
const productImageInput = document.getElementById("product-image");
const productResetBtn = document.getElementById("product-reset-btn");
const productsTableBody = document.querySelector("#products-table tbody");

// Orders
const orderStatusFilter = document.getElementById("admin-status-filter");
const reloadOrdersBtn = document.getElementById("reload-orders-btn");
const ordersTableBody = document.querySelector("#orders-table tbody");

// Users & Drivers
const createDriverForm = document.getElementById("create-driver-form");
const driverEmailInput = document.getElementById("driver-email");
const usersTableBody = document.querySelector("#users-table tbody");
const driversTableBody = document.querySelector("#drivers-table tbody");

function showMessage(msg, type = "info") {
  messageEl.textContent = msg || "";
  messageEl.className = `message ${type}`;
}

// ============ AUTH / INIT ============

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Not authenticated");
    }

    const data = await res.json();
    if (!data.user || data.user.role !== "admin") {
      window.location.href = "/homepage";
      return null;
    }

    currentAdmin = data.user;
    adminEmailSpan.textContent = `${data.user.email} (admin)`;
    return data.user;
  } catch (err) {
    console.error(err);
    window.location.href = "/loginPage";
    return null;
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    console.error(e);
  } finally {
    window.location.href = "/loginPage";
  }
}

// ============ TABS ============

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach((sec) => {
      if (sec.id === target) {
        sec.classList.add("active");
      } else {
        sec.classList.remove("active");
      }
    });
  });
});

// ============ PRODUCTS ============

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/products?limit=1000`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();

    console.log("Products API response:", data);

    if (!res.ok) {
      showMessage(data.message || "Failed to load products", "error");
      return;
    }

    const products = data.products || [];
    console.log("Products count:", products.length);
    renderProducts(products);
  } catch (err) {
    console.error("Error loading products:", err);
    showMessage("Network error loading products", "error");
  }
}

function renderProducts(products) {
  productsTableBody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.dataset.productId = p.id;
    tr.dataset.editMode = "false";

    const imgSrc = p.image_url || "/images/default.png";

    tr.innerHTML = `
      <td>${p.id}</td>
      <td><img src="${imgSrc}" alt="${
      p.name
    }" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
      <td class="editable-cell" data-field="name">${p.name}</td>
      <td class="editable-cell" data-field="description">${
        p.description || ""
      }</td>
      <td class="editable-cell" data-field="price">${p.price}</td>
      <td class="editable-cell" data-field="stock">${p.stock}</td>
      <td class="editable-cell" data-field="category">${p.category || ""}</td>
      <td>
        <button class="edit-product-btn" data-id="${p.id}">Edit</button>
        <button class="save-product-btn" data-id="${
          p.id
        }" style="display:none;">Save</button>
        <button class="cancel-edit-btn" data-id="${
          p.id
        }" style="display:none;">Cancel</button>
        <button class="delete-product-btn" data-id="${p.id}">Delete</button>
      </td>
    `;

    productsTableBody.appendChild(tr);
  });

  // Attach edit event
  document.querySelectorAll(".edit-product-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      enableEditMode(id);
    });
  });

  // Attach save event
  document.querySelectorAll(".save-product-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await saveProductInline(id);
    });
  });

  // Attach cancel event
  document.querySelectorAll(".cancel-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadProducts(); // Reload to reset
    });
  });

  // Attach delete event
  document.querySelectorAll(".delete-product-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm(`Delete product #${id}?`)) {
        deleteProduct(id);
      }
    });
  });
}

function enableEditMode(productId) {
  const row = document.querySelector(`tr[data-product-id="${productId}"]`);
  if (!row) return;

  row.dataset.editMode = "true";

  // Make cells editable
  row.querySelectorAll(".editable-cell").forEach((cell) => {
    const field = cell.dataset.field;
    const currentValue = cell.textContent;

    if (field === "description") {
      cell.innerHTML = `<textarea style="width:100%; min-height:50px;">${currentValue}</textarea>`;
    } else {
      const inputType =
        field === "price" || field === "stock" ? "number" : "text";
      const step = field === "price" ? "0.01" : "";
      cell.innerHTML = `<input type="${inputType}" ${
        step ? `step="${step}"` : ""
      } value="${currentValue}" style="width:100%;">`;
    }
  });

  // Toggle buttons
  row.querySelector(".edit-product-btn").style.display = "none";
  row.querySelector(".save-product-btn").style.display = "inline-block";
  row.querySelector(".cancel-edit-btn").style.display = "inline-block";
  row.querySelector(".delete-product-btn").style.display = "none";
}

async function saveProductInline(productId) {
  const row = document.querySelector(`tr[data-product-id="${productId}"]`);
  if (!row) return;

  const data = {};

  row.querySelectorAll(".editable-cell").forEach((cell) => {
    const field = cell.dataset.field;
    const input = cell.querySelector("input, textarea");
    if (input) {
      let value = input.value.trim();
      if (field === "price" || field === "stock") {
        value = Number(value);
      }
      data[field] = value;
    }
  });

  if (!data.name) {
    showMessage("Product name is required", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      showMessage(result.message || "Failed to update product", "error");
      return;
    }

    showMessage("Product updated successfully", "success");
    await loadProducts();
  } catch (err) {
    console.error(err);
    showMessage("Network error updating product", "error");
  }
}

async function deleteProduct(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to delete product", "error");
      return;
    }
    showMessage("Product deleted", "success");
    await loadProducts();
  } catch (err) {
    console.error(err);
    showMessage("Network error deleting product", "error");
  }
}

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = productNameInput.value.trim();
  const description = productDescInput.value.trim();
  const price = parseFloat(productPriceInput.value);
  const stock = parseInt(productStockInput.value, 10);
  const category = productCategoryInput.value.trim();

  if (!name || isNaN(price) || isNaN(stock)) {
    showMessage("Name, price, and stock are required", "error");
    return;
  }

  try {
    // Always POST for new products (no ID field anymore)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || "");
    formData.append("price", price);
    formData.append("stock", stock);
    formData.append("category", category || "");

    // Only append image if a file is selected
    if (productImageInput.files && productImageInput.files[0]) {
      formData.append("image", productImageInput.files[0]);
    }

    const res = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to save product", "error");
      return;
    }

    showMessage("Product created successfully", "success");
    productForm.reset();
    await loadProducts();
  } catch (err) {
    console.error(err);
    showMessage("Network error saving product", "error");
  }
});

productResetBtn.addEventListener("click", () => {
  productForm.reset();
  showMessage("Form cleared", "info");
});

// ============ ORDERS ============

async function loadDrivers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/drivers`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn(data.message || "Could not load drivers");
      driversList = [];
      return;
    }
    driversList = data.drivers || [];
  } catch (err) {
    console.error(err);
    driversList = [];
  }
}

async function loadOrders() {
  const status = orderStatusFilter.value;
  const qs = new URLSearchParams();
  qs.set("limit", "50");
  if (status) qs.set("status", status);

  try {
    const res = await fetch(`${API_BASE_URL}/orders?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to load orders", "error");
      return;
    }
    renderOrders(data.orders || []);
  } catch (err) {
    console.error(err);
    showMessage("Network error loading orders", "error");
  }
}

function renderOrders(orders) {
  ordersTableBody.innerHTML = "";

  orders.forEach((o) => {
    const tr = document.createElement("tr");

    const statusOptions = [
      "Pending",
      "Preparing",
      "Ready",
      "On the way",
      "Delivered",
      "Cancelled",
    ]
      .map(
        (s) =>
          `<option value="${s}" ${
            o.status === s ? "selected" : ""
          }>${s}</option>`
      )
      .join("");

    const driverOptions =
      '<option value="">-- none --</option>' +
      driversList
        .map(
          (d) =>
            `<option value="${d.id}" ${
              o.driver_id === d.id ? "selected" : ""
            }>${d.email}</option>`
        )
        .join("");

    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.user_id}</td>
      <td>${o.driver_id || ""}</td>
      <td>${o.total_amount}</td>
      <td>${o.status}</td>
      <td>${o.created_at}</td>
      <td>
        <select class="order-status-select">
          ${statusOptions}
        </select>
        <button class="update-status-btn" data-id="${o.id}">Update</button>
      </td>
      <td>
        <select class="order-driver-select">
          ${driverOptions}
        </select>
        <button class="assign-driver-btn" data-id="${o.id}">Assign</button>
      </td>
    `;

    ordersTableBody.appendChild(tr);
  });

  // Status update
  document.querySelectorAll(".update-status-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const select = btn.closest("td").querySelector(".order-status-select");
      const status = select.value;
      await updateOrderStatus(id, status);
    });
  });

  // Assign driver
  document.querySelectorAll(".assign-driver-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const select = btn.closest("td").querySelector(".order-driver-select");
      const driverId = select.value;
      await assignDriverToOrder(id, driverId);
    });
  });
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to update status", "error");
      return;
    }
    showMessage("Order status updated", "success");
    await loadOrders();
  } catch (err) {
    console.error(err);
    showMessage("Network error updating order status", "error");
  }
}

async function assignDriverToOrder(orderId, driverId) {
  if (!driverId) {
    showMessage("Please select a driver", "error");
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/assign-driver`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_id: parseInt(driverId, 10) }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to assign driver", "error");
      return;
    }
    showMessage("Driver assigned to order", "success");
    await loadOrders();
  } catch (err) {
    console.error(err);
    showMessage("Network error assigning driver", "error");
  }
}

// ============ USERS & DRIVERS ============

async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to load users", "error");
      return;
    }
    renderUsers(data.users || []);
  } catch (err) {
    console.error(err);
    showMessage("Network error loading users", "error");
  }
}

function renderUsers(users) {
  usersTableBody.innerHTML = "";

  users.forEach((u) => {
    // Only show customers in the users table (skip admins and drivers)
    if (u.role === "admin" || u.role === "driver") {
      return;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.created_at}</td>
    `;
    usersTableBody.appendChild(tr);
  });
}

async function loadDriversTable() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/drivers`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Failed to load drivers", "error");
      return;
    }
    const drivers = data.drivers || [];
    renderDrivers(drivers);
  } catch (err) {
    console.error(err);
    showMessage("Network error loading drivers", "error");
  }
}

function renderDrivers(drivers) {
  driversTableBody.innerHTML = "";
  drivers.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${d.email}</td>
      <td>${d.role}</td>
      <td>${d.created_at}</td>
      <td>
        <button class="delete-driver-btn" data-id="${d.id}">Delete</button>
      </td>
    `;
    driversTableBody.appendChild(tr);
  });

  // Attach delete event listeners
  document.querySelectorAll(".delete-driver-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteDriver(btn.dataset.id));
  });
}

async function deleteDriver(driverId) {
  if (
    !confirm(
      "Are you sure you want to delete this driver? Their orders will be set back to Pending status."
    )
  ) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/drivers/${driverId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to delete driver", "error");
      return;
    }

    const ordersAffected = data.ordersAffected || 0;
    showMessage(
      `Driver deleted successfully. ${ordersAffected} order(s) set to Pending.`,
      "success"
    );
    await loadDriversTable();
    await loadOrders(); // Refresh orders table
  } catch (err) {
    console.error(err);
    showMessage("Network error deleting driver", "error");
  }
}

createDriverForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = driverEmailInput.value.trim();
  if (!email) {
    showMessage("Driver email is required", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/drivers`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Failed to create driver", "error");
      return;
    }
    showMessage("Driver created successfully", "success");
    createDriverForm.reset();
    await loadUsers();
    await loadDrivers();
    await loadDriversTable();
  } catch (err) {
    console.error(err);
    showMessage("Network error creating driver", "error");
  }
});

// ============ EVENT BINDINGS & INIT ============

logoutBtn.addEventListener("click", logout);

if (reloadOrdersBtn) {
  reloadOrdersBtn.addEventListener("click", async () => {
    await loadOrders();
  });
}

if (orderStatusFilter) {
  orderStatusFilter.addEventListener("change", async () => {
    await loadOrders();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await fetchCurrentUser();
  if (!user) return;

  showMessage("Welcome to the admin dashboard", "info");

  await loadDrivers();
  await loadProducts();
  await loadOrders();
  await loadUsers();
  await loadDriversTable();
});
