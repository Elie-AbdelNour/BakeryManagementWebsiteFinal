const API_BASE_URL = "/api";
let isInitialized = false;
let currentUser = null;
let productsPagination = { currentPage: 1, totalPages: 1 };
let driversCache = [];
let productsCache = {}; // NEW: store products so cart can access image_url

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
document.addEventListener("DOMContentLoaded", () => {
  if (isInitialized) return; // <--- FIX
  isInitialized = true;

  initLogout();

  loadCurrentUser()
    .then(() => {
      setupRoleVisibility();
      attachCommonHandlers();
      loadProducts(1); // <-- IMPORTANT: load products first so we can cache images

      if (!currentUser) return;

      if (currentUser.role === "customer" && !window.IS_CART_PAGE) {
        // ✅ Don't call loadCart here - cart.html handles it
        if (document.querySelector("#customer-orders-table"))
          loadCustomerOrders();
      } else if (currentUser.role === "admin") {
        if (document.querySelector("#admin-products-table"))
          loadAdminProductsTable();
        if (document.querySelector("#admin-orders-table")) loadAdminOrders();
        if (document.querySelector("#users-table")) loadUsers();
        loadDriversList();
      } else if (currentUser.role === "driver") {
        if (document.querySelector("#driver-orders-table")) loadDriverOrders();
      }
    })
    .catch(() => {
      currentUser = null;
      setupRoleVisibility();
      attachCommonHandlers();
      loadProducts(1);
    });
});

// ---------- Auth / User ----------
async function loadCurrentUser() {
  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/me`);
    currentUser = data.user;

    const ui = document.getElementById("user-info");
    if (ui) ui.textContent = `${currentUser.email} (${currentUser.role})`;

    return currentUser;
  } catch (err) {
    currentUser = null;
    const ui = document.getElementById("user-info");
    if (ui) ui.textContent = "Guest";
    return null;
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

function setupRoleVisibility() {
  const navCart = document.getElementById("nav-cart");
  const navOrders = document.getElementById("nav-orders");
  const navLogin = document.getElementById("nav-login");
  const logoutBtn = document.getElementById("logout-btn");

  navCart.hidden = true;
  navOrders.hidden = true;
  logoutBtn.hidden = true;
  navLogin.hidden = false;

  if (!currentUser) return;

  navLogin.hidden = true;
  logoutBtn.hidden = false;

  if (currentUser.role === "customer") {
    navCart.hidden = false;
    navOrders.hidden = false;
  }
}

// ---------- Products / Catalog ----------
function attachCommonHandlers() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", () => loadProducts(1));

  const categoryInput = document.getElementById("category-input");
  if (categoryInput)
    categoryInput.addEventListener("input", () => loadProducts(1));

  const minInput = document.getElementById("min-price-input");
  const maxInput = document.getElementById("max-price-input");
  if (minInput) minInput.addEventListener("input", () => loadProducts(1));
  if (maxInput) maxInput.addEventListener("input", () => loadProducts(1));

  const filtersForm = document.getElementById("product-filters");
  if (filtersForm)
    filtersForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadProducts(1);
    });

  const prevBtn = document.getElementById("products-prev");
  const nextBtn = document.getElementById("products-next");

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      if (productsPagination.currentPage > 1)
        loadProducts(productsPagination.currentPage - 1);
    });

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      if (productsPagination.currentPage < productsPagination.totalPages)
        loadProducts(productsPagination.currentPage + 1);
    });

  // ✅ Cart page buttons
  const clearCartBtn = document.getElementById("clear-cart-btn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", clearCart);
  }

  const placeOrderBtn = document.getElementById("place-order-btn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", placeOrder);
  }
}

async function loadProducts(page) {
  const search = document.getElementById("search-input")?.value.trim();
  const category = document.getElementById("category-input")?.value.trim();
  const minPrice = document.getElementById("min-price-input")?.value.trim();
  const maxPrice = document.getElementById("max-price-input")?.value.trim();

  const params = new URLSearchParams();
  params.set("page", page || 1);
  params.set("limit", 4);

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);

  try {
    const data = await apiFetch(
      `${API_BASE_URL}/products?` + params.toString()
    );

    // 🔥 Store products in cache for cart image support
    productsCache = {};
    (data.products || []).forEach((p) => {
      productsCache[p.id] = p;
    });

    renderProducts(data.products || []);

    productsPagination.currentPage = data.pagination?.currentPage || 1;
    productsPagination.totalPages = data.pagination?.totalPages || 1;

    const infoEl = document.getElementById("products-page-info");
    if (infoEl)
      infoEl.textContent = `Page ${productsPagination.currentPage} of ${productsPagination.totalPages}`;
  } catch (err) {
    showGlobalMessage("Failed to load products", "error");
  }
}

async function renderProducts(products) {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  if (!products.length) {
    container.textContent = "No products found.";
    return;
  }

  for (const p of products) {
    const card = document.createElement("div");
    card.className = "product-card";

    const title = document.createElement("h3");

    if (p.image_url) {
      const img = document.createElement("img");
      img.src = p.image_url.startsWith("http") ? p.image_url : `${p.image_url}`;
      img.alt = p.name;
      img.className = "product-image";
      card.appendChild(img);
    }

    title.textContent = p.name;

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.textContent = `${p.category || "Uncategorized"}`;

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = `${Number(p.price).toFixed(2)}$`;

    const stock = document.createElement("div");
    stock.className = "product-meta";
    stock.textContent = `Stock: ${p.stock}`;
    if (p.stock === 0) {
      stock.style.color = "red";
      stock.style.fontWeight = "bold";
    }

    // Rating display
    const ratingContainer = document.createElement("div");
    ratingContainer.className = "product-rating";
    try {
      const ratingData = await apiFetch(
        `${API_BASE_URL}/reviews/rating/${p.id}`
      );
      const avgRating = ratingData.avgRating || 0;
      const reviewCount = ratingData.reviewCount || 0;
      ratingContainer.innerHTML = `
        <span class="stars">${renderStars(avgRating)}</span>
        <span class="rating-text">${avgRating.toFixed(
          1
        )} (${reviewCount} reviews)</span>
      `;
    } catch (err) {
      ratingContainer.innerHTML = `<span class="rating-text">No reviews yet</span>`;
    }

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const btn = document.createElement("button");
    btn.className = "btn small primary";

    if (p.stock === 0) {
      btn.textContent = "Out of Stock";
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    } else {
      btn.textContent = "Add to Cart";
      btn.addEventListener("click", async () => {
        if (!currentUser) {
          showGlobalMessage("Please log in first", "error");
          setTimeout(() => {
            window.location.href = "/loginPage";
          }, 1000);
          return;
        }
        await addToCart(p.id);
      });
    }

    actions.appendChild(btn);

    // View Reviews button
    const viewReviewsBtn = document.createElement("button");
    viewReviewsBtn.className = "btn small secondary";
    viewReviewsBtn.textContent = "View Reviews";
    viewReviewsBtn.addEventListener("click", () => showReviewsModal(p));
    actions.appendChild(viewReviewsBtn);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(price);
    card.appendChild(stock);
    card.appendChild(ratingContainer);
    card.appendChild(actions);

    container.appendChild(card);
  }
}

// Render star rating
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let stars = "";
  for (let i = 0; i < fullStars; i++) stars += "★";
  if (halfStar) stars += "⯨";
  for (let i = 0; i < emptyStars; i++) stars += "☆";

  return stars;
}

// Show reviews modal
async function showReviewsModal(product) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content review-modal">
      <div class="modal-header">
        <h2>Reviews for ${product.name}</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div id="reviews-list" class="reviews-list">Loading reviews...</div>
        <div id="review-form-container"></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-close").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Load reviews
  await loadReviews(product.id);

  // Check if user can review
  if (currentUser && currentUser.role === "customer") {
    await loadReviewForm(product.id);
  }
}

// Load reviews for a product
async function loadReviews(productId) {
  const reviewsList = document.getElementById("reviews-list");
  if (!reviewsList) return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/reviews/product/${productId}`);
    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      reviewsList.innerHTML = "<p>No reviews yet. Be the first to review!</p>";
      return;
    }

    reviewsList.innerHTML = reviews
      .map(
        (r) => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${r.user_email}</span>
          <span class="review-rating">${renderStars(r.rating)}</span>
        </div>
        <p class="review-comment">${r.comment || "No comment provided."}</p>
        <span class="review-date">${new Date(
          r.created_at
        ).toLocaleDateString()}</span>
      </div>
    `
      )
      .join("");
  } catch (err) {
    reviewsList.innerHTML = "<p>Failed to load reviews.</p>";
  }
}

// Load review form if user is eligible
async function loadReviewForm(productId) {
  const formContainer = document.getElementById("review-form-container");
  if (!formContainer) return;

  try {
    const data = await apiFetch(
      `${API_BASE_URL}/reviews/can-review/${productId}`
    );

    console.log("Can review response:", data);

    if (data.canReview) {
      formContainer.innerHTML = `
        <div class="review-form">
          <h3>Write a Review</h3>
          <form id="submit-review-form">
            <input type="hidden" id="review-product-id" value="${productId}">
            <input type="hidden" id="review-order-id" value="${data.orderId}">
            
            <label>Rating:</label>
            <div class="star-rating">
              <input type="radio" name="rating" value="5" id="star5" required>
              <label for="star5">★</label>
              <input type="radio" name="rating" value="4" id="star4">
              <label for="star4">★</label>
              <input type="radio" name="rating" value="3" id="star3">
              <label for="star3">★</label>
              <input type="radio" name="rating" value="2" id="star2">
              <label for="star2">★</label>
              <input type="radio" name="rating" value="1" id="star1">
              <label for="star1">★</label>
            </div>
            
            <label>Comment (optional):</label>
            <textarea id="review-comment" maxlength="1000" rows="4" placeholder="Share your experience..."></textarea>
            
            <button type="submit" class="btn primary">Submit Review</button>
          </form>
        </div>
      `;

      document
        .getElementById("submit-review-form")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          await submitReview();
        });
    } else {
      formContainer.innerHTML =
        "<p class='review-note'>You can only review products from your delivered orders.</p>";
    }
  } catch (err) {
    console.error("Error loading review form:", err);
    formContainer.innerHTML = `<p class='review-note'>Error: ${err.message}</p>`;
  }
}

// Submit a review
async function submitReview() {
  const productId = document.getElementById("review-product-id").value;
  const orderId = document.getElementById("review-order-id").value;
  const rating = document.querySelector('input[name="rating"]:checked')?.value;
  const comment = document.getElementById("review-comment").value;

  if (!rating) {
    showGlobalMessage("Please select a rating", "error");
    return;
  }

  try {
    await apiFetch(`${API_BASE_URL}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: Number(productId),
        order_id: Number(orderId),
        rating: Number(rating),
        comment: comment,
      }),
    });

    showGlobalMessage("Review submitted successfully!", "success");

    // Reload reviews
    await loadReviews(productId);

    // Remove form
    document.getElementById("review-form-container").innerHTML =
      "<p class='review-note'>Thank you for your review!</p>";

    // Reload products to update rating
    setTimeout(() => loadProducts(productsPagination.currentPage), 1000);
  } catch (err) {
    showGlobalMessage(err.message || "Failed to submit review", "error");
  }
}

// ---------- Cart (Customer) ----------
async function loadCart() {
  if (!currentUser || currentUser.role !== "customer") return;

  const cartGrid = document.getElementById("cart-grid");
  if (!cartGrid) return;

  cartGrid.innerHTML = "";

  const emptyMsg = document.getElementById("cart-empty-msg");
  const totalEl = document.getElementById("cart-total");

  try {
    const data = await apiFetch(`${API_BASE_URL}/cart`);
    const cart = data.cart || [];

    if (!cart.length) {
      if (emptyMsg) emptyMsg.textContent = "Your cart is empty.";
      if (totalEl) totalEl.textContent = "";
      return;
    }

    if (emptyMsg) emptyMsg.textContent = "";
    let total = 0;

    cart.forEach((item) => {
      const imageUrl = item.image_url || "/images/default.png";
      total += Number(item.total);

      const card = document.createElement("div");
      card.className = "cart-card";

      card.innerHTML = `
        <img src="${imageUrl}" class="cart-card-image" alt="${item.name}">
        <h3 class="cart-card-title">${item.name}</h3>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Price:</span>
          <span class="cart-card-value cart-card-price">${Number(
            item.price
          ).toFixed(2)}$</span>
        </div>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Quantity:</span>
          <div class="cart-card-quantity">
            <input type="number" min="1" value="${item.quantity}" data-pid="${
        item.product_id
      }" class="qty-input">
          </div>
        </div>
        
        <div class="cart-card-info">
          <span class="cart-card-label">Subtotal:</span>
          <span class="cart-card-value cart-card-price">${Number(
            item.total
          ).toFixed(2)}$</span>
        </div>
        
        <div class="cart-card-actions">
          <button class="btn small primary update-btn" data-pid="${
            item.product_id
          }">Update</button>
          <button class="btn small danger remove-btn" data-pid="${
            item.product_id
          }">Remove</button>
        </div>
      `;

      cartGrid.appendChild(card);
    });

    if (totalEl) totalEl.textContent = `Total: ${total.toFixed(2)}$`;

    // attach handlers after cards are added
    document.querySelectorAll(".update-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.pid;
        const qty = document.querySelector(
          `.qty-input[data-pid="${pid}"]`
        ).value;
        updateCartItem(pid, qty);
      });
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.pid;
        removeCartItem(pid);
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function addToCart(productId) {
  try {
    await apiFetch(`${API_BASE_URL}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });

    showGlobalMessage("Added to cart!", "success");

    if (document.querySelector("#cart-table")) loadCart();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to add to cart", "error");
  }
}

async function updateCartItem(productId, quantity) {
  const qty = Number(quantity);
  if (!qty || qty < 1) return showGlobalMessage("Invalid quantity", "error");

  try {
    await apiFetch(`${API_BASE_URL}/cart/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });

    showGlobalMessage("Cart updated!", "success");
    loadCart();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to update cart", "error");
    loadCart(); // Reload to show correct quantities
  }
}

async function removeCartItem(productId) {
  try {
    await apiFetch(`${API_BASE_URL}/cart/${productId}`, { method: "DELETE" });
    showGlobalMessage("Removed!", "success");
    loadCart();
  } catch (err) {
    console.error(err);
  }
}

async function clearCart() {
  if (!currentUser || currentUser.role !== "customer") return;

  try {
    await apiFetch(`${API_BASE_URL}/cart`, { method: "DELETE" });
    showGlobalMessage("Cart cleared.", "success");
    loadCart();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to clear cart", "error");
  }
}

async function placeOrder() {
  if (!currentUser || currentUser.role !== "customer") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders`, {
      method: "POST",
    });
    showGlobalMessage(data.message || "Order placed successfully.", "success");
    loadCart();
    loadCustomerOrders();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to place order", "error");
  }
}

// ---------- Customer Orders ----------
async function loadCustomerOrders() {
  if (!currentUser || currentUser.role !== "customer") return;

  const tbody = document.querySelector("#customer-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/my?limit=20`);
    const orders = data.orders || [];

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      tdStatus.textContent = o.status;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(o.created_at).toLocaleString();

      const tdDetails = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "View";
      btn.addEventListener("click", () => loadOrderDetails(o.id));
      tdDetails.appendChild(btn);

      tr.appendChild(tdId);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdDetails);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

async function loadOrderDetails(orderId) {
  if (!currentUser || currentUser.role !== "customer") return;

  const container = document.getElementById("order-details");
  if (!container) return;
  container.textContent = "Loading order details...";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/${orderId}`);
    const order = data.order || data;

    if (!order || !order.items || !order.items.length) {
      container.textContent = "No details for this order.";
      return;
    }

    let html = `<strong>Order #${order.id}</strong><br/>`;
    html += `<em>Status:</em> ${order.status}<br/>`;
    html += `<em>Total:</em> ${Number(order.total_amount).toFixed(
      2
    )}$<br/><br/>`;
    html += `<table class="data-table"><thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr></thead><tbody>`;

    order.items.forEach((it) => {
      html += `<tr>
        <td>${it.product_name}</td>
        <td>${Number(it.price).toFixed(2)}$</td>
        <td>${it.quantity}</td>
        <td>${Number(it.subtotal).toFixed(2)}$</td>
      </tr>`;
    });
    html += `</tbody></table>`;

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.textContent = "Failed to load order details.";
  }
}

// ---------- Admin: Products ----------
function renderAdminProductsTable(products) {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#admin-products-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = p.id;

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdCat = document.createElement("td");
    tdCat.textContent = p.category || "";

    const tdPrice = document.createElement("td");
    tdPrice.textContent = `${Number(p.price).toFixed(2)}$`;

    const tdStock = document.createElement("td");
    tdStock.textContent = p.stock;

    const tdActions = document.createElement("td");
    tdActions.className = "actions";

    const tdImg = document.createElement("td");
    tdImg.innerHTML = `<img src="${p.image_url}" class="admin-img">`;
    tr.appendChild(tdImg);

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn small";
    btnEdit.textContent = "Edit";
    btnEdit.addEventListener("click", () => fillProductForm(p));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn small danger";
    btnDelete.textContent = "Delete";
    btnDelete.addEventListener("click", () => deleteProduct(p.id));

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdCat);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// In case you need to force reload separate from catalog
async function loadAdminProductsTable() {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/products?page=1&limit=100`);
    renderAdminProductsTable(data.products || []);
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load products", "error");
  }
}

function fillProductForm(p) {
  if (!currentUser || currentUser.role !== "admin") return;

  document.getElementById("product-id").value = p.id;
  document.getElementById("product-name").value = p.name;
  document.getElementById("product-category").value = p.category || "";
  document.getElementById("product-price").value = p.price;
  document.getElementById("product-stock").value = p.stock;
  document.getElementById("product-image-url").value = p.image_url || "";
  document.getElementById("product-description").value = p.description || "";
}

function resetProductForm() {
  if (!currentUser || currentUser.role !== "admin") return;

  document.getElementById("product-id").value = "";
  document.getElementById("product-name").value = "";
  document.getElementById("product-category").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-stock").value = "";
  document.getElementById("product-image-url").value = "";
  document.getElementById("product-description").value = "";
}

async function handleProductSave(e) {
  if (!currentUser || currentUser.role !== "admin") return;

  e.preventDefault();
  const id = document.getElementById("product-id").value;
  const payload = {
    name: document.getElementById("product-name").value.trim(),
    category: document.getElementById("product-category").value.trim(),
    price: Number(document.getElementById("product-price").value),
    stock: Number(document.getElementById("product-stock").value),
    image_url: document.getElementById("product-image-url").value.trim(),
    description: document.getElementById("product-description").value.trim(),
  };

  const method = id ? "PUT" : "POST";
  const url = id
    ? `${API_BASE_URL}/products/${id}`
    : `${API_BASE_URL}/products`;

  try {
    await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showGlobalMessage("Product saved.", "success");
    resetProductForm();
    loadProducts(productsPagination.currentPage || 1);
    loadAdminProductsTable();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to save product", "error");
  }
}

async function deleteProduct(id) {
  if (!currentUser || currentUser.role !== "admin") return;
  if (!confirm("Delete this product?")) return;

  try {
    await apiFetch(`${API_BASE_URL}/products/${id}`, { method: "DELETE" });
    showGlobalMessage("Product deleted.", "success");
    loadProducts(productsPagination.currentPage || 1);
    loadAdminProductsTable();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to delete product", "error");
  }
}

// ---------- Admin: Orders & Drivers ----------
async function loadDriversList() {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    const data = await apiFetch(`${API_BASE_URL}/users/drivers`);
    driversCache = data.drivers || [];
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load drivers", "error");
  }
}

function createDriverSelect(currentDriverId) {
  const select = document.createElement("select");
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "Unassigned";
  select.appendChild(emptyOpt);

  driversCache.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.email;
    if (currentDriverId && Number(currentDriverId) === Number(d.id)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  return select;
}

async function loadAdminOrders() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#admin-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const statusFilter = document.getElementById("admin-order-status-filter");
  const params = new URLSearchParams();
  params.set("limit", 50);
  if (statusFilter && statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders?` + params.toString());
    const orders = data.orders || [];

    if (!driversCache.length) {
      await loadDriversList();
    }

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdUser = document.createElement("td");
      tdUser.textContent = o.user_id;

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      const statusSelect = document.createElement("select");
      [
        "Pending",
        "Preparing",
        "Ready",
        "On the way",
        "Delivered",
        "Cancelled",
      ].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        if (o.status === s) opt.selected = true;
        statusSelect.appendChild(opt);
      });
      tdStatus.appendChild(statusSelect);

      const tdDriver = document.createElement("td");
      const driverSelect = createDriverSelect(o.driver_id);
      tdDriver.appendChild(driverSelect);

      const tdActions = document.createElement("td");
      tdActions.className = "actions";

      const btnUpdate = document.createElement("button");
      btnUpdate.className = "btn small";
      btnUpdate.textContent = "Update";
      btnUpdate.addEventListener("click", async () => {
        try {
          await apiFetch(`${API_BASE_URL}/orders/${o.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: statusSelect.value }),
          });

          if (driverSelect.value) {
            await apiFetch(`${API_BASE_URL}/orders/${o.id}/assign-driver`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ driver_id: Number(driverSelect.value) }),
            });
          }

          showGlobalMessage("Order updated.", "success");
          loadAdminOrders();
        } catch (err) {
          console.error(err);
          showGlobalMessage(err.message || "Failed to update order", "error");
        }
      });

      tdActions.appendChild(btnUpdate);

      tr.appendChild(tdId);
      tr.appendChild(tdUser);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDriver);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load orders", "error");
  }
}

// ---------- Admin: Users / Drivers ----------
async function loadUsers() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/users`);
    const users = data.users || [];

    users.forEach((u) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = u.id;

      const tdEmail = document.createElement("td");
      tdEmail.textContent = u.email;

      const tdRole = document.createElement("td");
      tdRole.textContent = u.role;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(u.created_at).toLocaleString();

      const tdActions = document.createElement("td");
      tdActions.className = "actions";

      if (u.role !== "driver") {
        const btnPromote = document.createElement("button");
        btnPromote.className = "btn small";
        btnPromote.textContent = "Promote to Driver";
        btnPromote.addEventListener("click", () => promoteToDriver(u.id));
        tdActions.appendChild(btnPromote);
      } else {
        tdActions.textContent = "Driver";
      }

      tr.appendChild(tdId);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRole);
      tr.appendChild(tdCreated);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load users", "error");
  }
}

async function promoteToDriver(userId) {
  if (!currentUser || currentUser.role !== "admin") return;

  try {
    await apiFetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: "PATCH",
    });
    showGlobalMessage("User promoted to driver.", "success");
    loadUsers();
    loadDriversList();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to promote user", "error");
  }
}

async function handleCreateDriver(e) {
  if (!currentUser || currentUser.role !== "admin") return;

  e.preventDefault();
  const emailInput = document.getElementById("new-driver-email");
  const email = emailInput.value.trim();
  if (!email) return;

  try {
    await apiFetch(`${API_BASE_URL}/users/drivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    showGlobalMessage("Driver created.", "success");
    emailInput.value = "";
    loadUsers();
    loadDriversList();
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to create driver", "error");
  }
}

// ---------- Driver: Orders ----------
async function loadDriverOrders() {
  if (!currentUser || currentUser.role !== "driver") return;

  const tbody = document.querySelector("#driver-orders-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  try {
    const data = await apiFetch(`${API_BASE_URL}/orders/driver?limit=50`);
    const orders = data.orders || [];

    orders.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;

      const tdEmail = document.createElement("td");
      tdEmail.textContent = o.customer_email || "";

      const tdTotal = document.createElement("td");
      tdTotal.textContent = `${Number(o.total_amount).toFixed(2)}$`;

      const tdStatus = document.createElement("td");
      tdStatus.textContent = o.status;

      const tdCreated = document.createElement("td");
      tdCreated.textContent = new Date(o.created_at).toLocaleString();

      const tdUpdate = document.createElement("td");
      const select = document.createElement("select");
      ["On the way", "Delivered", "Cancelled"].forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      });

      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "Save";
      btn.addEventListener("click", () =>
        updateDeliveryStatus(o.id, select.value)
      );

      tdUpdate.appendChild(select);
      tdUpdate.appendChild(btn);

      tr.appendChild(tdId);
      tr.appendChild(tdEmail);
      tr.appendChild(tdTotal);
      tr.appendChild(tdStatus);
      tr.appendChild(tdCreated);
      tr.appendChild(tdUpdate);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showGlobalMessage(err.message || "Failed to load driver orders", "error");
  }
}

async function updateDeliveryStatus(orderId, status) {
  if (!currentUser || currentUser.role !== "driver") return;

  try {
    await apiFetch(`${API_BASE_URL}/orders/${orderId}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    showGlobalMessage("Delivery status updated.", "success");
    loadDriverOrders();
  } catch (err) {
    console.error(err);
    showGlobalMessage(
      err.message || "Failed to update delivery status",
      "error"
    );
  }
}
