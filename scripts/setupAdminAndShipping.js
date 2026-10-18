const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function setup() {
  try {
    // 1. Update/Insert Admin user
    const adminPassHash = await bcrypt.hash('thamizhini@gmail.com', 10);
    const [existingAdmin] = await pool.query('SELECT id FROM users WHERE email = ?', ['thamizhini@gmail.com']);

    if (existingAdmin.length > 0) {
      await pool.query('UPDATE users SET password = ?, role = "admin", name = "THAMIZHINI Admin" WHERE email = ?', [
        adminPassHash,
        'thamizhini@gmail.com'
      ]);
      console.log('✅ Updated existing admin credentials for thamizhini@gmail.com');
    } else {
      const [oldAdmin] = await pool.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
      if (oldAdmin.length > 0) {
        await pool.query('UPDATE users SET email = ?, password = ?, name = ? WHERE id = ?', [
          'thamizhini@gmail.com',
          adminPassHash,
          'THAMIZHINI Admin',
          oldAdmin[0].id
        ]);
        console.log('✅ Updated admin email and password to thamizhini@gmail.com');
      } else {
        await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
          'THAMIZHINI Admin',
          'thamizhini@gmail.com',
          adminPassHash,
          'admin'
        ]);
        console.log('✅ Created admin thamizhini@gmail.com');
      }
    }

    // 2. Remove demo customer user
    await pool.query('DELETE FROM users WHERE email = ?', ['user@fashionhub.com']);
    await pool.query('DELETE FROM users WHERE email = ?', ['admin@fashionhub.com']);
    console.log('✅ Removed demo users');

    // 3. Add shipping_cost column to products table if not exists
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'fashion_ecommerce' AND TABLE_NAME = 'products'"
    );
    const colNames = cols.map(c => c.COLUMN_NAME);

    if (!colNames.includes('shipping_cost')) {
      await pool.query('ALTER TABLE products ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0.00 AFTER price');
      console.log('✅ Added shipping_cost column to products table');
    } else {
      console.log('ℹ️ shipping_cost column already exists');
    }

    // Set sample shipping costs for demo products (e.g. 50 on sarees, 0 on jewellery)
    await pool.query('UPDATE products SET shipping_cost = 50.00 WHERE category = "Women" AND (shipping_cost = 0 OR shipping_cost IS NULL)');
    await pool.query('UPDATE products SET shipping_cost = 30.00 WHERE category = "Accessories" AND (shipping_cost = 0 OR shipping_cost IS NULL)');

    // Verify users
    const [users] = await pool.query('SELECT id, name, email, role FROM users');
    console.log('Current Users in DB:', users);

    console.log('🎉 Setup successful!');
    process.exit(0);
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
}

setup();
