const { pool } = require('../config/db');

// Place a new Order
async function createOrder(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { items, shipping_name, shipping_address, city, postal_code, phone, payment_method, payment_ref } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    if (!shipping_name || !shipping_address || !city || !postal_code || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide full shipping details and phone number.' });
    }

    await connection.beginTransaction();

    // Verify products and calculate subtotal & shipping fee safely
    let itemsSubtotal = 0;
    let shippingFee = 0;
    const verifiedItems = [];

    for (const item of items) {
      const [productRows] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.id || item.product_id]);
      if (productRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: `Product ID ${item.id} not found.` });
      }

      const product = productRows[0];
      const qty = parseInt(item.quantity, 10) || 1;

      if (product.stock < qty) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`
        });
      }

      const itemTotal = parseFloat(product.price) * qty;
      itemsSubtotal += itemTotal;

      const itemShipping = (parseFloat(product.shipping_cost) || 0) * qty;
      shippingFee += itemShipping;

      verifiedItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image_url: product.image_url
      });

      // Deduct stock
      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, product.id]);
    }

    const finalTotal = itemsSubtotal + shippingFee;

    // Insert Order with computed items_total and shipping_fee
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, items_total, shipping_fee, total_amount, shipping_name, shipping_address, city, postal_code, phone, payment_method, payment_ref, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        userId,
        itemsSubtotal,
        shippingFee,
        finalTotal,
        shipping_name.trim(),
        shipping_address.trim(),
        city.trim(),
        postal_code.trim(),
        phone.trim(),
        payment_method || 'Cash On Delivery',
        payment_ref ? payment_ref.trim() : null
      ]
    );

    const orderId = orderResult.insertId;

    // Insert Order Items
    for (const item of verifiedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.name, item.price, item.quantity, item.image_url]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderId,
      itemsTotal: itemsSubtotal,
      shippingFee,
      totalAmount: finalTotal,
      itemsCount: verifiedItems.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: 'Server error while processing your order.' });
  } finally {
    connection.release();
  }
}

// Get logged-in user's order history
async function getMyOrders(req, res) {
  try {
    const userId = req.user.id;

    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch items for each order
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching order history.' });
  }
}

// Admin: Get all customer orders
async function getAllOrders(req, res) {
  try {
    const [orders] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching all orders for admin:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching orders.' });
  }
}

// Admin: Update order status
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({
      success: true,
      message: `Order status updated to "${status}" successfully.`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Server error updating order status.' });
  }
}

// Admin: Get Dashboard metrics & stats
async function getAdminStats(req, res) {
  try {
    const [salesRow] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status != "Cancelled"');
    const [ordersRow] = await pool.query('SELECT COUNT(*) AS total_orders FROM orders');
    const [pendingRow] = await pool.query('SELECT COUNT(*) AS pending_orders FROM orders WHERE status = "Pending"');
    const [productsRow] = await pool.query('SELECT COUNT(*) AS total_products FROM products');
    const [usersRow] = await pool.query('SELECT COUNT(*) AS total_customers FROM users WHERE role = "customer"');

    return res.json({
      success: true,
      stats: {
        totalRevenue: parseFloat(salesRow[0].total_revenue),
        totalOrders: ordersRow[0].total_orders,
        pendingOrders: pendingRow[0].pending_orders,
        totalProducts: productsRow[0].total_products,
        totalCustomers: usersRow[0].total_customers
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching statistics.' });
  }
}

// Admin: Manually update order delivery/shipping fee
async function updateOrderDeliveryFee(req, res) {
  try {
    const { id } = req.params;
    const { shipping_fee } = req.body;

    const fee = parseFloat(shipping_fee);
    if (isNaN(fee) || fee < 0) {
      return res.status(400).json({ success: false, message: 'Invalid delivery fee amount. Must be 0 or greater.' });
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = rows[0];
    const itemsTotal = parseFloat(order.items_total) > 0 
      ? parseFloat(order.items_total) 
      : (parseFloat(order.total_amount) - parseFloat(order.shipping_fee || 0));
    const newTotal = itemsTotal + fee;

    await pool.query(
      'UPDATE orders SET items_total = ?, shipping_fee = ?, total_amount = ? WHERE id = ?',
      [itemsTotal, fee, newTotal, id]
    );

    return res.json({
      success: true,
      message: `Delivery fee of ₹${fee.toFixed(2)} updated successfully! Total is now ₹${newTotal.toFixed(2)}.`,
      shipping_fee: fee,
      items_total: itemsTotal,
      total_amount: newTotal
    });
  } catch (error) {
    console.error('Error updating order delivery fee:', error);
    return res.status(500).json({ success: false, message: 'Server error updating delivery fee.' });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderDeliveryFee,
  getAdminStats
};
