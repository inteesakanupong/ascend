// Weekly planner UI and Today recommendation.

function plannerDayLabel(date) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function plannerActivityLabel(item) {
  const parts = [];
  if (item.liftDay) parts.push(`${item.liftDay}${item.liftMode === "shortened" ? " SHORT" : ""}`);
  if (item.run) parts.push(`${runTypeLabel(item.run.type).toUpperCase()} RUN ${item.run.durationMin}MIN`);
  return parts.length ? parts.join(" + ") : item.status === "skipped" ? "SKIPPED" : "RECOVERY";
}

function plannerActivityColor(item) {
  if (item.status === "skipped" || (!item.liftDay && !item.run)) return "var(--good)";
  if (item.liftDay === "LEGS" || item.run?.type === "long") return "var(--warn)";
  return "var(--accent)";
}

function plannerPreviewFuel(item) {
  if (!item?.run || typeof runFuelingAdjustmentForRuns !== "function") return { adjustment: 0, expenditure: 0 };
  const run = normalizeRunSession({
    id: `preview-${item.date}`,
    date: item.date,
    type: item.run.type,
    distanceKm: item.run.distanceKm,
    durationSec: item.run.durationMin * 60,
    rpe: item.run.rpe,
  });
  return runFuelingAdjustmentForRuns([run]);
}

function plannerCaloriesForItem(item, plan) {
  const targets = nutritionTargetsForDate(item.date);
  if (plan.status === "accepted") return targets.kcal;
  return targets.kcal + plannerPreviewFuel(item).adjustment;
}

function ensureCurrentWeeklyPlan() {
  let plan = normalizeWeeklyPlannerState(STATE);
  const today = todayISO();
  const lastDate = plan.items.length ? plan.items[plan.items.length - 1].date : null;
  if (!plan.items.length || !plan.anchorDate || today < plan.anchorDate || today > lastDate) {
    plan = generateWeeklyPlan({ anchorDate: today });
    saveState();
  } else if (plan.status === "accepted") {
    const before = JSON.stringify(plan);
    plan = reconcileWeeklyPlan(today);
    if (before !== JSON.stringify(plan)) saveState();
  }
  return plan;
}

function renderWeeklyPlanner() {
  const card = document.getElementById("today-planner-card");
  const body = document.getElementById("today-planner-body");
  if (!card || !body) return;
  const plan = ensureCurrentWeeklyPlan();
  const today = todayISO();
  const todayItem = plannerItemForDate(today);
  const readiness = typeof calculateReadiness === "function" ? calculateReadiness(today) : { score: null, adjustment: 0 };
  const badge = document.getElementById("today-planner-badge");
  badge.textContent = plan.status === "accepted" ? "ACTIVE" : "DRAFT";
  badge.style.color = plan.status === "accepted" ? "var(--good)" : "var(--warn)";

  const todayCalories = todayItem ? plannerCaloriesForItem(todayItem, plan) : nutritionTargetsForDate(today).kcal;
  const intensity = readiness.score == null ? "standard loads" : readiness.adjustment < 0 ? `${Math.abs(Math.round(readiness.adjustment * 100))}% reduced loads` : readiness.adjustment > 0 ? `${Math.round(readiness.adjustment * 100)}% readiness increase` : "standard loads";
  const todayReason = todayItem?.reason?.[0] || plan.lastDecision || "Current routine retained.";
  body.innerHTML = `
    <div style="padding:12px 14px;background:var(--bg-elev-2);border-left:3px solid ${plannerActivityColor(todayItem || {})};border-radius:8px;margin-bottom:10px;">
      <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);">TODAY</div>
      <div style="font-family:var(--f-display);font-size:22px;font-weight:900;margin-top:2px;">${escapeHtml(plannerActivityLabel(todayItem || {}))}</div>
      <div style="font-size:11px;color:var(--ink-mid);margin-top:4px;line-height:1.45;">Readiness ${readiness.score != null ? `${readiness.score}/5` : "not logged"} &middot; ${escapeHtml(intensity)} &middot; ${todayCalories.toLocaleString()} kcal</div>
      <div style="font-size:10px;color:var(--ink-dim);margin-top:5px;line-height:1.45;">${escapeHtml(todayReason)}</div>
    </div>
    <div style="display:grid;gap:5px;">
      ${plan.items.map(item => {
        const complete = (item.liftDay || item.run) && item.completed?.lift && item.completed?.run;
        const isToday = item.date === today;
        return `<div style="display:grid;grid-template-columns:72px minmax(0,1fr) 48px;gap:8px;align-items:center;padding:8px 9px;border:1px solid ${isToday ? plannerActivityColor(item) : "var(--line)"};border-radius:8px;background:${isToday ? "var(--bg-elev-2)" : "transparent"};">
          <div style="font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);">${escapeHtml(plannerDayLabel(item.date).toUpperCase())}</div>
          <div style="min-width:0;"><div style="font-family:var(--f-mono);font-size:10px;font-weight:800;white-space:normal;color:${complete ? "var(--good)" : "var(--ink)"};">${complete ? "DONE / " : ""}${escapeHtml(plannerActivityLabel(item))}</div>
          <div style="font-size:9px;color:var(--ink-dim);margin-top:2px;">${plannerCaloriesForItem(item, plan).toLocaleString()} kcal</div></div>
          <button class="btn ghost sm planner-day-edit" data-plan-date="${item.date}" style="font-size:8px;padding:5px;">EDIT</button>
        </div>`;
      }).join("")}
    </div>
    <div style="font-size:10px;color:var(--ink-dim);line-height:1.45;margin-top:9px;">${escapeHtml(plan.lastDecision || "")}</div>`;

  const accept = document.getElementById("btn-planner-accept");
  if (accept) {
    accept.style.display = plan.status === "accepted" ? "none" : "";
    accept.textContent = "ACCEPT WEEK";
  }
  document.getElementById("btn-planner-rebuild").textContent = plan.status === "accepted" ? "REBUILD" : "CUSTOMIZE";
  body.querySelectorAll(".planner-day-edit").forEach(button => button.addEventListener("click", () => openPlannerDayEditor(button.dataset.planDate)));
}

function openPlannerPreferences() {
  const plan = normalizeWeeklyPlannerState(STATE);
  const prefs = plan.preferences;
  $("#sheet-body").innerHTML = `
    <h3 style="margin-bottom:4px;">Weekly Plan</h3>
    <div class="muted" style="font-size:11px;line-height:1.5;margin-bottom:14px;">Changing these settings creates a new draft. Your permanent exercise routine remains unchanged.</div>
    <div class="input-grid">
      <div class="input"><label>Strength days</label><select id="planner-lift-days">${[3,4,5].map(value => `<option value="${value}" ${prefs.liftDays === value ? "selected" : ""}>${value} days</option>`).join("")}</select></div>
      <div class="input"><label>Running days</label><select id="planner-run-days">${[0,1,2,3,4].map(value => `<option value="${value}" ${prefs.runDays === value ? "selected" : ""}>${value} days</option>`).join("")}</select></div>
      <div class="input"><label>Long run</label><select id="planner-long-run"><option value="no" ${!prefs.includeLongRun ? "selected" : ""}>No</option><option value="yes" ${prefs.includeLongRun ? "selected" : ""}>Yes</option></select></div>
      <div class="input"><label>Preferred long-run day</label><select id="planner-long-day">${["Today","Tomorrow","Day 3","Day 4","Day 5","Day 6","Day 7"].map((label,index) => `<option value="${index}" ${prefs.preferredLongDay === index ? "selected" : ""}>${label}</option>`).join("")}</select></div>
    </div>
    <button class="btn primary full" style="margin-top:14px;" id="btn-generate-week">GENERATE DRAFT</button>`;
  document.getElementById("btn-generate-week").addEventListener("click", () => {
    generateWeeklyPlan({
      anchorDate: todayISO(),
      preferences: {
        liftDays: Number($("#planner-lift-days").value),
        runDays: Number($("#planner-run-days").value),
        includeLongRun: $("#planner-long-run").value === "yes",
        preferredLongDay: Number($("#planner-long-day").value),
      },
    });
    saveState();
    closeSheet();
    renderToday();
    toast("PLAN DRAFTED");
  });
  openSheet();
}

function openPlannerDayEditor(date) {
  const plan = normalizeWeeklyPlannerState(STATE);
  const item = plannerItemForDate(date);
  if (!item) return;
  const targets = plan.items.filter(candidate => candidate.date !== date && candidate.date >= todayISO());
  $("#sheet-body").innerHTML = `
    <h3 style="margin-bottom:4px;">${escapeHtml(plannerDayLabel(date))}</h3>
    <div style="font-family:var(--f-display);font-size:22px;font-weight:900;margin-bottom:6px;">${escapeHtml(plannerActivityLabel(item))}</div>
    <div class="muted" style="font-size:11px;line-height:1.5;margin-bottom:14px;">${escapeHtml((item.reason || []).join(" "))}</div>
    <div class="input"><label>Move to</label><select id="planner-move-target">${targets.map(candidate => `<option value="${candidate.date}">${escapeHtml(plannerDayLabel(candidate.date))} - ${escapeHtml(plannerActivityLabel(candidate))}</option>`).join("")}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:12px;">
      <button class="btn ghost sm" id="btn-plan-move">MOVE</button>
      <button class="btn ghost sm" id="btn-plan-shorten">SHORTEN</button>
      <button class="btn danger sm" id="btn-plan-skip">SKIP</button>
    </div>`;
  const apply = action => {
    const result = updatePlannerItem(date, action, action === "move" ? $("#planner-move-target").value : null);
    if (!result.ok) { toast(result.reason.toUpperCase()); return; }
    saveState();
    closeSheet();
    renderToday();
    toast({ move: "PLAN MOVED", shorten: "PLAN SHORTENED", skip: "PLAN SKIPPED" }[action]);
  };
  $("#btn-plan-move").addEventListener("click", () => apply("move"));
  $("#btn-plan-shorten").addEventListener("click", () => apply("shorten"));
  $("#btn-plan-skip").addEventListener("click", () => apply("skip"));
  openSheet();
}

document.getElementById("btn-planner-accept")?.addEventListener("click", () => {
  acceptWeeklyPlan();
  saveState();
  renderToday();
  toast("WEEK ACCEPTED");
});
document.getElementById("btn-planner-rebuild")?.addEventListener("click", openPlannerPreferences);
