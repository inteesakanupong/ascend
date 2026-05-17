// Weigh page renderer

function renderWeigh() {
  const today = todayISO();
  const log = getDailyLog(today) || { date: today, habits: {} };
  $("#weigh-date").value = today;
  $("#weigh-weight").value  = log.weight ?? "";
  const weighBfEl = document.getElementById("weigh-bodyfat");
  if (weighBfEl) weighBfEl.value = log.bodyFatPercent ?? log.bodyFatPct ?? "";
  // Show meal-derived totals if meals exist, otherwise show manually saved values
  const meals = log.meals || [];
  const mealsKcal    = meals.reduce((s, m) => s + (m.kcal    || 0), 0);
  const mealsProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
  $("#weigh-kcal").value    = meals.length > 0 ? mealsKcal    : (log.kcal    ?? "");
  $("#weigh-protein").value = meals.length > 0 ? Math.round(mealsProtein) : (log.protein ?? "");
  $("#weigh-notes").value   = log.notes ?? "";
  $("#weigh-steps").value   = log.steps ?? "";
  $("#weigh-water").value   = log.waterMl ?? "";
  // Show the goal as a label hint
  const stepGoalEl = document.getElementById("weigh-step-goal-label");
  if (stepGoalEl) stepGoalEl.textContent = `· goal ${(STATE.profile.stepGoal || 10000).toLocaleString()}`;
  // Recovery slider needs special handling (default to 5 if not logged)
  // Recovery is logged on TODAY page — show it here as read-only
  const recVal = log.recovery ?? null;
  const hiddenRec = document.getElementById("weigh-recovery");
  if (hiddenRec) hiddenRec.value = recVal ?? "";
  const recDisplay = document.getElementById("weigh-recovery-display");
  if (recDisplay) {
    recDisplay.textContent = recVal != null ? `${recVal}/10` : "—";
    recDisplay.style.color = recVal == null ? "var(--ink-dim)" : recVal >= 7 ? "var(--good)" : recVal <= 3 ? "var(--bad)" : "var(--accent)";
  }

  const start = STATE.profile.programStart;
  const dayNum = Math.max(1, daysBetween(start, today) + 1);
  const phase = currentPhase(dayNum);
  const adjKcal = phaseKcalAdjusted(phase);
  const baseKcal = phaseKcal(phase);
  const kcalDelta = adjKcal - baseKcal;
  const deltaNote = kcalDelta !== 0 ? ` <span style="font-size:9px;opacity:0.6;">(${kcalDelta > 0 ? "+" : ""}${kcalDelta} adj)</span>` : "";

  // Mini weight trend chart
  const trendChartEl = document.getElementById("weigh-trend-chart");
  const trendMetaEl  = document.getElementById("weigh-trend-meta");
  const allLogs = [...STATE.dailyLogs].filter(d=>d.weight!=null).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  if (trendChartEl) {
    trendChartEl.innerHTML = allLogs.length >= 2 ? renderWeightChart(allLogs) : `<div style="padding:12px;text-align:center;color:var(--ink-dim);font-size:12px;">Log 2+ weigh-ins to see trend</div>`;
  }
  if (trendMetaEl) {
    const rp = rpDietAnalytics();
    if (rp.weeklyKgLoss != null) {
      const rate = parseFloat(rp.weeklyKgLoss);
      const color = rp.rateStatus === "optimal" ? "var(--good)" : rp.rateStatus === "too_fast" ? "var(--bad)" : "#d4a017";
      trendMetaEl.innerHTML = `<span style="color:${color};font-weight:700;">${rate >= 0 ? "↓" : "↑"}${Math.abs(rate)}kg/wk</span>`;
    } else { trendMetaEl.textContent = `${allLogs.length} ENTRIES`; }
  }
  $("#weigh-phase").innerHTML = `<span class="phase-tag phase-${phase.toLowerCase()}">${phase}</span> · ${adjKcal} KCAL TARGET${deltaNote}`;

  // Habits
  const hRow = $("#weigh-habits");
  hRow.innerHTML = HABIT_DEFS.map(h => `
    <div class="habit ${log.habits && log.habits[h.key] ? 'checked' : ''}" data-habit="${h.key}" style="position:relative;cursor:pointer;">
      <div class="glyph">${h.glyph}</div>
      <div class="name">${h.name}</div>
    </div>
  `).join("");
  hRow.querySelectorAll(".habit").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.toggle("checked");
    });
  });

  renderRecentWeighIns();
  initWeighMeals();

  // ── Weight Automation Card ───────────────────────────────────────────────
  const autoCard = document.getElementById("weight-auto-card");
  const autoBadge = document.getElementById("weight-auto-badge");
  const autoBody = document.getElementById("weight-auto-body");
  const autoRate = document.getElementById("weight-auto-rate");
  const diag = weightDiagnostic();
  if (autoCard && diag.rate != null) {
    autoCard.style.display = "";
    const rate = diag.rate;
    const rateStr = `${rate > 0 ? "−" : "+"}${Math.abs(rate).toFixed(2)} kg/week`;
    autoRate.textContent = `Rolling avg: ${diag.avg?.toFixed(2) ?? "—"} kg · Rate: ${rateStr} · Lost: ${diag.lost?.toFixed(1) ?? "—"} kg`;

    const { adj, reason } = phaseKcalAutoAdj();
    const adjNote = adj !== 0
      ? ` Auto-adjusted ${adj > 0 ? "+" : ""}${adj} kcal applied to your target.`
      : "";

    if (diag.verdict === "OK") {
      autoBadge.textContent = "ON TRACK";
      autoBadge.style.color = "var(--good)";
      autoBody.textContent = diag.text;
    } else if (diag.verdict === "WARN") {
      autoBadge.textContent = rate > (STATE.cut.fastThreshold ?? 1.2) ? "TOO FAST" : "TOO SLOW";
      autoBadge.style.color = "var(--warn)";
      autoBody.textContent = diag.text + adjNote;
    } else if (diag.verdict === "BAD") {
      autoBadge.textContent = "GAINING";
      autoBadge.style.color = "var(--bad)";
      autoBody.textContent = diag.text;
    }
  } else if (autoCard) {
    autoCard.style.display = "";
    autoBadge.textContent = "BUILDING DATA";
    autoBadge.style.color = "var(--ink-dim)";
    const logged = STATE.dailyLogs.filter(d => d.weight != null).length;
    autoBody.textContent = `${logged}/8 weigh-ins logged. Keep logging daily weight to unlock rate tracking and calorie recommendations.`;
    autoRate.textContent = "";
  }
}

function renderRecentWeighIns() {
  const wrap = $("#weigh-recent");
  const recent = [...STATE.dailyLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  $("#weigh-recent-meta").textContent = `${STATE.dailyLogs.length} ENTRIES`;
  if (recent.length === 0) {
    wrap.innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">No daily logs yet</div></div>`;
    return;
  }
  wrap.innerHTML = recent.map(d => {
    const habitsBadge = HABIT_DEFS.map(h => d.habits && d.habits[h.key] ? h.glyph : "").filter(Boolean).join(" ");
    const dayNum = Math.max(1, daysBetween(STATE.profile.programStart, d.date) + 1);
    const phase = currentPhase(dayNum);
    return `
      <div class="row" data-date="${d.date}">
        <div class="row-spread">
          <div>
            <div style="font-family:var(--f-display);font-weight:700;font-size:16px;letter-spacing:0.04em;">${formatDate(d.date)}</div>
            <div class="muted" style="font-size:11px;margin-top:2px;">
              ${d.bodyFatPercent != null ? `<span class="hl">${Number(d.bodyFatPercent).toFixed(1)}% BF</span> · ` : ""}
              ${d.weight != null ? `<span class="hl">${fmtWeight(d.weight)}kg</span>` : "—"}
              ${d.kcal != null ? ` · ${d.kcal} kcal` : ""}
              ${d.protein != null ? ` · ${d.protein}g P` : ""}
              ${d.steps != null ? ` · ${d.steps.toLocaleString()} steps` : ""}
              ${d.waterMl != null ? ` · ${(d.waterMl/1000).toFixed(1)}L` : ""}
              ${d.recovery != null ? ` · R${d.recovery}` : ""}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:14px;">${habitsBadge || "<span class='muted' style='font-size:10px;'>—</span>"}</div>
            <button class="btn-delete-log" data-date="${d.date}" style="
              background:none;border:1px solid var(--line-strong);border-radius:6px;
              color:var(--ink-dim);font-size:11px;padding:4px 8px;cursor:pointer;
              font-family:var(--f-mono);letter-spacing:0.05em;flex-shrink:0;
            ">DEL</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Wire up delete buttons — first tap turns red + says CONFIRM, second tap deletes
  wrap.querySelectorAll(".btn-delete-log").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.confirm !== "1") {
        btn.dataset.confirm = "1";
        btn.textContent = "SURE?";
        btn.style.color = "var(--bad)";
        btn.style.borderColor = "var(--bad)";
        setTimeout(() => {
          if (btn.dataset.confirm === "1") {
            btn.dataset.confirm = "0";
            btn.textContent = "DEL";
            btn.style.color = "var(--ink-dim)";
            btn.style.borderColor = "var(--line-strong)";
          }
        }, 3000);
      } else {
        const date = btn.dataset.date;
        STATE.dailyLogs = STATE.dailyLogs.filter(d => d.date !== date);
        saveState();
        toast("DELETED");
        renderRecentWeighIns();
        renderToday();
      }
    });
  });
}
