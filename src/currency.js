// Currency detection and conversion utility for CostLens reports.
// Detects user's timezone, maps to currency, and provides approximate exchange rates.

const TIMEZONE_TO_CURRENCY = {
  // Americas
  "America/New_York": "USD", "America/Chicago": "USD", "America/Denver": "USD",
  "America/Los_Angeles": "USD", "America/Phoenix": "USD", "America/Anchorage": "USD",
  "America/Honolulu": "USD", "America/Toronto": "CAD", "America/Vancouver": "CAD",
  "America/Montreal": "CAD", "America/Sao_Paulo": "BRL", "America/Argentina/Buenos_Aires": "ARS",
  "America/Mexico_City": "MXN", "America/Bogota": "COP", "America/Lima": "PEN",
  "America/Santiago": "CLP",
  // Europe
  "Europe/London": "GBP", "Europe/Dublin": "EUR", "Europe/Paris": "EUR",
  "Europe/Berlin": "EUR", "Europe/Madrid": "EUR", "Europe/Rome": "EUR",
  "Europe/Amsterdam": "EUR", "Europe/Brussels": "EUR", "Europe/Vienna": "EUR",
  "Europe/Lisbon": "EUR", "Europe/Helsinki": "EUR", "Europe/Stockholm": "SEK",
  "Europe/Oslo": "NOK", "Europe/Copenhagen": "DKK", "Europe/Warsaw": "PLN",
  "Europe/Prague": "CZK", "Europe/Budapest": "HUF", "Europe/Bucharest": "RON",
  "Europe/Istanbul": "TRY", "Europe/Moscow": "RUB", "Europe/Zurich": "CHF",
  "Europe/Geneva": "CHF",
  // Asia
  "Asia/Tokyo": "JPY", "Asia/Osaka": "JPY", "Asia/Shanghai": "CNY",
  "Asia/Hong_Kong": "HKD", "Asia/Singapore": "SGD", "Asia/Seoul": "KRW",
  "Asia/Kolkata": "INR", "Asia/Calcutta": "INR", "Asia/Mumbai": "INR",
  "Asia/Bangkok": "THB", "Asia/Jakarta": "IDR", "Asia/Manila": "PHP",
  "Asia/Kuala_Lumpur": "MYR", "Asia/Taipei": "TWD", "Asia/Dubai": "AED",
  "Asia/Riyadh": "SAR", "Asia/Tehran": "IRR", "Asia/Karachi": "PKR",
  "Asia/Dhaka": "BDT", "Asia/Colombo": "LKR", "Asia/Kathmandu": "NPR",
  "Asia/Ho_Chi_Minh": "VND",
  // Oceania
  "Australia/Sydney": "AUD", "Australia/Melbourne": "AUD", "Australia/Perth": "AUD",
  "Australia/Brisbane": "AUD", "Pacific/Auckland": "NZD",
  // Africa
  "Africa/Johannesburg": "ZAR", "Africa/Cairo": "EGP", "Africa/Lagos": "NGN",
  "Africa/Nairobi": "KES",
};

// Approximate exchange rates (USD to local). Updated periodically.
// These are estimates for display purposes only.
const EXCHANGE_RATES = {
  USD: 1, CAD: 1.36, BRL: 5.0, ARS: 850, MXN: 17.2, COP: 3900, PEN: 3.7,
  CLP: 920, GBP: 0.79, EUR: 0.92, SEK: 10.5, NOK: 10.8, DKK: 6.9, PLN: 4.0,
  CZK: 23.0, HUF: 360, RON: 4.6, TRY: 32.0, RUB: 92, CHF: 0.88, JPY: 150,
  CNY: 7.2, HKD: 7.8, SGD: 1.34, KRW: 1320, INR: 83.5, THB: 35.5, IDR: 15700,
  PHP: 56.5, MYR: 4.7, TWD: 31.5, AED: 3.67, SAR: 3.75, IRR: 42000,
  PKR: 278, BDT: 110, LKR: 300, NPR: 133, VND: 24500, AUD: 1.52, NZD: 1.63,
  ZAR: 18.5, EGP: 48, NGN: 1550, KES: 130,
};

export function detectCurrency() {
  let tz = "UTC";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {}
  const code = TIMEZONE_TO_CURRENCY[tz] || "USD";
  return { timezone: tz, code, rate: EXCHANGE_RATES[code] || 1 };
}

export function formatCurrency(usdAmount, currency) {
  const { code, rate } = currency;
  const local = usdAmount * rate;
  const usdStr = `$${usdAmount.toFixed(2)}`;
  if (code === "USD") return usdStr;
  // Format local amount
  let localStr;
  if (local >= 1000) {
    localStr = `${code} ${Math.round(local).toLocaleString()}`;
  } else if (local >= 1) {
    localStr = `${code} ${local.toFixed(2)}`;
  } else {
    localStr = `${code} ${local.toFixed(4)}`;
  }
  return `${usdStr} (${localStr})`;
}

export function getCurrencySymbol(code) {
  const symbols = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CNY: "¥",
    KRW: "₩", BRL: "R$", CAD: "C$", AUD: "A$", NZD: "NZ$", CHF: "CHF",
    SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", CZK: "Kč", HUF: "Ft",
    RON: "lei", TRY: "₺", RUB: "₽", SGD: "S$", HKD: "HK$", TWD: "NT$",
    THB: "฿", PHP: "₱", MYR: "RM", AED: "د.إ", SAR: "﷼", ZAR: "R",
    EGP: "E£", NGN: "₦", KES: "KSh", MXN: "$", ARS: "$", COP: "$",
    PEN: "S/", CLP: "$", IDR: "Rp", VND: "₫", PKR: "₨", BDT: "৳",
    LKR: "Rs", NPR: "Rs", IRR: "﷼", TWD: "NT$",
  };
  return symbols[code] || code;
}
