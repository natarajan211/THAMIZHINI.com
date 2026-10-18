const { pool } = require('../config/db');

// Get all products with optional filters, search, and sorting
async function getAllProducts(req, res) {
  try {
    const { category, search, sort, featured } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Filter by Category
    if (category && category !== 'All' && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    // Search by Name or Description
    if (search && search.trim() !== '') {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by Featured
    if (featured === 'true' || featured === '1') {
      query += ' AND is_featured = 1';
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else {
      query += ' ORDER BY id DESC'; // default newest
    }

    const [products] = await pool.query(query, params);

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving products.' });
  }
}

// Get single product by ID
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      product: rows[0]
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving product.' });
  }
}

// Admin: Create new product
async function createProduct(req, res) {
  try {
    const { name, description, price, original_price, shipping_cost, category, stock, is_featured } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    if (!name || !price || !category || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, category, and product image (file upload or URL) are required.'
      });
    }

    if (!['Women', 'Accessories'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Category must be Women or Accessories.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, description, price, original_price, shipping_cost, category, image_url, stock, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || '',
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        shipping_cost !== undefined && shipping_cost !== '' ? parseFloat(shipping_cost) || 0 : 0.00,
        category,
        image_url.trim(),
        stock ? parseInt(stock, 10) : 20,
        is_featured ? (is_featured === 'true' || is_featured === true || is_featured === '1' ? 1 : 0) : 0
      ]
    );

    const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully with image & shipping cost!',
      product: newProduct[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Server error creating product.' });
  }
}

// Admin: Update product
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, original_price, shipping_cost, category, stock, is_featured } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await pool.query(
      `UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        shipping_cost = COALESCE(?, shipping_cost),
        category = COALESCE(?, category),
        image_url = COALESCE(?, image_url),
        stock = COALESCE(?, stock),
        is_featured = COALESCE(?, is_featured)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        price ? parseFloat(price) : null,
        original_price !== undefined ? (original_price ? parseFloat(original_price) : null) : null,
        shipping_cost !== undefined && shipping_cost !== '' ? parseFloat(shipping_cost) || 0 : null,
        category || null,
        image_url ? image_url.trim() : null,
        stock !== undefined ? parseInt(stock, 10) : null,
        is_featured !== undefined ? (is_featured === 'true' || is_featured === true || is_featured === '1' ? 1 : 0) : null,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Product updated successfully!',
      product: updated[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Server error updating product.' });
  }
}

// Admin: Delete product
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting product.' });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
