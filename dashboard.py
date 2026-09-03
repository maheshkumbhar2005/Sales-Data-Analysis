from __future__ import annotations

import streamlit as st

from src.sales_analysis import DATA_PATH, load_sales_data, summarize_sales


st.set_page_config(page_title="Sales Dashboard", page_icon="📊", layout="wide")

st.markdown(
    """
    <style>
    :root {
        --bg: #0f172a;
        --panel: #111827;
        --panel-2: #1f2937;
        --panel-3: #0b1220;
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #38bdf8;
        --accent-2: #22c55e;
        --border: rgba(148, 163, 184, 0.18);
    }

    html, body, [data-testid="stAppViewContainer"] {
        background: linear-gradient(135deg, var(--bg), #111827 55%, #0b1220);
        color: var(--text);
    }

    [data-testid="stHeader"] {
        background: rgba(15, 23, 42, 0.8);
        backdrop-filter: blur(10px);
    }

    .stApp {
        color: var(--text);
    }

    .stTabs [role="tablist"] > div {
        gap: 0.5rem;
    }

    .stTabs [role="tab"] {
        background: var(--panel-2);
        border: 1px solid var(--border);
        border-radius: 10px 10px 0 0;
        color: var(--text);
        padding: 0.5rem 1rem;
    }

    .stTabs [role="tab"][aria-selected="true"] {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.4);
    }

    div[data-testid="stMetric"] {
        background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9));
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
        padding: 1rem 1rem 0.8rem;
    }

    div[data-testid="stMetricLabel"] {
        color: var(--muted);
        font-weight: 600;
    }

    div[data-testid="stMetricValue"] {
        color: #f8fafc;
        font-weight: 700;
    }

    div[data-testid="stMetricDelta"] {
        color: var(--accent-2);
    }

    section[data-testid="stSidebar"] {
        background: rgba(15, 23, 42, 0.94);
        border-right: 1px solid var(--border);
    }

    .stSelectbox > div,
    .stMultiSelect > div,
    .stDateInput > div,
    .stTextInput > div {
        background: var(--panel-2);
        border: 1px solid var(--border);
        border-radius: 10px;
    }

    .stDataFrame,
    .stChart,
    .stPlotlyChart {
        background: rgba(17, 24, 39, 0.45);
        border-radius: 12px;
    }

    h1, h2, h3, h4, p {
        color: var(--text);
    }

    .stWarning {
        background: rgba(234, 179, 8, 0.1);
        border: 1px solid rgba(234, 179, 8, 0.35);
        color: #fef3c7;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def main() -> None:
    df = load_sales_data(DATA_PATH)
    summary = summarize_sales(df)

    st.title("Sales Dashboard")
    st.caption("Overview of sales performance and product trends")

    regions = sorted(df["Region"].unique())
    categories = sorted(df["Category"].unique())

    selected_regions = st.multiselect("Filter by Region", regions, default=regions)
    selected_categories = st.multiselect("Filter by Category", categories, default=categories)

    filtered_df = df[
        df["Region"].isin(selected_regions) & df["Category"].isin(selected_categories)
    ]

    if filtered_df.empty:
        st.warning("No data matches the current filters.")
        return

    filtered_summary = summarize_sales(filtered_df)

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total Revenue", f"${filtered_summary['total_revenue']:,.2f}")
    col2.metric("Total Units Sold", f"{filtered_summary['total_units']:,}")
    col3.metric("Avg Order Value", f"${filtered_summary['avg_order_value']:,.2f}")
    col4.metric("Top Category", filtered_summary["top_category"])
    col5.metric("Top Region", filtered_summary["top_region"])

    st.subheader("Revenue Trend")
    trend_data = filtered_summary["monthly_sales"].set_index("Month")["Total_Sales"]
    st.line_chart(trend_data, color="#38bdf8")

    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        st.subheader("Revenue by Category")
        category_chart = filtered_summary["category_sales"].set_index("Category")["Total_Sales"]
        st.bar_chart(category_chart, color="#22c55e")

    with chart_col2:
        st.subheader("Revenue by Region")
        region_chart = filtered_summary["region_sales"].set_index("Region")["Total_Sales"]
        st.bar_chart(region_chart, color="#38bdf8")

    st.subheader("Top Products by Units Sold")
    top_products = (
        filtered_df.groupby("Product", as_index=False)["Units_Sold"]
        .sum()
        .sort_values("Units_Sold", ascending=False)
        .head(10)
    )
    st.dataframe(top_products, use_container_width=True)

    st.subheader("Monthly Sales Table")
    st.dataframe(filtered_summary["monthly_sales"], use_container_width=True)


if __name__ == "__main__":
    main()
