from __future__ import annotations

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
    df["Date"] = pd.to_datetime(df["Date"])
    return df


def summarize_sales(df: pd.DataFrame) -> dict:
    total_revenue = df["Total_Sales"].sum()
    total_units = df["Units_Sold"].sum()
    avg_order_value = df["Total_Sales"].mean()
    top_category = df.groupby("Category")["Total_Sales"].sum().idxmax()
    top_region = df.groupby("Region")["Total_Sales"].sum().idxmax()

    monthly_sales = (
        df.assign(Month=df["Date"].dt.to_period("M").astype(str))
        .groupby("Month", as_index=False)["Total_Sales"]
        .sum()
        .sort_values("Month")
    )

    return {
        "total_revenue": total_revenue,
        "total_units": total_units,
        "avg_order_value": avg_order_value,
        "top_category": top_category,
        "top_region": top_region,
        "monthly_sales": monthly_sales,
    }


def create_visuals(df: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    monthly_sales = (
        df.assign(Month=df["Date"].dt.to_period("M").astype(str))
        .groupby("Month", as_index=False)["Total_Sales"]
        .sum()
        .sort_values("Month")
    )

    plt.figure(figsize=(10, 6))
    sns.barplot(
        data=monthly_sales,
        x="Month",
        y="Total_Sales",
        hue="Month",
        dodge=False,
        legend=False,
        palette="viridis",
    )
    plt.title("Monthly Sales Revenue")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "monthly_sales.png")
    plt.close()

    category_sales = df.groupby("Category")["Total_Sales"].sum().sort_values(ascending=False)
    plt.figure(figsize=(8, 6))
    category_sales.plot(kind="bar", color="steelblue")
    plt.title("Sales by Category")
    plt.ylabel("Total Sales")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "category_sales.png")
    plt.close()


def print_report(summary: dict) -> None:
    print("Sales Data Analysis Report")
    print("=" * 28)
    print(f"Total Revenue: ${summary['total_revenue']:,.2f}")
    print(f"Total Units Sold: {summary['total_units']:,}")
    print(f"Average Order Value: ${summary['avg_order_value']:,.2f}")
    print(f"Top Category: {summary['top_category']}")
    print(f"Top Region: {summary['top_region']}")
    print("\nMonthly Sales Trend:")
    print(summary["monthly_sales"].to_string(index=False))


def main() -> None:
    df = load_sales_data(DATA_PATH)
    summary = summarize_sales(df)
    create_visuals(df)
    print_report(summary)
    print("\nCharts saved to output/")


if __name__ == "__main__":
    main()
