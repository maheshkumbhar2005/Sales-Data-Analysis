# SQL Layer

The project can materialize the validated sales data in SQLite for ad hoc analysis, scheduled jobs, or downstream BI tools.

## Generate the database

Run:

```bash
python main.py
```

This creates `output/sales.db`. The database is generated output and is intentionally not committed; rerun the command whenever the source CSV changes.

## Tables and queries

The database contains one `sales` table with validated transaction fields and derived profitability metrics. The schema and sample analytics queries are in [`schema.sql`](schema.sql) and [`queries.sql`](queries.sql).

The Python query helpers are available in `src/sql_layer.py`:

```python
from src.sql_layer import query_category_sales, query_monthly_sales

monthly = query_monthly_sales()
category = query_category_sales()
```

The loader replaces the table contents on each run, so repeated generation is deterministic and does not duplicate transactions.
