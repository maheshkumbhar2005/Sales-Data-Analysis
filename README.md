# Sales Data Analysis

This project is a basic but useful sales analytics starter built with Python, pandas, and seaborn. It reads a sales dataset, summarizes key business metrics, and generates charts and export files for quick analysis.

## Features

- Loads a sample sales dataset from `data/sales_data.csv`
- Calculates core KPIs such as total revenue, total units sold, average order value, and average unit price
- Identifies top category, region, and product by sales volume
- Builds a sales dashboard with multiple charts
- Exports summary tables and JSON metrics to the `output/` folder
- Keeps the existing MIT license intact

## Project structure

- `data/` – sample dataset
- `src/` – analysis logic
- `output/` – generated charts and summaries
- `main.py` – entry point
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
3. Run the analysis:
   ```bash
   python main.py
   ```

## Web dashboard

A simple browser dashboard is also included using Streamlit.

Run it with:

```bash
streamlit run dashboard.py
```

This dashboard lets you filter by region and category, view sales KPIs, and inspect trend charts without writing Python code in the terminal.

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
