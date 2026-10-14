const charts = {};
const lightColors = ["#168c83", "#e4572e", "#e7a93b", "#4e79a7", "#7e8791", "#af4bce", "#3c9e6d", "#c0392b"];
const darkColors = ["#2dd4bf", "#ff7849", "#fbbf24", "#60a5fa", "#c084fc", "#e879f9", "#34d399", "#fb7185"];
const getColors = () => (getTheme() === "dark" ? darkColors : lightColors);
const statusColors = { Delivered: "#22c55e", Shipped: "#3b82f6", Processing: "#eab308", Returned: "#f97316", Cancelled: "#ef4444" };
const statusColorsDark = { Delivered: "#34d399", Shipped: "#60a5fa", Processing: "#fbbf24", Returned: "#fb923c", Cancelled: "#fb7185" };
const USD_TO_INR = 83;
let currentCurrency = localStorage.getItem("sales_currency") || "INR";
const moneyINR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const moneyUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateLabel = (value) => new Date(`${value}-02`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

const formatMoney = (val) => currentCurrency === "USD" ? moneyUSD.format(val || 0) : moneyINR.format((val || 0) * USD_TO_INR);
const formatMoneyShort = (val) => {
  if (currentCurrency === "USD") {
    const v = val || 0;
    return v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : moneyUSD.format(v));
  }
  const r = (val || 0) * USD_TO_INR;
  return r >= 100000 ? `₹${(r / 100000).toFixed(r >= 1000000 ? 0 : 1)}L` : moneyINR.format(r);
};

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

function updateCurrencyUI() {
  const sym = document.querySelector("#currency-symbol");
  const txt = document.querySelector("#currency-text");
  if (sym) sym.textContent = currentCurrency === "USD" ? "$" : "₹";
  if (txt) txt.textContent = currentCurrency;
}

function toggleCurrency() {
  currentCurrency = currentCurrency === "INR" ? "USD" : "INR";
  localStorage.setItem("sales_currency", currentCurrency);
  updateCurrencyUI();
  if (cachedDashboardData) {
    render(cachedDashboardData);
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
    callbacks: { label: (context) => formatMoney(context.raw) }
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
        ticks: { color: tickColor, font: { family: "JetBrains Mono", size: 10 }, callback: (value) => formatMoneyShort(value) }
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
      plugins: { legend: { display: false }, tooltip: getMoneyTooltip() },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const categoryName = data.categories[elements[0].index].name;
          const select = document.querySelector("#categories");
          Array.from(select.options).forEach(opt => opt.selected = opt.value === categoryName);
          load();
        }
      }
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
          label: "Upper 95% Bound",
          data: [
            ...Array(Math.max(0, data.monthly.length - 1)).fill(null),
            data.monthly.at(-1)?.revenue || 0,
            ...data.forecast.map((item) => item.upperRevenue ?? item.revenue)
          ],
          borderColor: "transparent",
          backgroundColor: "transparent",
          pointRadius: 0,
          tension: .35
        },
        {
          label: "Lower 95% Bound",
          data: [
            ...Array(Math.max(0, data.monthly.length - 1)).fill(null),
            data.monthly.at(-1)?.revenue || 0,
            ...data.forecast.map((item) => item.lowerRevenue ?? item.revenue)
          ],
          borderColor: "transparent",
          backgroundColor: isDark ? "rgba(251, 191, 36, 0.18)" : "rgba(231, 169, 59, 0.18)",
          fill: "-1",
          pointRadius: 0,
          tension: .35
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
      plugins: {
        ...defaults.plugins,
        tooltip: {
          ...getMoneyTooltip(),
          filter: (item) => item.datasetIndex !== 1 && item.datasetIndex !== 2
        }
      }
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
    `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${formatMoneyShort(item.revenue)}</b></div>`
  ).join("");

  const maxRegion = data.regions[0]?.revenue || 1;
  document.querySelector("#region-list").innerHTML = data.regions.map((item) =>
    `<div class="region-row"><span>${item.name}</span><div class="region-bar"><i style="width:${item.revenue / maxRegion * 100}%"></i></div><b>${formatMoneyShort(item.revenue)}</b></div>`
  ).join("");

  // Salesperson performance list
  if (data.salespersons && data.salespersons.length) {
    document.querySelector("#salesperson-list").innerHTML = data.salespersons.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${formatMoneyShort(item.revenue)}</b></div>`
    ).join("");
  }

  // Payment method list
  if (data.paymentMethods && data.paymentMethods.length) {
    document.querySelector("#payment-list").innerHTML = data.paymentMethods.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${formatMoneyShort(item.revenue)}</b></div>`
    ).join("");
  }

  // Customer type list
  if (data.customerTypes && data.customerTypes.length) {
    document.querySelector("#customer-type-list").innerHTML = data.customerTypes.map((item, index) =>
      `<div class="rank-row"><span><b style="color:${currentColors[index % currentColors.length]}">●</b> ${item.name}</span><b>${formatMoneyShort(item.revenue)}</b></div>`
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
    ? data.anomalies.map((item) => `<p class="anomaly"><b>${dateLabel(item.month)}</b> - ${formatMoneyShort(item.revenue)} revenue</p>`).join("")
    : `<p class="anomaly">No unusual monthly patterns detected.</p>`;
}

function renderRFM(rfmData) {
  if (!rfmData || !rfmData.length) return;
  const vip = rfmData.filter(c => c.Segment === "VIP");
  const atRisk = rfmData.filter(c => c.Segment === "At Risk");
  const newC = rfmData.filter(c => c.Segment === "New");
  const reg = rfmData.filter(c => c.Segment === "Regular");

  const vipEl = document.querySelector("#rfm-vip-count");
  const atRiskEl = document.querySelector("#rfm-at-risk-count");
  const newEl = document.querySelector("#rfm-new-count");
  const regEl = document.querySelector("#rfm-regular-count");

  if (vipEl) vipEl.textContent = number.format(vip.length);
  if (atRiskEl) atRiskEl.textContent = number.format(atRisk.length);
  if (newEl) newEl.textContent = number.format(newC.length);
  if (regEl) regEl.textContent = number.format(reg.length);

  const rfmBody = document.querySelector("#rfm-table-body");
  if (rfmBody) {
    rfmBody.innerHTML = rfmData.slice(0, 20).map(c => {
      const segClass = c.Segment.toLowerCase().replace(" ", "-");
      return `<tr>
        <td><b>${c.Customer_ID}</b></td>
        <td>${c.Recency} days ago</td>
        <td>${c.Frequency}</td>
        <td>${formatMoney(c.Monetary)}</td>
        <td><span class="segment-badge ${segClass}">${c.Segment}</span></td>
      </tr>`;
    }).join("");
  }
}

function renderCohort(cohortData) {
  if (!cohortData || !cohortData.length) return;
  const thead = document.querySelector("#cohort-table-head tr");
  const tbody = document.querySelector("#cohort-table-body");
  if (!thead || !tbody) return;

  const first = cohortData[0];
  const colKeys = Object.keys(first).filter(k => k !== "Cohort_Month" && k !== "index").sort((a, b) => Number(a) - Number(b));

  thead.innerHTML = `<th>Cohort Month</th>` + colKeys.map(k => `<th>Month ${k === "0" ? "0" : "+" + k}</th>`).join("");

  tbody.innerHTML = cohortData.map(row => {
    const month = row.Cohort_Month || row.index || "Cohort";
    const cells = colKeys.map(k => {
      const val = row[k];
      if (val === undefined || val === null) return `<td>-</td>`;
      const num = Number(val);
      let bg = "rgba(22, 140, 131, 0.08)";
      let color = "var(--ink)";
      if (num >= 80) { bg = "rgba(34, 197, 94, 0.25)"; color = "#16a34a"; }
      else if (num >= 40) { bg = "rgba(45, 212, 191, 0.2)"; color = "#0d9488"; }
      else if (num > 0) { bg = "rgba(251, 191, 36, 0.2)"; color = "#b45309"; }
      return `<td><span class="cohort-pill" style="background:${bg};color:${color}">${num.toFixed(0)}%</span></td>`;
    }).join("");
    return `<tr><td><b>${month}</b></td>${cells}</tr>`;
  }).join("");
}

let tableState = {
  search: "",
  sortColumn: "date",
  sortAsc: false,
  page: 1,
  pageSize: 25
};

function renderTable(data) {
  const tableBody = document.querySelector("#data-table-body");
  if (!tableBody || !data.rows) return;

  let rows = [...data.rows];

  if (tableState.search) {
    const q = tableState.search.toLowerCase();
    rows = rows.filter(r => 
      (r.orderId && r.orderId.toLowerCase().includes(q)) ||
      (r.customerName && r.customerName.toLowerCase().includes(q)) ||
      (r.product && r.product.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.region && r.region.toLowerCase().includes(q)) ||
      (r.orderStatus && r.orderStatus.toLowerCase().includes(q))
    );
  }

  rows.sort((a, b) => {
    let valA = a[tableState.sortColumn];
    let valB = b[tableState.sortColumn];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return tableState.sortAsc ? -1 : 1;
    if (valA > valB) return tableState.sortAsc ? 1 : -1;
    return 0;
  });

  const totalRows = rows.length;
  const pageSize = tableState.pageSize === "all" ? totalRows : Number(tableState.pageSize);
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  if (tableState.page > totalPages) tableState.page = totalPages;
  if (tableState.page < 1) tableState.page = 1;

  const startIdx = (tableState.page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageRows = rows.slice(startIdx, endIdx);

  tableBody.innerHTML = pageRows.map(row => 
    `<tr>
      <td><b>${row.orderId}</b></td>
      <td>${row.date}</td>
      <td>${row.customerName}</td>
      <td>${row.product}</td>
      <td>${row.category}</td>
      <td>${row.region}</td>
      <td>${number.format(row.units)}</td>
      <td>${formatMoneyShort(row.revenue)}</td>
      <td>${row.orderStatus}</td>
    </tr>`
  ).join("");

  const pageInfo = document.querySelector("#pagination-info");
  if (pageInfo) {
    pageInfo.textContent = totalRows ? `Showing ${startIdx + 1}-${Math.min(endIdx, totalRows)} of ${totalRows} transactions` : "0 transactions found";
  }
  const pageIndicator = document.querySelector("#page-indicator");
  if (pageIndicator) {
    pageIndicator.textContent = `Page ${tableState.page} of ${totalPages}`;
  }
  const prevBtn = document.querySelector("#prev-page");
  const nextBtn = document.querySelector("#next-page");
  if (prevBtn) prevBtn.disabled = tableState.page <= 1;
  if (nextBtn) nextBtn.disabled = tableState.page >= totalPages;
}

function setupTableControls() {
  const searchInput = document.querySelector("#table-search");
  searchInput?.addEventListener("input", (e) => {
    tableState.search = e.target.value.trim();
    tableState.page = 1;
    if (cachedDashboardData) renderTable(cachedDashboardData);
  });

  const pageSizeSelect = document.querySelector("#page-size");
  pageSizeSelect?.addEventListener("change", (e) => {
    tableState.pageSize = e.target.value;
    tableState.page = 1;
    if (cachedDashboardData) renderTable(cachedDashboardData);
  });

  document.querySelector("#prev-page")?.addEventListener("click", () => {
    if (tableState.page > 1) {
      tableState.page--;
      if (cachedDashboardData) renderTable(cachedDashboardData);
    }
  });

  document.querySelector("#next-page")?.addEventListener("click", () => {
    tableState.page++;
    if (cachedDashboardData) renderTable(cachedDashboardData);
  });

  document.querySelectorAll("#data-table th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");
      if (tableState.sortColumn === col) {
        tableState.sortAsc = !tableState.sortAsc;
      } else {
        tableState.sortColumn = col;
        tableState.sortAsc = true;
      }
      if (cachedDashboardData) renderTable(cachedDashboardData);
    });
  });
}

function setupAddOrderModal() {
  const modal = document.querySelector("#add-order-modal");
  const openBtn = document.querySelector("#open-add-modal");
  const closeBtn = document.querySelector("#close-add-modal");
  const cancelBtn = document.querySelector("#cancel-add-modal");
  const form = document.querySelector("#add-order-form");
  const feedback = document.querySelector("#form-feedback");

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    if (feedback) {
      feedback.classList.add("hidden");
      feedback.textContent = "";
    }
    const dateInput = document.querySelector("#form-date");
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    const nextId = cachedDashboardData?.rows?.length ? cachedDashboardData.rows.length + 1 : 163;
    const orderInput = document.querySelector("#form-order-id");
    if (orderInput) orderInput.value = `ORD-${String(nextId).padStart(5, '0')}`;
    const custInput = document.querySelector("#form-customer-id");
    if (custInput) custInput.value = `CUST-${String(Math.floor(Math.random() * 30) + 1).padStart(4, '0')}`;
  });

  const closeModal = () => {
    modal.classList.add("hidden");
    if (feedback) {
      feedback.classList.add("hidden");
      feedback.textContent = "";
    }
  };

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!feedback) return;
    feedback.className = "form-feedback";
    feedback.textContent = "Saving transaction and updating pipeline...";

    const payload = {
      Order_ID: document.querySelector("#form-order-id").value,
      Customer_ID: document.querySelector("#form-customer-id").value,
      Customer_Name: document.querySelector("#form-customer-name").value,
      Date: document.querySelector("#form-date").value,
      Product: document.querySelector("#form-product").value,
      Category: document.querySelector("#form-category").value,
      Region: document.querySelector("#form-region").value,
      Salesperson: document.querySelector("#form-salesperson").value,
      Units_Sold: Number(document.querySelector("#form-units").value),
      Unit_Price: Number(document.querySelector("#form-price").value),
      Discount: Number(document.querySelector("#form-discount").value || 0),
      Shipping_Cost: Number(document.querySelector("#form-shipping").value || 25),
      Payment_Method: document.querySelector("#form-payment").value,
      Order_Status: document.querySelector("#form-status").value,
    };

    try {
      const resp = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || "Failed to save sale");
      }
      feedback.classList.add("success");
      feedback.textContent = `Transaction ${result.orderId} added successfully! Refreshing...`;
      setTimeout(async () => {
        closeModal();
        form.reset();
        await load();
      }, 1000);
    } catch (err) {
      feedback.classList.add("error");
      feedback.textContent = `Error: ${err.message}`;
    }
  });
}

function setupUploadModal() {
  const modal = document.querySelector("#upload-modal");
  const openBtn = document.querySelector("#open-upload-modal");
  const closeBtn = document.querySelector("#close-upload-modal");
  const cancelBtn = document.querySelector("#cancel-upload-modal");
  const dropZone = document.querySelector("#drop-zone");
  const fileInput = document.querySelector("#csv-file-input");
  const submitBtn = document.querySelector("#submit-upload");
  const feedback = document.querySelector("#upload-feedback");
  const dropText = document.querySelector("#drop-zone-text");

  let selectedFile = null;

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    selectedFile = null;
    if (submitBtn) submitBtn.disabled = true;
    if (dropText) dropText.innerHTML = `Drag & drop your CSV file here, or <b style="color:var(--teal);cursor:pointer;">browse</b>`;
    if (feedback) {
      feedback.classList.add("hidden");
      feedback.textContent = "";
    }
  });

  const closeModal = () => {
    modal.classList.add("hidden");
    selectedFile = null;
    if (submitBtn) submitBtn.disabled = true;
    if (feedback) feedback.classList.add("hidden");
  };

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  dropZone?.addEventListener("click", () => fileInput?.click());

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer?.files?.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target?.files?.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.name.endsWith(".csv")) {
      feedback.className = "form-feedback error";
      feedback.classList.remove("hidden");
      feedback.textContent = "Please select a valid .csv file.";
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    selectedFile = file;
    if (submitBtn) submitBtn.disabled = false;
    feedback.classList.add("hidden");
    if (dropText) dropText.innerHTML = `Selected: <b>${file.name}</b> (${(file.size / 1024).toFixed(1)} KB)`;
  }

  submitBtn?.addEventListener("click", async () => {
    if (!selectedFile) return;
    feedback.className = "form-feedback";
    feedback.classList.remove("hidden");
    feedback.textContent = "Uploading and processing dataset...";
    submitBtn.disabled = true;

    try {
      const text = await selectedFile.text();
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text
      });
      const res = await resp.json();
      if (!resp.ok) {
        throw new Error(res.error || "Upload failed");
      }
      feedback.className = "form-feedback success";
      feedback.textContent = `Success! Processed ${res.count} transactions. Refreshing dashboard...`;
      setTimeout(async () => {
        closeModal();
        await load();
      }, 1200);
    } catch (err) {
      feedback.className = "form-feedback error";
      feedback.textContent = `Upload failed: ${err.message}`;
      submitBtn.disabled = false;
    }
  });
}

function render(data) {
  cachedDashboardData = data;
  const { metrics } = data;
  document.querySelector("#revenue").textContent = formatMoney(metrics.revenue);
  document.querySelector("#growth").textContent = `${metrics.growth >= 0 ? "+" : ""}${metrics.growth.toFixed(1)}% across period`;
  document.querySelector("#units").textContent = number.format(metrics.units);
  document.querySelector("#orders").textContent = `${number.format(metrics.orders)} transactions`;
  document.querySelector("#profit").textContent = formatMoney(metrics.profit);
  document.querySelector("#margin").textContent = `${metrics.margin.toFixed(1)}% estimated margin`;
  document.querySelector("#avg-order").textContent = formatMoney(metrics.avgOrder);
  document.querySelector("#top-category").textContent = metrics.topCategory;
  document.querySelector("#top-region").textContent = `${metrics.topRegion} leads by region`;
  document.querySelector("#top-salesperson").textContent = metrics.topSalesperson || "-";
  document.querySelector("#unique-customers").textContent = `${number.format(metrics.uniqueCustomers || 0)} unique customers`;
  document.querySelector("#total-shipping").textContent = formatMoney(metrics.totalShipping || 0);
  document.querySelector("#best-month").textContent = dateLabel(metrics.bestMonth);
  document.querySelector("#worst-month").textContent = dateLabel(metrics.worstMonth);
  document.querySelector("#forecast-total").textContent = formatMoney(data.forecast.reduce((total, item) => total + item.revenue, 0));

  const minRev = data.forecast.reduce((acc, item) => acc + (item.lowerRevenue ?? item.revenue), 0);
  const maxRev = data.forecast.reduce((acc, item) => acc + (item.upperRevenue ?? item.revenue), 0);
  const corridorEl = document.querySelector("#forecast-corridor");
  if (corridorEl) corridorEl.textContent = `${formatMoneyShort(minRev)} – ${formatMoneyShort(maxRev)}`;

  renderLists(data);
  renderCharts(data);
  renderRFM(data.rfm);
  renderCohort(data.cohort);
  renderTable(data);
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
  updateCurrencyUI();

  const toggleBtn = document.querySelector("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);
  }

  const currencyBtn = document.querySelector("#currency-toggle");
  if (currencyBtn) {
    currencyBtn.addEventListener("click", toggleCurrency);
  }

  setupTableControls();
  setupAddOrderModal();
  setupUploadModal();

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

// Chatbot functionality
document.querySelector("#chat-send")?.addEventListener("click", sendChatMessage);
document.querySelector("#chat-input")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

async function sendChatMessage() {
  const input = document.querySelector("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  
  const chatBody = document.querySelector("#chat-body");
  chatBody.innerHTML += `<div class="message user">${text}</div>`;
  input.value = "";
  chatBody.scrollTop = chatBody.scrollHeight;
  
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text, filters: Object.fromEntries(queryString()) })
    });
    const data = await response.json();
    chatBody.innerHTML += `<div class="message system">${data.answer || "Sorry, I couldn't understand that."}</div>`;
  } catch(e) {
    chatBody.innerHTML += `<div class="message system" style="color:red">Error reaching assistant.</div>`;
  }
  chatBody.scrollTop = chatBody.scrollHeight;
}
