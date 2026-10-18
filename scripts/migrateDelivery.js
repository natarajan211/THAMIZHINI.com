const { pool } = require('../config/db');

async function migrate() {
  try {
    const [colsOrders] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'fashion_ecommerce' AND TABLE_NAME = 'orders'"
    );
    const colNamesOrders = colsOrders.map(c => c.COLUMN_NAME);

    if (!colNamesOrders.includes('shipping_fee')) {
      await pool.query('ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER total_amount');
      console.log('✅ Added shipping_fee column to orders table.');
    }
    if (!colNamesOrders.includes('items_total')) {
      await pool.query('ALTER TABLE orders ADD COLUMN items_total DECIMAL(10, 2) DEFAULT 0.00 AFTER total_amount');
      console.log('✅ Added items_total column to orders table.');
    }

    await pool.query('UPDATE orders SET items_total = total_amount - shipping_fee WHERE items_total = 0 OR items_total IS NULL');

    const [colsSettings] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'fashion_ecommerce' AND TABLE_NAME = 'store_settings'"
    );
    const colNamesSettings = colsSettings.map(c => c.COLUMN_NAME);

    if (!colNamesSettings.includes('delivery_fee')) {
      await pool.query('ALTER TABLE store_settings ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER upi_merchant_name');
      console.log('✅ Added delivery_fee column to store_settings table.');
    }

    console.log('🎉 Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
