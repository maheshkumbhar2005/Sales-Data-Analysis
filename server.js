import { createServer } from "node:http";
import { readFile, appendFile, writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataPath = join(root, "data", "sales_data.csv");
const publicPath = join(root, "public");
const outputDir = join(root, "output");
const port = Number(process.env.PORT || 5000);

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
    orderId: row.Order_ID || "",
    customerId: row.Customer_ID || "",
    customerName: row.Customer_Name || "",
    date: row.Date,
    product: row.Product,
    category: row.Category,
    region: row.Region,
    units: Number(row.Units_Sold),
    price: Number(row.Unit_Price),
    revenue: Number(row.Total_Sales),
    profit: Number(row.Profit || Number(row.Total_Sales) * 0.3),
    discount: Number(row.Discount || 0),
    salesperson: row.Salesperson || "",
    paymentMethod: row.Payment_Method || "",
    customerType: row.Customer_Type || "",
    shippingCost: Number(row.Shipping_Cost || 0),
    orderStatus: row.Order_Status || "",
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
  const n = months.length;
  const average = sum(months, "revenue") / n;
  const last = months[n - 1];
  const slope = n > 1 ? (last.revenue - months[0].revenue) / (n - 1) : 0;
  
  // Calculate standard error of residuals
  let sumSqErr = 0;
  for (let i = 0; i < n; i++) {
    const fitted = average + slope * (i - (n - 1) / 2);
    sumSqErr += Math.pow(months[i].revenue - fitted, 2);
  }
  const se = n > 2 ? Math.sqrt(sumSqErr / (n - 2)) : average * 0.12;

  const lastDate = new Date(`${last.month}-01T00:00:00`);
  return Array.from({ length: periods }, (_, index) => {
    const date = new Date(lastDate);
    date.setMonth(date.getMonth() + index + 1);
    const month = date.toISOString().slice(0, 7);
    const predictedRevenue = Math.max(0, average + slope * (n + index - 1));
    const factor = Math.sqrt(1 + 1 / n + Math.pow(index + 1, 2) / Math.max(1, n));
    const margin = 1.96 * se * factor;
    return {
      month,
      revenue: Math.round(predictedRevenue),
      upperRevenue: Math.round(predictedRevenue + margin),
      lowerRevenue: Math.max(0, Math.round(predictedRevenue - margin)),
      units: Math.max(0, Math.round(sum(months, "units") / n + ((last.units - months[0].units) / Math.max(1, n - 1)) * (n + index - 1))),
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
  const totalShipping = sum(filtered, "shippingCost");
  const monthly = groupMonthly(filtered);
  const categories = groupBy(filtered, "category");
  const regions = groupBy(filtered, "region");
  const products = groupBy(filtered, "product");
  const salespersons = groupBy(filtered, "salesperson");

  // Payment method breakdown
  const paymentMap = new Map();
  for (const s of filtered) {
    const entry = paymentMap.get(s.paymentMethod) || { name: s.paymentMethod, revenue: 0, units: 0, count: 0 };
    entry.revenue += s.revenue;
    entry.units += s.units;
    entry.count += 1;
    paymentMap.set(s.paymentMethod, entry);
  }
  const paymentMethods = [...paymentMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Customer type breakdown
  const custTypeMap = new Map();
  for (const s of filtered) {
    const entry = custTypeMap.get(s.customerType) || { name: s.customerType, revenue: 0, units: 0, profit: 0, count: 0 };
    entry.revenue += s.revenue;
    entry.units += s.units;
    entry.profit += s.profit;
    entry.count += 1;
    custTypeMap.set(s.customerType, entry);
  }
  const customerTypes = [...custTypeMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Order status breakdown
  const statusMap = new Map();
  for (const s of filtered) {
    statusMap.set(s.orderStatus, (statusMap.get(s.orderStatus) || 0) + 1);
  }
  const orderStatuses = [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

  // Unique customers
  const uniqueCustomers = new Set(filtered.map((s) => s.customerId)).size;

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
      salespersons: [...new Set(sales.map((sale) => sale.salesperson))].filter(Boolean).sort(),
      paymentMethods: [...new Set(sales.map((sale) => sale.paymentMethod))].filter(Boolean).sort(),
      customerTypes: [...new Set(sales.map((sale) => sale.customerType))].filter(Boolean).sort(),
      orderStatuses: [...new Set(sales.map((sale) => sale.orderStatus))].filter(Boolean).sort(),
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
      topSalesperson: salespersons[0]?.name || "-",
      uniqueCustomers,
      totalShipping,
      bestMonth: [...monthly].sort((a, b) => b.revenue - a.revenue)[0]?.month || "-",
      worstMonth: [...monthly].sort((a, b) => a.revenue - b.revenue)[0]?.month || "-",
      growth: monthly.length > 1 ? ((last.revenue - first.revenue) / first.revenue) * 100 : 0,
    },
    monthly,
    categories,
    regions,
    products: products.slice(0, 10),
    salespersons,
    paymentMethods,
    customerTypes,
    orderStatuses,
    anomalies,
    forecast: linearForecast(monthly, Math.min(12, Math.max(1, Number(params.periods) || 3))),
    rows: filtered,
    rfm: rfmData,
    cohort: cohortData,
  };
}

function csv(items) {
  if (!items.length) return "";
  const columns = Object.keys(items[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...items.map((item) => columns.map((column) => escape(item[column])).join(","))].join("\n");
}

let sales = parseCsv(await readFile(dataPath, "utf8")).map(toSale).sort((a, b) => a.date.localeCompare(b.date));
let rfmData = [];
let cohortData = [];

async function loadAnalytics() {
  try {
    rfmData = JSON.parse(await readFile(join(outputDir, "rfm_analysis.json"), "utf8"));
  } catch {
    rfmData = [];
  }
  try {
    cohortData = JSON.parse(await readFile(join(outputDir, "cohort_retention.json"), "utf8"));
  } catch {
    cohortData = [];
  }
}
await loadAnalytics();

function queryParams(url) {
  return {
    start: url.searchParams.get("start") || "",
    end: url.searchParams.get("end") || "",
    regions: url.searchParams.getAll("region"),
    categories: url.searchParams.getAll("category"),
    periods: url.searchParams.get("periods") || "3",
  };
}

const handleRequest = async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname === "/api/dashboard") {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(buildDashboard(sales, queryParams(url))));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/upload") {
      let body = "";
      request.on("data", chunk => body += chunk.toString());
      request.on("end", async () => {
        try {
          if (!body || !body.trim()) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Uploaded CSV content is empty." }));
            return;
          }
          const parsed = parseCsv(body);
          if (parsed.length < 2) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "CSV must contain at least a header and one row." }));
            return;
          }
          const headers = new Set(parsed[0]);
          const required = ["Order_ID", "Date", "Product", "Category", "Region", "Units_Sold", "Unit_Price", "Total_Sales"];
          for (const req of required) {
            if (!headers.has(req)) {
              response.writeHead(400, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ error: `Missing required column: ${req}` }));
              return;
            }
          }

          await writeFile(dataPath, body, "utf8");
          sales = parseCsv(await readFile(dataPath, "utf8")).map(toSale).sort((a, b) => a.date.localeCompare(b.date));

          exec("python main.py", async (err) => {
            if (err) console.error("Error running main.py on upload:", err);
            else await loadAnalytics();
          });

          response.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          response.end(JSON.stringify({ success: true, message: "Dataset uploaded successfully", count: sales.length }));
        } catch(e) {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/sales") {
      let body = "";
      request.on("data", chunk => body += chunk.toString());
      request.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          
          // Validate required fields
          const required = ["Product", "Category", "Region", "Units_Sold", "Unit_Price"];
          for (const field of required) {
            const val = payload[field] ?? payload[field.toLowerCase()];
            if (val === undefined || val === null || String(val).trim() === "") {
              response.writeHead(400, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ error: `Field '${field}' is required and cannot be empty.` }));
              return;
            }
          }
          
          const units = Number(payload.Units_Sold ?? payload.units_sold);
          const price = Number(payload.Unit_Price ?? payload.unit_price);
          if (isNaN(units) || units <= 0 || !Number.isInteger(units)) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Units_Sold must be a positive integer." }));
            return;
          }
          if (isNaN(price) || price <= 0) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "Unit_Price must be a positive number." }));
            return;
          }
          
          const validStatuses = new Set(["Delivered", "Shipped", "Processing", "Returned", "Cancelled"]);
          const status = payload.Order_Status || payload.order_status || "Delivered";
          if (!validStatuses.has(status)) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: `Invalid Order_Status. Allowed: ${[...validStatuses].join(", ")}` }));
            return;
          }

          const validPayment = new Set(["Credit Card", "Debit Card", "UPI", "Net Banking", "Cash on Delivery"]);
          const payment = payload.Payment_Method || payload.payment_method || "Credit Card";
          if (!validPayment.has(payment)) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: `Invalid Payment_Method. Allowed: ${[...validPayment].join(", ")}` }));
            return;
          }

          const validCustomerType = new Set(["Regular", "Premium", "Enterprise"]);
          const customerType = payload.Customer_Type || payload.customer_type || "Regular";
          if (!validCustomerType.has(customerType)) {
            response.writeHead(400, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: `Invalid Customer_Type. Allowed: ${[...validCustomerType].join(", ")}` }));
            return;
          }

          // Generate IDs if missing
          const orderId = payload.Order_ID || payload.order_id || `ORD-${String(sales.length + 1).padStart(5, "0")}`;
          const customerId = payload.Customer_ID || payload.customer_id || `CUST-${String(Math.floor(Math.random() * 30) + 1).padStart(4, "0")}`;
          const customerName = payload.Customer_Name || payload.customer_name || "Valued Customer";
          const date = payload.Date || payload.date || new Date().toISOString().slice(0, 10);
          const discount = Number(payload.Discount ?? payload.discount ?? 0);
          const totalSales = Number(payload.Total_Sales ?? payload.total_sales ?? (units * price * (1 - discount / 100)));
          const costRatio = 0.7;
          const costPrice = Number(payload.Cost_Price ?? (price * costRatio).toFixed(2));
          const profit = Number(payload.Profit ?? (totalSales * (1 - costRatio)).toFixed(2));
          const profitMargin = Number(payload.Profit_Margin ?? ((1 - costRatio) * 100).toFixed(2));
          const shippingCost = Number(payload.Shipping_Cost ?? payload.shipping_cost ?? 25);
          const salesperson = payload.Salesperson || payload.salesperson || "Sunita Rao";

          const normalized = {
            Order_ID: orderId,
            Customer_ID: customerId,
            Customer_Name: customerName,
            Date: date,
            Product: payload.Product || payload.product,
            Category: payload.Category || payload.category,
            Region: payload.Region || payload.region,
            Units_Sold: units,
            Unit_Price: price,
            Total_Sales: totalSales,
            Cost_Price: costPrice,
            Profit: profit,
            Profit_Margin: profitMargin,
            Discount: discount,
            Salesperson: salesperson,
            Payment_Method: payment,
            Customer_Type: customerType,
            Shipping_Cost: shippingCost,
            Order_Status: status
          };

          const columns = ["Order_ID","Customer_ID","Customer_Name","Date","Product","Category","Region","Units_Sold","Unit_Price","Total_Sales","Cost_Price","Profit","Profit_Margin","Discount","Salesperson","Payment_Method","Customer_Type","Shipping_Cost","Order_Status"];
          const row = "\n" + columns.map(c => `"${String(normalized[c] ?? "").replaceAll('"', '""')}"`).join(",");
          
          await appendFile(dataPath, row);
          
          sales = parseCsv(await readFile(dataPath, "utf8")).map(toSale).sort((a, b) => a.date.localeCompare(b.date));
          
          exec("python main.py", async (err) => {
            if (err) console.error("Error running main.py:", err);
            else await loadAnalytics();
          });
          
          response.writeHead(201, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
          response.end(JSON.stringify({ success: true, message: "Sale added and pipeline triggered", orderId }));
        } catch(e) {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/chat") {
      let body = "";
      request.on("data", chunk => body += chunk.toString());
      request.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const q = (payload.question || "").toLowerCase();
          
          const dash = buildDashboard(sales, payload.filters || { regions: [], categories: [] });
          let answer = "";
          
          if (q.includes("best month") || q.includes("top month") || q.includes("highest month")) {
            answer = `The best month for revenue was ${dash.metrics.bestMonth}.`;
          } else if (q.includes("worst month") || q.includes("lowest month")) {
            answer = `The lowest month for revenue was ${dash.metrics.worstMonth}.`;
          } else if (q.includes("revenue") || q.includes("total sales")) {
            answer = `The total revenue for the current filters is $${dash.metrics.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}.`;
          } else if (q.includes("profit") || q.includes("margin")) {
            answer = `Estimated profit is $${dash.metrics.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} with an estimated margin of ${dash.metrics.margin.toFixed(1)}%.`;
          } else if (q.includes("category") || q.includes("top category")) {
            answer = `The highest generating category is ${dash.metrics.topCategory}.`;
          } else if (q.includes("product") || q.includes("top product")) {
            answer = `The top-selling product by units is ${dash.products[0]?.name || "N/A"}.`;
          } else if (q.includes("salesperson") || q.includes("rep") || q.includes("team")) {
            answer = `The leading salesperson is ${dash.metrics.topSalesperson} with top revenue across orders.`;
          } else if (q.includes("region") || q.includes("geography")) {
            answer = `The leading region by revenue is ${dash.metrics.topRegion}.`;
          } else if (q.includes("shipping") || q.includes("delivery cost")) {
            answer = `Total shipping expenses across orders sum to $${dash.metrics.totalShipping.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}.`;
          } else if (q.includes("status") || q.includes("delivery") || q.includes("return")) {
            const statusSummary = (dash.orderStatuses || []).map(s => `${s.status}: ${s.count}`).join(", ");
            answer = `Order fulfillment breakdown: ${statusSummary}.`;
          } else if (q.includes("vip") || q.includes("loyalty") || q.includes("rfm")) {
            const vipCount = (rfmData || []).filter(c => c.Segment === "VIP").length;
            const atRiskCount = (rfmData || []).filter(c => c.Segment === "At Risk").length;
            answer = `Customer segmentation: ${vipCount} VIP customers and ${atRiskCount} At-Risk customers identified via RFM analysis.`;
          } else if (q.includes("unique") || q.includes("customers")) {
            answer = `There are ${dash.metrics.uniqueCustomers} unique customers in this selection.`;
          } else if (q.includes("average") || q.includes("aov")) {
            answer = `The average order value is $${dash.metrics.avgOrder.toFixed(2)}.`;
          } else if (q.includes("anomaly") || q.includes("irregular")) {
            answer = `There are ${dash.anomalies.length} anomaly periods detected in historical monthly volume.`;
          } else {
            answer = `I can answer queries about total revenue, best/worst months, top products/categories, salespeople, regions, order fulfillment, RFM VIP customers, and profit margins. What would you like to know?`;
          }
          
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ answer }));
        } catch(e) {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    if (url.pathname === "/api/download.csv") {
      response.writeHead(200, { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=filtered_sales.csv" });
      response.end(csv(buildDashboard(sales, queryParams(url)).rows));
      return;
    }
    if (url.pathname.startsWith("/output/")) {
      const relPath = url.pathname.replace(/^\/output\//, "");
      const filePath = normalize(join(outputDir, relPath));
      if (!filePath.startsWith(outputDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const content = await readFile(filePath);
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".json": "application/json",
        ".csv": "text/csv",
      };
      response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
      response.end(content);
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
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
    response.end(error.code === "ENOENT" ? "Not found" : "Server error");
  }
};

const server = createServer(handleRequest);
server.listen(port, () => console.log(`Sales dashboard running at http://localhost:${port}`));

if (port !== 3000) {
  const altServer = createServer(handleRequest);
  altServer.on("error", () => {});
  altServer.listen(3000, () => console.log(`Also accessible at http://localhost:3000`));
}
