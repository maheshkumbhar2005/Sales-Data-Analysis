from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

from .sales_analysis import add_profit_metrics

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "sql" / "schema.sql"
DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent.parent / "output" / "sales.db"


def create_sales_database(
    df: pd.DataFrame, database_path: Path = DEFAULT_DATABASE_PATH
) -> Path:
    """Create or replace the SQLite sales database from validated sales data."""
    if df.empty:
        raise ValueError("Cannot create a sales database from empty data.")

    enriched = add_profit_metrics(df)
    database_path.parent.mkdir(exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        connection.execute("DELETE FROM sales")
        rows = []
        for transaction_id, row in enumerate(
            enriched.rename(
                columns={"Estimated_Margin_%": "Estimated_Margin_"}
            ).itertuples(index=False),
            start=1,
        ):
            rows.append(
                (
                    transaction_id,
                    getattr(row, "Order_ID", f"ORD-{transaction_id:05d}"),
                    getattr(row, "Customer_ID", ""),
                    getattr(row, "Customer_Name", ""),
                    row.Date.isoformat(),
                    row.Product,
                    row.Category,
                    row.Region,
                    int(row.Units_Sold),
                    float(row.Unit_Price),
                    float(row.Total_Sales),
                    float(row.Cost_Price),
                    float(row.Estimated_Cost),
                    float(row.Estimated_Profit),
                    float(row.Estimated_Margin_),
                    float(row.Discount),
                    getattr(row, "Salesperson", ""),
                    getattr(row, "Payment_Method", ""),
                    getattr(row, "Customer_Type", "Regular"),
                    float(getattr(row, "Shipping_Cost", 0)),
                    getattr(row, "Order_Status", "Delivered"),
                )
            )
        connection.executemany(
            """
            INSERT INTO sales (
                transaction_id, order_id, customer_id, customer_name,
                sale_date, product, category, region,
                units_sold, unit_price, total_sales, cost_price,
                estimated_cost, estimated_profit, estimated_margin, discount,
                salesperson, payment_method, customer_type,
                shipping_cost, order_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
    return database_path


def query_monthly_sales(database_path: Path = DEFAULT_DATABASE_PATH) -> pd.DataFrame:
    """Return monthly revenue, units, and profit from the SQLite database."""
    with sqlite3.connect(database_path) as connection:
        return pd.read_sql_query(
            """
            SELECT strftime('%Y-%m', sale_date) AS month,
                   SUM(total_sales) AS revenue,
                   SUM(units_sold) AS units_sold,
                   SUM(estimated_profit) AS estimated_profit
            FROM sales
            GROUP BY month
            ORDER BY month
            """,
            connection,
        )


def query_category_sales(database_path: Path = DEFAULT_DATABASE_PATH) -> pd.DataFrame:
    """Return revenue and profit grouped by category."""
    with sqlite3.connect(database_path) as connection:
        return pd.read_sql_query(
            """
            SELECT category,
                   SUM(total_sales) AS revenue,
                   SUM(estimated_profit) AS estimated_profit
            FROM sales
            GROUP BY category
            ORDER BY revenue DESC
            """,
            connection,
        )


def query_salesperson_sales(database_path: Path = DEFAULT_DATABASE_PATH) -> pd.DataFrame:
    """Return revenue and profit grouped by salesperson."""
    with sqlite3.connect(database_path) as connection:
        return pd.read_sql_query(
            """
            SELECT salesperson,
                   SUM(total_sales) AS revenue,
                   SUM(units_sold) AS units_sold,
                   SUM(estimated_profit) AS estimated_profit,
                   COUNT(*) AS order_count
            FROM sales
            GROUP BY salesperson
            ORDER BY revenue DESC
            """,
            connection,
        )


def query_order_status(database_path: Path = DEFAULT_DATABASE_PATH) -> pd.DataFrame:
    """Return order counts grouped by order status."""
    with sqlite3.connect(database_path) as connection:
        return pd.read_sql_query(
            """
            SELECT order_status,
                   COUNT(*) AS order_count,
                   SUM(total_sales) AS revenue
            FROM sales
            GROUP BY order_status
            ORDER BY order_count DESC
            """,
            connection,
        )
