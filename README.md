# 🌸 THAMIZHINI - Women's Fashion & Luxury Accessories

ஒரு முழுமையான, நவீன மற்றும் நேர்த்தியான **Women's Fashion & Luxury Accessories E-Commerce Website** (Full-Stack). இதில் **Node.js, Express, MySQL, Vanilla JavaScript, HTML5 & Modern CSS** பயன்படுத்தப்பட்டுள்ளது.

---

## 🌟 திட்டத்தின் முக்கிய அம்சங்கள் (Key Features)

1. **Modern Professional Home Page:**
   - கவர்ச்சிகரமான Hero Banner, Announcement Bar, மற்றும் Responsive Sticky Header.
   - 2 பிரம்மாண்டமான Category Spotlights (**Women's Couture** & **Luxury Accessories**).
2. **Women's & Accessories Products:**
   - காஞ்சிபுரம் பட்டுப் புடவைகள் (Kanchipuram Silk Sarees), சிக்கன்காரி குர்திகள் (Chikankari Kurtis), Western Dresses, மற்றும் குந்தன் நெக்லஸ், வெல்வெட் பொட்லி பேக்குகள் (Handcrafted Accessories).
   - MRP விலை, சலுகை விலை (Discount %), Stock விவரம் மற்றும் Customer Reviews/Ratings.
3. **Product Search & Category Filter:**
   - புடவை, குர்தி, நகைகள் எனப் பெயர் மற்றும் விவரங்களின் அடிப்படையில் Instant Live Search.
   - Category Pills (All, Women's Wear, Accessories).
   - விலை (Low to High, High to Low) மற்றும் Newest Arrivals / Rating அடிப்படையில் Sort செய்யும் வசதி.
4. **Add to Cart & Quantity Management:**
   - பக்கவாட்டில் திறக்கும் Interactive Cart Drawer (Slide-over drawer).
   - Quantity (+ / -) கூட்டுதல் மற்றும் குறைத்தல், Item removal.
   - Automatic Subtotal, Free Shipping Tracker (₹1,999-க்கு மேல் Free Delivery) மற்றும் Grand Total கணக்கீடு.
5. **Authentication (Register, Login, Logout):**
   - JWT (JSON Web Token) மற்றும் `bcryptjs` பாஸ்வேர்ட் என்க்ரிப்ஷன்.
   - Customer மற்றும் Admin இருவருக்கும் தனித்தனி roles.
   - டெஸ்டிங் செய்ய வசதியாக **One-Click Demo Login** வசதி.
6. **Place Order & Order History:**
   - முழுமையான Delivery Address & Mobile Number உடன் கூடிய Secure Checkout.
   - Cash on Delivery (COD) & Instant Online Demo Options.
   - வாடிக்கையாளர்கள் தங்களின் அனைத்து முந்தைய ஆர்டர்களையும் (Order History) பார்க்க முடியும்.
7. **Admin Product, Image Upload & Order Management:**
   - **Computer-ல் இருந்து நேரடியாக Photo Upload செய்யும் வசதி (Direct File Upload):** லிங்க் தட்டச்சு செய்ய வேண்டிய அவசியமின்றி, கணினியில் உள்ள புகைப்படத்தைத் தேர்ந்தெடுத்து (PNG, JPG, WEBP) உடனடியாகப் பதிவேற்றலாம் (Multer Integration & Live Preview).
   - **Product CRUD:** புதிய உடைகள்/பொருட்களைச் சேர்த்தல், திருத்துதல் (Edit) மற்றும் நீக்குதல் (Delete).
   - **Order Fulfillment:** வாடிக்கையாளர் ஆர்டர்களின் நிலையை (Pending ➔ Processing ➔ Shipped ➔ Delivered ➔ Cancelled) ஒரே கிளிக்கில் மாற்றுதல்.
8. **Shop Address & Store Details Management:**
   - கடை முகவரி, போன் நம்பர், பணி நேரம் (Timings), மற்றும் Google Maps லிங்க் ஆகியவற்றை அட்மின் கண்ட்ரோல் பேனலில் உள்ள **Shop Address & Contact** டேப் மூலம் எப்போது வேண்டுமானாலும் மாற்றிக்கொள்ளலாம்.
   - மாற்றிய முகவரி இணையதள முகப்புப் பக்கத்திலும் (Boutique Store Section) மற்றும் Footer-லும் உடனே பிரதிபலிக்கும்.
9. **MySQL Database:**
   - Foreign Key உறவுகளுடன் கூடிய பாதுகாப்பான அட்டவணைகள் (`users`, `products`, `orders`, `order_items`, `store_settings`).

---

## 📁 திட்டத்தின் கோப்பு கட்டமைப்பு (Folder Structure)

```text
e-commes web/
│
├── config/
│   └── db.js                 # MySQL Pool Connection & Error Handling
│
├── controllers/
│   ├── authController.js     # Register, Login & User Profile logic
│   ├── productController.js  # Catalog, Filter, Search, Admin CRUD (Women & Accessories)
│   └── orderController.js    # Place Order, My Orders, Admin Status update
│
├── middleware/
│   └── authMiddleware.js     # JWT Token Verification & Admin Role Check
│
├── routes/
│   ├── authRoutes.js         # /api/auth endpoints
│   ├── productRoutes.js      # /api/products endpoints
│   ├── orderRoutes.js        # /api/orders endpoints
│   └── adminRoutes.js        # /api/admin endpoints
│
├── scripts/
│   ├── initDb.js             # தானியங்கி MySQL Database உருவாக்கும் ஸ்கிரிப்ட்
│   ├── schema.sql            # நேரடி SQL Schema கோப்பு
│   └── test_e2e.js           # 10 தானியங்கி API & E2E டெஸ்டிங் ஸ்கிரிப்ட்
│
├── public/                   # Frontend Assets (HTML, CSS, JS)
│   ├── index.html            # THAMIZHINI வாடிக்கையாளர் Storefront
│   ├── admin.html            # Admin Management Panel
│   ├── css/
│   │   ├── style.css         # Modern Storefront Design & Animations
│   │   └── admin.css         # Admin Dashboard Styling
│   └── js/
│       ├── app.js            # Storefront Dynamic Logic (Cart, Search, Filter, Auth)
│       └── admin.js          # Admin Dashboard Logic (CRUD, Order status)
│
├── .env                      # Database & Port Settings
├── .env.example              # Example Configuration
├── package.json              # Dependencies & Scripts
├── README.md                 # Setup & Testing Guide
└── server.js                 # Express Application Entry Point
```

---

## 🛠️ கணினியில் நிறுவுதல் (Setup Instructions)

### 1. Database-ஐ உருவாக்கவும் (Initialization)
```bash
npm run init-db
```

### 2. இணையதளத்தை இயக்கவும் (Start Server)
```bash
npm start
```

இப்போது உங்கள் பிரவுசரில் திறக்கவும்:
- 🌸 **Storefront:** [http://localhost:5000](http://localhost:5000)
- 🛠️ **Admin Dashboard:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 🔑 மாதிரி கணக்குகள் (Demo Credentials)

| Role | Email | Password | அனுமதிகள் |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fashionhub.com` | `admin123` | புதிய பொருட்களைச் சேர்த்தல், நீக்குதல், ஆர்டர் ஸ்டேட்டஸ் மாற்றுதல் |
| **Customer** | `user@fashionhub.com` | `user123` | பொருட்களைப் பார்த்தல், கார்ட்டில் சேர்த்தல், ஆர்டர் செய்தல் |
