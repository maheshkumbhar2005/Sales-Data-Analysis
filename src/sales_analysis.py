from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "sales_data.csv"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"


def load_sales_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["Units_Sold"] = pd.to_numeric(df["Units_Sold"], errors="coerce")
    df["Unit_Price"] = pd.to_numeric(df["Unit_Price"], errors="coerce")
    df["Total_Sales"] = pd.to_numeric(df["Total_Sales"], errors="coerce")
    df = df.dropna(subset=["Date", "Category", "Region", "Units_Sold", "Total_Sales"]).copy()
    df["Month"] = df["Date"].dt.to_period("M").astype(str)
    return df


def summarize_sales(df: pd.DataFrame) -> dict:
    if df.empty:
        raise ValueError("Sales data is empty after cleaning.")

    df = df.copy()
    if "Month" not in df.columns:
        df["Month"] = df["Date"].dt.to_period("M").astype(str)

    total_revenue = df["Total_Sales"].sum()
    total_units = df["Units_Sold"].sum()
    avg_order_value = df["Total_Sales"].mean()
    avg_price_per_unit = df["Unit_Price"].mean()
    top_category = df.groupby("Category")["Total_Sales"].sum().idxmax()
    top_region = df.groupby("Region")["Total_Sales"].sum().idxmax()
    top_product = df.groupby("Product")["Units_Sold"].sum().idxmax()

    category_sales = df.groupby("Category", as_index=False)["Total_Sales"].sum().sort_values("Total_Sales", ascending=False)
    region_sales = df.groupby("Region", as_index=False)["Total_Sales"].sum().sort_values("Total_Sales", ascending=False)
    monthly_sales = (
        df.groupby("Month", as_index=False)["Total_Sales"]
        .sum()
        .sort_values("Month")
    )
    monthly_sales["Previous_Month"] = monthly_sales["Total_Sales"].shift(1)
    previous_month = monthly_sales["Previous_Month"]
    monthly_sales["MoM_Growth_%"] = (
        monthly_sales["Total_Sales"].subtract(previous_month)
        .div(previous_month)
        .mul(100)
        .where(previous_month.notna() & previous_month.ne(0), 0.0)
    )

    return {
        "total_revenue": total_revenue,
        "total_units": total_units,
        "avg_order_value": avg_order_value,
        "avg_price_per_unit": avg_price_per_unit,
        "top_category": top_category,
        "top_region": top_region,
        "top_product": top_product,
        "category_sales": category_sales,
        "region_sales": region_sales,
        "monthly_sales": monthly_sales,
    }


def export_summary(summary: dict) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    summary["category_sales"].to_csv(OUTPUT_DIR / "category_sales.csv", index=False)
    summary["region_sales"].to_csv(OUTPUT_DIR / "region_sales.csv", index=False)
    summary["monthly_sales"].to_csv(OUTPUT_DIR / "monthly_sales.csv", index=False)

    metrics = {
        "total_revenue": float(summary["total_revenue"]),
        "total_units": int(summary["total_units"]),
        "avg_order_value": float(summary["avg_order_value"]),
        "avg_price_per_unit": float(summary["avg_price_per_unit"]),
        "top_category": summary["top_category"],
        "top_region": summary["top_region"],
        "top_product": summary["top_product"],
    }
    (OUTPUT_DIR / "sales_summary.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def create_visuals(df: pd.DataFrame, summary: dict) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("Sales Performance Dashboard", fontsize=16)

    monthly_sales = summary["monthly_sales"]
    sns.barplot(
        data=monthly_sales,
        x="Month",
        y="Total_Sales",
        hue="Month",
        ax=axes[0, 0],
        palette="viridis",
        dodge=False,
        legend=False,
    )
    axes[0, 0].set_title("Monthly Revenue")
    axes[0, 0].tick_params(axis="x", rotation=45)

    category_sales = summary["category_sales"]
    sns.barplot(
        data=category_sales,
        x="Category",
        y="Total_Sales",
        hue="Category",
        ax=axes[0, 1],
        palette="magma",
        dodge=False,
        legend=False,
    )
    axes[0, 1].set_title("Revenue by Category")
    axes[0, 1].tick_params(axis="x", rotation=25)

    region_sales = summary["region_sales"]
    sns.barplot(
        data=region_sales,
        x="Region",
        y="Total_Sales",
        hue="Region",
        ax=axes[1, 0],
        palette="Blues",
        dodge=False,
        legend=False,
    )
    axes[1, 0].set_title("Revenue by Region")

    product_sales = df.groupby("Product", as_index=False)["Units_Sold"].sum().sort_values("Units_Sold", ascending=False).head(5)
    sns.barplot(
        data=product_sales,
        x="Units_Sold",
        y="Product",
        hue="Product",
        ax=axes[1, 1],
        palette="crest",
        dodge=False,
        legend=False,
    )
    axes[1, 1].set_title("Top 5 Products by Units")

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig(OUTPUT_DIR / "sales_dashboard.png")
    plt.close(fig)

    plt.figure(figsize=(10, 6))
    sns.lineplot(data=monthly_sales, x="Month", y="Total_Sales", marker="o")
    plt.title("Revenue Trend Over Time")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "revenue_trend.png")
    plt.close()


def print_report(summary: dict) -> None:
    print("Sales Data Analysis Report")
    print("=" * 28)
    print(f"Total Revenue: ${summary['total_revenue']:,.2f}")
    print(f"Total Units Sold: {summary['total_units']:,}")
    print(f"Average Order Value: ${summary['avg_order_value']:,.2f}")
    print(f"Average Unit Price: ${summary['avg_price_per_unit']:,.2f}")
    print(f"Top Category: {summary['top_category']}")
    print(f"Top Region: {summary['top_region']}")
    print(f"Top Product by Units: {summary['top_product']}")
    print("\nMonthly Sales Trend:")
    print(summary["monthly_sales"].to_string(index=False))

    best_moM = summary["monthly_sales"].loc[summary["monthly_sales"]["MoM_Growth_%"].idxmax()]
    print(f"\nBest month-over-month growth: {best_moM['Month']} ({best_moM['MoM_Growth_%']:.2f}%)")


def main() -> None:
    df = load_sales_data(DATA_PATH)
    summary = summarize_sales(df)
    export_summary(summary)
    create_visuals(df, summary)
    print_report(summary)
    print("\nDashboard and summary files saved to output/")


if __name__ == "__main__":
    main()
