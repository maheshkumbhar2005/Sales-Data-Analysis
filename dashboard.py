from __future__ import annotations

from io import StringIO

import streamlit as st

from src.sales_analysis import DATA_PATH, load_sales_data, summarize_sales


st.set_page_config(page_title="Sales Intelligence", page_icon="📈", layout="wide")

st.markdown(
    """
    <style>
    :root {
        --bg: #f5f3ee;
        --panel: #fffdf8;
        --ink: #17212b;
        --muted: #64717a;
        --accent: #e4572e;
        --accent-2: #168c83;
        --border: #dedbd2;
    }

    html, body, [data-testid="stAppViewContainer"] {
        background: radial-gradient(circle at 90% 0%, #e8f2ed 0, transparent 32rem), var(--bg);
        color: var(--ink);
    }

    [data-testid="stHeader"] {
        background: rgba(245, 243, 238, 0.88);
        backdrop-filter: blur(12px);
    }

    .stApp {
        color: var(--ink);
    }

    .stTabs [role="tablist"] > div {
        gap: 0.5rem;
    }

    .stTabs [role="tab"] {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 7px 7px 0 0;
        color: var(--ink);
        padding: 0.5rem 1rem;
    }

    .stTabs [role="tab"][aria-selected="true"] {
        background: rgba(228, 87, 46, 0.1);
        border-color: rgba(228, 87, 46, 0.45);
    }

    div[data-testid="stMetric"] {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 7px;
        box-shadow: 0 8px 20px rgba(23, 33, 43, 0.06);
        padding: 1rem 1rem 0.8rem;
    }

    div[data-testid="stMetricLabel"] {
        color: var(--muted);
        font-weight: 600;
    }

    div[data-testid="stMetricValue"] {
        color: var(--ink);
        font-weight: 700;
    }

    div[data-testid="stMetricDelta"] {
        color: var(--accent-2);
    }

    section[data-testid="stSidebar"] {
        background: #ebe9e2;
        border-right: 1px solid var(--border);
    }

    .stSelectbox > div,
    .stMultiSelect > div,
    .stDateInput > div,
    .stTextInput > div {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 10px;
    }

    .stDataFrame,
    .stChart,
    .stPlotlyChart {
        background: rgba(255, 253, 248, 0.7);
        border-radius: 7px;
    }

    h1, h2, h3, h4, p {
        color: var(--ink);
    }

    .stWarning {
        background: rgba(228, 87, 46, 0.08);
        border: 1px solid rgba(228, 87, 46, 0.3);
        color: #87331e;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def get_sales_data():
    return load_sales_data(DATA_PATH)


def dataframe_download(dataframe, filename: str) -> None:
    buffer = StringIO()
    dataframe.to_csv(buffer, index=False)
    st.download_button("Download CSV", buffer.getvalue(), filename, "text/csv")


def main() -> None:
    df = get_sales_data()

    st.title("Sales intelligence")
    st.caption("A focused view of revenue, momentum, and what is selling.")

    with st.sidebar:
        st.header("Explore the data")
        date_range = st.date_input(
            "Date range",
            value=(df["Date"].min().date(), df["Date"].max().date()),
            min_value=df["Date"].min().date(),
            max_value=df["Date"].max().date(),
        )
        regions = sorted(df["Region"].unique())
        categories = sorted(df["Category"].unique())
        selected_regions = st.multiselect("Regions", regions, default=regions)
        selected_categories = st.multiselect("Categories", categories, default=categories)

    start_date, end_date = date_range if len(date_range) == 2 else (date_range[0], date_range[0])
    filtered_df = df[
        df["Date"].dt.date.between(start_date, end_date)
        & df["Region"].isin(selected_regions)
        & df["Category"].isin(selected_categories)
    ]

    if filtered_df.empty:
        st.warning("No sales match the selected filters.")
        return

    filtered_summary = summarize_sales(filtered_df)
    monthly = filtered_summary["monthly_sales"]
    latest_growth = monthly.iloc[-1]["MoM_Growth_%"] if len(monthly) > 1 else None

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Revenue", f"${filtered_summary['total_revenue']:,.0f}")
    col2.metric("Units sold", f"{filtered_summary['total_units']:,}")
    col3.metric("Average order", f"${filtered_summary['avg_order_value']:,.0f}")
    col4.metric("Latest MoM", f"{latest_growth:+.1f}%" if latest_growth is not None else "n/a")

    st.subheader("Revenue pulse")
    st.line_chart(monthly.set_index("Month")["Total_Sales"], color="#e4572e")

    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        st.subheader("Category mix")
        category_chart = filtered_summary["category_sales"].set_index("Category")["Total_Sales"]
        st.bar_chart(category_chart, color="#168c83")
        dataframe_download(filtered_summary["category_sales"], "category_sales.csv")

    with chart_col2:
        st.subheader("Regional performance")
        region_chart = filtered_summary["region_sales"].set_index("Region")["Total_Sales"]
        st.bar_chart(region_chart, color="#e4572e")
        dataframe_download(filtered_summary["region_sales"], "region_sales.csv")

    st.subheader("Top products by units")
    top_products = (
        filtered_df.groupby("Product", as_index=False)["Units_Sold"]
        .sum()
        .sort_values("Units_Sold", ascending=False)
        .head(10)
    )
    st.dataframe(top_products, use_container_width=True, hide_index=True)

    with st.expander("Monthly detail"):
        st.dataframe(monthly, use_container_width=True, hide_index=True)
        dataframe_download(monthly, "monthly_sales.csv")


if __name__ == "__main__":
    main()
