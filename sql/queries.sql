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
