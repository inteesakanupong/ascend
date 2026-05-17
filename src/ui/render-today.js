// Today page renderer and Today-only interactions

let TODAY_WEEKLY_DAY = null;

function renderTodayWeeklyDashboard() {
  const weeklyDashEl = document.getElementById("today-weekly-dashboard");
  if (!weeklyDashEl) return;

  TODAY_WEEKLY_DAY = TODAY_WEEKLY_DAY || nextSessionDay();
  weeklyDashEl.innerHTML = buildWeeklyDashboardHTML(TODAY_WEEKLY_DAY);
  weeklyDashEl.querySelectorAll("[data-weekly-day]").forEach(btn => {
    btn.addEventListener("click", () => {
      TODAY_WEEKLY_DAY = btn.dataset.weeklyDay;
      renderToday();
    });
  });
}

function renderToday() {
  const today = todayISO();
  const start = STATE.profile.programStart;
  const dayNum = Math.max(1, daysBetween(start, today) + 1);
  const weekNum = Math.max(1, Math.ceil(dayNum / 7));
  const phase = currentPhase(dayNum);

  $("#today-eyebrow").textContent = `${phaseName(phase)} - WEEK ${weekNum} - DAY ${dayNum}`;
  // Phase 6: Inject weekly dashboard card
  renderTodayWeeklyDashboard();
  $("#today-date").textContent = formatDate(today);

  // Readiness score
  const readiness = calculateReadiness(today);
  const rEl = document.getElementById("today-readiness");
  if (rEl && readiness.score != null) {
    rEl.style.display = "";
    rEl.style.borderLeftColor = readinessColor(readiness.score);
    const rScore = document.getElementById("today-readiness-score");
    const rDetail = document.getElementById("today-readiness-detail");
    if (rScore) {
      rScore.textContent = `${readiness.score}/5 - ${readinessLabel(readiness.score)}`;
      rScore.style.color = readinessColor(readiness.score);
    }
    if (rDetail) {
      let txt = readiness.factors.length ? readiness.factors.join(" - ") : "Standard prescription";
      if (readiness.adjustment !== 0) {
        const pct = Math.round(readiness.adjustment * 100);
        txt += ` -> ${pct > 0 ? "+" : ""}${pct}% intensity today`;
      }
      rDetail.textContent = txt;
    }
  } else if (rEl) {
    rEl.style.display = "none";
  }

  // Morning log card pre-fill
  const morningStatus = document.getElementById("today-morning-weight-status");
  const morningInp    = document.getElementById("today-morning-weight");
  const recSlider     = document.getElementById("today-recovery-slider");
  const recValEl      = document.getElementById("today-recovery-val");
  const sleepCheck    = document.getElementById("today-sleep-habit");
  const todayLog      = getDailyLog(today);

  const loggedParts = [];
  if (todayLog?.weight   != null) { loggedParts.push(`${todayLog.weight}kg`); if (morningInp) morningInp.placeholder = todayLog.weight + "kg"; }
  if (todayLog?.recovery != null) {
    loggedParts.push(`recovery ${todayLog.recovery}/10`);
    if (recSlider) recSlider.value = todayLog.recovery;
    if (recValEl)  recValEl.textContent = `${todayLog.recovery} - ${todayLog.recovery >= 7 ? "Good" : todayLog.recovery <= 3 ? "Poor" : "OK"}`;
  }
  if (todayLog?.habits?.sleep) loggedParts.push("slept 7h+");

  if (morningStatus) {
    if (loggedParts.length) {
      morningStatus.textContent = `Saved: ${loggedParts.join(" - ")} logged today`;
      morningStatus.style.color = "var(--good)";
    } else {
      morningStatus.textContent = "Log weight, recovery and sleep right after waking up";
      morningStatus.style.color = "";
    }
  }

  // RP rate-of-loss banner
  const rp = rpDietAnalytics();
  const rpRateEl = document.getElementById("today-rp-rate");
  const rpRateLabel = document.getElementById("today-rp-rate-label");
  const rpRateText = document.getElementById("today-rp-rate-text");
  if (rpRateEl && rp.rateGuidance) {
    rpRateEl.style.display = "";
    const rpColors = { optimal: "var(--good)", too_slow: "#d4a017", stalled: "#d4a017", too_fast: "var(--bad)", gaining: "var(--bad)" };
    rpRateEl.style.borderLeftColor = rpColors[rp.rateStatus] || "var(--ink-dim)";
    if (rpRateLabel) {
      const durationNote = rp.durationStatus === "critical" ? " - PHASE TOO LONG" : rp.durationStatus === "long" ? " - CONSIDER ENDING" : "";
      rpRateLabel.textContent = `RP RATE - WEEK ${rp.phaseWeeks}${durationNote}`;
      rpRateLabel.style.color = rpColors[rp.rateStatus] || "var(--ink-dim)";
    }
    if (rpRateText) rpRateText.textContent = rp.rateGuidance;
  } else if (rpRateEl) {
    rpRateEl.style.display = "none";
  }

  // Phase-2: diet phase transition banner
  const dtEl     = document.getElementById("today-diet-transition");
  const dtTitle  = document.getElementById("today-diet-transition-title");
  const dtText   = document.getElementById("today-diet-transition-text");
  const dtSigs   = document.getElementById("today-diet-transition-signals");
  const dtDismissKey = `ppal-diet-transition-dismissed-${todayISO().slice(0,7)}`; // monthly dismiss
  const dtDismissed  = localStorage.getItem(dtDismissKey);
  if (dtEl) {
    const dt = (!dtDismissed) ? dietPhaseTransitionCheck() : null;
    if (dt) {
      dtEl.style.display = "";
      const actionColor = dt.level === "action" ? "var(--accent)" : "#d4a017";
      dtEl.style.borderLeftColor = actionColor;
      if (dtTitle) {
        dtTitle.textContent = dt.actionTitle;
        dtTitle.style.color = actionColor;
      }
      if (dtText) {
        dtText.textContent = dt.actionText +
          (dt.suggestedKcal ? ` (current: ${dt.currentKcal}kcal)` : "");
      }
      if (dtSigs && dt.signals.length > 1) {
        dtSigs.textContent = "Signals: " + dt.signals.map(s => s.text).join(" - ");
      }
      document.getElementById("btn-diet-transition-dismiss")?.addEventListener("click", () => {
        localStorage.setItem(dtDismissKey, "1");
        dtEl.style.display = "none";
      });
    } else {
      dtEl.style.display = "none";
    }
  }

  const nextDay = TODAY_WEEKLY_DAY || nextSessionDay();
  const chip = $("#today-chip"); const chipText = $("#today-chip-text");
  chip.className = `day-chip ${nextDay.toLowerCase()}`;
  chipText.textContent = nextDay;
  $("#today-cycle").textContent = `${STATE.sessions.length} SESSIONS LOGGED`;
  // Keep Today compact; detailed exercise prescriptions live on Lift.
  $("#today-next-meta").textContent = "Tap Start Session for the full plan";

  // Weight
  const diag = weightDiagnostic();
  if (diag.avg != null) {
    $("#today-weight").textContent = diag.avg.toFixed(2);
    $("#today-weight-sub").textContent = "7-day rolling average";
    $("#today-lost").innerHTML = `${diag.lost > 0 ? "-" : ""}${Math.abs(diag.lost).toFixed(1)}<span class="unit">kg</span>`;
    $("#today-rate").innerHTML = diag.rate != null
      ? `${diag.rate > 0 ? "-" : "+"}${Math.abs(diag.rate).toFixed(2)}<span class="unit">kg</span>`
      : `-`;
    const target = STATE.profile.bodyweight - STATE.cut.p1Target;
    const pct = clamp(diag.lost / target, 0, 1) * 100;
    $("#today-progress").innerHTML = `${pct.toFixed(0)}<span class="unit">%</span>`;
    // Delta vs starting weight
    const delta = diag.avg - STATE.profile.bodyweight;
    $("#today-delta").innerHTML = `<span class="${delta < 0 ? 'down' : 'up'}">${delta < 0 ? "DOWN" : "UP"} ${Math.abs(delta).toFixed(1)}</span>`;
  } else {
    const last = latestWeighIn();
    $("#today-weight").textContent = last ? fmtWeight(last.weight) : fmtWeight(STATE.profile.bodyweight);
    $("#today-weight-sub").textContent = last ? "Latest weigh-in (need 7+ for avg)" : "Starting weight - log today to begin";
    $("#today-lost").textContent = "-";
    $("#today-rate").textContent = "-";
    $("#today-progress").textContent = "-";
    $("#today-delta").innerHTML = "";
  }
  // Phase tag
  $("#today-phase-meta").innerHTML = `<span class="phase-tag phase-${phase.toLowerCase()}">${phase}</span> - ${phaseKcalAdjusted(phase)} KCAL`;

  // Verdict pill
  const wrap = $("#today-verdict-wrap");
  if (diag.verdict === "OK") {
    wrap.innerHTML = `<span class="verdict progress">OK - ${diag.text}</span>`;
  } else if (diag.verdict === "WARN") {
    wrap.innerHTML = `<span class="verdict beat">WATCH - ${diag.text}</span>`;
  } else if (diag.verdict === "BAD") {
    wrap.innerHTML = `<span class="verdict deload">CHECK - ${diag.text}</span>`;
  } else {
    wrap.innerHTML = `<span class="verdict start">${diag.text}</span>`;
  }

  // Habits today
  const log = getDailyLog(today) || { habits: {} };
  const hRow = $("#today-habits");
  hRow.innerHTML = HABIT_DEFS.map(h => `
    <div class="habit ${log.habits && log.habits[h.key] ? 'checked' : ''}" data-habit="${h.key}" style="position:relative;">
      <div class="glyph">${h.glyph}</div>
      <div class="name">${h.name}</div>
    </div>
  `).join("");
  hRow.querySelectorAll(".habit").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.dataset.habit;
      const cur = getDailyLog(today) || { date: today, habits: {} };
      cur.habits = cur.habits || {};
      cur.habits[key] = !cur.habits[key];
      upsertDailyLog(cur);
      saveState();
      renderToday();
    });
  });
  const checked = HABIT_DEFS.filter(h => log.habits && log.habits[h.key]).length;
  $("#today-habit-summary").textContent = `${checked} / 4 DONE`;

  // Streak
  const streak = currentStreak();
  $("#today-streak").textContent = streak;
  $("#today-streak-meta").textContent = streak === 0
    ? "Log a session or weigh-in today to start"
    : streak === 1
    ? "consecutive day logged - keep it going"
    : `consecutive days logged - keep it going`;

  // Tap streak number to show 7-day habit breakdown
  const streakEl = document.getElementById("today-streak");
  if (streakEl && !streakEl._listenerAdded) {
    streakEl._listenerAdded = true;
    streakEl.style.cursor = "pointer";
    streakEl.addEventListener("click", () => {
      const today = todayISO();
      const rows = Array.from({length: 7}, (_, i) => {
        const d = new Date(isoToDate(today));
        d.setDate(d.getDate() - (6 - i));
        const iso = d.toISOString().slice(0, 10);
        const log = getDailyLog(iso);
        const dayLabel = formatDate(iso).slice(0, 6);
        const hasSession = STATE.sessions.some(s => s.date === iso);
        const habits = log?.habits || {};
        const done = HABIT_DEFS.filter(h => habits[h.key]).map(h => h.glyph).join("");
        const wt = log?.weight ? `${log.weight}kg` : "";
        return `<div style="display:flex;justify-content:space-between;padding:6px 14px;${i%2===0?'background:var(--bg-elev-1)':''};">
          <span style="font-family:var(--f-mono);font-size:11px;color:var(--ink-mid);">${dayLabel}</span>
          <span style="font-size:11px;">${wt} ${hasSession ? 'session' : ''} ${done || '<span style="color:var(--ink-faint);">-</span>'}</span>
        </div>`;
      }).join("");
      $("#sheet-body").innerHTML = `
        <h3>Last 7 Days</h3>
        <div class="muted" style="font-size:11px;margin-bottom:12px;letter-spacing:0.08em;">STREAK - HABITS - SESSIONS</div>
        <div style="border-radius:10px;overflow:hidden;border:1px solid var(--line);">${rows}</div>
        <div class="muted" style="font-size:10px;margin-top:10px;text-align:center;">session - steps - protein - water - sleep</div>
      `;
      openSheet();
    });
  }

  // Did we already log a session today?
  const todaySessions = STATE.sessions.filter(s => s.date === today);
  const doneDom = document.getElementById("today-session-done");
  const doneMeta = document.getElementById("today-session-done-meta");
  const startBtn = $("#btn-start-session");
  if (todaySessions.length > 0) {
    if (doneDom) {
      doneDom.style.display = "block";
      const names = todaySessions.map(s => s.day).join(" + ");
      const dur = todaySessions[todaySessions.length-1].durationSec;
      doneMeta.textContent = names + (dur ? ` - ${Math.floor(dur/60)}:${String(dur%60).padStart(2,"0")}` : "");
    }
    if (startBtn) startBtn.textContent = "LOG ANOTHER SESSION ->";
  } else {
    if (doneDom) doneDom.style.display = "none";
    if (startBtn) startBtn.textContent = "START SESSION ->";
  }

  // Macro strip - show if kcal/protein logged today
  const macroCard = document.getElementById("today-macro-card");
  const macroBars = document.getElementById("today-macro-bars");
  const macroMeta = document.getElementById("today-macro-meta");
  const kcalTarget    = phaseKcalAdjusted(phase);
  const proteinTarget = STATE.cut.proteinFloor || 160;
  const targets       = nutritionTargetsForDate(today);
  const carbTarget    = targets.carbs || (kcalTarget ? Math.round(kcalTarget * 0.37 / 4) : 190);
  const fatTarget     = targets.fat || (STATE.cut.p1Kcal ? Math.round(STATE.cut.p1Kcal * 0.28 / 9) : 65);
  if (macroCard && (log.kcal || log.protein || (log.meals && log.meals.length > 0))) {
    macroCard.style.display = "block";
    // Use meal-derived totals if meals exist (live, no SAVE needed)
    const mealsList = log.meals || [];
    const mealsKcalLive    = mealsList.reduce((s,m) => s + (m.kcal    || 0), 0);
    const mealsProteinLive = mealsList.reduce((s,m) => s + (m.protein || 0), 0);
    const mealsCarbsLive   = mealsList.reduce((s,m) => s + (m.carbs   || 0), 0);
    const mealsFatLive     = mealsList.reduce((s,m) => s + (m.fat     || 0), 0);
    const kcal    = mealsList.length > 0 ? mealsKcalLive             : (log.kcal    || 0);
    const protein = mealsList.length > 0 ? Math.round(mealsProteinLive) : (log.protein || 0);
    const carbs   = mealsList.length > 0
      ? Math.round(mealsCarbsLive)
      : Math.max(0, Math.round(((kcal || 0) - (protein * 4) - (fatTarget * 9)) / 4));
    const fat     = mealsList.length > 0 ? Math.round(mealsFatLive)     : 0;
    const meals   = mealsList.length;
    macroMeta.textContent = meals > 0 ? `${meals} MEAL${meals !== 1 ? "S" : ""} LOGGED` : "MANUAL ENTRY";
    const bars = [
      { label: "Calories", val: kcal,    target: kcalTarget,    color: "var(--accent)", unit: "kcal" },
      { label: "Protein",  val: protein, target: proteinTarget, color: "var(--good)",   unit: "g" },
      { label: "Carbs",    val: carbs,   target: carbTarget,    color: "var(--arms)",   unit: "g" },
      { label: "Fat",      val: fat,     target: fatTarget,     color: "#f4a261",       unit: "g" },
    ].map(b => {
      const pct = Math.min(100, b.target > 0 ? (b.val / b.target) * 100 : 0);
      const over = b.val > b.target;
      return `<div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--f-mono);margin-bottom:4px;">
          <span style="color:var(--ink-mid);font-weight:700;letter-spacing:0.08em;">${b.label}</span>
          <span style="color:${over ? "var(--bad)" : "var(--ink-mid)"};">${b.val} / ${b.target}${b.unit}</span>
        </div>
        <div style="height:5px;background:var(--bg-elev-3);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${over ? "var(--bad)" : b.color};border-radius:3px;transition:width 400ms;"></div>
        </div>
      </div>`;
    }).join("");
    macroBars.innerHTML = bars;
  } else if (macroCard) {
    macroCard.style.display = "none";
  }
}

// Start session button jumps to lift tab pre-filled.
$("#btn-start-session").addEventListener("click", () => {
  const day = TODAY_WEEKLY_DAY || nextSessionDay();
  goTab("lift");
  setTimeout(() => selectLiftDay(day), 50);
});

// Morning log - weight + recovery + sleep
const _todayRecoverySlider = document.getElementById("today-recovery-slider");
const _todayRecoveryVal    = document.getElementById("today-recovery-val");
const RECOVERY_LABELS = ["","Poor","Low","Below avg","Below avg","OK","Decent","Good","Good","Great","Peak"];
if (_todayRecoverySlider) {
  _todayRecoverySlider.value = 5;
  _todayRecoveryVal.textContent = `5 - OK`;
  _todayRecoverySlider.addEventListener("input", (e) => {
    const v = +e.target.value;
    _todayRecoveryVal.textContent = `${v} - ${RECOVERY_LABELS[v] || ""}`;
    _todayRecoveryVal.style.color = v >= 7 ? "var(--good)" : v <= 3 ? "var(--bad)" : "var(--accent)";
  });
}

// Phase-3: 3-tap check-in (energy / soreness / mood) auto-fills recovery slider.
const _checkinState = { energy: null, soreness: null, mood: null };

function _updateCheckinSlider() {
  const { energy, soreness, mood } = _checkinState;
  if (energy == null || soreness == null || mood == null) return;
  // Soreness is inverse: high soreness = low recovery
  const recoveryScore = Math.round(((energy + (6 - soreness) + mood) / 3) * 2);
  const clamped = Math.max(1, Math.min(10, recoveryScore));
  if (_todayRecoverySlider) {
    _todayRecoverySlider.value = clamped;
    _todayRecoveryVal && (_todayRecoveryVal.textContent = `${clamped} - ${RECOVERY_LABELS[clamped] || ""}`);
    _todayRecoveryVal && (_todayRecoveryVal.style.color = clamped >= 7 ? "var(--good)" : clamped <= 3 ? "var(--bad)" : "var(--accent)");
  }
  const el = document.getElementById("checkin-summary");
  const labels = { energy: ["very low","low","ok","good","peak"], soreness: ["none","mild","moderate","sore","very sore"], mood: ["low","meh","ok","good","great"] };
  if (el) el.textContent = `Energy ${labels.energy[energy-1]} - Soreness ${labels.soreness[soreness-1]} - Mood ${labels.mood[mood-1]} -> ${clamped}/10`;
}

["energy","soreness","mood"].forEach(group => {
  document.querySelectorAll(`.checkin-btn[data-group="${group}"]`).forEach(btn => {
    btn.addEventListener("click", () => {
      const val = +btn.dataset.val;
      _checkinState[group] = val;
      document.querySelectorAll(`.checkin-btn[data-group="${group}"]`).forEach(b => {
        const isActive = +b.dataset.val === val;
        b.style.background = isActive ? "var(--accent)" : "var(--bg-elev-2)";
        b.style.color = isActive ? "white" : "var(--ink)";
        b.style.borderColor = isActive ? "var(--accent)" : "var(--line)";
      });
      _updateCheckinSlider();
    });
  });
});

document.getElementById("btn-log-morning").addEventListener("click", () => {
  const weightInp  = document.getElementById("today-morning-weight");
  const status     = document.getElementById("today-morning-weight-status");
  const recSlider  = document.getElementById("today-recovery-slider");
  const sleepCheck = document.getElementById("today-sleep-habit");

  const w        = parseFloat(weightInp?.value);
  const recovery = recSlider ? +recSlider.value : null;
  const slept    = sleepCheck ? sleepCheck.checked : false;
  const today    = todayISO();

  if (!w && !recovery) { toast("ENTER WEIGHT OR RECOVERY"); return; }
  if (w && (w < 30 || w > 300)) { toast("ENTER A VALID WEIGHT"); return; }

  const cur = getDailyLog(today) || { date: today };
  if (w) {
    cur.weight = w;
    STATE.profile.bodyweight = w;
  }
  if (recovery) cur.recovery = recovery;
  if (!cur.habits) cur.habits = {};
  cur.habits.sleep = slept;

  upsertDailyLog(cur);
  saveState();

  // Reset inputs
  if (weightInp) weightInp.value = "";
  if (recSlider) { recSlider.value = 5; _todayRecoveryVal && (_todayRecoveryVal.textContent = "5 - OK"); }
  if (sleepCheck) sleepCheck.checked = false;
  // Reset check-in buttons
  _checkinState.energy = _checkinState.soreness = _checkinState.mood = null;
  document.querySelectorAll(".checkin-btn").forEach(b => {
    b.style.background = "var(--bg-elev-2)"; b.style.color = "var(--ink)"; b.style.borderColor = "var(--line)";
  });
  const cSummary = document.getElementById("checkin-summary");
  if (cSummary) cSummary.textContent = "";

  // Update status
  const parts = [];
  if (w) parts.push(`${w}kg`);
  if (recovery) parts.push(`recovery ${recovery}/10`);
  if (slept) parts.push("slept 7h+");
  if (status) {
    status.textContent = `Saved: ${parts.join(" - ")} logged`;
    status.style.color = "var(--good)";
  }

  renderToday();
  toast(`MORNING LOGGED`);
});

