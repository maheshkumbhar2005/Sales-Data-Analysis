-- Monthly performance
SELECT
    strftime('%Y-%m', sale_date) AS month,
    SUM(total_sales) AS revenue,
    SUM(units_sold) AS units_sold,
    SUM(estimated_profit) AS estimated_profit
FROM sales
GROUP BY month
ORDER BY month;

-- Category performance
SELECT
    category,
    SUM(total_sales) AS revenue,
    SUM(estimated_profit) AS estimated_profit
FROM sales
GROUP BY category
ORDER BY revenue DESC;

-- Region performance
SELECT
    region,
    SUM(total_sales) AS revenue,
    SUM(estimated_profit) AS estimated_profit
FROM sales
GROUP BY region
ORDER BY revenue DESC;

-- Salesperson performance
SELECT
    salesperson,
    SUM(total_sales) AS revenue,
    SUM(units_sold) AS units_sold,
    SUM(estimated_profit) AS estimated_profit,
    COUNT(*) AS order_count
FROM sales
GROUP BY salesperson
ORDER BY revenue DESC;

-- Payment method breakdown
SELECT
    payment_method,
    SUM(total_sales) AS revenue,
    COUNT(*) AS order_count
FROM sales
GROUP BY payment_method
ORDER BY revenue DESC;

-- Customer type performance
SELECT
    customer_type,
    SUM(total_sales) AS revenue,
    SUM(units_sold) AS units_sold,
    SUM(estimated_profit) AS estimated_profit,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM sales
GROUP BY customer_type
ORDER BY revenue DESC;

-- Order status distribution
SELECT
    order_status,
    COUNT(*) AS order_count,
    SUM(total_sales) AS revenue
FROM sales
GROUP BY order_status
ORDER BY order_count DESC;

-- Top customers by revenue
SELECT
    customer_id,
    customer_name,
    SUM(total_sales) AS revenue,
    SUM(units_sold) AS units_sold,
    COUNT(*) AS order_count
FROM sales
GROUP BY customer_id, customer_name
ORDER BY revenue DESC
LIMIT 20;

-- Shipping cost analysis by region
SELECT
    region,
    SUM(shipping_cost) AS total_shipping,
    AVG(shipping_cost) AS avg_shipping,
    COUNT(*) AS order_count
FROM sales
GROUP BY region
ORDER BY total_shipping DESC;
