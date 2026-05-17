// Core helpers: DOM selectors, date utilities, formatters
// Loaded first so all other modules can use $, $$, todayISO, escapeHtml etc.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
function nowTH() {
  // Returns a Date whose UTC values represent Thai local time
  return new Date(Date.now() + TZ_OFFSET_MS);
}

function todayISO() {
  // Always returns today's date in Thailand time (UTC+7)
  return nowTH().toISOString().slice(0, 10);
}

function isoToDate(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((isoToDate(b) - isoToDate(a)) / 86400000);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = isoToDate(iso);
  const wk = ["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()];
  return `${wk} ${d.getDate()} ${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()]} ${d.getFullYear()}`;
}

function fmtWeight(w) {
  if (w === undefined || w === null || w === "") return "—";
  return Number(w).toFixed(Number.isInteger(Number(w)) ? 0 : 1);
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

