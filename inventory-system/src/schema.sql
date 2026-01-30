CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  barcode_id TEXT UNIQUE NOT NULL,
  card_name TEXT,
  set_name TEXT,
  series TEXT,
  game TEXT DEFAULT 'pokemon',
  card_type TEXT DEFAULT 'raw',
  cert_number TEXT, 
  card_number TEXT,
  condition TEXT, 
  grade TEXT,
  grade_qualifier TEXT,
  purchase_price NUMERIC(10,2),
  purchase_date TIMESTAMP,
  front_label_price NUMERIC(10,2),
  sale_price NUMERIC(10,2),
  sale_date TIMESTAMP,
  status TEXT DEFAULT 'PLANNED',
  image_url TEXT,
  notes TEXT,
  tcg_product_id INTEGER
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id),
  stripe_payment_intent_id TEXT,
  sale_price NUMERIC(10,2),
  fees NUMERIC(10,2),
  net_amount NUMERIC(10,2),
  sale_date TIMESTAMP,
  payment_method TEXT
);