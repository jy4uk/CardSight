# CardSight Architecture Documentation

**Last Updated:** February 3, 2026  
**Version:** 1.0

---

## System Overview

CardSight is a full-stack trading card inventory management system with multi-user support, real-time inventory tracking, sales processing, trade management, and business analytics.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite)                                               │
│  - Components (Inventory, Trades, Insights, Settings)           │
│  - Context (Auth, Cart, Theme)                                  │
│  - API Client (Axios + JWT interceptors)                        │
│  - State Management (React Hooks + Context)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS/REST API
                     │ JWT Authentication
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express Server                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Middleware Stack                                         │   │
│  │ - CORS (multi-origin support)                           │   │
│  │ - Cookie Parser (refresh tokens)                        │   │
│  │ - JSON Body Parser                                      │   │
│  │ - JWT Authentication (authenticateToken)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Route Handlers                                           │   │
│  │ - /api/auth/* (login, signup, refresh, logout)          │   │
│  │ - /api/inventory/* (CRUD, bulk upload, barcode scan)    │   │
│  │ - /api/trades/* (create, list, delete)                  │   │
│  │ - /api/saved-deals/* (CRUD, validate)                   │   │
│  │ - /api/insights/* (metrics, card shows)                 │   │
│  │ - /api/user/settings (profile update)                   │   │
│  │ - /api/user/account (delete account)                    │   │
│  │ - /api/transactions/* (sales, Stripe integration)       │   │
│  │ - /api/users/* (beta codes, user management)            │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │ PostgreSQL Protocol
                     │ Connection Pool
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Core Tables                                              │   │
│  │ - users (auth, profiles)                                │   │
│  │ - beta_codes (signup validation)                        │   │
│  │ - inventory (cards, status, pricing)                    │   │
│  │ - trades (trade records)                                │   │
│  │ - trade_items (items in trades)                         │   │
│  │ - saved_deals (pending deals)                           │   │
│  │ - transactions (sales records)                          │   │
│  │ - card_shows (event tracking)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Indexes (Performance)                                    │   │
│  │ - user_id (all tables with user data)                   │   │
│  │ - barcode_id (inventory lookups)                        │   │
│  │ - status (inventory filtering)                          │   │
│  │ - created_at (time-based queries)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend (React)

```
/web/src/
├── components/
│   ├── AccountSettings.jsx          # User profile & bulk upload
│   ├── AddItemModal.jsx             # Add inventory item
│   ├── InventoryCard.jsx            # Single card display
│   ├── Insights.jsx                 # Business analytics
│   ├── IntakePage.jsx               # Purchase/trade intake
│   ├── TradeHistory.jsx             # Trade management
│   ├── PendingBarcodes.jsx          # Barcode assignment
│   ├── BarcodeGeneratorPage.jsx    # Barcode generation
│   ├── CartDrawer.jsx               # Shopping cart
│   ├── LoginModal.jsx               # Authentication
│   ├── SignupModal.jsx              # User registration
│   └── modals/
│       └── TradeModal.jsx           # Trade creation
├── context/
│   ├── AuthContextNew.jsx           # Auth state & JWT management
│   ├── CartContext.jsx              # Shopping cart state
│   └── ThemeContext.jsx             # Dark/light mode
├── hooks/
│   └── useBarcodeScanner.jsx        # Barcode scanning logic
├── utils/
│   └── apiClient.js                 # Axios instance + interceptors
└── api.js                           # API function wrappers
```

### Backend (Node.js/Express)

```
/inventory-system/src/
├── routes/
│   ├── auth-new.js                  # Authentication endpoints
│   ├── inventory.js                 # Inventory CRUD + bulk upload
│   ├── trades.js                    # Trade management
│   ├── savedDeals.js                # Saved deals CRUD
│   ├── insights.js                  # Analytics & metrics
│   ├── settings.js                  # User profile & account deletion
│   ├── transactions.js              # Sales & Stripe integration
│   ├── users.js                     # User management & beta codes
│   └── index.js                     # Route aggregator
├── services/
│   ├── db.js                        # PostgreSQL connection pool
│   └── userService.js               # User data access layer
├── middleware/
│   └── auth.js                      # JWT verification middleware
├── auth/
│   └── jwt-utils.js                 # Token generation & validation
├── config/
│   └── index.js                     # Environment configuration
├── migrations/
│   ├── add_multiuser_support.sql
│   ├── add_username_column.sql
│   ├── add_beta_codes.sql
│   └── add_card_shows.sql
└── server.js                        # Express app entry point
```

---

## Data Flow Diagrams

### Authentication Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ POST /auth/login             │                              │
     │ {email, password}            │                              │
     ├─────────────────────────────>│                              │
     │                              │ SELECT * FROM users          │
     │                              │ WHERE email = $1             │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │ <user record>                │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │                              │ bcrypt.compare(password)     │
     │                              │                              │
     │                              │ generateAccessToken()        │
     │                              │ generateRefreshToken()       │
     │                              │                              │
     │ Set-Cookie: refreshToken     │                              │
     │ {accessToken, user}          │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │ Store accessToken in memory  │                              │
     │ Store user in AuthContext    │                              │
     │                              │                              │
```

### Inventory Query Flow (with User Isolation)

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ GET /api/inventory           │                              │
     │ Authorization: Bearer <JWT>  │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │ authenticateToken()          │
     │                              │ Extract userId from JWT      │
     │                              │                              │
     │                              │ SELECT * FROM inventory      │
     │                              │ WHERE user_id = $1           │
     │                              │ AND deleted_at IS NULL       │
     │                              │ ORDER BY created_at DESC     │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │ <inventory records>          │
     │                              │<─────────────────────────────┤
     │                              │                              │
     │ {success: true, data: [...]} │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
```

### Bulk Upload Flow

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│ Browser │                    │ Backend │                    │ Database │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ 1. User uploads CSV file     │                              │
     │                              │                              │
     │ 2. PapaParse parses CSV      │                              │
     │    into array of objects     │                              │
     │                              │                              │
     │ POST /api/inventory/bulk     │                              │
     │ {items: [{...}, {...}]}      │                              │
     ├─────────────────────────────>│                              │
     │                              │                              │
     │                              │ authenticateToken()          │
     │                              │ Extract userId               │
     │                              │                              │
     │                              │ For each item:               │
     │                              │   - Validate data            │
     │                              │   - Check barcode unique     │
     │                              │   - Auto-fetch image         │
     │                              │   - INSERT INTO inventory    │
     │                              ├─────────────────────────────>│
     │                              │<─────────────────────────────┤
     │                              │                              │
     │ {success: true,              │                              │
     │  results: {                  │                              │
     │    success: [...],           │                              │
     │    failed: [...]             │                              │
     │  }}                          │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │ 3. Display results to user   │                              │
     │    (success count + errors)  │                              │
     │                              │                              │
```

---

## Database Schema

### Core Tables

```sql
-- Users & Authentication
users
├── id (SERIAL PRIMARY KEY)
├── email (VARCHAR UNIQUE NOT NULL)
├── username (VARCHAR UNIQUE NOT NULL)
├── password_hash (VARCHAR NOT NULL)
├── first_name (VARCHAR)
├── last_name (VARCHAR)
├── token_version (INTEGER DEFAULT 0)
├── beta_code_id (INTEGER REFERENCES beta_codes)
├── created_at (TIMESTAMP DEFAULT NOW())
├── updated_at (TIMESTAMP DEFAULT NOW())
└── last_login (TIMESTAMP)

beta_codes
├── id (SERIAL PRIMARY KEY)
├── code (VARCHAR UNIQUE NOT NULL)
├── is_used (BOOLEAN DEFAULT FALSE)
├── used_by_user_id (INTEGER REFERENCES users)
└── created_at (TIMESTAMP DEFAULT NOW())

-- Inventory Management
inventory
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER REFERENCES users NOT NULL)
├── card_name (VARCHAR NOT NULL)
├── set_name (VARCHAR)
├── card_number (VARCHAR)
├── game (VARCHAR DEFAULT 'pokemon')
├── card_type (VARCHAR DEFAULT 'raw')
├── purchase_price (DECIMAL)
├── front_label_price (DECIMAL NOT NULL)
├── condition (VARCHAR)
├── quantity (INTEGER DEFAULT 1)
├── barcode_id (VARCHAR)
├── cert_number (VARCHAR)
├── grade (VARCHAR)
├── image_url (TEXT)
├── status (VARCHAR DEFAULT 'IN_STOCK')
├── purchase_date (DATE)
├── created_at (TIMESTAMP DEFAULT NOW())
├── updated_at (TIMESTAMP DEFAULT NOW())
└── deleted_at (TIMESTAMP)

-- Trades
trades
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER REFERENCES users NOT NULL)
├── customer_name (VARCHAR)
├── trade_date (DATE)
├── total_trade_in_value (DECIMAL)
├── total_trade_out_value (DECIMAL)
├── cash_difference (DECIMAL)
├── notes (TEXT)
└── created_at (TIMESTAMP DEFAULT NOW())

trade_items
├── id (SERIAL PRIMARY KEY)
├── trade_id (INTEGER REFERENCES trades)
├── inventory_id (INTEGER REFERENCES inventory)
├── direction (VARCHAR) -- 'IN' or 'OUT'
├── item_value (DECIMAL)
└── created_at (TIMESTAMP DEFAULT NOW())

-- Saved Deals
saved_deals
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER REFERENCES users NOT NULL)
├── deal_type (VARCHAR) -- 'purchase', 'trade', 'sale'
├── customer_name (VARCHAR)
├── customer_note (TEXT)
├── deal_data (JSONB)
├── total_items (INTEGER)
├── total_value (DECIMAL)
├── trade_out_inventory_ids (INTEGER[])
├── show_id (INTEGER REFERENCES card_shows)
├── expires_at (TIMESTAMP)
└── created_at (TIMESTAMP DEFAULT NOW())

-- Sales & Transactions
transactions
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER REFERENCES users NOT NULL)
├── inventory_id (INTEGER REFERENCES inventory)
├── sale_price (DECIMAL NOT NULL)
├── payment_method (VARCHAR)
├── stripe_payment_intent_id (VARCHAR)
├── customer_email (VARCHAR)
├── sale_date (TIMESTAMP DEFAULT NOW())
└── created_at (TIMESTAMP DEFAULT NOW())

-- Card Shows
card_shows
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER REFERENCES users NOT NULL)
├── show_name (VARCHAR NOT NULL)
├── location (VARCHAR)
├── show_date (DATE)
└── created_at (TIMESTAMP DEFAULT NOW())
```

### Key Indexes

```sql
-- User isolation (critical for multi-user queries)
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_saved_deals_user_id ON saved_deals(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_card_shows_user_id ON card_shows(user_id);

-- Performance indexes
CREATE INDEX idx_inventory_barcode ON inventory(barcode_id);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_created_at ON inventory(created_at DESC);
CREATE INDEX idx_inventory_user_status ON inventory(user_id, status);

-- Unique constraints
CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
CREATE UNIQUE INDEX idx_users_username ON users(LOWER(username));
CREATE UNIQUE INDEX idx_beta_codes_code ON beta_codes(code);
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────┐
│ JWT Token Strategy                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Access Token (short-lived, 15 minutes)                     │
│ ├── Stored in memory (React state)                         │
│ ├── Sent in Authorization header                           │
│ ├── Contains: userId, email                                │
│ └── Used for API authentication                            │
│                                                             │
│ Refresh Token (long-lived, 7-30 days)                      │
│ ├── Stored in httpOnly cookie                              │
│ ├── SameSite=None (production), Lax (development)          │
│ ├── Secure flag in production                              │
│ ├── Contains: userId, email, tokenVersion                  │
│ └── Used to generate new access tokens                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Multi-User Data Isolation                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. authenticateToken middleware extracts userId from JWT   │
│ 2. All queries filter by user_id from req.user.userId      │
│ 3. No user can access another user's data                  │
│ 4. Bulk operations auto-assign user_id                     │
│                                                             │
│ Example:                                                    │
│   SELECT * FROM inventory                                   │
│   WHERE user_id = $1  -- From JWT, not request body        │
│   AND deleted_at IS NULL                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Password Security                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ - Bcrypt hashing (10 rounds)                               │
│ - Passwords never stored in plain text                     │
│ - Password required for account deletion                   │
│ - Token version for forced logout                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### CORS Configuration

```javascript
// Multi-origin support for production + development
const allowedOrigins = [
  'http://localhost:5173',           // Local development
  'https://card-pilot.vercel.app',   // Production frontend
  process.env.FRONTEND_URL           // Environment-specific
].filter(Boolean);

// Credentials enabled for cookie-based auth
corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

---

## API Endpoints Reference

### Authentication (`/api/auth/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | ❌ | Create new user account |
| POST | `/auth/login` | ❌ | Login with email/username + password |
| POST | `/auth/refresh` | 🍪 | Refresh access token using cookie |
| POST | `/auth/logout` | ✅ | Invalidate refresh token |
| POST | `/auth/forgot-password` | ❌ | Request password reset |
| POST | `/auth/reset-password` | ❌ | Reset password with token |

### Inventory (`/api/inventory/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/inventory` | ✅ | List user's inventory |
| POST | `/inventory` | ✅ | Add single inventory item |
| POST | `/inventory/bulk` | ✅ | Bulk add inventory (max 1000) |
| PATCH | `/inventory/:id` | ✅ | Update inventory item |
| DELETE | `/inventory/:id` | ✅ | Delete inventory item |
| GET | `/inventory/barcode/:barcode` | ✅ | Find item by barcode |
| GET | `/inventory/public` | ❌ | View public inventory by username |

### Trades (`/api/trades/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/trades` | ✅ | List user's trades |
| POST | `/trades` | ✅ | Create new trade |
| DELETE | `/trades/:id` | ✅ | Delete trade |

### Saved Deals (`/api/saved-deals/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/saved-deals` | ✅ | List user's saved deals |
| POST | `/saved-deals` | ✅ | Create saved deal |
| PUT | `/saved-deals/:id` | ✅ | Update saved deal |
| DELETE | `/saved-deals/:id` | ✅ | Delete saved deal |
| GET | `/saved-deals/:id/validate` | ✅ | Validate deal availability |

### Insights (`/api/insights/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/insights` | ✅ | Get business metrics |
| GET | `/insights/card-shows` | ✅ | List card shows |
| POST | `/insights/card-shows` | ✅ | Create card show |
| DELETE | `/insights/card-shows/:id` | ✅ | Delete card show |

### User Settings (`/api/user/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/user/settings` | ✅ | Update profile (name, email, username) |
| DELETE | `/user/account` | ✅ | Delete account (requires password) |

### Transactions (`/api/transactions/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/transactions/sell` | ✅ | Direct sale (cash/card) |
| POST | `/transactions/stripe/create-payment-intent` | ✅ | Create Stripe payment |
| POST | `/transactions/stripe/process-payment` | ✅ | Process Stripe payment |
| GET | `/transactions/stripe/readers` | ✅ | List Stripe card readers |

### Users (`/api/users/*`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users/validate-beta-code` | ❌ | Validate beta code for signup |

**Legend:**
- ✅ = JWT required (Authorization: Bearer token)
- 🍪 = Cookie required (refreshToken)
- ❌ = No auth required

---

## External Integrations

### Stripe Payment Processing

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Browser │                    │ Backend │                    │ Stripe  │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ POST /stripe/create-payment  │                              │
     ├─────────────────────────────>│                              │
     │                              │ stripe.paymentIntents.create │
     │                              ├─────────────────────────────>│
     │                              │                              │
     │                              │ <payment intent>             │
     │                              │<─────────────────────────────┤
     │ {clientSecret}               │                              │
     │<─────────────────────────────┤                              │
     │                              │                              │
     │ Stripe.js confirms payment   │                              │
     ├──────────────────────────────────────────────────────────>│
     │                              │                              │
     │ POST /stripe/process-payment │                              │
     ├─────────────────────────────>│                              │
     │                              │ Update inventory status      │
     │                              │ Create transaction record    │
     │                              │                              │
```

### Card Image API (Pokemon TCG API)

```
Backend auto-fetches card images during inventory creation:
- Searches by card name + set name
- Stores image URL in inventory.image_url
- Falls back to placeholder if not found
```

---

## Deployment Architecture

### Production Setup

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend (Vercel)                                            │
│ - URL: https://card-pilot.vercel.app                        │
│ - Auto-deploy from main branch                              │
│ - Environment: VITE_API_URL                                 │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS
                     │
┌────────────────────▼─────────────────────────────────────────┐
│ Backend (Render/Railway/Heroku)                             │
│ - Node.js Express server                                     │
│ - Environment variables:                                     │
│   - DATABASE_URL (PostgreSQL connection)                    │
│   - JWT_SECRET                                              │
│   - REFRESH_TOKEN_SECRET                                    │
│   - STRIPE_SECRET_KEY                                       │
│   - FRONTEND_URL                                            │
│   - NODE_ENV=production                                     │
└────────────────────┬─────────────────────────────────────────┘
                     │ PostgreSQL Protocol
                     │
┌────────────────────▼─────────────────────────────────────────┐
│ Database (Render/Supabase/Railway)                          │
│ - PostgreSQL 14+                                             │
│ - Connection pooling enabled                                 │
│ - Automated backups                                          │
└──────────────────────────────────────────────────────────────┘
```

### Environment Variables

**Backend:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<random-secret>
REFRESH_TOKEN_SECRET=<random-secret>
STRIPE_SECRET_KEY=sk_live_...
FRONTEND_URL=https://card-pilot.vercel.app
NODE_ENV=production
PORT=3000
```

**Frontend:**
```bash
VITE_API_URL=https://api.cardsight.com
```

---

## Performance Optimizations

### Current Implementations

1. **Database Connection Pooling**
   - pg.Pool manages connections
   - Reuses connections across requests
   - Prevents connection exhaustion

2. **User Data Isolation**
   - All queries filtered by user_id
   - Indexed on user_id for fast lookups
   - Prevents data leakage

3. **JWT Token Strategy**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7-30 days)
   - Reduces database lookups

4. **Bulk Operations**
   - Bulk inventory upload (up to 1000 items)
   - Single transaction for multiple inserts
   - Detailed success/failure reporting

5. **Image Auto-Fetch**
   - Automatic card image retrieval
   - Cached in database (image_url)
   - No repeated API calls

### Recommended Future Optimizations

1. **Pagination**
   - Add limit/offset to list endpoints
   - Default: 50 items, max: 100
   - Reduce data transfer

2. **Caching**
   - Redis for session storage
   - Cache frequently accessed data
   - 5-minute TTL for inventory counts

3. **Database Indexes**
   - Composite indexes on (user_id, status, created_at)
   - Full-text search on card_name
   - Partial indexes for active records

4. **API Response Optimization**
   - Include related data in single query (JOINs)
   - SELECT only needed columns
   - Compress responses (gzip)

5. **Frontend Optimization**
   - React Query for caching
   - Infinite scroll for lists
   - Debounced search (300ms)
   - Optimistic UI updates

---

## Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **State Management:** React Context + Hooks
- **Notifications:** react-hot-toast
- **CSV Parsing:** papaparse
- **Routing:** React Router (if applicable)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM/Query:** Raw SQL via pg
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Payment Processing:** Stripe
- **CORS:** cors middleware
- **Cookie Parsing:** cookie-parser

### DevOps
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Render/Railway/Heroku
- **Database Hosting:** Render/Supabase/Railway
- **Version Control:** Git
- **CI/CD:** Auto-deploy on push to main

---

## Key Features

### Multi-User Support
- ✅ JWT-based authentication
- ✅ User registration with beta codes
- ✅ Complete data isolation per user
- ✅ Public profile viewing (read-only)

### Inventory Management
- ✅ Add/edit/delete inventory items
- ✅ Barcode scanning and assignment
- ✅ Bulk CSV upload (up to 1000 items)
- ✅ Auto-fetch card images
- ✅ Status tracking (IN_STOCK, SOLD, TRADED, etc.)
- ✅ Pending barcode assignment

### Sales & Transactions
- ✅ Direct sales (cash/card)
- ✅ Stripe payment integration
- ✅ Transaction history
- ✅ Shopping cart system

### Trade Management
- ✅ Create trades (items in/out)
- ✅ Track trade values
- ✅ Trade history
- ✅ Saved deals (pending trades)

### Business Insights
- ✅ Inventory metrics (total value, count, avg price)
- ✅ Sales metrics (revenue, profit)
- ✅ Trade metrics
- ✅ Recent transactions
- ✅ Card show tracking
- ✅ Time-range filtering (7d, 30d, 90d, 1y, all)

### User Settings
- ✅ Update profile (name, email, username)
- ✅ Bulk inventory upload
- ✅ Account deletion (with password confirmation)
- ✅ Toast notifications for all actions

### UI/UX
- ✅ Dark mode support
- ✅ Responsive design (mobile/desktop)
- ✅ Mobile bottom navigation
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling

---

## Security Considerations

### Implemented
- ✅ JWT authentication on all protected routes
- ✅ Password hashing with bcrypt
- ✅ HttpOnly cookies for refresh tokens
- ✅ CORS with credential support
- ✅ User data isolation (user_id filtering)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Password confirmation for account deletion
- ✅ Token version for forced logout
- ✅ Input validation on all endpoints

### Recommended
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] SQL query logging (production)
- [ ] Security headers (helmet.js)
- [ ] API request logging
- [ ] Automated security scanning

---

## Maintenance Notes

### Database Migrations
- Located in `/inventory-system/src/migrations/`
- Run via `node src/migrate.js`
- Always include rollback logic
- Test on staging before production

### Adding New Features
1. Create backend route in `/inventory-system/src/routes/`
2. Add authenticateToken middleware
3. Filter queries by user_id
4. Create frontend component in `/web/src/components/`
5. Add API call to `/web/src/api.js`
6. Update this architecture document

### Updating Dependencies
```bash
# Backend
cd inventory-system && npm update

# Frontend
cd web && npm update
```

### Monitoring
- Check database connection pool usage
- Monitor API response times
- Track error rates
- Review user growth vs database size

---

## Changelog

### Version 1.0 (February 3, 2026)
- Initial architecture documentation
- Multi-user authentication system
- Inventory management with bulk upload
- Trade and saved deals system
- Business insights and analytics
- Account settings with profile management
- Stripe payment integration
- Dark mode support
- Mobile-responsive design

---

**Document Maintained By:** Cascade AI  
**Review Frequency:** After major feature additions  
**Next Review:** After next significant architectural change
