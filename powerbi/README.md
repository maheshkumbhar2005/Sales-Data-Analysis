# Power BI Report

## Load the data

1. Run `python main.py` from the project root.
2. In Power BI Desktop, choose **Get data > Text/CSV**.
3. Select `output/powerbi_sales_data.csv` and load it as `Sales`.
4. Set `Date` and `MonthStart` to Date types. Sort `MonthName` by `MonthNumber`.

The export is a flat table, so no relationship is required for the starter report. `MonthStart` is the month-level key for trend visuals and `Date` supports daily filtering.

## Measures

Create these measures in the `Sales` table:

```DAX
Revenue = SUM ( Sales[Total_Sales] )
Units Sold = SUM ( Sales[Units_Sold] )
Estimated Cost = SUM ( Sales[Estimated_Cost] )
Estimated Profit = SUM ( Sales[Estimated_Profit] )
Profit Margin % = DIVIDE ( [Estimated Profit], [Revenue], 0 )
Average Order Value = AVERAGE ( Sales[Total_Sales] )
``` 

## Suggested report pages

- **Overview:** Revenue, Units Sold, Estimated Profit, and Profit Margin % cards; revenue by month; revenue by category and region.
- **Trends:** Revenue and Units Sold by MonthStart with Year, Region, and Category slicers.
- **Products:** Revenue, Units Sold, and Estimated Profit by Product and Category.
- **Geography:** Revenue and Estimated Profit by Region.

Refresh the CSV after rerunning `main.py`, then select **Refresh** in Power BI Desktop.