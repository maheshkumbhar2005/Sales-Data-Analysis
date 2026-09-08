const charts = {};
const colors = ["#168c83", "#e4572e", "#e7a93b", "#4e79a7", "#7e8791"];
const USD_TO_INR = 83;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateLabel = (value) => new Date(`${value}-02`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const rupees = (value) => value * USD_TO_INR;
const moneyShort = (value) => rupees(value) >= 100000 ? `₹${(rupees(value) / 100000).toFixed(rupees(value) >= 1000000 ? 0 : 1)}L` : money.format(rupees(value));
const moneyTooltip = { backgroundColor: "#101c2c", padding: 10, titleFont: { family: "DM Sans" }, bodyFont: { family: "DM Sans" }, callbacks: { label: (context) => money.format(rupees(context.raw)) } };

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

function destroyChart(id) { if (charts[id]) charts[id].destroy(); }
function chartDefaults() {
  return { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#101c2c", padding: 10, titleFont: { family: "DM Sans" }, bodyFont: { family: "DM Sans" } } }, scales: { x: { grid: { display: false }, ticks: { color: "#87918f", font: { family: "DM Sans", size: 10 } } }, y: { grid: { color: "#e9e7e1" }, border: { display: false }, ticks: { color: "#87918f", font: { family: "DM Sans", size: 10 }, callback: (value) => moneyShort(value) } } } };
}

function renderCharts(data) {
  destroyChart("trend");
  charts.trend = new Chart(document.querySelector("#trend-chart"), { type: "line", data: { labels: data.monthly.map((item) => dateLabel(item.month)), datasets: [{ label: "Revenue", data: data.monthly.map((item) => item.revenue), borderColor: "#e4572e", backgroundColor: "rgba(228,87,46,.10)", fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: "#fffdf8", pointBorderWidth: 2 }, { label: "Units", data: data.monthly.map((item) => item.units), borderColor: "#168c83", backgroundColor: "transparent", tension: .35, pointRadius: 3, pointBackgroundColor: "#fffdf8", pointBorderWidth: 2, yAxisID: "units" }] }, options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, tooltip: moneyTooltip }, scales: { ...chartDefaults().scales, units: { position: "right", grid: { display: false }, border: { display: false }, ticks: { color: "#87918f", font: { size: 10 } } } } } });
  destroyChart("growth");
  charts.growth = new Chart(document.querySelector("#growth-chart"), { type: "bar", data: { labels: data.monthly.map((item) => dateLabel(item.month)), datasets: [{ data: data.monthly.map((item) => item.growth), backgroundColor: data.monthly.map((item) => item.growth >= 0 ? "#168c83" : "#e7a93b"), borderRadius: 2, barPercentage: .65 }] }, options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, tooltip: { callbacks: { label: (context) => `${context.raw.toFixed(1)}%` } } }, scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, ticks: { callback: (value) => `${value}%` } } } } });
  destroyChart("category");
  charts.category = new Chart(document.querySelector("#category-chart"), { type: "doughnut", data: { labels: data.categories.map((item) => item.name), datasets: [{ data: data.categories.map((item) => item.revenue), backgroundColor: colors, borderWidth: 3, borderColor: "#fffdf8" }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false }, tooltip: moneyTooltip } } });
  destroyChart("product");
  charts.product = new Chart(document.querySelector("#product-chart"), { type: "bar", data: { labels: data.products.slice(0, 7).reverse().map((item) => item.name), datasets: [{ data: data.products.slice(0, 7).reverse().map((item) => item.units), backgroundColor: "#168c83", borderRadius: 2, barThickness: 14 }] }, options: { indexAxis: "y", ...chartDefaults(), scales: { x: { ...chartDefaults().scales.y, grid: { color: "#e9e7e1" }, ticks: { color: "#87918f", font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: "#17212b", font: { size: 10 } } } } } });
  const historicalLabels = data.monthly.map((item) => dateLabel(item.month));
  const forecastLabels = data.forecast.map((item) => dateLabel(item.month));
  destroyChart("forecast");
  charts.forecast = new Chart(document.querySelector("#forecast-chart"), { type: "line", data: { labels: [...historicalLabels, ...forecastLabels], datasets: [{ label: "Historical", data: [...data.monthly.map((item) => item.revenue), ...Array(data.forecast.length).fill(null)], borderColor: "#e4572e", backgroundColor: "rgba(228,87,46,.08)", fill: true, tension: .35, pointRadius: 3 }, { label: "Forecast", data: [...Array(Math.max(0, data.monthly.length - 1)).fill(null), data.monthly.at(-1)?.revenue || 0, ...data.forecast.map((item) => item.revenue)], borderColor: "#e4572e", borderDash: [6, 5], tension: .35, pointRadius: 3 }] }, options: { ...chartDefaults(), plugins: { ...chartDefaults().plugins, tooltip: moneyTooltip } } });
}

function renderLists(data) {
  document.querySelector("#category-list").innerHTML = data.categories.map((item, index) => `<div class="rank-row"><span><b style="color:${colors[index % colors.length]}">●</b> ${item.name}</span><b>${moneyShort(item.revenue)}</b></div>`).join("");
  const maxRegion = data.regions[0]?.revenue || 1;
  document.querySelector("#region-list").innerHTML = data.regions.map((item) => `<div class="region-row"><span>${item.name}</span><div class="region-bar"><i style="width:${item.revenue / maxRegion * 100}%"></i></div><b>${moneyShort(item.revenue)}</b></div>`).join("");
  document.querySelector("#insights").innerHTML = [`${data.metrics.topCategory} generated the highest revenue.`, `${data.metrics.topRegion} region contributed the most sales.`, data.metrics.growth >= 0 ? `Revenue grew ${data.metrics.growth.toFixed(1)}% across the selected period.` : `Revenue fell ${Math.abs(data.metrics.growth).toFixed(1)}% across the selected period.`, `${data.products[0]?.name || "No product"} leads by units sold.`, `${dateLabel(data.metrics.bestMonth)} was the strongest month.`].map((text) => `<div class="insight">${text}</div>`).join("");
  document.querySelector("#anomalies").innerHTML = data.anomalies.length ? data.anomalies.map((item) => `<p class="anomaly"><b>${dateLabel(item.month)}</b> - ${moneyShort(item.revenue)} revenue</p>`).join("") : `<p class="anomaly">No unusual monthly patterns detected.</p>`;
}

function render(data) {
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
  const response = await fetch("/api/dashboard");
  const data = await response.json();
  document.querySelector("#start-date").value = data.filters.minDate;
  document.querySelector("#end-date").value = data.filters.maxDate;
  fillSelect("regions", data.filters.regions);
  fillSelect("categories", data.filters.categories);
  document.querySelectorAll("#start-date, #end-date, #regions, #categories, #periods").forEach((element) => element.addEventListener("change", load));
  document.querySelector("#reset").addEventListener("click", () => { document.querySelector("#start-date").value = data.filters.minDate; document.querySelector("#end-date").value = data.filters.maxDate; document.querySelectorAll("#regions option, #categories option").forEach((option) => { option.selected = true; }); document.querySelector("#periods").value = "3"; load(); });
  render(data);
}
init().catch((error) => { document.querySelector("#empty-state").textContent = `Dashboard could not load: ${error.message}`; document.querySelector("#empty-state").classList.remove("hidden"); });
