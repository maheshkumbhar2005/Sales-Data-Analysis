# Sales Data Analysis

This project is a sales analytics dashboard built with Python, pandas, and a Node.js frontend. It reads a sales dataset, summarizes key business metrics, and provides interactive charts, filters, and exports for quick analysis.

## Features

- Loads a sample sales dataset from `data/sales_data.csv`
- Calculates core KPIs such as total revenue, total units sold, average order value, and average unit price
- Identifies top category, region, and product by sales volume
- Serves a responsive Node.js dashboard with Chart.js visualizations
- Organizes the dashboard into Overview, Trends, Products, Geography, Forecast, and Data tabs
- Includes interactive donut, comparison, trend, growth, product, and scatter charts
- Generates automatic business insights from the active filters
- Filters results by date range, region, and category
- Downloads filtered sales data and summary tables
- Forecasts future monthly revenue and units with an ML model
- Compares selected KPIs with the immediately preceding equal period
- Flags unusual monthly revenue and unit patterns
- Shows estimated profit and margin using a documented cost assumption
- Exports summary tables and JSON metrics to the `output/` folder
- Exports a Power BI-ready transaction table with date and profit dimensions
- Keeps the existing MIT license intact

## Project structure

- `data/` – sample dataset
- `src/` – analysis logic
- `output/` – generated charts and summaries
- `powerbi/` – Power BI setup, measures, and report guidance
- `server.js` – Node.js API and static frontend server
- `public/` – dashboard interface, styles, and visualizations
- `src/sales_analysis.py` – data loading, validation, and Python analysis logic
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

Run the tests with coverage:

```bash
python -m pytest
```

The pytest configuration reports line coverage for `src/` and highlights uncovered lines.

## Web dashboard

The dashboard is served by Node.js and uses the local CSV as its data source. Node.js 18 or newer is required.

Run it with:

```bash
npm start
```

Open `http://localhost:3000`. The dashboard lets you filter by date range, region, and category, view revenue and unit trends, inspect category, region, and product performance, review a baseline forecast, and download filtered data. Use `npm run dev` during development for automatic server restarts.

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

Time-series data can be split with `split_time_series` for validation. The helper sorts by date or month and keeps the latest observations in the test set without shuffling, preventing future data from leaking into training.

Because the sample CSV does not include product costs, profit is estimated with a 70% cost ratio, resulting in a 30% estimated margin. Replace `DEFAULT_COST_RATIO` or add a real cost column before using profitability metrics for operational decisions. Anomaly detection runs on monthly revenue and units with an Isolation Forest model.

## Sales data fields

The source CSV includes `Date`, `Product`, `Category`, `Region`, `Units_Sold`, `Unit_Price`, `Total_Sales`, `Cost_Price`, `Profit`, `Profit_Margin`, and `Discount`. `Cost_Price` is a per-unit value, `Discount` is a percentage, and `Profit` is calculated as `Total_Sales - (Cost_Price * Units_Sold)`. The sample uses a 70% cost baseline and 0% discount because the original source data did not provide those business fields.

## Output files

After running the project, the following files are generated in `output/`:

- `sales_dashboard.png`
- `revenue_trend.png`
- `category_sales.csv`
- `region_sales.csv`
- `monthly_sales.csv`
- `sales_summary.json`
- `sales_anomalies.csv`
- `powerbi_sales_data.csv`

## Power BI

See [`powerbi/README.md`](powerbi/README.md) for the recommended Power BI model and report layout. Run `python main.py` first, then load `output/powerbi_sales_data.csv` as the `Sales` table. The export includes a continuous month key, calendar fields, dimensions, revenue, units, estimated cost, estimated profit, margin, and discount.

## Notes

- The repository's MIT license remains unchanged.
- This is a starter project intended for learning and expansion into a real dashboard or business reporting workflow.
