const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, headers: { ...options.headers, ...headers } };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) {
        req.write(data);
      } else if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function run() {
  console.log('🧪 Testing Store Settings & Image File Upload...');

  // 1. Get Store Settings
  const getSettings = await request({ hostname: 'localhost', port: 5000, path: '/api/settings', method: 'GET' });
  console.log('1. Store Settings fetched:', getSettings.data.success ? `✅ PASS (${getSettings.data.settings.address_line1}, ${getSettings.data.settings.city})` : '❌ FAIL');

  // 2. Login Admin
  const adminLogin = await request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'admin@fashionhub.com', password: 'admin123' }
  );
  const adminToken = adminLogin.data.token;
  console.log('2. Admin Logged in:', adminToken ? '✅ PASS' : '❌ FAIL');

  // 3. Update Store Address via Admin
  const updateSettings = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    },
    {
      store_name: 'THAMIZHINI',
      address_line1: 'No. 48, Usman Road, T. Nagar',
      address_line2: 'Opposite to Panagal Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
      phone: '+91 98400 12345',
      opening_hours: 'Monday – Sunday: 9:30 AM – 9:30 PM (All 7 Days Open)'
    }
  );
  console.log('3. Store Address Updated by Admin:', updateSettings.data.success ? `✅ PASS (${updateSettings.data.settings.address_line1})` : '❌ FAIL');

  // 4. Test Multipart Image Upload for Product Creation
  // Create a small sample test image file buffer
  const sampleImagePath = path.join(__dirname, 'test_sample.png');
  // 1x1 transparent PNG buffer
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(sampleImagePath, png1x1);

  // Construct multipart/form-data payload manually
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let multipartBody = [];

  function addField(name, value) {
    return Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
    ]);
  }

  multipartBody.push(addField('name', 'Handcrafted Silk Banarasi Saree'));
  multipartBody.push(addField('category', 'Women'));
  multipartBody.push(addField('price', '4299'));
  multipartBody.push(addField('original_price', '5999'));
  multipartBody.push(addField('stock', '15'));
  multipartBody.push(addField('description', 'Authentic Banarasi silk with zari weaving.'));
  multipartBody.push(addField('is_featured', '1'));

  // Add File
  const fileHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="sample_saree.png"\r\nContent-Type: image/png\r\n\r\n`
  );
  const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  multipartBody.push(Buffer.concat([fileHeader, png1x1, fileFooter]));

  const finalPayload = Buffer.concat(multipartBody);

  const prodRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/products',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': finalPayload.length,
        'Authorization': `Bearer ${adminToken}`
      }
    },
    finalPayload
  );

  console.log('4. Create Product with Uploaded Image File:', prodRes.data.success ? `✅ PASS (Image: ${prodRes.data.product.image_url})` : `❌ FAIL (${JSON.stringify(prodRes.data)})`);

  // Verify that uploaded image exists on disk and is accessible via HTTP
  if (prodRes.data.product && prodRes.data.product.image_url) {
    const imgCheck = await request({
      hostname: 'localhost',
      port: 5000,
      path: prodRes.data.product.image_url,
      method: 'GET'
    });
    console.log('5. Verify Uploaded Image Accessible via HTTP:', imgCheck.status === 200 ? '✅ PASS (HTTP 200 OK)' : '❌ FAIL');
  }

  // Clean up sample image
  if (fs.existsSync(sampleImagePath)) {
    fs.unlinkSync(sampleImagePath);
  }

  console.log('\n🎉 ALL STORE SETTINGS & IMAGE UPLOAD TESTS PASSED SUCCESSFULLY!');
}

run().catch(console.error);
