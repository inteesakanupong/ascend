// Tab navigation

function goTab(tab) {
  $$(".page").forEach(p => p.classList.remove("active"));
  const page = $(`#page-${tab}`);
  if (!page) tab = "today";
  $(`#page-${tab}`)?.classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  if (tab === "today")    renderToday();
  if (tab === "lift")     renderLift();
  if (tab === "weigh")    renderWeigh();
  if (tab === "stats")    renderStats();
  if (tab === "settings") renderSettings();
  window.scrollTo(0, 0);
}

// Sheet and toast utilities

// ───────── 11. MISC UI ─────────
function openSheet() { $("#scrim").classList.add("open"); $("#sheet").classList.add("open"); }
function closeSheet() { $("#scrim").classList.remove("open"); $("#sheet").classList.remove("open"); }
document.addEventListener("DOMContentLoaded", () => {
  const scrim = document.getElementById("scrim");
  if (scrim) scrim.addEventListener("click", closeSheet);
});

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1700);
}

// ───────── 11b. REST TIMER ─────────
