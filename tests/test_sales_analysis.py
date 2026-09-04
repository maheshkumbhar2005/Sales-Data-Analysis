from pathlib import Path

import pandas as pd

from src.sales_analysis import (
    DATA_PATH,
    add_profit_metrics,
    compare_periods,
    detect_sales_anomalies,
    engineer_monthly_features,
    filter_sales_data,
    forecast_sales,
    load_sales_data,
    summarize_sales,
)


def test_load_sales_data_parses_dates(tmp_path: Path):
    csv_file = tmp_path / "sample.csv"
    csv_file.write_text(
        "Date,Product,Category,Region,Units_Sold,Unit_Price,Total_Sales\n"
        "2025-01-01,Laptop,Electronics,North,2,100,200\n"
        "2025-01-05,Mouse,Accessories,South,5,20,100\n",
        encoding="utf-8",
    )

    df = load_sales_data(csv_file)

    assert list(df.columns)[:7] == [
        "Date",
        "Product",
        "Category",
        "Region",
        "Units_Sold",
        "Unit_Price",
        "Total_Sales",
    ]
    assert pd.api.types.is_datetime64_any_dtype(df["Date"])


def test_load_sales_data_rejects_missing_columns(tmp_path: Path):
    csv_file = tmp_path / "missing.csv"
    csv_file.write_text("Date,Product\n2025-01-01,Laptop\n", encoding="utf-8")

    try:
        load_sales_data(csv_file)
    except ValueError as exc:
        assert "missing required columns" in str(exc)
    else:
        raise AssertionError("Expected missing-column validation error")


def test_load_sales_data_rejects_empty_file(tmp_path: Path):
    csv_file = tmp_path / "empty.csv"
    csv_file.write_text("", encoding="utf-8")

    try:
        load_sales_data(csv_file)
    except ValueError as exc:
        assert "Unable to read sales CSV" in str(exc)
    else:
        raise AssertionError("Expected empty-file validation error")


def test_source_data_includes_profit_analysis_columns():
    df = load_sales_data(DATA_PATH)

    assert {"Cost_Price", "Profit", "Profit_Margin", "Discount"}.issubset(df.columns)
    assert df.loc[0, "Profit"] == df.loc[0, "Total_Sales"] - (df.loc[0, "Cost_Price"] * df.loc[0, "Units_Sold"])
    assert df.loc[0, "Profit_Margin"] == 30


def test_summarize_sales_calculates_expected_values():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01", "2025-01-02", "2025-02-01"]),
            "Product": ["Laptop", "Laptop", "Mouse"],
            "Category": ["Electronics", "Electronics", "Accessories"],
            "Region": ["North", "South", "North"],
            "Units_Sold": [2, 3, 5],
            "Unit_Price": [100, 100, 20],
            "Total_Sales": [200, 300, 100],
        }
    )

    summary = summarize_sales(df)

    assert summary["total_revenue"] == 600
    assert summary["total_units"] == 10
    assert summary["avg_order_value"] == 200
    assert summary["top_category"] == "Electronics"
    assert summary["top_region"] == "North"
    assert summary["top_product"] == "Laptop"
    assert list(summary["top_products"]["Product"]) == ["Laptop", "Mouse"]
    assert list(summary["monthly_sales"]["Units_Sold"]) == [5, 5]
    assert summary["total_profit"] == 180
    assert summary["estimated_margin"] == 30
    assert summary["best_month"] == "2025-01"
    assert summary["worst_month"] == "2025-02"
    assert summary["category_sales"]["Contribution_%"].sum() == 100


def test_summarize_sales_includes_months_without_rows():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01", "2025-03-01"]),
            "Product": ["Laptop", "Mouse"],
            "Category": ["Electronics", "Accessories"],
            "Region": ["North", "South"],
            "Units_Sold": [2, 3],
            "Unit_Price": [100, 20],
            "Total_Sales": [200, 60],
        }
    )

    monthly = summarize_sales(df)["monthly_sales"]

    assert list(monthly["Month"]) == ["2025-01", "2025-02", "2025-03"]
    assert list(monthly["Total_Sales"]) == [200, 0, 60]
    assert list(monthly["MoM_Growth_%"]) == [0, -100.0, 0]


def test_forecast_sales_returns_future_non_negative_predictions():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01", "2025-02-01", "2025-03-01"]),
            "Product": ["Laptop", "Mouse", "Laptop"],
            "Category": ["Electronics", "Accessories", "Electronics"],
            "Region": ["North", "South", "North"],
            "Units_Sold": [2, 4, 6],
            "Unit_Price": [100, 20, 100],
            "Total_Sales": [200, 80, 600],
        }
    )

    features = engineer_monthly_features(df)
    forecast = forecast_sales(df, periods=2)

    assert {"Month_Index", "Month_Sin", "Month_Cos"}.issubset(features.columns)
    assert list(forecast["Forecast_Month"]) == ["2025-04", "2025-05"]
    assert (forecast[["Predicted_Revenue", "Predicted_Units"]] >= 0).all().all()


def test_forecast_sales_rejects_invalid_horizon():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01"]),
            "Product": ["Laptop"],
            "Category": ["Electronics"],
            "Region": ["North"],
            "Units_Sold": [2],
            "Unit_Price": [100],
            "Total_Sales": [200],
        }
    )

    try:
        forecast_sales(df, periods=0)
    except ValueError as exc:
        assert "at least 1" in str(exc)
    else:
        raise AssertionError("Expected invalid forecast horizon error")


def test_period_comparison_and_anomaly_outputs():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01", "2025-01-02", "2025-01-03", "2025-02-01"]),
            "Product": ["Laptop", "Mouse", "Laptop", "Laptop"],
            "Category": ["Electronics", "Accessories", "Electronics", "Electronics"],
            "Region": ["North", "North", "North", "North"],
            "Units_Sold": [2, 5, 10, 10],
            "Unit_Price": [100, 20, 100, 100],
            "Total_Sales": [200, 100, 1000, 1000],
        }
    )

    selected = filter_sales_data(df, "2025-02-01", "2025-02-28", ["North"], ["Electronics"])
    comparison = compare_periods(df, "2025-01-02", "2025-01-03")
    anomalies = detect_sales_anomalies(df)

    assert len(selected) == 1
    assert comparison["current"]["revenue"] == 1100
    assert comparison["previous"]["revenue"] == 200
    assert comparison["changes"]["revenue_pct"] == 450
    assert {"Anomaly_Score", "Is_Anomaly"}.issubset(anomalies.columns)


def test_add_profit_metrics_validates_cost_ratio():
    df = pd.DataFrame({"Total_Sales": [100], "Unit_Price": [100], "Units_Sold": [1]})

    enriched = add_profit_metrics(df, cost_ratio=0.6)

    assert enriched["Estimated_Profit"].iloc[0] == 40
    assert enriched["Estimated_Margin_%"].iloc[0] == 40
    try:
        add_profit_metrics(df, cost_ratio=1.2)
    except ValueError as exc:
        assert "between 0 and 1" in str(exc)
    else:
        raise AssertionError("Expected invalid cost-ratio error")


def test_summarize_sales_handles_zero_previous_month():
    df = pd.DataFrame(
        {
            "Date": pd.to_datetime(["2025-01-01", "2025-02-01"]),
            "Product": ["Laptop", "Laptop"],
            "Category": ["Electronics", "Electronics"],
            "Region": ["North", "North"],
            "Units_Sold": [0, 2],
            "Unit_Price": [100, 100],
            "Total_Sales": [0, 200],
        }
    )

    summary = summarize_sales(df)

    assert summary["monthly_sales"]["MoM_Growth_%"].tolist() == [0, 0]
