import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataPath = join(root, "data", "sales_data.csv");
const publicPath = join(root, "public");
const port = Number(process.env.PORT || 3000);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function toSale(row) {
  return {
    date: row.Date,
    product: row.Product,
    category: row.Category,
    region: row.Region,
    units: Number(row.Units_Sold),
    price: Number(row.Unit_Price),
    revenue: Number(row.Total_Sales),
    profit: Number(row.Profit || Number(row.Total_Sales) * 0.3),
    discount: Number(row.Discount || 0),
  };
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item[key]) || { name: item[key], revenue: 0, units: 0, profit: 0 };
    group.revenue += item.revenue;
    group.units += item.units;
    group.profit += item.profit;
    groups.set(item[key], group);
  }
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
}

function monthKey(date) {
  return date.slice(0, 7);
}

function groupMonthly(items) {
  const groups = new Map();
  for (const item of items) {
    const month = monthKey(item.date);
    const group = groups.get(month) || { month, revenue: 0, units: 0, profit: 0 };
    group.revenue += item.revenue;
    group.units += item.units;
    group.profit += item.profit;
    groups.set(month, group);
  }
  const months = [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
  return months.map((item, index) => ({
    ...item,
    growth: index && months[index - 1].revenue ? ((item.revenue - months[index - 1].revenue) / months[index - 1].revenue) * 100 : 0,
  }));
}

function linearForecast(months, periods) {
  if (!months.length) return [];
  const average = sum(months, "revenue") / months.length;
  const last = months[months.length - 1];
  const slope = months.length > 1 ? (last.revenue - months[0].revenue) / (months.length - 1) : 0;
  const lastDate = new Date(`${last.month}-01T00:00:00`);
  return Array.from({ length: periods }, (_, index) => {
    const date = new Date(lastDate);
    date.setMonth(date.getMonth() + index + 1);
    const month = date.toISOString().slice(0, 7);
    return {
      month,
      revenue: Math.max(0, average + slope * (months.length + index - 1)),
      units: Math.max(0, Math.round(sum(months, "units") / months.length + ((last.units - months[0].units) / Math.max(1, months.length - 1)) * (months.length + index - 1))),
    };
  });
}

function buildDashboard(sales, params) {
  const filtered = sales.filter((sale) =>
    (!params.start || sale.date >= params.start) &&
    (!params.end || sale.date <= params.end) &&
    (!params.regions.length || params.regions.includes(sale.region)) &&
    (!params.categories.length || params.categories.includes(sale.category))
  );
  const revenue = sum(filtered, "revenue");
  const profit = sum(filtered, "profit");
  const monthly = groupMonthly(filtered);
  const categories = groupBy(filtered, "category");
  const regions = groupBy(filtered, "region");
  const products = groupBy(filtered, "product");
  const anomalies = monthly.length >= 3
    ? monthly.filter((month) => month.revenue > revenue / monthly.length * 1.5 || month.revenue < revenue / monthly.length * 0.5).map((month) => ({ ...month, reason: "Revenue moved notably from the period average" }))
    : [];
  const first = monthly[0];
  const last = monthly[monthly.length - 1];
  return {
    filters: {
      minDate: sales[0]?.date || "",
      maxDate: sales.at(-1)?.date || "",
      regions: [...new Set(sales.map((sale) => sale.region))].sort(),
      categories: [...new Set(sales.map((sale) => sale.category))].sort(),
    },
    metrics: {
      revenue,
      units: sum(filtered, "units"),
      profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      orders: filtered.length,
      avgOrder: filtered.length ? revenue / filtered.length : 0,
      topCategory: categories[0]?.name || "-",
      topRegion: regions[0]?.name || "-",
      bestMonth: [...monthly].sort((a, b) => b.revenue - a.revenue)[0]?.month || "-",
      worstMonth: [...monthly].sort((a, b) => a.revenue - b.revenue)[0]?.month || "-",
      growth: monthly.length > 1 ? ((last.revenue - first.revenue) / first.revenue) * 100 : 0,
    },
    monthly,
    categories,
    regions,
    products: products.slice(0, 10),
    anomalies,
    forecast: linearForecast(monthly, Math.min(12, Math.max(1, Number(params.periods) || 3))),
    rows: filtered,
  };
}

function csv(items) {
  if (!items.length) return "";
  const columns = Object.keys(items[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...items.map((item) => columns.map((column) => escape(item[column])).join(","))].join("\n");
}

const sales = parseCsv(await readFile(dataPath, "utf8")).map(toSale).sort((a, b) => a.date.localeCompare(b.date));

function queryParams(url) {
  return {
    start: url.searchParams.get("start") || "",
    end: url.searchParams.get("end") || "",
    regions: url.searchParams.getAll("region"),
    categories: url.searchParams.getAll("category"),
    periods: url.searchParams.get("periods") || "3",
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname === "/api/dashboard") {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(buildDashboard(sales, queryParams(url))));
      return;
    }
    if (url.pathname === "/api/download.csv") {
      response.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=filtered_sales.csv" });
      response.end(csv(buildDashboard(sales, queryParams(url)).rows));
      return;
    }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(publicPath, requested));
    if (!filePath.startsWith(publicPath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    const content = await readFile(filePath);
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
});

server.listen(port, () => console.log(`Sales dashboard running at http://localhost:${port}`));
