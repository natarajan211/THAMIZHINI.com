const { pool } = require('../config/db');

// Default initial settings including UPI Payment details
const defaultSettings = {
  store_name: "THAMIZHINI",
  tagline: "Women's Couture & Luxury Accessories",
  address_line1: "No. 48, Usman Road, T. Nagar",
  address_line2: "Opposite Panagal Park",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600017",
  phone: "+91 98400 12345",
  secondary_phone: "044 2434 5678",
  email: "contact@thamizhini.com",
  whatsapp: "+91 98400 12345",
  opening_hours: "Monday – Sunday: 9:30 AM – 9:30 PM",
  google_maps_link: "https://maps.google.com/?q=Usman+Road+T+Nagar+Chennai",
  upi_id: "natarajanamsavalli348-2@okaxis",
  upi_number: "9962998657",
  upi_merchant_name: "Thamizhini Couture",
  delivery_fee: 0.00
};

// Ensure table exists and seeded with UPI columns
async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      id INT PRIMARY KEY DEFAULT 1,
      store_name VARCHAR(150),
      tagline VARCHAR(255),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      phone VARCHAR(50),
      secondary_phone VARCHAR(50),
      email VARCHAR(150),
      whatsapp VARCHAR(50),
      opening_hours VARCHAR(150),
      google_maps_link VARCHAR(500),
      upi_id VARCHAR(100) DEFAULT 'natarajanamsavalli348-2@okaxis',
      upi_number VARCHAR(50) DEFAULT '9962998657',
      upi_merchant_name VARCHAR(150) DEFAULT 'Thamizhini Couture',
      delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // Ensure upi_number column exists in existing tables
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_settings' AND COLUMN_NAME = 'upi_number'"
    );
    if (cols.length === 0) {
      await pool.query("ALTER TABLE store_settings ADD COLUMN upi_number VARCHAR(50) DEFAULT '9962998657' AFTER upi_id");
    }
    await pool.query("UPDATE store_settings SET upi_number = '9962998657' WHERE (upi_number IS NULL OR upi_number = '') AND id = 1");
  } catch (colErr) {
    console.error('Column migration note for upi_number:', colErr.message);
  }

  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(`
      INSERT INTO store_settings (id, store_name, tagline, address_line1, address_line2, city, state, pincode, phone, secondary_phone, email, whatsapp, opening_hours, google_maps_link, upi_id, upi_number, upi_merchant_name)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      defaultSettings.store_name,
      defaultSettings.tagline,
      defaultSettings.address_line1,
      defaultSettings.address_line2,
      defaultSettings.city,
      defaultSettings.state,
      defaultSettings.pincode,
      defaultSettings.phone,
      defaultSettings.secondary_phone,
      defaultSettings.email,
      defaultSettings.whatsapp,
      defaultSettings.opening_hours,
      defaultSettings.google_maps_link,
      defaultSettings.upi_id,
      defaultSettings.upi_number,
      defaultSettings.upi_merchant_name
    ]);
  }
}

// Public: Get Store Settings / Address & UPI
async function getSettings(req, res) {
  try {
    await ensureSettingsTable();
    const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
    return res.json({
      success: true,
      settings: rows[0] || defaultSettings
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving store settings.' });
  }
}

// Admin: Update Store Settings, Address & UPI ID
async function updateSettings(req, res) {
  try {
    await ensureSettingsTable();
    const {
      store_name,
      tagline,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      phone,
      secondary_phone,
      email,
      whatsapp,
      opening_hours,
      google_maps_link,
      upi_id,
      upi_number,
      upi_merchant_name,
      delivery_fee
    } = req.body;

    await pool.query(`
      UPDATE store_settings SET
        store_name = COALESCE(?, store_name),
        tagline = COALESCE(?, tagline),
        address_line1 = COALESCE(?, address_line1),
        address_line2 = COALESCE(?, address_line2),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        phone = COALESCE(?, phone),
        secondary_phone = COALESCE(?, secondary_phone),
        email = COALESCE(?, email),
        whatsapp = COALESCE(?, whatsapp),
        opening_hours = COALESCE(?, opening_hours),
        google_maps_link = COALESCE(?, google_maps_link),
        upi_id = COALESCE(?, upi_id),
        upi_number = COALESCE(?, upi_number),
        upi_merchant_name = COALESCE(?, upi_merchant_name),
        delivery_fee = COALESCE(?, delivery_fee)
      WHERE id = 1
    `, [
      store_name,
      tagline,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      phone,
      secondary_phone,
      email,
      whatsapp,
      opening_hours,
      google_maps_link,
      upi_id,
      upi_number,
      upi_merchant_name,
      delivery_fee !== undefined ? parseFloat(delivery_fee) || 0 : null
    ]);

    const [updated] = await pool.query('SELECT * FROM store_settings WHERE id = 1');

    return res.json({
      success: true,
      message: 'Store details and UPI payment settings saved successfully!',
      settings: updated[0]
    });
  } catch (error) {
    console.error('Error updating store settings:', error);
    return res.status(500).json({ success: false, message: 'Server error updating store settings.' });
  }
}

module.exports = {
  getSettings,
  updateSettings
};
