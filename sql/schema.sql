CREATE TABLE IF NOT EXISTS sales (
    transaction_id INTEGER PRIMARY KEY,
    order_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
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
    discount REAL NOT NULL CHECK (discount BETWEEN 0 AND 100),
    salesperson TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('Regular', 'Premium', 'Enterprise')),
    shipping_cost REAL NOT NULL CHECK (shipping_cost >= 0),
    order_status TEXT NOT NULL CHECK (order_status IN ('Delivered', 'Shipped', 'Processing', 'Returned', 'Cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales (category);
CREATE INDEX IF NOT EXISTS idx_sales_region ON sales (region);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales (salesperson);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_status ON sales (order_status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales (payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_customer_type ON sales (customer_type);
