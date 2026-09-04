# Sales Data Analysis

This project is a sales analytics dashboard built with Python, pandas, Plotly, and Streamlit. It reads a sales dataset, summarizes key business metrics, and provides interactive charts, filters, and exports for quick analysis.

## Features

- Loads a sample sales dataset from `data/sales_data.csv`
- Calculates core KPIs such as total revenue, total units sold, average order value, and average unit price
- Identifies top category, region, and product by sales volume
- Builds an interactive Streamlit dashboard with Plotly charts
- Filters results by date range, region, and category
- Downloads filtered sales data and summary tables
- Forecasts future monthly revenue and units with an ML model
- Exports summary tables and JSON metrics to the `output/` folder
- Keeps the existing MIT license intact

## Project structure

- `data/` – sample dataset
- `src/` – analysis logic
- `output/` – generated charts and summaries
- `app.py` – Streamlit dashboard entry point
- `src/sales_analysis.py` – data loading, validation, and analysis logic
- `requirements.txt` – Python dependencies
- `LICENSE` – MIT license retained from the repository

## Quick start

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Generate the reports and static output files:
   ```bash
   python main.py
   ```

## Web dashboard

A simple browser dashboard is also included using Streamlit.

Run it with:

```bash
streamlit run app.py
```

The dashboard lets you filter by date range, region, and category, view revenue and unit trends, inspect category, region, and product performance, and download filtered data.

## Prediction workflow

```text
Historical Sales
   ↓
Data Cleaning and Validation
   ↓
Monthly Feature Engineering
   ↓
Linear Regression Model
   ↓
Future Monthly Sales Prediction
   ↓
Interactive Dashboard
```

The model uses monthly trend and seasonal features to forecast revenue and units. Forecast months can be selected from the dashboard sidebar. Predictions are intended as a transparent baseline for this small sample dataset and should be retrained with more history before production use.

## Output files

After running the project, the following files are generated in `output/`:

- `sales_dashboard.png`
- `revenue_trend.png`
- `category_sales.csv`
- `region_sales.csv`
- `monthly_sales.csv`
- `sales_summary.json`

## Notes

- The repository's MIT license remains unchanged.
- This is a starter project intended for learning and expansion into a real dashboard or business reporting workflow.
