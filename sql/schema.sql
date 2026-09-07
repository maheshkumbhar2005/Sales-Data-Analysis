CREATE TABLE IF NOT EXISTS sales (
    transaction_id INTEGER PRIMARY KEY,
    sale_date TEXT NOT NULL,
    product TEXT NOT NULL,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    units_sold INTEGER NOT NULL CHECK (units_sold >= 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    total_sales REAL NOT NULL CHECK (total_sales >= 0),
    cost_price REAL NOT NULL CHECK (cost_price >= 0),
    estimated_cost REAL NOT NULL CHECK (estimated_cost >= 0),
    estimated_profit REAL NOT NULL,
    estimated_margin REAL NOT NULL,
    discount REAL NOT NULL CHECK (discount BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales (category);
CREATE INDEX IF NOT EXISTS idx_sales_region ON sales (region);
