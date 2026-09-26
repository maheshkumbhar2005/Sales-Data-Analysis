const charts = {};
const lightColors = ["#168c83", "#e4572e", "#e7a93b", "#4e79a7", "#7e8791", "#af4bce", "#3c9e6d", "#c0392b"];
const darkColors = ["#2dd4bf", "#ff7849", "#fbbf24", "#60a5fa", "#c084fc", "#e879f9", "#34d399", "#fb7185"];
const getColors = () => (getTheme() === "dark" ? darkColors : lightColors);
const statusColors = { Delivered: "#22c55e", Shipped: "#3b82f6", Processing: "#eab308", Returned: "#f97316", Cancelled: "#ef4444" };
const statusColorsDark = { Delivered: "#34d399", Shipped: "#60a5fa", Processing: "#fbbf24", Returned: "#fb923c", Cancelled: "#fb7185" };
const USD_TO_INR = 83;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateLabel = (value) => new Date(`${value}-02`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const rupees = (value) => value * USD_TO_INR;
const moneyShort = (value) => rupees(value) >= 100000 ? `₹${(rupees(value) / 100000).toFixed(rupees(value) >= 1000000 ? 0 : 1)}L` : money.format(rupees(value));

let cachedDashboardData = null;

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function updateThemeUI() {
  const currentTheme = getTheme();
  const themeText = document.querySelector(".theme-text");
  if (themeText) {
    themeText.textContent = currentTheme === "dark" ? "Light Mode" : "Dark Mode";
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sales_dashboard_theme", theme);
  updateThemeUI();
  if (cachedDashboardData) {
    render(cachedDashboardData);
  }
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

function getMoneyTooltip() {
  const isDark = getTheme() === "dark";
  return {
    backgroundColor: isDark ? "#1e293b" : "#101c2c",
    titleColor: "#ffffff",
    bodyColor: isDark ? "#38bdf8" : "#f8fafc",
    borderColor: isDark ? "#475569" : "transparent",
    borderWidth: isDark ? 1 : 0,
    padding: 10,
    titleFont: { family: "Outfit", weight: 600, size: 12 },
    bodyFont: { family: "JetBrains Mono", size: 11 },
    callbacks: { label: (context) => money.format(rupees(context.raw)) }
  };
}

function fillSelect(id, values) {
  const select = document.querySelector(`#${id}`);
  select.innerHTML = values.map((value) => `<option value="${value}" selected>${value}</option>`).join("");
}

function queryString() {
  const query = new URLSearchParams();
  const start = document.querySelector("#start-date").value;
  const end = document.querySelector("#end-date").value;
  if (start) query.set("start", start);
  if (end) query.set("end", end);
  document.querySelectorAll("#regions option:checked").forEach((option) => query.append("region", option.value));
  document.querySelectorAll("#categories option:checked").forEach((option) => query.append("category", option.value));
  query.set("periods", document.querySelector("#periods").value);
  return query;
}

function updateDownload() {
  document.querySelector("#download").href = `/api/download.csv?${queryString()}`;
}

function destroyChart(id) {
  if (charts[id]) charts[id].destroy();
}

function chartDefaults() {
  const isDark = getTheme() === "dark";
  const tickColor = isDark ? "#cbd5e1" : "#718096";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e9e7e1";
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: getMoneyTooltip()
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { family: "JetBrains Mono", size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        border: { display: false },
        ticks: { color: tickColor, font: { family: "JetBrains Mono", size: 10 }, callback: (value) => moneyShort(value) }
      }
    }
  };
}

function renderCharts(data) {
  const isDark = getTheme() === "dark";
  const pointBg = isDark ? "#131d27" : "#fffdf8";
  const doughnutBorder = isDark ? "#131d27" : "#fffdf8";
  const defaults = chartDefaults();

  destroyChart("trend");
  charts.trend = new Chart(document.querySelector("#trend-chart"), {
    type: "line",
    data: {
      labels: data.monthly.map((item) => dateLabel(item.month)),
      datasets: [
        {
          label: "Revenue",
          data: data.monthly.map((item) => item.revenue),
          borderColor: isDark ? "#ff7849" : "#e4572e",
          backgroundColor: isDark ? "rgba(255, 120, 73, 0.20)" : "rgba(228,87,46,.10)",
          fill: true,
          tension: .35,
          pointRadius: 4,
          pointBackgroundColor: pointBg,
          pointBorderWidth: 2
        },
        {
          label: "Units",
          data: data.monthly.map((item) => item.units),
          borderColor: isDark ? "#2dd4bf" : "#168c83",
          backgroundColor: "transparent",
          tension: .35,
          pointRadius: 4,
          pointBackgroundColor: pointBg,
          pointBorderWidth: 2,
          yAxisID: "units"
        }
      ]
    },
    options: {
      ...defaults,
      plugins: { ...defaults.plugins, tooltip: getMoneyTooltip() },
      scales: {
        ...defaults.scales,
        units: {
          position: "right",
          grid: { display: false },
          border: { display: false },
          ticks: { color: isDark ? "#2dd4bf" : "#168c83", font: { family: "JetBrains Mono", size: 10 } }
        }
      }
    }
  });

  destroyChart("growth");
  charts.growth = new Chart(document.querySelector("#growth-chart"), {
    type: "bar",
    data: {
      labels: data.monthly.map((item) => dateLabel(item.month)),
      datasets: [
        {
          data: data.monthly.map((item) => item.growth),
          backgroundColor: data.monthly.map((item) => item.growth >= 0 ? (isDark ? "#2dd4bf" : "#168c83") : (isDark ? "#fbbf24" : "#e7a93b")),
          borderRadius: 2,
          barPercentage: .65
        }
      ]
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        tooltip: {
          ...getMoneyTooltip(),
          callbacks: { label: (context) => `${context.raw.toFixed(1)}%` }
        }
      },
      scales: {
        ...defaults.scales,
        y: {
          ...defaults.scales.y,
          ticks: { ...defaults.scales.y.ticks, callback: (value) => `${value}%` }
        }
      }
    }
  });

  destroyChart("category");
  charts.category = new Chart(document.querySelector("#category-chart"), {
    type: "doughnut",
    data: {
      labels: data.categories.map((item) => item.name),
      datasets: [
        {
          data: data.categories.map((item) => item.revenue),
          backgroundColor: getColors(),
          borderWidth: 3,
          borderColor: doughnutBorder
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: { legend: { display: false }, tooltip: getMoneyTooltip() }
    }
  });

  destroyChart("product");
  charts.product = new Chart(document.querySelector("#product-chart"), {
    type: "bar",
    data: {
      labels: data.products.slice(0, 7).reverse().map((item) => item.name),
      datasets: [
        {
          data: data.products.slice(0, 7).reverse().map((item) => item.units),
          backgroundColor: isDark ? "#2dd4bf" : "#168c83",
          borderRadius: 2,
          barThickness: 14
        }
      ]
    },
    options: {
      indexAxis: "y",
      ...defaults,
      scales: {
        x: {
          ...defaults.scales.y,
          grid: { color: defaults.scales.y.grid.color },
          ticks: { color: defaults.scales.x.ticks.color, font: { size: 10 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: isDark ? "#f8fafc" : "#17212b", font: { family: "Plus Jakarta Sans", size: 11, weight: 600 } }
        }
      }
    }
  });

  const historicalLabels = data.monthly.map((item) => dateLabel(item.month));
  const forecastLabels = data.forecast.map((item) => dateLabel(item.month));
  destroyChart("forecast");
  charts.forecast = new Chart(document.querySelector("#forecast-chart"), {
    type: "line",
    data: {
      labels: [...historicalLabels, ...forecastLabels],
      datasets: [
        {
          label: "Historical",
          data: [...data.monthly.map((item) => item.revenue), ...Array(data.forecast.length).fill(null)],
          borderColor: isDark ? "#ff7849" : "#e4572e",
          backgroundColor: isDark ? "rgba(255, 120, 73, 0.16)" : "rgba(228,87,46,.08)",
          fill: true,
          tension: .35,
          pointRadius: 4
        },
        {
          label: "Forecast",
          data: [
            ...Array(Math.max(0, data.monthly.length - 1)).fill(null),
            data.monthly.at(-1)?.revenue || 0,
            ...data.forecast.map((item) => item.revenue)
          ],
          borderColor: isDark ? "#fbbf24" : "#e7a93b",
          borderDash: [6, 5],
          tension: .35,
          pointRadius: 4
        }
      ]
    },
    options: {
      ...defaults,
      plugins: { ...defaults.plugins, tooltip: getMoneyTooltip() }
    }
  });

  // Payment method doughnut
  if (data.paymentMethods && data.paymentMethods.length) {
    destroyChart("payment");
    charts.payment = new Chart(document.querySelector("#payment-chart"), {
      type: "doughnut",
      data: {
        labels: data.paymentMethods.map((item) => item.name),
        datasets: [{
          data: data.paymentMethods.map((item) => item.revenue),
          backgroundColor: getColors(),
          borderWidth: 3,
          borderColor: doughnutBorder
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: { legend: { display: false }, tooltip: getMoneyTooltip() }
      }
    });
  }

  // Customer type doughnut
  if (data.customerTypes && data.customerTypes.length) {
    destroyChart("customerType");
    charts.customerType = new Chart(document.querySelector("#customer-type-chart"), {
      type: "doughnut",
      data: {
        labels: data.customerTypes.map((item) => item.name),
        datasets: [{
          data: data.customerTypes.map((item) => item.revenue),
          backgroundColor: getColors().slice(2),
          borderWidth: 3,
          borderColor: doughnutBorder
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: { legend: { display: false }, tooltip: getMoneyTooltip() }
      }
    });
  }

  // Order status bar chart
  if (data.orderStatuses && data.orderStatuses.length) {
    const sColors = isDark ? statusColorsDark : statusColors;
    destroyChart("status");
    charts.status = new Chart(document.querySelector("#status-chart"), {
      type: "bar",
      data: {
        labels: data.orderStatuses.map((item) => item.status),
        datasets: [{
          data: data.orderStatuses.map((item) => item.count),
          backgroundColor: data.orderStatuses.map((item) => sColors[item.status] || (isDark ? "#60a5fa" : "#4e79a7")),
          borderRadius: 4,
          barPercentage: 0.6
        }]
      },
      options: {
        ...defaults,
        plugins: {
          ...defaults.plugins,
          tooltip: {
            ...getMoneyTooltip(),
            callbacks: { label: (context) => `${context.raw} orders` }
          }
        },
        scales: {
          ...defaults.scales,
          y: {
            ...defaults.scales.y,
            ticks: { ...defaults.scales.y.ticks, callback: (value) => value }
          }
        }
      }
    });
  }
}

function renderLists(data) {
  const currentColors = getColors();
  document.querySelector("#category-list").innerHTML = data.categories.map((item, index) =>
    `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${moneyShort(item.revenue)}</b></div>`
  ).join("");

  const maxRegion = data.regions[0]?.revenue || 1;
  document.querySelector("#region-list").innerHTML = data.regions.map((item) =>
    `<div class="region-row"><span>${item.name}</span><div class="region-bar"><i style="width:${item.revenue / maxRegion * 100}%"></i></div><b>${moneyShort(item.revenue)}</b></div>`
  ).join("");

  // Salesperson performance list
  if (data.salespersons && data.salespersons.length) {
    const maxSP = data.salespersons[0]?.revenue || 1;
    document.querySelector("#salesperson-list").innerHTML = data.salespersons.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${moneyShort(item.revenue)}</b></div>`
    ).join("");
  }

  // Payment method list
  if (data.paymentMethods && data.paymentMethods.length) {
    document.querySelector("#payment-list").innerHTML = data.paymentMethods.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${moneyShort(item.revenue)}</b></div>`
    ).join("");
  }

  // Customer type list
  if (data.customerTypes && data.customerTypes.length) {
    document.querySelector("#customer-type-list").innerHTML = data.customerTypes.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${moneyShort(item.revenue)}</b></div>`
    ).join("");
  }

  // Order status list
  if (data.orderStatuses && data.orderStatuses.length) {
    const maxStatus = data.orderStatuses[0]?.count || 1;
    const isDark = getTheme() === "dark";
    const sColors = isDark ? statusColorsDark : statusColors;
    document.querySelector("#status-list").innerHTML = data.orderStatuses.map((item) =>
      `<div class="region-row"><span>${item.status}</span><div class="region-bar"><i style="width:${item.count / maxStatus * 100}%;background:${sColors[item.status] || 'var(--teal)'}"></i></div><b>${number.format(item.count)}</b></div>`
    ).join("");
  }

  document.querySelector("#insights").innerHTML = [
    `${data.metrics.topCategory} generated the highest revenue.`,
    `${data.metrics.topRegion} region contributed the most sales.`,
    data.metrics.growth >= 0
      ? `Revenue grew ${data.metrics.growth.toFixed(1)}% across the selected period.`
      : `Revenue fell ${Math.abs(data.metrics.growth).toFixed(1)}% across the selected period.`,
    `${data.products[0]?.name || "No product"} leads by units sold.`,
    `${dateLabel(data.metrics.bestMonth)} was the strongest month.`,
    data.metrics.topSalesperson && data.metrics.topSalesperson !== "-"
      ? `${data.metrics.topSalesperson} is the top-performing salesperson.`
      : null,
    data.metrics.uniqueCustomers
      ? `${number.format(data.metrics.uniqueCustomers)} unique customers placed orders.`
      : null,
  ].filter(Boolean).map((text) => `<div class="insight">${text}</div>`).join("");

  document.querySelector("#anomalies").innerHTML = data.anomalies.length
    ? data.anomalies.map((item) => `<p class="anomaly"><b>${dateLabel(item.month)}</b> - ${moneyShort(item.revenue)} revenue</p>`).join("")
    : `<p class="anomaly">No unusual monthly patterns detected.</p>`;
}

function render(data) {
  cachedDashboardData = data;
  const { metrics } = data;
  document.querySelector("#revenue").textContent = money.format(rupees(metrics.revenue));
  document.querySelector("#growth").textContent = `${metrics.growth >= 0 ? "+" : ""}${metrics.growth.toFixed(1)}% across period`;
  document.querySelector("#units").textContent = number.format(metrics.units);
  document.querySelector("#orders").textContent = `${number.format(metrics.orders)} transactions`;
  document.querySelector("#profit").textContent = money.format(rupees(metrics.profit));
  document.querySelector("#margin").textContent = `${metrics.margin.toFixed(1)}% estimated margin`;
  document.querySelector("#avg-order").textContent = money.format(rupees(metrics.avgOrder));
  document.querySelector("#top-category").textContent = metrics.topCategory;
  document.querySelector("#top-region").textContent = `${metrics.topRegion} leads by region`;
  document.querySelector("#top-salesperson").textContent = metrics.topSalesperson || "-";
  document.querySelector("#unique-customers").textContent = `${number.format(metrics.uniqueCustomers || 0)} unique customers`;
  document.querySelector("#total-shipping").textContent = money.format(rupees(metrics.totalShipping || 0));
  document.querySelector("#best-month").textContent = dateLabel(metrics.bestMonth);
  document.querySelector("#worst-month").textContent = dateLabel(metrics.worstMonth);
  document.querySelector("#forecast-total").textContent = money.format(rupees(data.forecast.reduce((total, item) => total + item.revenue, 0)));

  renderLists(data);
  renderCharts(data);
}

async function load() {
  updateDownload();
  const response = await fetch(`/api/dashboard?${queryString()}`);
  const data = await response.json();
  const empty = !data.rows.length;
  document.querySelector("#empty-state").classList.toggle("hidden", !empty);
  document.querySelector("#dashboard").classList.toggle("hidden", empty);
  if (!empty) render(data);
}

async function init() {
  updateThemeUI();
  const toggleBtn = document.querySelector("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);
  }

  document.querySelectorAll(".workspace-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".workspace-nav a").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const response = await fetch("/api/dashboard");
  const data = await response.json();
  document.querySelector("#start-date").value = data.filters.minDate;
  document.querySelector("#end-date").value = data.filters.maxDate;
  fillSelect("regions", data.filters.regions);
  fillSelect("categories", data.filters.categories);
  document.querySelectorAll("#start-date, #end-date, #regions, #categories, #periods").forEach((element) => element.addEventListener("change", load));
  document.querySelector("#reset").addEventListener("click", () => {
    document.querySelector("#start-date").value = data.filters.minDate;
    document.querySelector("#end-date").value = data.filters.maxDate;
    document.querySelectorAll("#regions option, #categories option").forEach((option) => { option.selected = true; });
    document.querySelector("#periods").value = "3";
    load();
  });
  render(data);
}

init().catch((error) => {
  document.querySelector("#empty-state").textContent = `Dashboard could not load: ${error.message}`;
  document.querySelector("#empty-state").classList.remove("hidden");
});
