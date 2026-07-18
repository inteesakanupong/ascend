// Running logger and summaries. Uses the shared bottom sheet to preserve the five-tab layout.

function runTypeLabel(type) {
  return (RUN_TYPES[type] || RUN_TYPES.easy).label;
}

function runBodyweightForDate(date) {
  const logs = (STATE.dailyLogs || [])
    .filter(log => log.date <= date && Number.isFinite(Number(log.weight)))
    .sort((a, b) => b.date.localeCompare(a.date));
  return Number(logs[0]?.weight || STATE.profile?.bodyweight || 80);
}

function openRunLogger(runId = null) {
  const existing = runId ? (STATE.runSessions || []).find(run => run.id === runId) : null;
  const run = existing || normalizeRunSession({
    id: `run-${Date.now()}`,
    date: todayISO(),
    type: "easy",
    environment: "outdoor",
    rpe: 5,
  });
  const totalMinutes = Math.floor((run.durationSec || 0) / 60);
  const seconds = (run.durationSec || 0) % 60;
  $("#sheet-body").innerHTML = `
    <h3 style="margin-bottom:4px;">${existing ? "Edit" : "Log"} Run</h3>
    <div class="muted" style="font-size:11px;margin-bottom:14px;line-height:1.5;">Distance and duration drive pace. RPE and run type drive recovery load.</div>
    <div class="input-grid">
      <div class="input"><label>Date</label><input type="date" id="run-date" value="${escapeHtml(run.date)}"></div>
      <div class="input"><label>Start time</label><input type="time" id="run-time" value="${escapeHtml(run.startTime || "")}"></div>
      <div class="input"><label>Run type</label><select id="run-type">
        ${Object.entries(RUN_TYPES).map(([value, config]) => `<option value="${value}" ${run.type === value ? "selected" : ""}>${config.label}</option>`).join("")}
      </select></div>
      <div class="input"><label>Environment</label><select id="run-environment">
        ${[["outdoor","Outdoor"],["treadmill","Treadmill"],["trail","Trail"]].map(([value,label]) => `<option value="${value}" ${run.environment === value ? "selected" : ""}>${label}</option>`).join("")}
      </select></div>
      <div class="input"><label>Distance (km)</label><input type="number" inputmode="decimal" min="0.01" step="0.01" id="run-distance" value="${run.distanceKm || ""}" placeholder="5.00"></div>
      <div class="input"><label>Duration (minutes)</label><input type="number" inputmode="numeric" min="0" step="1" id="run-minutes" value="${totalMinutes || ""}" placeholder="30"></div>
      <div class="input"><label>Extra seconds</label><input type="number" inputmode="numeric" min="0" max="59" step="1" id="run-seconds" value="${seconds || ""}" placeholder="00"></div>
      <div class="input"><label>Session RPE (1-10)</label><input type="number" inputmode="numeric" min="1" max="10" step="1" id="run-rpe" value="${run.rpe}"></div>
      <div class="input"><label>Average HR (optional)</label><input type="number" inputmode="numeric" min="30" max="240" step="1" id="run-hr" value="${run.avgHr || ""}" placeholder="bpm"></div>
      <div class="input"><label>Elevation gain (m)</label><input type="number" inputmode="numeric" min="0" step="1" id="run-elevation" value="${run.elevationM || ""}" placeholder="0"></div>
      <div class="input"><label>Surface (optional)</label><input type="text" id="run-surface" maxlength="40" value="${escapeHtml(run.surface || "")}" placeholder="Road, track, grass"></div>
      <div class="input"><label>Pain / discomfort (0-10)</label><input type="number" inputmode="numeric" min="0" max="10" step="1" id="run-pain" value="${run.pain || 0}"></div>
    </div>
    <div class="input" style="margin-top:10px;"><label>Intervals, splits, and notes</label><textarea id="run-notes" rows="3" maxlength="500" placeholder="Example: 6 x 400m, 90s recovery">${escapeHtml(run.notes || "")}</textarea></div>
    <div id="run-live-summary" style="padding:10px 12px;background:var(--bg-elev-2);border-radius:8px;font-size:11px;line-height:1.55;margin:12px 0;"></div>
    <div style="display:grid;grid-template-columns:${existing ? "1fr 1fr" : "1fr"};gap:8px;">
      ${existing ? `<button class="btn danger" id="btn-delete-run">DELETE</button>` : ""}
      <button class="btn primary" id="btn-save-run">SAVE RUN</button>
    </div>`;

  const preview = () => {
    const distance = Number($("#run-distance").value || 0);
    const durationSec = Number($("#run-minutes").value || 0) * 60 + Number($("#run-seconds").value || 0);
    const draft = normalizeRunSession({
      ...run,
      type: $("#run-type").value,
      environment: $("#run-environment").value,
      distanceKm: distance,
      durationSec,
      rpe: $("#run-rpe").value,
      elevationM: $("#run-elevation").value,
    });
    const pace = formatRunPace(runPaceSecondsPerKm(draft));
    const kcal = estimatedRunCalories(draft, runBodyweightForDate($("#run-date").value));
    $("#run-live-summary").innerHTML = `<strong>${pace}</strong> pace &middot; ${runTrainingLoad(draft)} load &middot; about ${kcal} kcal expenditure<br><span class="muted">Fueling is calculated separately after saving and will not automatically add back the full estimate.</span>`;
  };
  ["run-distance","run-minutes","run-seconds","run-rpe","run-type","run-environment","run-elevation","run-date"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", preview);
    document.getElementById(id)?.addEventListener("change", preview);
  });
  preview();

  $("#btn-save-run").addEventListener("click", () => {
    const distanceKm = Number($("#run-distance").value || 0);
    const durationSec = Number($("#run-minutes").value || 0) * 60 + Number($("#run-seconds").value || 0);
    if (distanceKm <= 0 || durationSec <= 0) {
      toast("ENTER DISTANCE AND DURATION");
      return;
    }
    const saved = normalizeRunSession({
      ...run,
      date: $("#run-date").value,
      startTime: $("#run-time").value,
      type: $("#run-type").value,
      environment: $("#run-environment").value,
      distanceKm,
      durationSec,
      rpe: $("#run-rpe").value,
      avgHr: $("#run-hr").value,
      elevationM: $("#run-elevation").value,
      surface: $("#run-surface").value,
      pain: $("#run-pain").value,
      notes: $("#run-notes").value,
      createdAt: existing?.createdAt || run.createdAt,
    });
    if (!Array.isArray(STATE.runSessions)) STATE.runSessions = [];
    const index = STATE.runSessions.findIndex(item => item.id === saved.id);
    if (index >= 0) STATE.runSessions[index] = saved;
    else STATE.runSessions.push(saved);
    STATE.runSessions.sort((a, b) => a.date.localeCompare(b.date) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
    const daily = getDailyLog(saved.date) || { date: saved.date };
    if (daily.restDay) upsertDailyLog({ ...daily, restDay: false, restDayLoggedAt: null });
    saveState();
    closeSheet();
    renderToday();
    if (document.getElementById("page-stats")?.classList.contains("active")) renderStats();
    toast(existing ? "RUN UPDATED" : "RUN LOGGED");
  });

  document.getElementById("btn-delete-run")?.addEventListener("click", () => {
    if (!confirm("Delete this run?")) return;
    STATE.runSessions = (STATE.runSessions || []).filter(item => item.id !== run.id);
    saveState();
    closeSheet();
    renderToday();
    if (document.getElementById("page-stats")?.classList.contains("active")) renderStats();
    toast("RUN DELETED");
  });
  openSheet();
}

function runSummaryRow(run, includeActions = false) {
  const pace = formatRunPace(runPaceSecondsPerKm(run));
  const kcal = estimatedRunCalories(run, runBodyweightForDate(run.date));
  return `<div style="padding:10px 0;border-bottom:1px solid var(--line);">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
      <div><div style="font-weight:700;font-size:13px;">${escapeHtml(runTypeLabel(run.type))} &middot; ${run.distanceKm.toFixed(2)} km</div>
      <div class="muted" style="font-size:10px;margin-top:3px;">${escapeHtml(run.date)} &middot; ${formatRunDuration(run.durationSec)} &middot; ${pace} &middot; RPE ${run.rpe}</div></div>
      ${includeActions ? `<button class="btn ghost sm run-edit-btn" data-run-id="${escapeHtml(run.id)}">EDIT</button>` : `<div style="font-family:var(--f-mono);font-size:10px;text-align:right;white-space:nowrap;">${runTrainingLoad(run)} LOAD<br><span class="muted">~${kcal} kcal</span></div>`}
    </div>
    ${run.pain >= 4 ? `<div style="font-size:10px;color:var(--bad);margin-top:5px;">Pain ${run.pain}/10 recorded. Recovery recommendations will stay conservative.</div>` : ""}
  </div>`;
}

function renderTodayRunning() {
  const card = document.getElementById("today-running-card");
  const wrap = document.getElementById("today-running-summary");
  if (!card || !wrap) return;
  const date = todayISO();
  const runs = runsForDate(date);
  card.style.display = runs.length ? "" : "none";
  if (!runs.length) return;
  const fuel = runFuelingAdjustmentForDate(date);
  document.getElementById("today-running-meta").textContent = `${runs.length} RUN${runs.length === 1 ? "" : "S"}`;
  wrap.innerHTML = runs.map(run => runSummaryRow(run, true)).join("") + `
    <div style="padding:9px 10px;margin-top:9px;background:var(--bg-elev-2);border-radius:8px;font-size:11px;line-height:1.5;">
      Estimated expenditure <strong>${fuel.expenditure} kcal</strong> &middot; fueling adjustment <strong>+${fuel.adjustment} kcal</strong><br>
      <span class="muted">${escapeHtml(fuel.reason || "")}</span>
    </div>`;
  wrap.querySelectorAll(".run-edit-btn").forEach(button => button.addEventListener("click", () => openRunLogger(button.dataset.runId)));
}

function renderRunningStats() {
  const summaryWrap = document.getElementById("stats-running-summary");
  const historyWrap = document.getElementById("stats-running-history");
  if (!summaryWrap || !historyWrap) return;
  const summary = runningLoadSummary(todayISO());
  const current = summary.current;
  const change = summary.loadChangePct;
  document.getElementById("stats-running-meta").textContent = `${current.count} RUN${current.count === 1 ? "" : "S"} / LAST 7 DAYS`;
  summaryWrap.innerHTML = `<div class="stat-row" style="margin-top:10px;">
    <div class="stat"><div class="stat-label">Distance</div><div class="stat-value tnum">${current.distanceKm}<span class="unit">km</span></div></div>
    <div class="stat"><div class="stat-label">Duration</div><div class="stat-value tnum">${Math.round(current.durationSec / 60)}<span class="unit">min</span></div></div>
    <div class="stat"><div class="stat-label">Load</div><div class="stat-value tnum">${current.load}</div></div>
  </div>
  <div style="margin-top:10px;padding:9px 10px;background:var(--bg-elev-2);border-left:3px solid ${change != null && change > 25 ? "var(--bad)" : "var(--good)"};border-radius:8px;font-size:11px;line-height:1.5;">
    ${change == null ? "Log another comparable week to calculate the weekly load change." : change > 25 ? `Run load increased ${change}%. Recovery and leg-day recommendations are being reduced.` : `Run load change ${change > 0 ? "+" : ""}${change}%. Current progression is controlled.`}
  </div>`;
  const recent = [...(STATE.runSessions || [])].sort((a, b) => b.date.localeCompare(a.date) || String(b.startTime || "").localeCompare(String(a.startTime || ""))).slice(0, 10);
  historyWrap.innerHTML = recent.length
    ? `<div class="card-label" style="margin-bottom:4px;">Recent Runs</div>${recent.map(run => runSummaryRow(run, true)).join("")}`
    : `<div class="empty"><div class="glyph">○</div><div class="label">No runs logged yet</div></div>`;
  historyWrap.querySelectorAll(".run-edit-btn").forEach(button => button.addEventListener("click", () => openRunLogger(button.dataset.runId)));
}

document.getElementById("btn-log-run")?.addEventListener("click", () => openRunLogger());
document.getElementById("btn-log-another-run")?.addEventListener("click", () => openRunLogger());
document.getElementById("btn-stats-log-run")?.addEventListener("click", () => openRunLogger());
