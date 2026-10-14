# Changelog

All notable changes to the **Sales Data Analysis** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-10-14 — Today's Contribution

### Summary of Today's Work
Comprehensive enhancement of the analytical models, interactive dashboard architecture, data ingestion capabilities, and open-source contribution guidelines.

### Added
- **Forecast Confidence Intervals (Prediction Corridors)**:
  - 95% confidence intervals (`Revenue_Upper_Bound` & `Revenue_Lower_Bound`) calculated via residual standard error in both Python (`src/sales_analysis.py`) and Node.js (`server.js`).
  - Shaded prediction corridor band visualized on the dashboard forecast chart via Chart.js.
- **Customer Cohort Retention Analysis**:
  - Implemented `calculate_cohort_retention(df)` to compute monthly repeat purchase retention matrix across customer acquisition cohorts.
  - Exported cohort retention metrics to `output/cohort_retention.json` and `output/cohort_retention.csv`.
  - Rendered a retention matrix table with color-coded retention percentage pills directly on the dashboard.
- **Interactive 3D Plotly Visualizations**:
  - Added `generate_plotly_visuals()` to automatically export standalone interactive reports:
    - `output/rfm_3d_scatter.html`: 3D scatter plot of customer behavioral space across Recency, Frequency, and Monetary value.
    - `output/cohort_retention.html`: Interactive retention rate heatmap.
  - Added dedicated navigation buttons in the dashboard header and cohort section to open these reports.
- **CSV Dataset Drag & Drop Uploader**:
  - Implemented `POST /api/upload` endpoint in `server.js` with full CSV header and schema validation.
  - Added an accessible modal dialog in `public/index.html` allowing drag-and-drop or file picker upload of custom sales datasets, automatically triggering pipeline re-analysis.
- **Dual Currency Switcher**:
  - Added live toggle between US Dollars (`$ USD`) and Indian Rupees (`₹ INR`) across all metric cards, revenue trends, and tables.
- **Raw Data Table Enhancements**:
  - Added real-time search input for instant record filtering.
  - Added interactive sortable table headers for all numeric and text dimensions.
  - Added pagination controls (Previous, Next, and Page indicators) to efficiently browse records.
- **Transaction Entry Modal ("+ Add Order")**:
  - Added a responsive modal form allowing users to append new sales orders directly into the database with client and server-side validation.
- **Contribution Documentation**:
  - Added `CONTRIBUTING.md` with complete developer onboarding, workflow instructions, coding standards, and PR submission guidelines.
  - Updated `README.md` with detailed feature explanations.

### Changed
- Refactored `server.js` to serve generated static HTML files from `/output/` securely with MIME type mapping.
- Enhanced AI Chat Assistant (`POST /api/chat`) with intent handling for VIP customer counts, order fulfillment statistics, and shipping expenses.
- Upgraded Python pipeline reporting in `main.py` to output both summary statistics, RFM segments, and cohort tables.

### Fixed
- **SQLite Connection Resource Leak**: Wrapped all database connections in `src/sql_layer.py` and `src/alert.py` in `try...finally` blocks, resolving unclosed database resource warnings.
- **Pandas Quantile Duplicate Edge Error**: Fixed `calculate_rfm` failure by applying `.rank(method="first")` to break ties before `pd.qcut` binning.
- **CSV Row Serialization Bug**: Fixed newline formatting when appending new sales transactions in `server.js`.

### Testing
- Expanded unit test coverage in `tests/test_sales_analysis.py` with test cases for cohort retention matrix, prediction intervals, and Plotly visualization generation.
- Achieved **100% test pass rate** across all 31 unit tests (`31 passed`).

---

## [1.0.0] - 2026-10-13
- Initial release of Sales Data Analysis platform.
- Data loading, validation, and feature engineering.
- SQLite SQL analytics queries.
- Node.js dashboard server with Chart.js charts.
- Basic RFM segmentation and ML sales forecasting.
