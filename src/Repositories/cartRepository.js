const db = require("../config/config");

function getCartByUser(userId, callback) {
  const sql = `
    SELECT ci.id, ci.product_id, p.name, p.price, p.image_url, ci.quantity, (p.price * ci.quantity) AS total
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?`;
  db.query(sql, [userId], callback);
}

function addToCart(userId, productId, quantity, callback) {
  // First check product stock
  const checkStockSql = "SELECT stock FROM products WHERE id = ?";
  db.query(checkStockSql, [productId], (err, rows) => {
    if (err) return callback(err);
    if (!rows || rows.length === 0) {
      return callback(new Error("Product not found"));
    }

    const availableStock = rows[0].stock;

    if (availableStock === 0) {
      return callback(new Error("Product is out of stock"));
    }

    // Check if item already in cart
    const checkCartSql =
      "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?";
    db.query(checkCartSql, [userId, productId], (err2, cartRows) => {
      if (err2) return callback(err2);

      const currentCartQty = cartRows.length > 0 ? cartRows[0].quantity : 0;
      const totalQty = currentCartQty + quantity;

      if (totalQty > availableStock) {
        return callback(
          new Error(
            `Cannot add to cart. Only ${availableStock} items available in stock (you already have ${currentCartQty} in cart)`
          )
        );
      }

      // Proceed with adding to cart
      const sql = `
        INSERT INTO cart_items (user_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`;
      db.query(sql, [userId, productId, quantity], callback);
    });
  });
}

function updateQuantity(userId, productId, quantity, callback) {
  // First check product stock
  const checkStockSql = "SELECT stock FROM products WHERE id = ?";
  db.query(checkStockSql, [productId], (err, rows) => {
    if (err) return callback(err);
    if (!rows || rows.length === 0) {
      return callback(new Error("Product not found"));
    }

    const availableStock = rows[0].stock;

    if (availableStock === 0) {
      return callback(new Error("Product is out of stock"));
    }

    if (quantity > availableStock) {
      return callback(
        new Error(
          `Cannot update cart. Only ${availableStock} items available in stock`
        )
      );
    }

    // Proceed with update
    const sql = `
      UPDATE cart_items SET quantity = ? 
      WHERE user_id = ? AND product_id = ?`;
    db.query(sql, [quantity, userId, productId], callback);
  });
}

// Remove a single product from cart
function removeFromCart(userId, productId, callback) {
  const sql = `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`;
  db.query(sql, [userId, productId], callback);
}

// Clear entire cart
function clearCart(userId, callback) {
  const sql = `DELETE FROM cart_items WHERE user_id = ?`;
  db.query(sql, [userId], callback);
}

module.exports = {
  getCartByUser,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
