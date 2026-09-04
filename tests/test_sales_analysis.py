from pathlib import Path

import pandas as pd

from src.sales_analysis import load_sales_data, summarize_sales


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
