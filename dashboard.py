from __future__ import annotations

from io import StringIO

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

from src.sales_analysis import (
    DATA_PATH,
    compare_periods,
    forecast_sales,
    load_sales_data,
    filter_sales_data,
    summarize_sales,
)


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

    .dashboard-kicker {
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: -0.5rem;
    }

    @media (max-width: 768px) {
        [data-testid="stMetric"] {
            padding: 0.8rem 0.7rem 0.65rem;
        }

        div[data-testid="stMetricValue"] {
            font-size: 1.35rem;
        }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def get_sales_data():
    return load_sales_data(DATA_PATH)


@st.cache_data
def get_sales_summary(filtered_df):
    return summarize_sales(filtered_df)


@st.cache_data
def get_sales_forecast(filtered_df, periods: int):
    return forecast_sales(filtered_df, periods)


@st.cache_data
def get_period_comparison(filtered_df, start_date, end_date):
    return compare_periods(filtered_df, start_date, end_date)


def dataframe_download(dataframe, filename: str) -> None:
    buffer = StringIO()
    dataframe.to_csv(buffer, index=False)
    st.download_button("Download CSV", buffer.getvalue(), filename, "text/csv")


def selected_date_range(date_range, fallback_date):
    if isinstance(date_range, (tuple, list)):
        if len(date_range) == 2:
            return date_range
        if date_range:
            return date_range[0], date_range[0]
    return fallback_date, fallback_date


def style_chart(figure, height: int = 340):
    figure.update_layout(
        template="simple_white",
        height=height,
        margin={"l": 12, "r": 12, "t": 16, "b": 12},
        font={"color": "#17212b"},
        hoverlabel={"bgcolor": "#17212b", "font_color": "#fffdf8"},
    )
    return figure


def main() -> None:
    try:
        df = get_sales_data()
    except ValueError as exc:
        st.error(f"Sales data could not be loaded: {exc}")
        st.stop()

    st.markdown('<div class="dashboard-kicker">Commercial performance / 2025</div>', unsafe_allow_html=True)
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
        forecast_periods = st.slider("Forecast months", min_value=1, max_value=12, value=3)

    start_date, end_date = selected_date_range(date_range, df["Date"].min().date())
    filtered_df = filter_sales_data(df, start_date, end_date, selected_regions, selected_categories)
    comparison_base = filter_sales_data(
        df,
        df["Date"].min(),
        df["Date"].max(),
        selected_regions,
        selected_categories,
    )

    if filtered_df.empty:
        st.warning("No sales match the selected filters.")
        return

    filtered_summary = get_sales_summary(filtered_df)
    monthly = filtered_summary["monthly_sales"]
    forecast = get_sales_forecast(filtered_df, forecast_periods)
    comparison = get_period_comparison(comparison_base, start_date, end_date)
    latest_growth = monthly.iloc[-1]["MoM_Growth_%"] if len(monthly) > 1 else None

    col1, col2, col3, col4, col5, col6 = st.columns(6)
    col1.metric("Revenue", f"${filtered_summary['total_revenue']:,.0f}", f"{comparison['changes']['revenue_pct']:+.1f}% vs prior")
    col2.metric("Units sold", f"{filtered_summary['total_units']:,}", f"{comparison['changes']['units']:+,.0f} vs prior")
    col3.metric("Estimated profit", f"${filtered_summary['total_profit']:,.0f}", f"{comparison['changes']['profit']:+,.0f} vs prior")
    col4.metric("Margin", f"{filtered_summary['estimated_margin']:.1f}%", f"{comparison['changes']['margin']:+.1f} pts")
    col5.metric("Best month", filtered_summary["best_month"])
    col6.metric("Worst month", filtered_summary["worst_month"])

    trend_col, download_col = st.columns([4, 1], gap="large")
    with trend_col:
        st.subheader("Performance pulse")
        st.caption("Solid lines show historical results. Dotted lines show the ML forecast.")
        revenue_trend = go.Figure()
        revenue_trend.add_trace(go.Scatter(x=monthly["Month"], y=monthly["Total_Sales"], mode="lines+markers", name="Historical revenue", line={"color": "#e4572e"}))
        revenue_trend.add_trace(go.Scatter(x=forecast["Forecast_Month"], y=forecast["Predicted_Revenue"], mode="lines+markers", name="Forecast revenue", line={"color": "#e4572e", "dash": "dot"}))
        revenue_trend = style_chart(revenue_trend)
        st.plotly_chart(revenue_trend, use_container_width=True, theme=None)
        units_trend = go.Figure()
        units_trend.add_trace(go.Scatter(x=monthly["Month"], y=monthly["Units_Sold"], mode="lines+markers", name="Historical units", line={"color": "#168c83"}))
        units_trend.add_trace(go.Scatter(x=forecast["Forecast_Month"], y=forecast["Predicted_Units"], mode="lines+markers", name="Forecast units", line={"color": "#168c83", "dash": "dot"}))
        units_trend = style_chart(units_trend, height=260)
        st.plotly_chart(units_trend, use_container_width=True, theme=None)
    with download_col:
        st.subheader("Export")
        dataframe_download(filtered_df, "filtered_sales_data.csv")

    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        st.subheader("Category contribution")
        category_chart = style_chart(
            px.bar(
                filtered_summary["category_sales"],
                x="Category",
                y="Contribution_%",
                color="Category",
                color_discrete_sequence=["#168c83", "#e4572e", "#e7a93b", "#4e79a7"],
                labels={"Contribution_%": "Share of revenue"},
                text_auto=".1f",
            )
        )
        st.plotly_chart(category_chart, use_container_width=True, theme=None)
        dataframe_download(filtered_summary["category_sales"], "category_sales.csv")

    with chart_col2:
        st.subheader("Region contribution")
        region_chart = style_chart(
            px.bar(
                filtered_summary["region_sales"],
                x="Region",
                y="Contribution_%",
                color="Region",
                color_discrete_sequence=["#e4572e", "#168c83", "#e7a93b", "#4e79a7"],
                labels={"Contribution_%": "Share of revenue"},
                text_auto=".1f",
            )
        )
        st.plotly_chart(region_chart, use_container_width=True, theme=None)
        dataframe_download(filtered_summary["region_sales"], "region_sales.csv")

    profit_col, anomaly_col = st.columns(2, gap="large")
    with profit_col:
        st.subheader("Profit and margin")
        profit_chart = style_chart(
            px.bar(
                monthly,
                x="Month",
                y="Estimated_Profit",
                color_discrete_sequence=["#e7a93b"],
                labels={"Estimated_Profit": "Estimated profit"},
            )
        )
        st.plotly_chart(profit_chart, use_container_width=True, theme=None)
    with anomaly_col:
        st.subheader("Anomaly watch")
        anomaly_chart = style_chart(
            px.scatter(
                monthly,
                x="Month",
                y="Total_Sales",
                color="Is_Anomaly",
                size="Units_Sold",
                color_discrete_map={False: "#168c83", True: "#e4572e"},
                labels={"Total_Sales": "Revenue", "Is_Anomaly": "Unusual month"},
            )
        )
        st.plotly_chart(anomaly_chart, use_container_width=True, theme=None)
        if filtered_summary["anomalies"].empty:
            st.caption("No unusual monthly sales patterns detected.")
        else:
            st.dataframe(filtered_summary["anomalies"], use_container_width=True, hide_index=True)
            dataframe_download(filtered_summary["anomalies"], "sales_anomalies.csv")

    top_products = filtered_summary["top_products"]
    product_chart_col, product_table_col = st.columns([1.15, 1], gap="large")
    with product_chart_col:
        st.subheader("Top products by units")
        product_chart = style_chart(
            px.bar(
                top_products.sort_values("Units_Sold"),
                x="Units_Sold",
                y="Product",
                orientation="h",
                color_discrete_sequence=["#168c83"],
                labels={"Units_Sold": "Units sold"},
            )
        )
        st.plotly_chart(product_chart, use_container_width=True, theme=None)
    with product_table_col:
        st.subheader("Product detail")
        st.dataframe(
            top_products,
            use_container_width=True,
            hide_index=True,
            column_config={"Units_Sold": st.column_config.NumberColumn("Units sold", format="%,d")},
        )

    with st.expander("Monthly detail"):
        st.dataframe(monthly, use_container_width=True, hide_index=True)
        dataframe_download(monthly, "monthly_sales.csv")

    with st.expander("Future sales prediction"):
        st.dataframe(forecast, use_container_width=True, hide_index=True)
        dataframe_download(forecast, "sales_forecast.csv")


if __name__ == "__main__":
    main()
