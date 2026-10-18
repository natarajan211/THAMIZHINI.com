const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
const DB_NAME = process.env.DB_NAME || 'fashion_ecommerce';

const isSSL =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_PORT && Number(process.env.DB_PORT) === 4000) ||
  (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com'));

const sslConfig = isSSL
  ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
    }
  : undefined;

async function initDatabase() {
  console.log('🔄 Connecting to MySQL/TiDB server to initialize database...');
  let connection;

  try {
    // 1. Connect to MySQL/TiDB Server without database to create DB if needed
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      ssl: sslConfig
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database "${DB_NAME}" created or already exists.`);

    // Switch to database
    await connection.changeUser({ database: DB_NAME });

    // 2. Create Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('customer', 'admin') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 3. Create Products Table (Women & Accessories)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2) DEFAULT NULL,
        shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
        category ENUM('Women', 'Accessories') NOT NULL,
        image_url VARCHAR(600) NOT NULL,
        stock INT DEFAULT 25,
        rating DECIMAL(2, 1) DEFAULT 4.5,
        is_featured BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 4. Create Orders Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        items_total DECIMAL(10, 2) DEFAULT 0.00,
        shipping_fee DECIMAL(10, 2) DEFAULT 0.00,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
        shipping_name VARCHAR(100) NOT NULL,
        shipping_address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        phone VARCHAR(25) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash On Delivery',
        payment_ref VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. Create Order Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NULL,
        product_name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL,
        image_url VARCHAR(600),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All tables (users, products, orders, order_items) are ready.');

    // 6. Check and Seed Admin User
    const [userRows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (userRows[0].count === 0) {
      console.log('🌱 Seeding initial admin user...');
      const adminPassHash = await bcrypt.hash('thamizhini@gmail.com', 10);

      await connection.query(`
        INSERT INTO users (name, email, password, role) VALUES
        ('THAMIZHINI Admin', 'thamizhini@gmail.com', ?, 'admin');
      `, [adminPassHash]);

      console.log('   -> Admin created: thamizhini@gmail.com / thamizhini@gmail.com');
    }

    // 7. Check and Seed Products (Women & Accessories)
    const [productRows] = await connection.query('SELECT COUNT(*) AS count FROM products');
    if (productRows[0].count === 0) {
      console.log('🌱 Seeding Thamizhini Women and Accessories products...');

      const sampleProducts = [
        // Women's Collection
        [
          'Traditional Kanchipuram Pure Silk Saree',
          'Exquisite handwoven pure mulberry silk saree featuring intricate golden zari border and matching blouse piece.',
          5999.00,
          7999.00,
          'Women',
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&auto=format&fit=crop&q=80',
          15,
          4.9,
          1
        ],
        [
          'Pastel Chikankari Embroidered Kurti Set',
          'Breathable georgette kurti set embellished with authentic Lucknowi thread embroidery and palazzo.',
          2499.00,
          3299.00,
          'Women',
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=700&auto=format&fit=crop&q=80',
          25,
          4.8,
          1
        ],
        [
          'Floral Bohemian Silk Maxi Dress',
          'Graceful flowing wrap silhouette adorned with subtle botanical motifs and flutter sleeves.',
          2899.00,
          3999.00,
          'Women',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=700&auto=format&fit=crop&q=80',
          18,
          4.9,
          1
        ],
        [
          'Double-Breasted Minimalist Trench Coat',
          'Timeless outerwear staple featuring storm flaps, tortoiseshell buttons, and a cinching waist belt.',
          4499.00,
          5999.00,
          'Women',
          'https://images.unsplash.com/photo-1544441893-675973e31985?w=700&auto=format&fit=crop&q=80',
          12,
          4.9,
          1
        ],
        [
          'Elegance Satin V-Neck Blouse',
          'Lustrous champagne satin blouse with pleated cuffs and a relaxed, sophisticated drape.',
          1499.00,
          1999.00,
          'Women',
          'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=700&auto=format&fit=crop&q=80',
          30,
          4.6,
          0
        ],
        [
          'High-Waist Tailored Wide Leg Trousers',
          'Chic pleated trousers with a flattering high waist, deep slant pockets, and wide flared hem.',
          1899.00,
          2599.00,
          'Women',
          'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=700&auto=format&fit=crop&q=80',
          25,
          4.7,
          0
        ],

        // Accessories Collection
        [
          'Handcrafted Rose Gold Kundan Jewellery Set',
          'Regal choker necklace adorned with uncut polki kundan stones, pearls, and matching dangling earrings.',
          1899.00,
          2699.00,
          'Accessories',
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=700&auto=format&fit=crop&q=80',
          20,
          4.9,
          1
        ],
        [
          'Embroidered Potli Velvet Evening Bag',
          'Luxurious velvet potli pouch with handcrafted zardozi embroidery and beaded drawstring tassel.',
          1299.00,
          1799.00,
          'Accessories',
          'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=700&auto=format&fit=crop&q=80',
          30,
          4.7,
          0
        ],
        [
          'Vintage Leather Crossbody Bag',
          'Handcrafted genuine full-grain leather saddle bag with brass buckle hardware and adjustable strap.',
          2999.00,
          4299.00,
          'Accessories',
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&auto=format&fit=crop&q=80',
          14,
          4.8,
          1
        ],
        [
          'Chronograph Minimalist Rose Gold Watch',
          'Sleek matte stainless steel case with scratch-resistant sapphire crystal and Japanese quartz movement.',
          2499.00,
          3499.00,
          'Accessories',
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80',
          20,
          4.8,
          1
        ],
        [
          'Designer Polarized Cat-Eye Sunglasses',
          'Ultra-lightweight frame with 100% UV400 protective polarized gradient lenses.',
          1199.00,
          1699.00,
          'Accessories',
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=700&auto=format&fit=crop&q=80',
          40,
          4.5,
          0
        ],
        [
          'Handmade Full-Grain Leather Waist Belt',
          'Durable vegetable-tanned genuine leather belt with antique nickel brushed buckle.',
          899.00,
          1299.00,
          'Accessories',
          'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=700&auto=format&fit=crop&q=80',
          50,
          4.6,
          0
        ]
      ];

      const insertSql = `
        INSERT INTO products (name, description, price, original_price, category, image_url, stock, rating, is_featured)
        VALUES ?
      `;

      await connection.query(insertSql, [sampleProducts]);
      console.log(`   -> Successfully seeded ${sampleProducts.length} Thamizhini products!`);
    }

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initDatabase;
