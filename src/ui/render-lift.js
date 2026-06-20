// Lift page, Workout Mode, Targeted Warm-Up, and exercise selector UI

// ───────── 7. LIFT PAGE ─────────
let LIFT_DAY = null;
let LIFT_DRAFT = null;
let LIFT_EDITING_ID = null;
let LIFT_SESSION_START_MS = null;
let LIFT_SESSION_ACTIVE = false;
// v15: per-set state
let LIFT_SET_DONE = [];
let LIFT_SET_RPE  = [];
// v16: per-exercise extra set state { s3done, s3w, s3r, s4done, s4w, s4r }
let LIFT_EXTRA_SETS = [];
let LIFT_TECHNIQUES = [];
let LIFT_DISMISSED_BANNERS = new Set(); // "exIdx-setNum" dismissed by user this session
let LIFT_MRV_AUTOPLAN = [];
let TARGETED_WARMUP_ACTIVE = false;
let WORKOUT_DRAFT_RESTORING = false;


const TARGETED_WARMUP_METHOD = "targeted_warmup";

// ─── Phase 8 v2: Fully Automated Targeted Warm-Up Engine ────────────────────
// The system reads the user's recent training trends and decides everything:
// mode, movements, rounds, ramp sets, and substitution pool.
// User interaction is limited to: tick exercises done, swap a movement
// (from the auto-generated recommended list only), and post-warm-up assessment.
// ─────────────────────────────────────────────────────────────────────────────

// Movement library with equipment tags for swap matching

// ── Trend analysis: reads recent sessions to decide warm-up intensity ────────

// ── Select warm-up movements based on day + trend context ────────────────────

// ── Build ramp set prescription from working weight ──────────────────────────

// ── Main build function ───────────────────────────────────────────────────────











let _workoutDraftTimer = null;






function renderTargetedWarmupPage() {
  const warmup = ensureTargetedWarmupDraft();
  const wrap = document.getElementById("targeted-warmup-page");
  if (!warmup || !wrap) return;

  const isComplete = targetedWarmupComplete(warmup);
  const warn = targetedWarmupWarning(warmup);
  const modeLabel = (warmup.modeLabel || warmup.mode).toUpperCase();

  const circuitTotal = warmup.completion?.length || 0;
  const circuitDone = warmup.completion?.filter(c => c.completed).length || 0;
  const pct = circuitTotal > 0 ? Math.round((circuitDone / circuitTotal) * 100) : 0;

  const signalHtml = (warmup.trendSignals || []).length
    ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;">${warmup.trendSignals.slice(0,3).map(s => `<span class="tag" style="font-size:10px;">${escapeHtml(s)}</span>`).join("")}</div>`
    : "";

  const movementCards = warmup.movements.map((m, idx) => {
    const roundBtns = Array.from({ length: warmup.rounds }, (_, i) => {
      const round = i + 1;
      const item = warmup.completion.find(c => c.movementId === m.id && c.round === round);
      const label = warmup.rounds === 1 ? "DONE" : `SET ${round}`;
      return `<button class="btn sm ${item?.completed ? "primary" : "ghost"}" style="flex:1;" data-tw-round="${round}" data-tw-movement="${escapeHtml(m.id)}">${label}</button>`;
    }).join("");
    const swapHtml = (m.swapPool || []).length
      ? `<div style="margin-top:8px;"><div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:5px;">NO EQUIPMENT? SWAP TO:</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${m.swapPool.map(alt => `<button class="btn ghost" style="font-size:11px;padding:4px 10px;" data-tw-swap="${escapeHtml(m.id)}" data-tw-swap-to='${JSON.stringify(alt).replace(/'/g,"&#39;")}'>${escapeHtml(alt.name)}</button>`).join("")}</div></div>`
      : "";
    return `<div style="padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--bg-elev-2);"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><div><div style="font-family:var(--f-mono);font-size:9px;letter-spacing:0.14em;color:var(--ink-dim);font-weight:700;">0${idx+1}</div><div style="font-family:var(--f-display);font-size:20px;font-weight:900;">${escapeHtml(m.name)}</div></div><div class="tag" style="white-space:nowrap;">${escapeHtml(m.prescription)}</div></div><div class="muted" style="font-size:12px;line-height:1.45;margin-top:5px;">${escapeHtml(m.purpose)} <em style="color:var(--ink-dim);">${escapeHtml(m.effort || "")}</em></div>${swapHtml}<div style="display:flex;gap:6px;margin-top:10px;">${roundBtns}</div></div>`;
  }).join("");

  wrap.innerHTML = `
    <div class="card" style="border-left:3px solid var(--accent);">
      <div class="card-head">
        <div>
          <div class="card-label">Targeted Warm-Up &middot; ${escapeHtml(modeLabel)}</div>
          <div style="font-family:var(--f-display);font-size:26px;font-weight:900;letter-spacing:0.02em;margin-top:3px;">${escapeHtml(warmup.leadExercise || warmup.dayFocus || LIFT_DAY)}</div>
        </div>
        <div class="card-meta">${warmup.estimatedMin} MIN</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:10px;">
        <div class="tag" style="justify-content:center;color:var(--good);border-color:var(--good);">Session Loaded</div>
        <div class="tag" style="justify-content:center;color:var(--accent);border-color:var(--accent);font-weight:700;">Warm-Up</div>
        <div class="tag" style="justify-content:center;${isComplete ? "color:var(--good);border-color:var(--good);" : ""}">Start Workout</div>
      </div>
      ${signalHtml}
    </div>

    <div class="card">
      <div class="card-head"><div class="card-label">Today's Plan</div><div class="card-meta">AUTO-GENERATED</div></div>
      <div style="font-size:13px;line-height:1.55;color:var(--ink-mid);">Movements and intensity selected from your recent <strong>${escapeHtml(warmup.dayFocus || LIFT_DAY)}</strong> training data. ${warmup.rounds === 1 ? "One round — minimal mode." : `${warmup.rounds} rounds per exercise.`} No manual inputs required.</div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-label">Activation Circuit</div><div class="card-meta">${circuitDone}/${circuitTotal} DONE</div></div>
      ${circuitTotal > 0 ? `<div style="height:4px;background:var(--bg-elev-3);border-radius:2px;margin-bottom:12px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--accent);border-radius:2px;transition:width 0.3s;"></div></div>` : ""}
      <div style="display:grid;gap:10px;">${movementCards}</div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-label">Main-Lift Ramp</div><div class="card-meta" style="${warmup.rampCompleted ? "color:var(--good);" : ""}">${warmup.rampCompleted ? "DONE \u2713" : "REQUIRED"}</div></div>
      <div style="font-size:13px;line-height:1.6;color:var(--ink-mid);margin-bottom:10px;">${escapeHtml(warmup.rampSets)}</div>
      <button class="btn ${warmup.rampCompleted ? "primary" : "ghost"} full" data-tw-ramp="1">${warmup.rampCompleted ? "RAMP DONE \u2713 \u2014 TAP TO UNDO" : "MARK RAMP SETS DONE"}</button>
    </div>

    <div class="card" style="${!warmup.rampCompleted ? "opacity:0.5;pointer-events:none;" : ""}">
      <div class="card-head"><div class="card-label">Quick Assessment</div><div class="card-meta" style="${warmup.feedback.saved ? "color:var(--good);" : ""}">${warmup.feedback.saved ? "SAVED \u2713" : "REQUIRED"}</div></div>
      <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:7px;">HOW DO YOU FEEL NOW?</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px;">${[["more_ready","\u2191 BETTER"],["same","\u2192 SAME"],["more_tired","\u2193 TIRED"]].map(([v,l]) => `<button class="btn sm ${warmup.feedback.postWarmupReadiness === v ? "primary" : "ghost"}" data-tw-feedback="postWarmupReadiness" data-val="${v}">${l}</button>`).join("")}</div>
      <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:7px;">JOINT RESPONSE</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px;">${[["better","BETTER"],["same","SAME"],["worse","WORSE"]].map(([v,l]) => `<button class="btn sm ${warmup.feedback.jointResponse === v ? "primary" : "ghost"}" data-tw-feedback="jointResponse" data-val="${v}">${l}</button>`).join("")}</div>
      <button class="btn ${warmup.feedback.saved ? "primary" : "ghost"} full" data-tw-save-feedback="1">${warmup.feedback.saved ? "ASSESSMENT SAVED \u2713" : "SAVE ASSESSMENT"}</button>
      ${warn ? `<div style="margin-top:10px;padding:10px;border-radius:9px;border-left:3px solid #d4a017;background:rgba(212,160,23,0.08);font-size:12px;line-height:1.5;color:var(--ink);">${escapeHtml(warn)}</div>` : ""}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:12px;margin-bottom:16px;">
      <button class="btn ghost" data-tw-back="1">\u2190 BACK</button>
      <button class="btn primary" data-tw-start="1" ${isComplete ? "" : 'disabled style="opacity:0.45;"'}>START WORKOUT \u2192</button>
    </div>
  `;
}

function openTargetedWarmupPage() {
  if (!LIFT_DRAFT) return;
  TARGETED_WARMUP_ACTIVE = true;
  const gate = document.getElementById("lift-start-gate");
  const warmupPage = document.getElementById("targeted-warmup-page");
  const exWrap = document.getElementById("lift-exercises");
  const saveBtn = document.getElementById("btn-save-session");
  const activeBar = document.getElementById("session-active-bar");
  const feedback = document.getElementById("session-feedback-panel");
  if (gate) gate.style.display = "none";
  if (warmupPage) warmupPage.style.display = "";
  if (exWrap) exWrap.style.display = "none";
  if (saveBtn) saveBtn.style.display = "none";
  if (activeBar) activeBar.classList.remove("visible");
  if (feedback) feedback.style.display = "none";
  renderTargetedWarmupPage();
  scheduleWorkoutAutosave();
  window.scrollTo(0, 0);
}

function closeTargetedWarmupPage() {
  TARGETED_WARMUP_ACTIVE = false;
  const gate = document.getElementById("lift-start-gate");
  const warmupPage = document.getElementById("targeted-warmup-page");
  if (gate) gate.style.display = "";
  if (warmupPage) warmupPage.style.display = "none";
  scheduleWorkoutAutosave();
  window.scrollTo(0, 0);
}

function activateLiftSession() {
  LIFT_SESSION_ACTIVE = true;
  TARGETED_WARMUP_ACTIVE = false;
  LIFT_SESSION_START_MS = Date.now();
  const plannedExtraSets = LIFT_EXTRA_SETS;
  LIFT_SET_DONE = STATE.exercises[LIFT_DAY].map(() => ({ s1: false, s2: false }));
  LIFT_SET_RPE  = STATE.exercises[LIFT_DAY].map(() => ({ s1: null, s2: null }));
  LIFT_EXTRA_SETS = STATE.exercises[LIFT_DAY].map((_, idx) => ({
    dismissed: !!plannedExtraSets[idx]?.dismissed,
    sets: (plannedExtraSets[idx]?.sets || []).map(s => ({ ...s })),
  }));
  LIFT_TECHNIQUES = STATE.exercises[LIFT_DAY].map(() => null);
  LIFT_DISMISSED_BANNERS = new Set();

  // Hide gate, show exercises + save btn + active bar
  const gate = document.getElementById("lift-start-gate");
  const warmupPage = document.getElementById("targeted-warmup-page");
  const exWrap = document.getElementById("lift-exercises");
  const saveBtn = document.getElementById("btn-save-session");
  const activeBar = document.getElementById("session-active-bar");
  if (gate) gate.style.display = "none";
  if (warmupPage) warmupPage.style.display = "none";
  if (exWrap) exWrap.style.display = "";
  if (saveBtn) saveBtn.style.display = "";
  if (activeBar) activeBar.classList.add("visible");

  renderLiftExercises();
  updateSessionDurationDisplay();
  scheduleWorkoutAutosave();
}

// ── Juggernaut Wave Engine ────────────────────────────────────────────────
// Implements Chad Wesley Smith's 4-week wave structure:
// Week 1: Accumulation  — high vol, low intensity (RPE 6-7, leave plenty in tank)
// Week 2: Intensification — moderate vol, higher intensity (RPE 7-8)
// Week 3: Realization   — low vol, test AMRAP at working max
// Week 4: Deload        — reduce vol/intensity, recover

const JUG_WAVES = [
  { name: "ACCUMULATION",    week: 1, rpeTarget: [6, 7], volumeMultiplier: 1.0,  deload: false,
    intensityNote: "High volume, stay RPE 6-7. Leave 3+ reps in tank.",
    hypertrophyNote: "Volume introduction week. Sets should feel manageable — technique and consistency are the goal. Stay between MEV and lower MAV. A session that felt easy is a good session this week.",
  },
  { name: "INTENSIFICATION", week: 2, rpeTarget: [7, 8], volumeMultiplier: 0.85, deload: false,
    intensityNote: "Moderate volume, push to RPE 7-8. Leave 1-2 reps in tank.",
    hypertrophyNote: "Volume climbs this week. Sets should feel genuinely challenging — RPE 7-8. This is where most of the growth stimulus comes from. Quality reps near failure, not failure itself.",
  },
  { name: "REALIZATION",     week: 3, rpeTarget: [8, 9], volumeMultiplier: 0.6,  deload: false,
    intensityNote: "AMRAP week — test your true capacity on lead exercise. Cap at 20 reps.",
    hypertrophyNote: "Near-MRV week. Volume is at its highest — push hard, but stay technically clean. AMRAP on lead lift to gauge strength progress. The deload is coming — earn it this week.",
  },
  { name: "DELOAD",          week: 4, rpeTarget: [5, 6], volumeMultiplier: 0.5,  deload: true,
    intensityNote: "Recovery week — 60% weights, 50% volume. Feeling fresh is the goal.",
    hypertrophyNote: "Recovery week. Drop to ~60% of normal weight and ~50% volume. The adaptation from the last 3 weeks happens now — don't sabotage it by training hard. Feeling fresh by the end of the week is the only goal.",
  },
];



// Working max — stored per exercise day in STATE, used for Juggernaut % calculations

// After Realization week AMRAP: recalculate working max
// Chad's formula: (reps performed - targetReps) × incrementPerRep + currentMax
// For PPL accessory work (not powerlifting comp lifts), we simplify:
// If reps > repMax consistently: add weight. If reps < repMin: deload.
function recalcWorkingMax(day, exIdx, amrapReps, amrapWeight, opts = {}) {
  const ex = STATE.exercises[day][exIdx];
  // Juggernaut Method: AMRAP → estimate 1RM (Epley) → Training Max = 90% of 1RM
  // This TM is stored as the working max and drives all future wave percentages.
  if (!amrapWeight || !amrapReps || amrapReps < 1) return getWorkingMax(day, exIdx, ex) || ex.start;
  const rpe = opts.rpe ?? null;
  const effectiveReps = amrapReps + (rpe != null && rpe <= 8 ? 2 : rpe === 9 ? 1 : 0);
  const estimatedOneRm = estimateOneRm(amrapWeight, effectiveReps);
  const epleyTM = roundToIncrement(estimatedOneRm * 0.90, ex);
  return epleyTM;
}

// ── Phase-1: Stall detection ──────────────────────────────────────────────────
// Returns true if the last `n` sessions for a given day+exercise show identical
// weight × reps. Compares s1w × s1r (first set — most consistent signal).
// n=3 is the default "confirmed stall"; n=2 is "early warning".
function isStalled(day, exIdx, n = 3) {
  const ex = activeExerciseForSlot(day, exIdx) || STATE.exercises[day]?.[exIdx];
  const sessions = exerciseHistoryFor(day, exIdx, ex, { allowSlotFallback: !isActiveExerciseSwapped(day, exIdx) }).sessions;
  if (sessions.length < n) return false;
  const recent = sessions.slice(-n);
  const w0 = recent[0].sets?.[exIdx]?.s1w;
  const r0 = recent[0].sets?.[exIdx]?.s1r;
  if (w0 == null || r0 == null) return false;
  return recent.every(s => s.sets?.[exIdx]?.s1w === w0 && s.sets?.[exIdx]?.s1r === r0);
}

// ── Phase-1: Rep range adaptation ────────────────────────────────────────────
// Tracks per-exercise consecutive sessions where:
//   hitTop  = both sets hit repMax at RPE ≤ 7  (range is too easy → widen)
//   missMin = either set missed repMin         (range is too hard → narrow)
// Stored in STATE.repRangeCounters: { "PUSH:0": { hitTop: N, missMin: N }, ... }
// Returns a recommendation object or null.
function getRepRangeAdaptation(day, exIdx) {
  const counters = STATE.repRangeCounters || {};
  const activeEx = activeExerciseForSlot(day, exIdx) || STATE.exercises[day]?.[exIdx];
  const key = `${day}:${exerciseKeyFor(activeEx)}`;
  const c = counters[key] || { hitTop: 0, missMin: 0 };
  const ex = STATE.exercises[day]?.[exIdx];
  if (!ex) return null;
  if (isLeadLift(day, exIdx)) return null;
  if (c.hitTop >= 2) {
    return {
      action: "widen",
      newMin: ex.repMin,
      newMax: ex.repMax + 2,
      reason: `Hit ${ex.repMax} reps at RPE ≤7 two sessions in a row — range is too easy.`
    };
  }
  if (c.missMin >= 2) {
    return {
      action: "narrow",
      newMin: Math.max(1, ex.repMin - 1),
      newMax: Math.max(ex.repMin, ex.repMax - 2),
      reason: `Missed rep floor two sessions in a row — reduce range to match current capacity.`
    };
  }
  return null;
}

// Called on session save. Updates hitTop/missMin counters per exercise.
// Pass in the saved session object.
function updateRepRangeCounters(session) {
  if (!STATE.repRangeCounters) STATE.repRangeCounters = {};
  const day = session.day;
  const exercises = STATE.exercises[day] || [];
  exercises.forEach((ex, idx) => {
    if (isLeadLift(day, idx)) return;
    const key = `${day}:${sessionExerciseKey(session, idx) || idx}`;
    const s = session.sets?.[idx];
    if (!s) return;
    const { s1w, s1r, s2w, s2r } = s;
    if (s1r == null || s2r == null) return;

    // Get RPE for this exercise (average across both sets)
    const rpe1 = session.rpe?.[idx]?.s1 || null;
    const rpe2 = session.rpe?.[idx]?.s2 || null;
    const avgRpe = (rpe1 != null && rpe2 != null) ? (rpe1 + rpe2) / 2
                 : (rpe1 ?? rpe2 ?? null);

    const missMin = s1r < ex.repMin || s2r < ex.repMin;
    const hitTop  = s1r >= ex.repMax && s2r >= ex.repMax && (avgRpe == null || avgRpe <= 7);

    const prev = STATE.repRangeCounters[key] || { hitTop: 0, missMin: 0 };
    STATE.repRangeCounters[key] = {
      hitTop:  hitTop  ? prev.hitTop + 1  : 0,
      missMin: missMin ? prev.missMin + 1 : 0,
    };
  });
}

// Apply a rep range adaptation to STATE permanently.
function applyRepRangeAdaptation(day, exIdx, adaptation) {
  if (!adaptation || !STATE.exercises[day]?.[exIdx]) return;
  STATE.exercises[day][exIdx].repMin = adaptation.newMin;
  STATE.exercises[day][exIdx].repMax = adaptation.newMax;
  // Reset the counter for this exercise
  const key = `${day}:${exerciseKeyFor(STATE.exercises[day]?.[exIdx])}`;
  if (STATE.repRangeCounters) STATE.repRangeCounters[key] = { hitTop: 0, missMin: 0 };
  saveState();
}

// ── Phase-2: Weekly program adjustment ───────────────────────────────────────
// Runs on DELOAD week session save. Analyses the just-completed 4-week cycle
// and returns an array of changes to apply to the next cycle.
// Changes are stored in STATE.pendingProgramChanges and surfaced at session start.
//
// Rules (Bromley/Juggernaut):
//   STALL  (isStalled n=3)  → -5% working weight for that exercise
//   RPE    avg last 3 > 8.5 → drop one set (volume) next cycle — show as note, not auto-apply
//   BEAT   both sets hit repMax both sessions in last 2 → add increment (already handled by
//          progressionFor, so we only flag here if it STILL hasn't progressed — safety net)
//   RECOVERY trend declining 3+ sessions → recommend extra deload day (info only)

function weeklyProgramCheck(day) {
  const exercises = STATE.exercises[day] || [];
  const changes = [];

  // Average RPE for this day across last 3 sessions
  const daySessions = STATE.sessions
    .filter(s => s.day === day)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  let totalRpe = 0, rpeCount = 0;
  daySessions.forEach(s => {
    (s.rpe || []).forEach(r => {
      if (!r) return;
      if (r.s1) { totalRpe += r.s1; rpeCount++; }
      if (r.s2) { totalRpe += r.s2; rpeCount++; }
    });
  });
  const avgRpe = rpeCount > 0 ? totalRpe / rpeCount : null;

  // Per-exercise stall check
  exercises.forEach((ex, idx) => {
    if (isStalled(day, idx, 3)) {
      const curW = STATE.sessions
        .filter(s => s.day === day)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.sets?.[idx]?.s1w;
      if (curW == null) return;
      const newW = roundToIncrement(curW * 0.95, ex);
      changes.push({
        type: "stall_deload",
        exIdx: idx,
        exName: ex.name,
        oldWeight: curW,
        newWeight: newW,
        reason: `Stalled ${fmtWeight(curW)}kg for 3 sessions — drop 5% to reset (${fmtWeight(newW)}kg)`
      });
    }
  });

  // Session-level RPE signal
  if (avgRpe != null && avgRpe > 8.5) {
    changes.push({
      type: "high_rpe_info",
      exIdx: null,
      exName: null,
      reason: `Avg RPE ${avgRpe.toFixed(1)} across last 3 ${day} sessions — consider reducing volume by 1 set next cycle to manage fatigue`
    });
  }

  // Recovery trend check
  const recentLogs = [...STATE.dailyLogs]
    .filter(d => d.recovery != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  if (recentLogs.length >= 4) {
    const recent3avg = recentLogs.slice(0, 3).reduce((s, d) => s + d.recovery, 0) / 3;
    const prev3avg   = recentLogs.slice(3, 6).reduce((s, d) => s + d.recovery, 0) / 3;
    if (recent3avg < prev3avg - 1.5 && recent3avg < 6) {
      changes.push({
        type: "recovery_declining",
        exIdx: null,
        exName: null,
        reason: `Recovery trending down (${prev3avg.toFixed(1)} → ${recent3avg.toFixed(1)}/10) — an extra rest day before next ${day} session is recommended`
      });
    }
  }

  return changes; // empty = all good
}

// Persist pending changes to STATE; shown at next session start
function savePendingProgramChanges(day, changes) {
  if (!STATE.pendingProgramChanges) STATE.pendingProgramChanges = {};
  STATE.pendingProgramChanges[day] = changes.length > 0 ? changes : null;
  saveState();
}

// Apply a stall_deload change: adjust the working max downward
function applyProgramChange(day, change) {
  if (change.type !== "stall_deload") return; // info-only changes don't auto-apply
  setWorkingMax(day, change.exIdx, change.newWeight, STATE.exercises?.[day]?.[change.exIdx]);
  // Also clear any stale stall counters
  if (STATE.repRangeCounters) STATE.repRangeCounters[`${day}:${change.exIdx}`] = { hitTop: 0, missMin: 0 };
  saveState();
}

// ── Phase-2: Swap suggestion ─────────────────────────────────────────────────
// Returns swap alternatives when an exercise has been stalled for 3 sessions.
// Called from exercise card rendering — inline below both sets when stall detected.
function getStallSwapSuggestion(day, exIdx) {
  if (!isStalled(day, exIdx, 3)) return null;
  const ex = STATE.exercises[day]?.[exIdx];
  if (!ex) return null;
  const alts = getSwapAlternatives(ex.name);
  if (!alts.length) return null;
  return {
    exName: ex.name,
    alternatives: alts,
    reason: `Same weight and reps for 3 sessions — variation may break the plateau`
  };
}

// ── Phase-2: Diet phase transition decision tree ─────────────────────────────
// Wraps rpDietAnalytics() signals into a 3-tier decision: TRANSITION / WATCH / OK
// Returns null (no action needed) or { level, action, targetKcal, title, text }
function dietPhaseTransitionCheck() {
  const rp = rpDietAnalytics();
  const signals = [];
  const cut = STATE.cut;

  // Signal 1: loss rate off-target for a sustained period (not just 1 week)
  if (rp.rateStatus === "stalled" || rp.rateStatus === "gaining")
    signals.push({ key: "rate_stalled", text: `Loss rate stalled (${rp.weeklyPctLoss ?? 0}% BW/wk)` });
  else if (rp.rateStatus === "too_slow")
    signals.push({ key: "rate_slow",    text: `Loss too slow (${rp.weeklyPctLoss}% BW/wk, target 0.5-1%)` });
  else if (rp.rateStatus === "too_fast")
    signals.push({ key: "rate_fast",    text: `Loss too fast (${rp.weeklyPctLoss}% BW/wk, muscle risk)` });

  // Signal 2: phase duration
  if (rp.durationStatus === "critical")
    signals.push({ key: "duration_critical", text: `Phase running ${rp.phaseWeeks} weeks — RP max is 16` });
  else if (rp.durationStatus === "long")
    signals.push({ key: "duration_long",     text: `Phase at ${rp.phaseWeeks} weeks — metabolic adaptation likely` });

  // Signal 3: muscle retention risk
  if (rp.lossTooFast)
    signals.push({ key: "muscle_risk_rate",  text: "Loss pace risks muscle retention" });
  if (rp.lowProtein)
    signals.push({ key: "low_protein",       text: `Avg protein ${rp.avgProtein7}g — below floor (${cut.proteinFloor}g)` });
  if (rp.lowRecovery)
    signals.push({ key: "low_recovery",      text: `Avg recovery ${rp.avgRecovery7}/10 — fatigue accumulating` });

  if (signals.length === 0) return null;

  // Compute recommended new calorie target
  const currentKcal = rp.targetKcal;
  let suggestedKcal = null;
  let actionTitle = "";
  let actionText = "";
  let level = "info";

  const hasRateFast  = signals.some(s => s.key === "rate_fast" || s.key === "muscle_risk_rate");
  const hasRateSlow  = signals.some(s => s.key === "rate_stalled" || s.key === "rate_slow");
  const hasDuration  = signals.some(s => s.key === "duration_critical" || s.key === "duration_long");
  const hasFatigue   = signals.some(s => s.key === "low_recovery");

  if (rp.durationStatus === "critical" || (hasDuration && signals.length >= 2)) {
    level = "action";
    actionTitle = "DIET BREAK RECOMMENDED";
    actionText  = `${rp.phaseWeeks} weeks is a long cut. A 1-2 week diet break at maintenance (~${rp.targetKcal + 400}kcal) resets leptin, improves recovery, and protects muscle before continuing.`;
    suggestedKcal = rp.targetKcal + 400;
  } else if (hasRateFast) {
    level = "action";
    actionTitle = "INCREASE CALORIES";
    suggestedKcal = Math.round(currentKcal + 200);
    actionText  = `Losing too fast risks muscle. Add ~200kcal → ${suggestedKcal}kcal/day. Protein stays at ${cut.proteinFloor}g+.`;
  } else if (hasRateSlow && !hasFatigue && signals.length >= 2) {
    level = "action";
    actionTitle = "REDUCE CALORIES";
    suggestedKcal = Math.round(currentKcal - 150);
    actionText  = `Multiple stall signals. Try ${suggestedKcal}kcal/day for 1-2 weeks before making larger cuts.`;
  } else if (hasFatigue && signals.length >= 2) {
    level = "action";
    actionTitle = "REFEED DAY";
    suggestedKcal = Math.round(currentKcal + 350);
    actionText  = `Low recovery + ${signals.filter(s=>s.key!=="low_recovery").map(s=>s.text).join(", ")}. Schedule a 1-day refeed at ~${suggestedKcal}kcal to restore glycogen and hormones.`;
  } else {
    level = "info";
    actionTitle = "WATCH SIGNALS";
    actionText  = `${signals.length} signal${signals.length>1?"s":""} detected. Monitor for another week before acting: ${signals.map(s=>s.text).join(" · ")}.`;
  }

  return {
    level,       // "action" | "info"
    actionTitle,
    actionText,
    signals,
    suggestedKcal,
    currentKcal,
  };
}

// MRV warning: checks multi-session RPE trend and recovery signals
function mrvWarning() {
  const recent = [...STATE.sessions]
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  if (recent.length < 2) return null;

  // Average RPE across last 3 sessions
  let totalRpe = 0, rpeCount = 0;
  recent.slice(0,3).forEach(s => {
    (s.rpe || []).forEach(r => {
      if (!r) return;
      const v = typeof r === "number" ? r : ((r.s1 || 0) + (r.s2 || 0)) / 2;
      if (v > 0) { totalRpe += v; rpeCount++; }
    });
  });
  const avgRpe = rpeCount > 0 ? totalRpe / rpeCount : null;

  // Recovery trend
  const recentLogs = [...STATE.dailyLogs]
    .filter(d => d.recovery != null)
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0,7);
  const avgRecovery = recentLogs.length
    ? recentLogs.reduce((s,d) => s + d.recovery, 0) / recentLogs.length
    : null;

  // Recovery trend direction (improving or declining)
  const recovTrend = recentLogs.length >= 4
    ? (recentLogs.slice(0,3).reduce((s,d)=>s+d.recovery,0)/3) - (recentLogs.slice(3,7).reduce((s,d)=>s+d.recovery,0)/4)
    : null;

  // Energy rating trend from sessions
  const energyRatings = recent.slice(0,3).map(s => s.energyRating).filter(Boolean);
  const avgEnergy = energyRatings.length ? energyRatings.reduce((a,b)=>a+b,0)/energyRatings.length : null;

  // Performance stall check
  const day = LIFT_DAY;
  if (!day) return null;
  const leadIdx = getLeadLiftIdx(day);
  const daySessions = recent.filter(s => s.day === day).slice(0,3);
  let stalled = false;
  if (daySessions.length >= 3) {
    const lw = daySessions.map(s => s.sets?.[leadIdx]?.s1w ?? 0);
    const lr = daySessions.map(s => s.sets?.[leadIdx]?.s1r ?? 0);
    stalled = lw[0] === lw[1] && lw[1] === lw[2] && lr[0] === lr[1] && lr[1] === lr[2];
  }

  // Where are we in the wave?
  const wave = juggernautWave(0, day);

  const signals = [];
  if (avgRpe != null && avgRpe > 8.5)      signals.push(`avg RPE ${avgRpe.toFixed(1)}`);
  if (avgRecovery != null && avgRecovery <= 4.5) signals.push(`avg recovery ${avgRecovery.toFixed(1)}/10`);
  if (avgEnergy != null && avgEnergy <= 2)  signals.push("low pre-session energy");
  if (stalled)                               signals.push("lead lift stalled 3 sessions");
  if (recovTrend != null && recovTrend < -1) signals.push("recovery declining");

  // ── PULL DELOAD FORWARD: multiple signals + not already deload
  if (signals.length >= 2 && wave.name !== "DELOAD") {
    return {
      level: "warning",
      action: "pull_forward",
      text: `Fatigue accumulating: ${signals.join(" · ")}. You're in ${wave.name} week — consider taking an early deload now rather than waiting for week 4.`
    };
  }

  // ── PUSH DELOAD BACK: feeling great on deload week
  if (wave.name === "DELOAD" && avgRpe != null && avgRpe < 7 && (avgRecovery == null || avgRecovery >= 7) && !stalled) {
    return {
      level: "good",
      action: "push_back",
      text: `Feeling fresh (avg RPE ${avgRpe.toFixed(1)}, recovery ${avgRecovery?.toFixed(1) ?? "?"}): deload may not be needed this cycle. You could push through with an extra intensification week.`
    };
  }

  // ── SINGLE SIGNAL WARNING
  if (signals.length === 1 && (avgRpe != null && avgRpe > 8.5 || stalled)) {
    return {
      level: "info",
      action: null,
      text: `Watch: ${signals[0]}. One more session like this → consider early deload.`
    };
  }
  return null;
}

function sessionAverageLoggedRpe(session) {
  let total = 0;
  let count = 0;
  (session?.rpe || []).forEach((entry, idx) => {
    const values = typeof entry === "number"
      ? [entry]
      : [entry?.s1, entry?.s2];
    values.forEach((rpe, setIdx) => {
      if (rpe == null) return;
      const key = setIdx === 0 ? "s1" : "s2";
      if (typeof sessionSetDone === "function" && !sessionSetDone(session, idx, key)) return;
      total += rpe;
      count++;
    });
  });
  return count ? total / count : null;
}

function programStressReview(today = todayISO()) {
  const sessions = sortSessionsChronological((STATE.sessions || []).filter(s => s.date && s.date <= today));
  if (!sessions.length) {
    return {
      stressScore: 0,
      recommendation: "skip_deload",
      canSkipDeload: true,
      text: "No completed sessions are recorded yet, so accumulated training stress is low.",
      factors: ["0 sessions/week", "0 completed sets/week"],
    };
  }

  const programStart = STATE.profile?.programStart || sessions[0].date;
  let programSessions = sessions.filter(s => s.date >= programStart);
  if (!programSessions.length) programSessions = sessions;
  const firstDate = programSessions[0]?.date || programStart || today;
  const elapsedWeeks = Math.max(1 / 7, (daysBetween(firstDate, today) + 1) / 7);
  const completedSets = programSessions.reduce((sum, s) => {
    const base = (s.sets || []).reduce((inner, _, idx) => inner + sessionSetCount(s, idx), 0);
    const extras = (s.extraSets || []).reduce((inner, e) => inner + (e.sets || []).length, 0);
    return sum + base + extras;
  }, 0);
  const sessionsPerWeek = programSessions.length / elapsedWeeks;
  const completedSetsPerWeek = completedSets / elapsedWeeks;
  const completionRows = programSessions
    .map(s => typeof sessionCompletionRatio === "function" ? sessionCompletionRatio(s) : s.completionSummary?.completionRatio)
    .filter(v => v != null);
  const avgCompletion = completionRows.length ? completionRows.reduce((a, b) => a + b, 0) / completionRows.length : 1;
  const incompleteSessions = programSessions.filter(s => {
    const ratio = typeof sessionCompletionRatio === "function" ? sessionCompletionRatio(s) : s.completionSummary?.completionRatio;
    return ratio != null && ratio < 0.85;
  }).length;

  const rpeRows = programSessions.map(sessionAverageLoggedRpe).filter(v => v != null);
  const avgRpe = rpeRows.length ? rpeRows.reduce((a, b) => a + b, 0) / rpeRows.length : null;
  const recovery = recentRecoveryAverage(14);
  const fatigue = typeof computeFatigueSummary === "function" ? computeFatigueSummary(28) : null;

  const volumeTotals = {};
  for (const s of programSessions) {
    (s.sets || []).forEach((_, idx) => {
      const name = sessionExerciseName(s, idx);
      if (!name) return;
      const sets = sessionSetCount(s, idx);
      if (!sets) return;
      const weights = exerciseWeightedMuscles(name);
      Object.entries(weights).forEach(([muscle, weight]) => {
        volumeTotals[muscle] = (volumeTotals[muscle] || 0) + sets * weight;
      });
    });
  }
  const weeklyVolume = {};
  Object.entries(volumeTotals).forEach(([muscle, sets]) => {
    weeklyVolume[muscle] = roundVolume(sets / elapsedWeeks);
  });
  const overMrv = [];
  const nearMrv = [];
  Object.entries(VOLUME_LANDMARKS).forEach(([muscle, lm]) => {
    const sets = weeklyVolume[muscle] || 0;
    if (sets > lm.mrv) overMrv.push(muscle);
    else if (sets >= Math.max(lm.mav, lm.mrv * 0.85)) nearMrv.push(muscle);
  });

  const gaps = [];
  for (let i = 1; i < programSessions.length; i++) {
    gaps.push(daysBetween(programSessions[i - 1].date, programSessions[i].date));
  }
  const longestGap = gaps.length ? Math.max(...gaps) : daysBetween(programSessions[0].date, today);

  let performanceScore = 0;
  performanceScore += Math.min(30, completedSetsPerWeek * 1.25);
  performanceScore += Math.min(16, sessionsPerWeek * 3.5);
  if (avgRpe != null) performanceScore += Math.max(0, (avgRpe - 6) * 9);
  performanceScore += overMrv.length * 14 + nearMrv.length * 6;
  performanceScore += Math.min(14, (fatigue?.recoveryCost || 0) / 22);
  if (avgCompletion < 0.75) performanceScore += 8;

  let readinessModifier = 0;
  if (recovery != null && recovery < 6) readinessModifier += Math.min(6, (6 - recovery) * 3);
  if (recovery != null && recovery >= 8 && avgRpe != null && avgRpe < 7.2) readinessModifier -= 2;
  if (sessionsPerWeek < 2.5 && avgCompletion >= 0.85) readinessModifier -= 8;
  if (longestGap >= 4 && avgCompletion >= 0.85) readinessModifier -= 4;
  const stressScore = Math.round(clamp(performanceScore + readinessModifier, 0, 100));

  const performanceRequiresDeload = performanceScore >= 62 || overMrv.length > 0 || completedSetsPerWeek >= 80 || (avgRpe != null && avgRpe >= 8.2);
  const mustDeload = performanceRequiresDeload || avgCompletion < 0.7;
  const canSkip = !mustDeload && stressScore <= 46 && sessionsPerWeek <= 4.25 && avgCompletion >= 0.85 && (avgRpe == null || avgRpe < 7.8);
  const recommendation = mustDeload ? "take_deload" : canSkip ? "skip_deload" : "optional_deload";
  const drivers = [
    `${roundVolume(completedSetsPerWeek)} completed sets/week`,
    `${roundVolume(sessionsPerWeek)} sessions/week over ${roundVolume(elapsedWeeks)} weeks`,
  ];
  if (avgRpe != null) drivers.push(`avg RPE ${avgRpe.toFixed(1)}`);
  if (overMrv.length) drivers.push(`over MRV: ${overMrv.slice(0, 3).join(", ")}`);
  if (nearMrv.length) drivers.push(`near MRV: ${nearMrv.slice(0, 3).join(", ")}`);
  const context = [
    `completion ${Math.round(avgCompletion * 100)}%`,
  ];
  if (recovery != null) context.push(`check-in recovery ${recovery.toFixed(1)}/10`);
  if (incompleteSessions) context.push(`${incompleteSessions} incomplete session${incompleteSessions !== 1 ? "s" : ""}`);
  if (longestGap >= 3) context.push(`${longestGap}d longest gap`);

  const text = recommendation === "take_deload"
    ? "Do the deload today. Program stress is high enough that recovery work is the plan."
    : recommendation === "skip_deload"
    ? "Skip is available. Actual program stress is low enough to move into the next accumulation wave."
    : "Default to the deload. Stress is moderate, so only skip if joints, motivation, and sleep feel clearly strong.";

  return {
    stressScore,
    performanceScore: Math.round(clamp(performanceScore, 0, 100)),
    readinessModifier: Math.round(readinessModifier),
    recommendation,
    canSkipDeload: recommendation === "skip_deload",
    text,
    factors: [...drivers, ...context],
    drivers,
    context,
    weeklyVolume,
  };
}

function setDeloadSkipChoice(day, shouldSkip) {
  if (!STATE.profile) STATE.profile = {};
  if (!STATE.profile.skipDeloadNext) STATE.profile.skipDeloadNext = {};
  if (shouldSkip) STATE.profile.skipDeloadNext[day] = true;
  else delete STATE.profile.skipDeloadNext[day];
  saveState();
  selectLiftDay(day);
  toast(shouldSkip ? "DELOAD SKIPPED FOR THIS SESSION" : "DELOAD KEPT");
}

function renderDeloadStressReview(day, wave) {
  const el = document.getElementById("lsg-deload-review");
  if (!el) return;
  const isDecisionPoint = wave?.name === "DELOAD" || wave?.deloadSkipped || STATE.profile?.skipDeloadNext?.[day];
  if (!isDecisionPoint) {
    el.style.display = "none";
    return;
  }
  const review = programStressReview(todayISO());
  const label = document.getElementById("lsg-deload-label");
  const score = document.getElementById("lsg-deload-score");
  const text = document.getElementById("lsg-deload-text");
  const factors = document.getElementById("lsg-deload-factors");
  const actions = document.getElementById("lsg-deload-actions");
  const takeBtn = document.getElementById("btn-deload-take");
  const skipBtn = document.getElementById("btn-deload-skip");
  const skipActive = !!STATE.profile?.skipDeloadNext?.[day];
  if (!review.canSkipDeload && !skipActive) {
    el.style.display = "none";
    return;
  }
  el.style.display = "";
  const color = review.recommendation === "take_deload" ? "var(--bad)" : review.recommendation === "skip_deload" ? "var(--good)" : "#d4a017";
  el.style.borderLeftColor = color;
  if (label) {
    label.style.color = color;
    label.textContent = skipActive ? "DELOAD SKIPPED" : "DELOAD STRESS REVIEW";
  }
  if (score) score.textContent = `${review.stressScore}/100 STRESS`;
  if (text) text.textContent = skipActive ? "Skip choice is active for this workout. Press TAKE DELOAD to restore the deload prescription." : review.text;
  if (factors) {
    const driverText = review.drivers?.length ? `Performance: ${review.drivers.join(" · ")}` : "";
    const contextText = review.context?.length ? `Context: ${review.context.join(" · ")}` : "";
    factors.innerHTML = [driverText, contextText].filter(Boolean).map(escapeHtml).join("<br>");
  }
  if (actions) actions.style.display = (review.canSkipDeload || skipActive) ? "" : "none";
  if (skipBtn) {
    skipBtn.disabled = !review.canSkipDeload && !skipActive;
    skipBtn.style.opacity = skipBtn.disabled ? "0.45" : "1";
    skipBtn.textContent = skipActive ? "SKIP ACTIVE" : "SKIP DELOAD";
    skipBtn.onclick = () => {
      if (!review.canSkipDeload && !skipActive) {
        toast("STRESS TOO HIGH TO SKIP");
        return;
      }
      setDeloadSkipChoice(day, true);
    };
  }
  if (takeBtn) takeBtn.onclick = () => setDeloadSkipChoice(day, false);
}

function addMrvExerciseToDraft(day, rec) {
  const suggestion = rec.exercise || rec.toExercise || (MRV_EXERCISE_SUGGESTIONS[rec.muscle] || [])[0]?.name;
  if (!suggestion || !STATE.exercises?.[day]) return null;
  const targetKey = exerciseKeyFor(suggestion);
  const existingIdx = STATE.exercises[day].findIndex(ex => exerciseKeyFor(ex) === targetKey);
  if (existingIdx >= 0) {
    return { ex: activeExerciseForSlot(day, existingIdx) || STATE.exercises[day][existingIdx], idx: existingIdx, added: false };
  }
  const added = mrvExerciseDefaults(canonicalNameForExercise(suggestion), rec.muscle);
  STATE.exercises[day].push(added);
  const idx = STATE.exercises[day].length - 1;
  if (LIFT_DRAFT?.day === day) {
    const p = progressionFor(day, idx);
    LIFT_DRAFT.sets.push({ s1w: p.weight, s1r: p.reps, s2w: p.weight, s2r: p.reps });
    LIFT_SET_DONE.push({ s1: false, s2: false });
    LIFT_SET_RPE.push({ s1: null, s2: null });
    LIFT_EXTRA_SETS.push({ dismissed: false, sets: [] });
    LIFT_TECHNIQUES.push(null);
  }
  return { ex: added, idx, added: true };
}

function planMrvSetForDraft(day, rec) {
  let target = findCurrentDayMuscleExercise(day, rec.muscle, false);
  let addedExercise = false;
  if (!target) {
    const added = addMrvExerciseToDraft(day, rec);
    if (!added) return false;
    target = { ex: added.ex, idx: added.idx };
    addedExercise = added.added;
  }
  const already = (LIFT_EXTRA_SETS[target.idx]?.sets || []).some(s =>
    ["mrv", "mrv_projection", "mrv_autoplan"].includes(s.source) && s.muscle === rec.muscle
  );
  if (already) return false;
  const p = progressionFor(day, target.idx);
  const prescription = projectedExtraSetPrescription(target.idx, target.ex, rec.lm?.effortRpe ?? 7);
  if (!LIFT_EXTRA_SETS[target.idx]) LIFT_EXTRA_SETS[target.idx] = { dismissed: false, sets: [] };
  LIFT_EXTRA_SETS[target.idx].sets.push({
    weight: prescription.weight ?? p.weight,
    reps: prescription.reps ?? target.ex?.repMin ?? p.reps ?? 10,
    rpe: null,
    done: false,
    source: "mrv_autoplan",
    muscle: rec.muscle,
  });
  LIFT_MRV_AUTOPLAN.push({
    type: addedExercise ? "add_exercise_set" : "add_set",
    exercise: target.ex.name,
    weight: prescription.weight ?? p.weight,
    reps: prescription.reps ?? target.ex?.repMin ?? p.reps ?? 10,
    avgRpe: rec.lm?.effortRpe ?? 7,
    reason: rec.reason || rec.body || `${rec.muscle} is below target volume`,
    idx: target.idx,
    muscle: rec.muscle,
  });
  recordAdaptiveDecision({
    action: addedExercise ? "add_exercise" : "add_set",
    to: target.ex.name,
    day,
    reason: `${rec.muscle} was below target volume, so ${target.ex.name} was auto-planned before the session.`,
    confidence: rec.confidence || 0.66,
    targetMuscle: rec.muscle,
  });
  return true;
}

function planMrvReductionForDraft(day, rec) {
  const muscle = rec.muscle || rec.fromMuscle;
  const target = findCurrentDayMuscleExercise(day, muscle, true);
  if (!target) return false;
  const set = LIFT_DRAFT?.sets?.[target.idx];
  if (!set || (set.s2w == null && set.s2r == null)) return false;
  set.s2w = null;
  set.s2r = null;
  LIFT_MRV_AUTOPLAN.push({
    type: "reduce_set",
    exercise: target.ex.name,
    reason: rec.reason || rec.body || `${muscle} is above target volume`,
    idx: target.idx,
    muscle,
  });
  recordAdaptiveDecision({
    action: "reduce_set",
    from: target.ex.name,
    day,
    reason: `${muscle} was above MRV/MAV, so one set was auto-removed before the session.`,
    confidence: rec.confidence || 0.7,
    targetMuscle: muscle,
  });
  return true;
}

function refreshMrvAutoplanSetPrescriptions() {
  for (const item of LIFT_MRV_AUTOPLAN) {
    if (!["add_set", "add_exercise_set"].includes(item.type)) continue;
    const ex = activeExerciseForSlot(LIFT_DAY, item.idx) || STATE.exercises[LIFT_DAY]?.[item.idx];
    if (!ex) continue;
    const prescription = projectedExtraSetPrescription(item.idx, ex, item.avgRpe ?? 7);
    const planned = (LIFT_EXTRA_SETS[item.idx]?.sets || []).find(s =>
      s.source === "mrv_autoplan" && s.muscle === item.muscle && !s.done
    );
    if (planned) {
      planned.weight = prescription.weight;
      planned.reps = prescription.reps;
    }
    item.weight = prescription.weight;
    item.reps = prescription.reps;
  }
}

function mrvAutoplanReportHtml() {
  return LIFT_MRV_AUTOPLAN.map(c => {
    if (c.type === "swap") return `<div style="margin-bottom:3px;">MRV auto-plan: ${escapeHtml(c.from)} -> ${escapeHtml(c.to)}</div>`;
    if (c.type === "reduce_set") return `<div style="margin-bottom:3px;">MRV auto-plan: removed 1 set from ${escapeHtml(c.exercise)}</div>`;
    if (c.type === "add_exercise_set") return `<div style="margin-bottom:3px;">MRV auto-plan: added ${escapeHtml(c.exercise)} and 1 set at ${fmtWeight(c.weight)}kg x ${escapeHtml(String(c.reps))}</div>`;
    return `<div style="margin-bottom:3px;">MRV auto-plan: added 1 set to ${escapeHtml(c.exercise)} at ${fmtWeight(c.weight)}kg x ${escapeHtml(String(c.reps))}</div>`;
  }).join("");
}

function mrvAutoplanPlanRows() {
  return LIFT_MRV_AUTOPLAN.map(c => {
    if (c.type === "swap") return { label: "Swap", text: `${c.from} -> ${c.to}` };
    if (c.type === "reduce_set") return { label: "Volume", text: `Removed 1 set from ${c.exercise}` };
    if (c.type === "add_exercise_set") return { label: "Volume", text: `Added ${c.exercise}: ${fmtWeight(c.weight)}kg x ${c.reps}` };
    return { label: "Volume", text: `Added 1 set to ${c.exercise}: ${fmtWeight(c.weight)}kg x ${c.reps}` };
  });
}

function renderTodayPlanSummary(day, wave, readiness, deloadReview) {
  const summary = document.getElementById("lsg-plan-summary");
  const chip = document.getElementById("lsg-plan-chip");
  const rowsEl = document.getElementById("lsg-plan-rows");
  const details = document.getElementById("lsg-plan-details");
  const detailBody = document.getElementById("lsg-plan-detail-body");
  if (!summary || !rowsEl) return;
  const rows = [];
  const detailsHtml = [];
  rows.push({ label: "Wave", text: `${wave.name}${wave.deloadSkipped ? " skipped deload" : ""} · target RPE ${wave.rpeTarget[0]}-${wave.rpeTarget[1]}` });
  const mode = STATE.athleteProfile?.programMode || "hypertrophy";
  const waveText = wave.deloadSkipped
    ? "Deload skipped by stress review. Starting the next accumulation wave with normal readiness controls."
    : (mode === "hypertrophy" && wave.hypertrophyNote) ? wave.hypertrophyNote : wave.intensityNote;
  if (waveText) {
    detailsHtml.push(`
      <div style="padding:8px 10px;border-radius:8px;background:var(--bg-elev-2);border-left:3px solid var(--accent);">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:800;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:3px;">WAVE INTENT</div>
        <div style="font-size:11px;line-height:1.45;color:var(--ink);">${escapeHtml(waveText)}</div>
      </div>
    `);
  }
  if (deloadReview) {
    const verdict = deloadReview.recommendation === "take_deload" ? "Deload recommended"
      : deloadReview.recommendation === "skip_deload" ? "Skip available"
      : "Deload default";
    rows.push({ label: "Deload", text: `${verdict} · ${deloadReview.stressScore}/100 stress` });
    detailsHtml.push(`
      <div style="padding:8px 10px;border-radius:8px;background:var(--bg-elev-2);border-left:3px solid ${deloadReview.recommendation === "take_deload" ? "var(--bad)" : deloadReview.recommendation === "skip_deload" ? "var(--good)" : "#d4a017"};">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:800;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:3px;">DELOAD LOGIC</div>
        <div style="font-size:11px;line-height:1.45;color:var(--ink);">${escapeHtml(deloadReview.text)}</div>
        <div style="font-size:10px;line-height:1.45;color:var(--ink-dim);margin-top:4px;">${escapeHtml((deloadReview.drivers || deloadReview.factors || []).join(" · "))}</div>
      </div>
    `);
  }
  mrvAutoplanPlanRows().forEach(r => rows.push(r));
  if (readiness?.score != null) {
    const adjustmentText = wave.name === "DELOAD" || !readiness.adjustment
      ? readinessLabel(readiness.score)
      : `${readinessLabel(readiness.score)} · ${Math.round(readiness.adjustment * 100) > 0 ? "+" : ""}${Math.round(readiness.adjustment * 100)}%`;
    rows.push({ label: "Readiness", text: `${readiness.score}/5 ${adjustmentText}` });
    if (readiness.factors?.length) {
      detailsHtml.push(`
        <div style="padding:8px 10px;border-radius:8px;background:var(--bg-elev-2);border-left:3px solid ${readinessColor(readiness.score)};">
          <div style="font-family:var(--f-mono);font-size:9px;font-weight:800;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:3px;">READINESS CONTEXT</div>
          <div style="font-size:10px;line-height:1.45;color:var(--ink-dim);">${escapeHtml(readiness.factors.join(" · "))}</div>
        </div>
      `);
    }
  }
  if (LIFT_MRV_AUTOPLAN.length) {
    detailsHtml.push(`
      <div style="padding:8px 10px;border-radius:8px;background:var(--bg-elev-2);border-left:3px solid #d4a017;">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:800;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:3px;">AUTO-APPLIED</div>
        <div style="font-size:11px;line-height:1.55;color:var(--ink);">${mrvAutoplanReportHtml()}</div>
      </div>
    `);
  }
  summary.style.display = "";
  if (chip) chip.textContent = `${rows.length} SIGNAL${rows.length !== 1 ? "S" : ""}`;
  rowsEl.innerHTML = rows.map(row => `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:5px 0;border-top:1px solid var(--line);">
      <span style="font-family:var(--f-mono);font-size:9px;font-weight:800;letter-spacing:0.1em;color:var(--ink-dim);text-transform:uppercase;">${escapeHtml(row.label)}</span>
      <span style="text-align:right;font-weight:700;">${escapeHtml(row.text)}</span>
    </div>
  `).join("");
  if (details && detailBody) {
    details.style.display = detailsHtml.length ? "" : "none";
    detailBody.innerHTML = detailsHtml.join("");
  }
}

function prepareMrvSessionPlan(day) {
  LIFT_MRV_AUTOPLAN = [];
  if (!LIFT_DRAFT || !day || typeof generateMrvRecommendations !== "function") return;
  const usedKeys = new Set((STATE.exercises[day] || []).map(ex => exerciseKeyFor(ex)));
  let changed = false;
  const recs = generateMrvRecommendations()
    .filter(r => r.action === "swap" && r.day === day)
    .filter(r => r.fromIdx != null && r.toExercise && r.fromExercise)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  for (const rec of recs) {
    const current = STATE.exercises[day]?.[rec.fromIdx];
    if (!current || current.leadLift) continue;
    if (exerciseKeyFor(current) !== exerciseKeyFor(rec.fromExercise)) continue;
    const toKey = exerciseKeyFor(rec.toExercise);
    const fromKey = exerciseKeyFor(current);
    if (!toKey || toKey === fromKey) continue;
    if (usedKeys.has(toKey)) continue;
    const dbMatch = typeof findDbMatch === "function" ? findDbMatch(rec.toExercise) : null;
    LIFT_DRAFT.swappedExercises[rec.fromIdx] = buildExerciseSwap(current, canonicalNameForExercise(rec.toExercise), dbMatch);
    resetDraftSlotForExercise(day, rec.fromIdx);
    usedKeys.delete(fromKey);
    usedKeys.add(toKey);
    LIFT_MRV_AUTOPLAN.push({
      type: "swap",
      from: current.name,
      to: canonicalNameForExercise(rec.toExercise),
      reason: rec.reason || rec.body || "MRV balance",
      idx: rec.fromIdx,
      muscle: rec.muscle,
    });
    changed = true;
  }
  const addRecs = generateMrvRecommendations()
    .filter(r => r.action === "add" && mrvRecommendationAppliesToDay(r, day))
    .filter(r => !mrvRecommendationAlreadyApplied(r, day))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  for (const rec of addRecs) {
    if (planMrvSetForDraft(day, rec)) changed = true;
  }
  const reduceRecs = generateMrvRecommendations()
    .filter(r => ["reduce", "watch"].includes(r.action) && mrvRecommendationAppliesToDay(r, day))
    .filter(r => !mrvRecommendationAlreadyApplied(r, day))
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  for (const rec of reduceRecs) {
    if (planMrvReductionForDraft(day, rec)) changed = true;
  }
  if (changed) {
    updateAdaptiveStateSnapshot("mrv_session_autoplan");
    saveState();
  }
}

function selectLiftDay(day) {
  LIFT_DAY = day;
  LIFT_EDITING_ID = null;
  LIFT_SESSION_ACTIVE = false;
  TARGETED_WARMUP_ACTIVE = false;
  LIFT_SESSION_START_MS = null;
  LIFT_SET_DONE = [];
  LIFT_SET_RPE = [];
  LIFT_EXTRA_SETS = [];
  LIFT_TECHNIQUES = [];
  LIFT_MRV_AUTOPLAN = [];
  LIFT_DISMISSED_BANNERS = new Set();
  $$(".day-tab").forEach(t => t.classList.toggle("active", t.dataset.day === day));
  const todayD = todayISO();
  LIFT_DRAFT = {
    id: "draft",
    day,
    date: todayD,
    sets: STATE.exercises[day].map((_, idx) => {
      const p = progressionFor(day, idx);
      return { s1w: p.weight, s1r: p.reps, s2w: p.weight, s2r: p.reps };
    }),
    swappedExercises: {},
    notes: null,
    targetedWarmup: null,
  };
  prepareMrvSessionPlan(day);
  $("#lift-date").value = todayD;
  const liftNotesEl = document.getElementById("lift-notes");
  if (liftNotesEl) liftNotesEl.value = "";
  $("#lift-recommended").textContent = `${day} · #${countSessions(day) + 1}`;

  // Show START gate, hide exercises / save btn / active bar
  const gate = document.getElementById("lift-start-gate");
  const warmupPage = document.getElementById("targeted-warmup-page");
  const exWrap = document.getElementById("lift-exercises");
  const saveBtn = document.getElementById("btn-save-session");
  const activeBar = document.getElementById("session-active-bar");
  const feedbackPanel = document.getElementById("session-feedback-panel");
  if (gate) {
    gate.style.display = "";
    const lsgDay = document.getElementById("lsg-day-label");
    const lsgSub = document.getElementById("lsg-sub-label");
    if (lsgDay) lsgDay.textContent = day;
    if (lsgSub) {
      const sessionNum = countSessions(day) + 1;
      const leadIdx = getLeadLiftIdx(day);
      const pLead = progressionFor(day, leadIdx);
      const leadName = STATE.exercises[day][leadIdx]?.name?.split(" ").slice(0,3).join(" ") || "Lead";
      lsgSub.textContent = `Session #${sessionNum} · ${leadName} @ ${fmtWeight(pLead.weight)}kg`;
    }

    // Juggernaut wave intent banner
    const todayDay = Math.max(1, daysBetween(STATE.profile.programStart, todayISO()) + 1);
    const wave = juggernautWave(todayDay, day); // pass day for session-based week count
    const waveEl    = document.getElementById("lsg-wave-intent");
    const waveLabel = document.getElementById("lsg-wave-label");
    const waveCycle = document.getElementById("lsg-wave-cycle");
    const waveNote  = document.getElementById("lsg-wave-note");
    const waveRpe   = document.getElementById("lsg-wave-rpe");
    if (waveEl && waveLabel && waveNote) {
      waveEl.style.display = "";
      const colors = { ACCUMULATION: "#4a9eff", INTENSIFICATION: "#d4a017", REALIZATION: "var(--accent)", DELOAD: "var(--good)" };
      waveEl.style.borderLeftColor = colors[wave.name] || "var(--accent)";
      waveLabel.style.color = colors[wave.name] || "var(--accent)";
      waveLabel.textContent = `WEEK ${wave.waveWeek}/4 · ${wave.name}`;
      if (waveCycle) waveCycle.textContent = `CYCLE ${wave.cycleNum} · WEEK ${wave.weekNum}`;
      const mode = STATE.athleteProfile?.programMode || "hypertrophy";
      waveNote.textContent = wave.deloadSkipped
        ? "Deload skipped by stress review. Starting the next accumulation wave with normal readiness controls."
        : (mode === "hypertrophy" && wave.hypertrophyNote) ? wave.hypertrophyNote : wave.intensityNote;
      if (waveRpe) waveRpe.textContent = `Target RPE: ${wave.rpeTarget[0]}–${wave.rpeTarget[1]} · ${mode.toUpperCase()} MODE`;
    }
    if (waveEl) waveEl.style.display = "none";
    const deloadReview = (wave?.name === "DELOAD" || wave?.deloadSkipped || STATE.profile?.skipDeloadNext?.[day])
      ? programStressReview(todayISO())
      : null;
    const readiness = calculateReadiness(todayISO());
    renderTodayPlanSummary(day, wave, readiness, deloadReview);
    renderDeloadStressReview(day, wave);

    // MRV warning
    const mrvWarn = wave.name === "DELOAD" ? null : mrvWarning();
    const mrvEl = document.getElementById("lsg-mrv-warn");
    const mrvText = document.getElementById("lsg-mrv-text");
    if (mrvEl && mrvText) {
      if (mrvWarn) {
        mrvEl.style.display = "";
        mrvText.textContent = mrvWarn.text;
        const colors = { warning: "var(--bad)", info: "#e07020", good: "var(--good)" };
        mrvEl.style.borderLeftColor = colors[mrvWarn.level] || "#e07020";
        const labels = { warning: "⚠️ MRV SIGNAL", info: "📊 WATCH", good: "✓ FATIGUE OK" };
        const labelEl = mrvEl.querySelector("div:first-child");
        if (labelEl) {
          labelEl.textContent = labels[mrvWarn.level] || "MRV SIGNAL";
          labelEl.style.color = colors[mrvWarn.level] || "#e07020";
        }
      } else {
        mrvEl.style.display = "none";
      }
    }
    if (mrvEl) mrvEl.style.display = "none";

    // MRV volume recommendation banner for this day
    const mrvRecEl    = document.getElementById("lsg-mrv-rec");
    const mrvRecLabel = document.getElementById("lsg-mrv-rec-label");
    const mrvRecText  = document.getElementById("lsg-mrv-rec-text");
    const mrvApplyBtn = document.getElementById("lsg-mrv-apply");
    if (mrvRecEl && mrvRecText) {
      // Filter to recommendations relevant to today's day. Abs/core can be added on any lift day.
      const dayRecs = mrvLiftRecommendationsForDay(day)
        .filter(r => !["add", "swap", "reduce", "watch"].includes(r.action));
      const topRec  = dayRecs[0]; // already sorted: over > swap > high > low > zero
      if (topRec) {
        mrvRecEl.style.display = "";
        const col = { over: "var(--bad)", swap: "var(--accent)", high: "#d4a017", low: "var(--good)", zero: "var(--ink-dim)" }[topRec.severity];
        const icon = { over: "!", swap: "SWAP", high: "HIGH", low: "ADD", zero: "0" }[topRec.severity];
        mrvRecEl.style.borderLeftColor = col;
        if (mrvRecLabel) { mrvRecLabel.textContent = `${icon} ${topRec.title}`; mrvRecLabel.style.color = col; }
        mrvRecText.textContent = topRec.body;
        // If multiple signals, append count
        if (dayRecs.length > 1) {
          mrvRecText.textContent += ` (+${dayRecs.length - 1} more — see STATS)`;
        }
        if (mrvApplyBtn) {
          mrvApplyBtn.style.display = "none";
          mrvApplyBtn.onclick = null;
        }
      } else {
        mrvRecEl.style.display = "none";
        if (mrvApplyBtn) {
          mrvApplyBtn.style.display = "none";
          mrvApplyBtn.onclick = null;
        }
      }
    }
    if (mrvRecEl) mrvRecEl.style.display = "none";
    const prEl    = document.getElementById("lsg-program-review");
    const prItems = document.getElementById("lsg-program-review-items");
    const pending = STATE.pendingProgramChanges?.[day];
    const prLabel = prEl?.querySelector("div:first-child");
    if (prEl && prItems && LIFT_MRV_AUTOPLAN.length > 0) {
      prEl.style.display = "";
      if (prLabel) prLabel.textContent = "SESSION PLAN";
      prItems.innerHTML = mrvAutoplanReportHtml();
      const applyReviewBtn = document.getElementById("btn-program-review-apply");
      const dismissReviewBtn = document.getElementById("btn-program-review-dismiss");
      if (applyReviewBtn) {
        applyReviewBtn.textContent = "AUTO-APPLIED";
        applyReviewBtn.disabled = true;
        applyReviewBtn.style.opacity = "0.65";
      }
      if (dismissReviewBtn) dismissReviewBtn.textContent = "HIDE";
      applyReviewBtn?.addEventListener("click", () => {
        toast("MRV PLAN ALREADY APPLIED");
      });
      dismissReviewBtn?.addEventListener("click", () => {
        LIFT_MRV_AUTOPLAN = [];
        prEl.style.display = "none";
      });
    } else if (prEl && prItems && pending && pending.length > 0) {
      prEl.style.display = "";
      if (prLabel) prLabel.textContent = "PROGRAM REVIEW";
      prItems.innerHTML = pending.map(c =>
        `<div style="margin-bottom:3px;">• ${escapeHtml(c.reason)}</div>`
      ).join("");
      const applyReviewBtn = document.getElementById("btn-program-review-apply");
      const dismissReviewBtn = document.getElementById("btn-program-review-dismiss");
      if (applyReviewBtn) {
        applyReviewBtn.textContent = "APPLY CHANGES";
        applyReviewBtn.disabled = false;
        applyReviewBtn.style.opacity = "1";
      }
      if (dismissReviewBtn) dismissReviewBtn.textContent = "DISMISS";
      // APPLY button: apply all stall_deload changes
      applyReviewBtn?.addEventListener("click", () => {
        pending.forEach(c => applyProgramChange(day, c));
        STATE.pendingProgramChanges[day] = null;
        saveState();
        prEl.style.display = "none";
        selectLiftDay(day); // re-render start gate with updated weights
        toast("PROGRAM UPDATED");
      });
      dismissReviewBtn?.addEventListener("click", () => {
        STATE.pendingProgramChanges[day] = null;
        saveState();
        prEl.style.display = "none";
      });
    } else if (prEl) {
      prEl.style.display = "none";
    }
    if (prEl && LIFT_MRV_AUTOPLAN.length > 0) prEl.style.display = "none";

    // Readiness banner with auto-adjust
    const rEl = document.getElementById("lsg-readiness");
    const rScore = document.getElementById("lsg-readiness-score");
    const rDetail = document.getElementById("lsg-readiness-detail");
    if (rEl && rScore && rDetail && readiness.score != null) {
      rEl.style.display = "";
      rEl.style.borderLeftColor = readinessColor(readiness.score);
      rScore.textContent = `${readiness.score}/5 · ${readinessLabel(readiness.score)}`;
      rScore.style.color = readinessColor(readiness.score);
      let detailText = readiness.factors.length ? readiness.factors.join(" · ") : "Standard prescription";
      if (readiness.adjustment !== 0 && wave.name !== "DELOAD") {
        const pct = Math.round(readiness.adjustment * 100);
        detailText += ` → ${pct > 0 ? "+" : ""}${pct}% intensity`;
      } else if (readiness.adjustment !== 0 && wave.name === "DELOAD") {
        detailText += " · deload load unchanged";
      }
      rDetail.textContent = detailText;
      // Apply readiness adjustment to draft sets — but NOT on deload week
      // (progressionFor already reduced weights by ~12.5% for deload)
      if (readiness.adjustment !== 0 && wave.name !== "DELOAD") {
        LIFT_DRAFT.sets = STATE.exercises[day].map((_, idx) => {
          const ex = STATE.exercises[day][idx];
          const p = progressionFor(day, idx);
          const adjW = roundToIncrement(p.weight * (1 + readiness.adjustment), ex);
          return { s1w: adjW, s1r: p.reps, s2w: adjW, s2r: p.reps };
        });
        LIFT_DRAFT.readinessAdjustment = readiness.adjustment;
        refreshMrvAutoplanSetPrescriptions();
        if (prItems && LIFT_MRV_AUTOPLAN.length > 0) prItems.innerHTML = mrvAutoplanReportHtml();
      }
      if (rEl) rEl.style.display = "none";
    } else if (rEl) {
      rEl.style.display = "none";
    }
  }
  if (warmupPage) warmupPage.style.display = "none";
  if (exWrap) exWrap.style.display = "none";
  if (saveBtn) saveBtn.style.display = "none";
  if (activeBar) activeBar.classList.remove("visible");
  if (feedbackPanel) feedbackPanel.style.display = "none";

  renderWorkoutResumeCard();
  renderLiftHistory();
}

function loadDraftFromSession(sessionId) {
  // Edit-existing path: load a saved session into LIFT_DRAFT for editing
  const s = STATE.sessions.find(x => x.id === sessionId);
  if (!s) return;
  LIFT_DAY = s.day;
  LIFT_EDITING_ID = sessionId;
  LIFT_SESSION_ACTIVE = true;   // editing skips the gate
  TARGETED_WARMUP_ACTIVE = false;
  $$(".day-tab").forEach(t => t.classList.toggle("active", t.dataset.day === s.day));
  LIFT_DRAFT = {
    id: s.id,
    day: s.day,
    date: s.date,
    sets: s.sets.map(set => ({ ...set })),
    swappedExercises: { ...(s.swappedExercises || {}) },
    notes: s.notes ?? null,
    targetedWarmup: s.warmup ? savedTargetedWarmup(s.warmup) : null,
  };
  LIFT_SET_DONE = STATE.exercises[s.day].map(() => ({ s1: false, s2: false }));
  // Migrate per-exercise rpe (legacy) → per-set rpe
  LIFT_SET_RPE = STATE.exercises[s.day].map((_, i) => {
    const legacy = (s.rpe || [])[i];
    if (legacy != null && typeof legacy === "number") return { s1: legacy, s2: legacy };
    if (legacy && typeof legacy === "object") return { s1: legacy.s1 ?? null, s2: legacy.s2 ?? null };
    return { s1: null, s2: null };
  });
  LIFT_EXTRA_SETS = STATE.exercises[s.day].map(() => ({ dismissed: false, sets: [] }));
  (s.extraSets || []).forEach((entry, idx) => {
    if (LIFT_EXTRA_SETS[idx] && Array.isArray(entry?.sets)) {
      LIFT_EXTRA_SETS[idx].sets = entry.sets.map(es => ({ ...es }));
    }
  });
  LIFT_TECHNIQUES = STATE.exercises[s.day].map((_, i) => s.techniques?.[i] || null);
  // When editing, don't restart the timer
  LIFT_SESSION_START_MS = null;
  $("#lift-date").value = s.date;
  const liftNotesEl2 = document.getElementById("lift-notes");
  if (liftNotesEl2) liftNotesEl2.value = s.notes ?? "";
  $("#lift-recommended").textContent = `EDITING · ${s.day} · ${formatDate(s.date)}`;

  // Hide gate, show exercises and save
  const gate = document.getElementById("lift-start-gate");
  const warmupPage = document.getElementById("targeted-warmup-page");
  const exWrap = document.getElementById("lift-exercises");
  const saveBtn = document.getElementById("btn-save-session");
  const activeBar = document.getElementById("session-active-bar");
  if (gate) gate.style.display = "none";
  if (warmupPage) warmupPage.style.display = "none";
  if (exWrap) exWrap.style.display = "";
  if (saveBtn) saveBtn.style.display = "";
  if (activeBar) activeBar.classList.remove("visible"); // no timer when editing

  renderLiftExercises();
  renderLiftHistory();
  updateSessionDurationDisplay();
}

// Update the duration chip on lift page; ticks every second while a session
// is in progress.
let _lastDurText = "";
let _lastDoneText = "";
function updateSessionDurationDisplay() {
  const el = document.getElementById("session-duration");
  if (!el) return;
  if (LIFT_EDITING_ID || !LIFT_SESSION_START_MS) {
    if (_lastDurText !== "") { el.textContent = ""; _lastDurText = ""; }
    return;
  }
  const elapsedSec = Math.floor((Date.now() - LIFT_SESSION_START_MS) / 1000);
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const durText = `${m}:${String(s).padStart(2, "0")}`;
  if (durText !== _lastDurText) { el.textContent = durText; _lastDurText = durText; }

  // Update done count badge — only if changed
  const sabDone = document.getElementById("sab-done-count");
  if (sabDone && LIFT_SET_DONE.length) {
    let doneCount = 0, total = 0;
    LIFT_SET_DONE.forEach((s, i) => {
      if (s.s1) doneCount++;
      if (s.s2) doneCount++;
      total += 2;
      // Count extra sets
      (LIFT_EXTRA_SETS[i]?.sets || []).forEach(es => {
        if (es.done) doneCount++;
        total++;
      });
    });
    const doneText = `${doneCount} / ${total} SETS`;
    if (doneText !== _lastDoneText) { sabDone.textContent = doneText; _lastDoneText = doneText; }
  }
}
setInterval(updateSessionDurationDisplay, 1000);

function countSessions(day) {
  return STATE.sessions.filter(s => s.day === day).length;
}

function renderLift() {
  if (!LIFT_DAY) selectLiftDay(nextSessionDay());
  else {
    if (TARGETED_WARMUP_ACTIVE) renderTargetedWarmupPage();
    if (LIFT_SESSION_ACTIVE) renderLiftExercises();
    renderWorkoutResumeCard();
    renderLiftHistory();
  }
}

// ── Bromley In-Session Rules Engine (v16) ────────────────────────────────
// Pure deterministic rules — no AI, instant, always correct.
// Based on BASE Strength SRA principles by Alex Bromley.

// Compute session fatigue score: how tired is the athlete right now?
// Returns 0-10. Used to gate extra set suggestions.
function sessionFatigueScore(upToExIdx) {
  let score = 0;
  for (let i = 0; i < upToExIdx; i++) {
    const s1rpe = LIFT_SET_RPE[i]?.s1;
    const s2rpe = LIFT_SET_RPE[i]?.s2;
    const s1done = LIFT_SET_DONE[i]?.s1;
    const s2done = LIFT_SET_DONE[i]?.s2;
    // Each completed set adds fatigue proportional to RPE
    if (s1done && s1rpe != null) score += (s1rpe - 5) * 0.3;
    if (s2done && s2rpe != null) score += (s2rpe - 5) * 0.3;
    // Extra sets add more fatigue
    const extra = LIFT_EXTRA_SETS[i]?.sets || [];
    extra.forEach(es => { if (es.done && es.rpe != null) score += (es.rpe - 5) * 0.35; });
  }
  return Math.max(0, score);
}

// Remaining exercise count after exIdx (how much work is left in the session)
function remainingExercises(exIdx) {
  return (STATE.exercises[LIFT_DAY]?.length || 0) - exIdx - 1;
}

// Bromley weight suggestion after a completed set
// Returns { verdict, newWeight, newReps, label, color }
function bromleyWeightSuggestion(exIdx, setNum) {
  const ex = activeExerciseForSlot(LIFT_DAY, exIdx) || STATE.exercises[LIFT_DAY][exIdx];
  const setKey = `s${setNum}`;
  const wField = `s${setNum}w`;
  const rField = `s${setNum}r`;
  const rpe  = LIFT_SET_RPE[exIdx]?.[setKey];
  const reps = LIFT_DRAFT.sets[exIdx]?.[rField];
  const weight = LIFT_DRAFT.sets[exIdx]?.[wField];
  const inc = incrementFor(ex);
  const wave = juggernautWave(0, LIFT_DAY);

  if (rpe == null || reps == null || weight == null) return null;

  const isLeadExercise = isLeadLift(LIFT_DAY, exIdx);
  if (isLeadExercise) {
    const p = progressionFor(LIFT_DAY, exIdx);
    const targetReps = p?.reps ?? reps;
    const isLastSet = setNum === 2;
    if (wave.name === "REALIZATION" && isLastSet) {
      const currentWM = getWorkingMax(LIFT_DAY, exIdx, STATE.exercises?.[LIFT_DAY]?.[exIdx]) || weight;
      const newWM = recalcWorkingMax(LIFT_DAY, exIdx, reps, weight, { currentTM: currentWM, targetReps, rpe });
      const wmChange = newWM > currentWM ? `+${fmtWeight(newWM - currentWM)}kg` : "holding";
      return {
        verdict: "amrap_result",
        newWeight: null, newReps: null,
        label: `AMRAP RESULT: ${reps} reps @ ${fmtWeight(weight)}kg`,
        text: `Training max ${wmChange === "holding" ? "unchanged" : "updating to"} ${fmtWeight(newWM)}kg next cycle. Save session to lock it in.`,
        color: "good"
      };
    }
    if (reps >= targetReps) return null;
    return {
      verdict: "jtm_target_miss",
      newWeight: null,
      newReps: null,
      label: `Below JTM target (${targetReps} reps)`,
      text: `Log the set as performed. Lead lifts stay on the JTM wave target; no accessory drop-weight rule is applied.`,
      color: "warn"
    };
  }

  const missedReps   = reps < ex.repMin;
  const hitTopRange  = reps >= ex.repMax;
  const inRange      = reps >= ex.repMin && reps <= ex.repMax;
  const isLastSet    = setNum === 2;
  const nextLabel    = isLastSet ? "next session" : "Set 2";
  const firstSet = LIFT_DRAFT.sets[exIdx] || {};
  const firstSetRpe = LIFT_SET_RPE[exIdx]?.s1 ?? null;
  const isHeavierSecondSetTrial = setNum === 2
    && weight > (firstSet.s1w ?? 0)
    && (firstSet.s1r ?? 0) >= ex.repMax
    && (firstSetRpe == null || firstSetRpe <= 7);

  // DELOAD WEEK: suppress all push/progress suggestions — only flag if dangerously high RPE
  if (wave.name === "DELOAD") {
    if (rpe >= 9) {
      return {
        verdict: "drop", newWeight: weight - inc, newReps: reps,
        label: `RPE ${rpe} on deload week — too heavy`,
        text: `RPE ${rpe} is too high for a deload week. Drop to ${fmtWeight(weight - inc)}kg — deload should feel easy (RPE 5-6).`,
        color: "warn"
      };
    }
    if (rpe <= 6 && inRange) {
      return null; // Expected on deload — don't say "push harder"
    }
    return null;
  }

  // REALIZATION WEEK AMRAP on lead lift last set — suppress ALL in-session suggestions.
  // Any RPE on an AMRAP set is expected and fine. Show a positive message instead.
  const isRealizationAMRAP = wave.name === "REALIZATION" && isLastSet && isLeadLift(LIFT_DAY, exIdx);
  if (isRealizationAMRAP) {
    const currentWM = getWorkingMax(LIFT_DAY, exIdx, STATE.exercises?.[LIFT_DAY]?.[exIdx]) || weight;
    const newWM = recalcWorkingMax(LIFT_DAY, exIdx, reps, weight, { currentTM: currentWM, targetReps: JUG_TM_PCTS.REALIZATION?.reps, rpe });
    const wmChange = newWM > currentWM ? `+${fmtWeight(newWM - currentWM)}kg` : "holding";
    return {
      verdict: "amrap_result",
      newWeight: null, newReps: null,
      label: `AMRAP RESULT: ${reps} reps @ ${fmtWeight(weight)}kg`,
      text: `Training max ${wmChange === "holding" ? "unchanged" : "updating to"} ${fmtWeight(newWM)}kg next cycle. Save session to lock it in.`,
      color: "good"
    };
  }

  // RPE 10 — absolute max, must drop
  if (isHeavierSecondSetTrial && missedReps) {
    return {
      verdict: "load_find_hold",
      newWeight: null, newReps: null,
      label: `Higher-load trial logged`,
      text: `Set 1 earned the increase. Hold ${fmtWeight(weight)}kg next session and rebuild reps; no deload is applied.`,
      color: "good"
    };
  }

  if (rpe === 10) {
    const drop = missedReps ? inc * 2 : inc;
    return {
      verdict: "drop", newWeight: weight - drop, newReps: ex.repMin,
      label: `RPE 10 — Drop ${drop}kg for ${nextLabel}`,
      text: `RPE 10 means nothing left. Drop to ${fmtWeight(weight - drop)}kg for ${nextLabel} — preserve technique.`,
      color: "bad"
    };
  }
  // RPE 9 — also skip during Realization AMRAP (going near-max is the point)
  if (rpe === 9 && isRealizationAMRAP) return null;

  // RPE 9 + missed reps — double drop
  if (rpe === 9 && missedReps) {
    return {
      verdict: "drop", newWeight: weight - inc * 2, newReps: ex.repMin,
      label: `RPE 9 + missed reps — Drop ${inc * 2}kg for ${nextLabel}`,
      text: `Missed reps at RPE 9 — reduce to ${fmtWeight(weight - inc * 2)}kg for ${nextLabel}.`,
      color: "bad"
    };
  }
  // RPE 9 + hit reps — single drop
  if (rpe === 9 && inRange) {
    const msg = isLastSet
      ? `RPE 9 at ${weight}kg — hold weight next session, focus on reps.`
      : `RPE 9 at Set 1 — drop to ${fmtWeight(weight - inc)}kg for Set 2 to stay in range.`;
    return {
      verdict: "drop", newWeight: weight - inc, newReps: reps,
      label: `RPE 9 — ${isLastSet ? "Hold next session" : "Drop " + inc + "kg for Set 2"}`,
      text: msg,
      color: "warn"
    };
  }
  // Missed reps at RPE ≤8 — weight is too heavy
  if (missedReps && rpe <= 8) {
    return {
      verdict: "drop", newWeight: weight - inc, newReps: ex.repMin,
      label: `Missed reps — Drop ${inc}kg for ${nextLabel}`,
      text: `Below rep floor at RPE ${rpe}. Drop to ${fmtWeight(weight - inc)}kg for ${nextLabel}.`,
      color: "warn"
    };
  }
  // RPE 8 + hit top of range → progress next session
  if (rpe === 8 && hitTopRange && isLastSet) {
    return {
      verdict: "progress", newWeight: weight + inc, newReps: ex.repMin,
      label: `Top of range @ RPE 8 — +${inc}kg next session`,
      text: `Hit ${reps} reps at RPE 8 — add ${inc}kg next ${LIFT_DAY} session.`,
      color: "good"
    };
  }
  // RPE ≤6 at Set 1 (in range) → push harder at Set 2
  // But only during Intensification or Realization — not Accumulation (stay submaximal)
  const todayWave = juggernautWave(0, LIFT_DAY);
  const canPushAccumulation = todayWave.name === "ACCUMULATION" && rpe <= 5; // only push if very easy in accumulation
  const canPushNormal = rpe <= 6 && inRange && setNum === 1 && todayWave.name !== "ACCUMULATION";
  if ((canPushAccumulation || canPushNormal) && inRange) {
    return {
      verdict: "push", newWeight: weight + inc, newReps: reps,
      label: `RPE ${rpe} — Push +${inc}kg at Set 2`,
      text: `RPE ${rpe} with ${reps} reps means you have significant room. Add ${inc}kg for Set 2.`,
      color: "good"
    };
  }
  // RPE 7 + in range at Set 1 → same weight, aim for more reps
  if (rpe === 7 && inRange && setNum === 1 && reps < ex.repMax) {
    return {
      verdict: "reps", newWeight: weight, newReps: Math.min(ex.repMax, reps + 1),
      label: `RPE 7 — Same weight, push ${Math.min(ex.repMax, reps + 1)} reps at Set 2`,
      text: `RPE 7 — same weight for Set 2, aim for ${Math.min(ex.repMax, reps + 1)} reps.`,
      color: "good"
    };
  }
  return null; // no suggestion needed — performance is on target
}

function bromleySuggestionHasAction(sugg) {
  return !!sugg && (sugg.newWeight != null || sugg.newReps != null);
}

function applyBromleySuggestionAutomatically(exIdx, setNum, sugg, opts = {}) {
  if (!bromleySuggestionHasAction(sugg)) return false;
  const nextSet = setNum + 1;
  if (nextSet > 2) {
    LIFT_DISMISSED_BANNERS.add(`${exIdx}-${setNum}`);
    return true;
  }
  if (LIFT_SET_DONE[exIdx]?.[`s${nextSet}`]) return false;

  if (sugg.newWeight != null) {
    LIFT_DRAFT.sets[exIdx][`s${nextSet}w`] = Math.max(0, sugg.newWeight);
    const wInp = document.querySelector(`input[data-ex="${exIdx}"][data-field="s${nextSet}w"]`);
    if (wInp) wInp.value = LIFT_DRAFT.sets[exIdx][`s${nextSet}w`];
  }
  if (sugg.newReps != null) {
    LIFT_DRAFT.sets[exIdx][`s${nextSet}r`] = Math.max(1, sugg.newReps);
    const rInp = document.querySelector(`input[data-ex="${exIdx}"][data-field="s${nextSet}r"]`);
    if (rInp) rInp.value = LIFT_DRAFT.sets[exIdx][`s${nextSet}r`];
  }

  LIFT_DISMISSED_BANNERS.add(`${exIdx}-${setNum}`);
  if (opts.toast) {
    const w = LIFT_DRAFT.sets[exIdx][`s${nextSet}w`];
    const r = LIFT_DRAFT.sets[exIdx][`s${nextSet}r`];
    toast(`SET ${nextSet} AUTO-UPDATED: ${fmtWeight(w)}kg x ${r}`);
  }
  return true;
}

function shouldShowBromleyInfo(sugg) {
  if (!sugg || bromleySuggestionHasAction(sugg)) return false;
  return ["amrap_result", "jtm_target_miss", "load_find_hold"].includes(sugg.verdict);
}

function mrvProjectedNeedForExercise(exIdx) {
  const ex = activeExerciseForSlot(LIFT_DAY, exIdx) || STATE.exercises[LIFT_DAY]?.[exIdx];
  if (!ex || typeof weeklyVolumeByMuscle !== "function") return null;
  const weights = exerciseWeightedMuscles(ex);
  const muscles = Object.keys(weights).filter(m => weights[m] > 0 && VOLUME_LANDMARKS[m]);
  if (!muscles.length) return null;
  const vol = weeklyVolumeByMuscle(7);
  const plannedExtra = (LIFT_EXTRA_SETS[exIdx]?.sets || []).filter(s => !s.done).length;
  const candidates = muscles.map(muscle => {
    const lm = typeof effectiveMrvLandmarksForMuscle === "function" ? effectiveMrvLandmarksForMuscle(muscle) : VOLUME_LANDMARKS[muscle];
    const current = vol[muscle] || 0;
    const projected = current + plannedExtra * weights[muscle];
    const target = Math.min(lm.mav, Math.max(lm.mev, lm.mav - 1));
    const deficit = Math.max(0, target - projected);
    const mrvRoom = Math.max(0, lm.mrv - projected);
    return { muscle, lm, current, projected, deficit, mrvRoom, contribution: weights[muscle] };
  }).sort((a, b) => b.deficit - a.deficit);
  const primary = candidates[0];
  if (!primary || primary.deficit <= 0 || primary.mrvRoom < primary.contribution) return null;
  const wave = juggernautWave(0, LIFT_DAY);
  const phaseCap = wave.name === "ACCUMULATION" ? 2 : wave.name === "INTENSIFICATION" ? 1 : wave.name === "REALIZATION" ? 1 : 0;
  if (phaseCap <= 0) return null;
  const neededByMrv = Math.ceil(primary.deficit / primary.contribution);
  const roomByMrv = Math.floor(primary.mrvRoom / primary.contribution);
  const suggestedSets = Math.max(0, Math.min(phaseCap, neededByMrv, roomByMrv));
  return suggestedSets ? { ...primary, suggestedSets, wave: wave.name } : null;
}

function projectedExtraSetPrescription(exIdx, ex, avgRpe) {
  const set = LIFT_DRAFT.sets[exIdx] || {};
  const inc = incrementFor(ex);
  const p = progressionFor(LIFT_DAY, exIdx);
  const lastWeight = set.s2w ?? set.s1w ?? p.weight;
  const lastReps = set.s2r ?? set.s1r ?? p.reps;
  const rpeDrop = avgRpe >= 7.25 ? inc : 0;
  return {
    weight: Math.max(0, roundToIncrement((lastWeight || 0) - rpeDrop, ex)),
    reps: Math.max(ex.repMin || 8, Math.min(ex.repMax || lastReps || 12, lastReps || ex.repMin || 8)),
  };
}

// Extra set suggestion after BOTH sets are done for an exercise
// Returns { suggest: bool, sets: number, reason, fatigue } | null
function extraSetSuggestion(exIdx) {
  const ex = activeExerciseForSlot(LIFT_DAY, exIdx) || STATE.exercises[LIFT_DAY][exIdx];
  if (isLeadLift(LIFT_DAY, exIdx)) return null;
  const s1rpe  = LIFT_SET_RPE[exIdx]?.s1;
  const s2rpe  = LIFT_SET_RPE[exIdx]?.s2;
  const s1reps = LIFT_DRAFT.sets[exIdx]?.s1r;
  const s2reps = LIFT_DRAFT.sets[exIdx]?.s2r;
  const s1w    = LIFT_DRAFT.sets[exIdx]?.s1w;

  // PHASE 2: Apply full restraint gate before any extra set logic
  const esGate = phase2RestraintGate();
  if (!esGate.canAddStress) {
    // On deload always suppress silently; otherwise allow the gate reason to surface
    return null;
  }
  const esWave = juggernautWave(0, LIFT_DAY);
  if (esWave.name === "DELOAD") return null;

  // Need both sets done and RPE logged for both
  if (!LIFT_SET_DONE[exIdx]?.s1 || !LIFT_SET_DONE[exIdx]?.s2) return null;
  if (s1rpe == null || s2rpe == null) return null;
  if (LIFT_EXTRA_SETS[exIdx]?.dismissed) return null;

  const avgRpe = (s1rpe + s2rpe) / 2;
  // Use whichever set had more reps for range check (be generous)
  const maxReps = Math.max(s1reps || 0, s2reps || 0);
  const inRange = maxReps >= ex.repMin; // at least hit the floor — don't require top of range
  const fatigue = sessionFatigueScore(exIdx);
  const mrvNeed = mrvProjectedNeedForExercise(exIdx);
  if (!mrvNeed) return null;
  const totalExercises = STATE.exercises[LIFT_DAY]?.length || 8;
  const remaining = remainingExercises(exIdx);
  const isLeadExercise = isLeadLift(LIFT_DAY, exIdx);
  // Position-aware: how far through the session are we? (0 = start, 1 = end)
  const sessionProgress = exIdx / totalExercises;

  // PHASE 2: Session duration protection
  // 60+ min: no extra sets — protect the session from growing too long
  const esDurationGate = phase2RestraintGate();
  if (esDurationGate.sessionMinutes >= 60) return null;

  // Never suggest if avg RPE ≥ 9
  if (avgRpe >= 9) return null;
  // Never suggest if reps missed badly (below floor for both sets)
  if (!inRange) return null;

  // Fatigue gate — scales with session position
  // Early in session: allow more fatigue headroom
  // Late in session (last 2 exercises): no extra sets
  if (remaining <= 1) return null; // last 2 exercises — protect them
  const fatigueCap = isLeadExercise ? 5 : (3 - sessionProgress * 1.5);
  if (fatigue > fatigueCap) return null;
  const prescription = projectedExtraSetPrescription(exIdx, ex, avgRpe);

  // RPE ≤6 avg → suggest 2 extra sets
  if (avgRpe <= 6) {
    return {
      suggestedSets: Math.min(2, mrvNeed.suggestedSets),
      weight: prescription.weight,
      reps: prescription.reps,
      reason: `${mrvNeed.muscle} is projected at ${roundVolume(mrvNeed.projected)} weighted sets vs target ${mrvNeed.lm.mev}-${mrvNeed.lm.mav} this phase. Avg RPE ${avgRpe.toFixed(1)} leaves room for a precise extra set at ${fmtWeight(prescription.weight)}kg x ${prescription.reps}.`,
      fatigue
    };
  }
  // RPE 7–7.5 → suggest 1 extra set
  if (avgRpe <= 7.5) {
    return {
      suggestedSets: Math.min(1, mrvNeed.suggestedSets),
      weight: prescription.weight,
      reps: prescription.reps,
      reason: `${mrvNeed.muscle} still needs projected phase volume (${roundVolume(mrvNeed.projected)} now, target ${mrvNeed.lm.mev}-${mrvNeed.lm.mav}). Add 1 controlled set at ${fmtWeight(prescription.weight)}kg x ${prescription.reps}; avg RPE was ${avgRpe.toFixed(1)}.`,
      fatigue
    };
  }
  return null;
}

function mrvRecommendationAppliesToDay(rec, day) {
  if (!rec || !day) return false;
  if (rec.day === day || !rec.day) return true;
  return rec.action === "add" && dayAllowsMuscle(day, rec.muscle);
}

function mrvRecommendationAlreadyApplied(rec, day = LIFT_DAY) {
  if (!rec || !day || !LIFT_DRAFT) return false;
  if (rec.action === "add") {
    const existing = findCurrentDayMuscleExercise(day, rec.muscle, false);
    if (existing) {
      return (LIFT_EXTRA_SETS[existing.idx]?.sets || []).some(s =>
        ["mrv", "mrv_projection", "mrv_autoplan"].includes(s.source) && s.muscle === rec.muscle
      );
    }
    const plannedName = rec.exercise || rec.toExercise || (MRV_EXERCISE_SUGGESTIONS[rec.muscle] || [])[0]?.name;
    const plannedKey = exerciseKeyFor(plannedName);
    return !!plannedKey && (STATE.exercises[day] || []).some(ex => exerciseKeyFor(ex) === plannedKey);
  }
  if (rec.action === "reduce" || rec.action === "watch") {
    const target = findCurrentDayMuscleExercise(day, rec.muscle || rec.fromMuscle, true);
    if (!target) return false;
    const set = LIFT_DRAFT.sets?.[target.idx];
    return !!set && set.s2w == null && set.s2r == null;
  }
  if (rec.action === "swap") {
    if (rec.fromIdx != null && LIFT_DRAFT?.swappedExercises?.[rec.fromIdx] && exerciseKeyFor(LIFT_DRAFT.swappedExercises[rec.fromIdx]) === exerciseKeyFor(rec.toExercise)) return true;
    return STATE.lastMrvSwap?.from === rec.fromExercise && STATE.lastMrvSwap?.to === rec.toExercise;
  }
  return false;
}

function mrvLiftRecommendationsForDay(day = LIFT_DAY) {
  return generateMrvRecommendations()
    .map((r, idx) => ({ ...r, _idx: idx }))
    .filter(r => mrvRecommendationAppliesToDay(r, day))
    .filter(r => !mrvRecommendationAlreadyApplied(r, day));
}

function mrvExerciseDefaults(name, muscle) {
  const db = typeof findDbMatch === "function" ? findDbMatch(name) : null;
  const equipment = db?.equipment || (name.toLowerCase().includes("cable") ? "cable" : "machine");
  const startByMuscle = { abs: 25, calves: 40, forearms: 15, biceps: 15, triceps: 25, shoulders: 10 };
  return {
    name,
    repMin: db?.type === "compound" ? 8 : 10,
    repMax: db?.type === "compound" ? 12 : 15,
    start: startByMuscle[muscle] ?? 20,
    equipment,
  };
}

function findCurrentDayMuscleExercise(day, muscle, preferHighestFatigue = false) {
  const candidates = (STATE.exercises[day] || [])
    .map((ex, idx) => {
      const active = activeExerciseForSlot(day, idx) || ex;
      return { ex: active, idx, weight: exerciseWeightedMuscles(active)[muscle] || 0, fatigue: exerciseFatigueProfile(active).recoveryCost };
    })
    .filter(c => c.weight > 0 && !c.ex.leadLift);
  if (!candidates.length) return null;
  return candidates.sort((a, b) => preferHighestFatigue ? b.fatigue - a.fatigue : b.weight - a.weight)[0];
}

function mrvLiftActionButtonLabel(rec, day = LIFT_DAY) {
  if (rec.action === "add") {
    return findCurrentDayMuscleExercise(day, rec.muscle, false) ? "ADD SET" : "ADD EXERCISE";
  }
  if (rec.action === "reduce" || rec.action === "watch") return "REDUCE SET";
  if (rec.action === "swap") return "APPLY SWAP";
  return "REVIEW";
}

function openMrvConfirmSheet({ title, body, details = [], confirmText = "APPLY", tone = "primary", onConfirm }) {
  const sheetBody = $("#sheet-body");
  if (!sheetBody || typeof openSheet !== "function") {
    if (typeof onConfirm === "function") onConfirm();
    return;
  }
  const detailHtml = details.length ? `
    <div style="display:grid;gap:7px;margin:12px 0;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg-elev-2);">
      ${details.map(item => `
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.35;">
          <span style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);text-transform:uppercase;">${escapeHtml(item.label)}</span>
          <span style="text-align:right;color:var(--ink);font-weight:700;">${escapeHtml(item.value)}</span>
        </div>
      `).join("")}
    </div>
  ` : "";
  sheetBody.innerHTML = `
    <div>
      <h3>${escapeHtml(title)}</h3>
      <p style="margin:0;color:var(--ink-mid);font-size:13px;line-height:1.5;">${escapeHtml(body)}</p>
      ${detailHtml}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">
        <button class="btn ghost" id="mrv-confirm-cancel" type="button">CANCEL</button>
        <button class="btn ${tone === "danger" ? "danger" : "primary"}" id="mrv-confirm-apply" type="button">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;
  openSheet();
  $("#mrv-confirm-cancel")?.addEventListener("click", closeSheet);
  $("#mrv-confirm-apply")?.addEventListener("click", () => {
    closeSheet();
    if (typeof onConfirm === "function") onConfirm();
  });
}

function addMrvExerciseToLiftDay(rec, day = LIFT_DAY, confirmed = false) {
  const suggestion = rec.exercise || rec.toExercise || (MRV_EXERCISE_SUGGESTIONS[rec.muscle] || [])[0]?.name;
  if (!suggestion) {
    toast("NO EXERCISE FOUND");
    return false;
  }
  if (!confirmed) {
    openMrvConfirmSheet({
      title: "Add MRV Exercise",
      body: "This adds the exercise to your program so it appears in future sessions too.",
      details: [
        { label: "Exercise", value: suggestion },
        { label: "Day", value: day },
        { label: "Reason", value: `${rec.muscle} is below target volume` },
      ],
      confirmText: "ADD EXERCISE",
      onConfirm: () => addMrvExerciseToLiftDay(rec, day, true),
    });
    return false;
  }
  const added = mrvExerciseDefaults(suggestion, rec.muscle);
  STATE.exercises[day].push(added);
  if (LIFT_DRAFT?.day === day) {
    const p = progressionFor(day, STATE.exercises[day].length - 1);
    LIFT_DRAFT.sets.push({ s1w: p.weight, s1r: p.reps, s2w: p.weight, s2r: p.reps });
    LIFT_SET_DONE.push({ s1: false, s2: false });
    LIFT_SET_RPE.push({ s1: null, s2: null });
    LIFT_EXTRA_SETS.push({ dismissed: false, sets: [] });
    LIFT_TECHNIQUES.push(null);
  }
  recordAdaptiveDecision({
    action: "add_exercise",
    to: suggestion,
    day,
    reason: `${rec.muscle} needed more weekly volume, so ${suggestion} was added to ${day}.`,
    confidence: rec.confidence || 0.68,
    targetMuscle: rec.muscle,
  });
  updateAdaptiveStateSnapshot("mrv_add_exercise");
  saveState();
  renderLift();
  toast(`ADDED ${suggestion.toUpperCase().slice(0, 22)}`);
  return true;
}

function addMrvSetToCurrentLift(rec, day = LIFT_DAY) {
  if (!LIFT_SESSION_ACTIVE) {
    toast("START SESSION FIRST");
    return false;
  }
  const target = findCurrentDayMuscleExercise(day, rec.muscle, false);
  if (!target) return addMrvExerciseToLiftDay(rec, day);
  const p = progressionFor(day, target.idx);
  const prescription = projectedExtraSetPrescription(target.idx, target.ex, rec.lm?.effortRpe ?? 7);
  if (!LIFT_EXTRA_SETS[target.idx]) LIFT_EXTRA_SETS[target.idx] = { dismissed: false, sets: [] };
  LIFT_EXTRA_SETS[target.idx].sets.push({
    weight: prescription.weight ?? p.weight,
    reps: prescription.reps ?? STATE.exercises[day][target.idx]?.repMin ?? p.reps ?? 10,
    rpe: null,
    done: false,
    source: "mrv",
    muscle: rec.muscle,
  });
  recordAdaptiveDecision({
    action: "add_set",
    to: target.ex.name,
    day,
    reason: `${rec.muscle} was below MEV, so one current-session set was added to ${target.ex.name}.`,
    confidence: rec.confidence || 0.66,
    targetMuscle: rec.muscle,
  });
  renderLiftExercises();
  toast(`MRV SET ADDED · ${target.ex.name.slice(0, 18)}`);
  return true;
}

function reduceMrvSetFromCurrentLift(rec, day = LIFT_DAY, confirmed = false) {
  const muscle = rec.muscle || rec.fromMuscle;
  const target = findCurrentDayMuscleExercise(day, muscle, true);
  if (!target) {
    toast("NO MATCHING EXERCISE TODAY");
    return false;
  }
  const set = LIFT_DRAFT?.sets?.[target.idx];
  if (!set) return false;
  if (!confirmed) {
    openMrvConfirmSheet({
      title: "Reduce MRV Set",
      body: "This removes one planned set from today's active session only.",
      details: [
        { label: "Exercise", value: target.ex.name },
        { label: "Day", value: day },
        { label: "Reason", value: `${muscle} is high relative to MRV/MAV` },
      ],
      confirmText: "REDUCE SET",
      tone: "danger",
      onConfirm: () => reduceMrvSetFromCurrentLift(rec, day, true),
    });
    return false;
  }
  set.s2w = null;
  set.s2r = null;
  if (LIFT_SET_DONE[target.idx]) LIFT_SET_DONE[target.idx].s2 = true;
  recordAdaptiveDecision({
    action: "reduce_set",
    from: target.ex.name,
    day,
    reason: `${muscle} volume was high, so one current-session set was removed from ${target.ex.name}.`,
    confidence: rec.confidence || 0.7,
    targetMuscle: muscle,
  });
  renderLiftExercises();
  toast(`SET REDUCED · ${target.ex.name.slice(0, 18)}`);
  return true;
}

function applyMrvLiftRecommendation(index) {
  const rec = generateMrvRecommendations()[index];
  if (!rec) return;
  if (rec.action === "swap") {
    applyMrvSwapRecommendation(index);
    return;
  }
  if (rec.action === "reduce" || rec.action === "watch") {
    reduceMrvSetFromCurrentLift(rec, LIFT_DAY);
    return;
  }
  if (rec.action === "add") {
    const existing = findCurrentDayMuscleExercise(LIFT_DAY, rec.muscle, false);
    if (existing) addMrvSetToCurrentLift(rec, LIFT_DAY);
    else addMrvExerciseToLiftDay(rec, LIFT_DAY);
  }
}

function mrvLiftActionPanel() {
  if (!LIFT_SESSION_ACTIVE) return "";
  const recs = mrvLiftRecommendationsForDay(LIFT_DAY).filter(rec => !["add", "swap", "reduce", "watch"].includes(rec.action));
  if (!recs.length) return "";
  const visible = recs.slice(0, 3);
  return `
    <div style="margin:0 0 12px;padding:10px 12px;border-radius:8px;background:var(--bg-elev-2);border:1px solid var(--line);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.14em;color:var(--accent);">MRV SESSION ACTIONS</div>
        <div style="font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);">${recs.length} SIGNAL${recs.length !== 1 ? "S" : ""}</div>
      </div>
      ${visible.map(rec => {
        const action = mrvLiftActionButtonLabel(rec, LIFT_DAY);
        const color = { over: "var(--bad)", swap: "var(--accent)", high: "#d4a017", low: "var(--good)", zero: "var(--ink-dim)" }[rec.severity] || "var(--accent)";
        return `
          <div style="padding:8px 0;border-top:1px solid var(--line);">
            <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:${color};margin-bottom:4px;">${escapeHtml(action)} · ${escapeHtml(rec.title)}</div>
            <div style="font-size:11px;color:var(--ink-mid);line-height:1.5;">${escapeHtml(rec.body)}</div>
            <button class="btn sm primary lift-mrv-action-btn" data-mrv-idx="${rec._idx}" style="margin-top:7px;width:100%;">${escapeHtml(action)}</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function activationRatingFromWeight(weight) {
  if (weight >= 0.85) return "main";
  if (weight >= 0.4) return "secondary";
  return null;
}

function currentMuscleActivationWeights(ex) {
  const key = exerciseKeyFor(ex);
  const manual = key ? STATE.exerciseMuscleActivations?.[key]?.weights : null;
  return manual ? { ...manual } : { ...exerciseWeightedMuscles(ex) };
}

function jsString(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function muscleActivationTargetFor(exOrName) {
  const name = typeof exOrName === "string" ? exOrName : exOrName?.name;
  const db = typeof findDbMatch === "function" ? findDbMatch(name) : null;
  return {
    ...(db || {}),
    ...(typeof exOrName === "object" ? exOrName : {}),
    name: name || db?.name || "Exercise",
    exerciseKey: exerciseKeyFor(exOrName),
  };
}

function muscleActivationEditorHtmlForExercise(exOrName) {
  const target = muscleActivationTargetFor(exOrName);
  const key = exerciseKeyFor(target);
  const weights = currentMuscleActivationWeights(target);
  const muscles = Object.entries(MUSCLE_LABELS).filter(([m]) => VOLUME_LANDMARKS[m]);
  return `
    <div style="font-family:var(--f-mono); font-size:10px; font-weight:700; letter-spacing:0.14em; color:var(--ink-dim); margin:16px 0 8px;">MUSCLE ACTIVATION</div>
    <div style="font-size:11px;color:var(--ink-dim);line-height:1.4;margin-bottom:8px;">Assign all main and secondary movers. These ratings drive volume, MRV, fatigue, and coaching.</div>
    <div style="display:grid;gap:6px;">
      ${muscles.map(([muscle, label]) => {
        const rating = activationRatingFromWeight(weights[muscle] || 0);
        return `
          <div style="display:grid;grid-template-columns:minmax(86px,1fr) auto auto;gap:6px;align-items:center;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg-elev-2);">
            <div style="font-size:12px;font-weight:700;">${escapeHtml(label)}</div>
            <button class="btn sm ${rating === "secondary" ? "primary" : "ghost"}" style="font-size:9px;padding:5px 8px;" onclick="setExerciseMuscleActivationByKey('${jsString(key)}', '${jsString(target.name)}', '${jsString(muscle)}', 'secondary')">SECONDARY</button>
            <button class="btn sm ${rating === "main" ? "primary" : "ghost"}" style="font-size:9px;padding:5px 8px;" onclick="setExerciseMuscleActivationByKey('${jsString(key)}', '${jsString(target.name)}', '${jsString(muscle)}', 'main')">MAIN</button>
          </div>`;
      }).join("")}
    </div>
    <button class="btn ghost sm" style="width:100%;margin-top:8px;" onclick="resetExerciseMuscleActivationByKey('${jsString(key)}')">RESET TO DEFAULT ACTIVATION</button>
  `;
}

function muscleActivationEditorHtml(exIdx, ex) {
  return muscleActivationEditorHtmlForExercise(ex);
}

function openEquipmentPicker(exIdx) {
  const day = LIFT_DAY;
  if (!day) return;
  const ex = STATE.exercises[day][exIdx];
  const currentLeadIdx = getLeadLiftIdx(day);
  const isCurrentLead = isLeadLift(day, exIdx);
  const EQUIPMENT_OPTIONS = [
    { value: null,         label: "Auto-detect",    inc: "auto" },
    { value: "machine",    label: "Machine",         inc: "+2.5kg" },
    { value: "cable",      label: "Cable",           inc: "+6kg" },
    { value: "smith",      label: "Smith Machine",   inc: "+2.5kg" },
    { value: "barbell",    label: "Barbell",         inc: "+2.5kg" },
    { value: "db",         label: "Dumbbell",        inc: "+2.5kg" },
    { value: "bodyweight", label: "Bodyweight",      inc: "+2.5kg" },
  ];
  const current = ex.equipment || null;
  window._refreshMuscleActivationEditor = () => openEquipmentPicker(exIdx);

  $("#sheet-body").innerHTML = `
    <div style="padding: 4px 0 16px;">
      <div style="font-family:var(--f-mono); font-size:10px; font-weight:700; letter-spacing:0.14em; color:var(--ink-dim); margin-bottom:12px;">EXERCISE SETTINGS · ${ex.name}</div>

      <!-- Lead lift toggle -->
      <div style="margin-bottom:16px; padding:10px 14px; background:${isCurrentLead ? "rgba(224,48,32,0.1)" : "var(--bg-elev-2)"}; border-radius:10px; border:1.5px solid ${isCurrentLead ? "var(--accent)" : "var(--line)"}; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-family:var(--f-mono); font-size:11px; font-weight:700; color:${isCurrentLead ? "var(--accent)" : "var(--ink)"};">⭐ LEAD LIFT</div>
          <div style="font-size:10px; color:var(--ink-dim); margin-top:2px;">AMRAP testing on Realization week</div>
        </div>
        <button onclick="toggleLeadLift(${exIdx})" style="padding:8px 14px; background:${isCurrentLead ? "var(--accent)" : "transparent"}; border:1.5px solid ${isCurrentLead ? "var(--accent)" : "var(--line)"}; border-radius:8px; color:${isCurrentLead ? "white" : "var(--ink-mid)"}; font-family:var(--f-mono); font-size:10px; font-weight:700; letter-spacing:0.1em; cursor:pointer;">
          ${isCurrentLead ? "✓ SET" : "SET"}
        </button>
      </div>

      <div style="font-family:var(--f-mono); font-size:10px; font-weight:700; letter-spacing:0.14em; color:var(--ink-dim); margin-bottom:8px;">EQUIPMENT TYPE</div>
      ${EQUIPMENT_OPTIONS.map(opt => `
        <button style="display:flex; width:100%; align-items:center; justify-content:space-between;
          padding:12px 14px; background:${(ex.equipment||null) === opt.value ? "var(--accent)" : "var(--bg-elev-2)"}; 
          border:none; border-radius:10px; margin-bottom:6px; cursor:pointer;
          color:${(ex.equipment||null) === opt.value ? "white" : "var(--ink)"};"
          onclick="setExerciseEquipment(${exIdx}, ${opt.value ? `'${opt.value}'` : "null"})">
          <span style="font-family:var(--f-mono); font-size:12px; font-weight:700; letter-spacing:0.06em;">${opt.label}</span>
          <span style="font-family:var(--f-mono); font-size:10px; opacity:0.7;">${opt.inc}</span>
        </button>`).join("")}

      <div style="font-family:var(--f-mono); font-size:10px; font-weight:700; letter-spacing:0.14em; color:var(--ink-dim); margin:16px 0 8px;">BAR TYPE (PLATE CALCULATOR)</div>
      ${[{val:"auto", label:"Auto-detect", kg:null}, ...Object.entries(BAR_LABELS).map(([v,l]) => ({val:v, label:l, kg:BAR_WEIGHTS[v]}))].map(opt => {
        const isActive = opt.val === "auto" ? !ex.barType : ex.barType === opt.val;
        return `
        <button style="display:flex; width:100%; align-items:center; justify-content:space-between;
          padding:10px 14px; background:${isActive ? "var(--accent)" : "var(--bg-elev-2)"};
          border:none; border-radius:10px; margin-bottom:6px; cursor:pointer;
          color:${isActive ? "white" : "var(--ink)"};"
          onclick="setBarType(${exIdx}, '${opt.val}')">
          <span style="font-family:var(--f-mono); font-size:11px; font-weight:700; letter-spacing:0.06em;">${opt.label}</span>
          ${opt.kg != null ? `<span style="font-family:var(--f-mono); font-size:10px; opacity:0.7;">${opt.kg}kg bar</span>` : ""}
        </button>`;
      }).join("")}
      ${muscleActivationEditorHtml(exIdx, ex)}
    </div>`;
  openSheet();
}

function toggleLeadLift(exIdx) {
  const day = LIFT_DAY;
  if (!day) return;
  const exs = STATE.exercises[day];
  const isAlreadyLead = isLeadLift(day, exIdx);
  // Remove leadLift from all exercises in this day
  exs.forEach(e => { delete e.leadLift; });
  if (!isAlreadyLead) {
    // Set this one as lead (only set if not already — toggle off if was set)
    exs[exIdx].leadLift = true;
  }
  saveState();
  closeSheet();
  renderLiftExercises();
}

function setExerciseEquipment(exIdx, equipment) {
  const day = LIFT_DAY;
  if (!day) return;
  if (equipment === null) {
    delete STATE.exercises[day][exIdx].equipment;
  } else {
    STATE.exercises[day][exIdx].equipment = equipment;
  }
  saveState();
  closeSheet();
  renderLiftExercises();
}

function setBarType(exIdx, barType) {
  const day = LIFT_DAY;
  if (!day) return;
  if (barType === "auto") {
    delete STATE.exercises[day][exIdx].barType;
  } else {
    STATE.exercises[day][exIdx].barType = barType;
  }
  saveState();
  closeSheet();
  renderLiftExercises();
}

function setExerciseMuscleActivation(exIdx, muscle, rating) {
  const day = LIFT_DAY;
  if (!day) return;
  const ex = STATE.exercises[day]?.[exIdx];
  if (!ex) return;
  setExerciseMuscleActivationByKey(exerciseKeyFor(ex), ex.name, muscle, rating);
}

function setExerciseMuscleActivationByKey(key, name, muscle, rating) {
  if (!key) return;
  if (!STATE.exerciseMuscleActivations) STATE.exerciseMuscleActivations = {};
  const ex = { name, exerciseKey: key };
  const weights = currentMuscleActivationWeights(ex);
  const currentRating = activationRatingFromWeight(weights[muscle] || 0);
  if (currentRating === rating) {
    delete weights[muscle];
  } else {
    weights[muscle] = MUSCLE_ACTIVATION_RATING_WEIGHTS[rating] || 0;
  }
  Object.keys(weights).forEach(m => {
    if (!weights[m] || weights[m] <= 0) delete weights[m];
  });
  if (Object.keys(weights).length) {
    STATE.exerciseMuscleActivations[key] = {
      name,
      weights,
      updatedAt: todayISO(),
    };
  } else {
    delete STATE.exerciseMuscleActivations[key];
  }
  saveState();
  if (typeof window._refreshMuscleActivationEditor === "function") {
    window._refreshMuscleActivationEditor();
  } else if (typeof renderLiftExercises === "function") {
    renderLiftExercises();
  }
}

function resetExerciseMuscleActivation(exIdx) {
  const day = LIFT_DAY;
  if (!day) return;
  const ex = STATE.exercises[day]?.[exIdx];
  if (!ex) return;
  resetExerciseMuscleActivationByKey(exerciseKeyFor(ex));
}

function resetExerciseMuscleActivationByKey(key) {
  if (!key) return;
  if (STATE.exerciseMuscleActivations) delete STATE.exerciseMuscleActivations[key];
  saveState();
  if (typeof window._refreshMuscleActivationEditor === "function") {
    window._refreshMuscleActivationEditor();
  } else if (typeof renderLiftExercises === "function") {
    renderLiftExercises();
  }
}

// ── Lead lift detection ──────────────────────────────────────────────────
// Returns true if this exercise is the lead lift for the day.
// Checks for explicit ex.leadLift flag first, then falls back to idx 0.


// Phase-2: Stall swap suggestion card — rendered inside exercise card when stalled 3 sessions
function stallSwapCard(exIdx) {
  if (!LIFT_SESSION_ACTIVE) return "";
  if (!LIFT_DAY) return "";
  // Only show after both sets done so user has completed the exercise
  const bothDone = LIFT_SET_DONE[exIdx]?.s1 && LIFT_SET_DONE[exIdx]?.s2;
  if (!bothDone) return "";
  const sugg = getStallSwapSuggestion(LIFT_DAY, exIdx);
  if (!sugg) return "";
  const alts = sugg.alternatives.map(name =>
    `<button class="btn ghost sm" style="font-size:10px;padding:5px 10px;" data-swap-alt="${exIdx}" data-swap-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`
  ).join("");
  return `
    <div class="extra-set-suggestion" data-stall-swap="${exIdx}" style="border-left-color:#d4a017;">
      <div class="es-label" style="color:#d4a017;">⚡ PLATEAU DETECTED</div>
      <div class="es-text">${escapeHtml(sugg.reason)}</div>
      <div class="es-text" style="margin-top:4px;font-size:10px;color:var(--ink-dim);font-family:var(--f-mono);letter-spacing:0.06em;">SWAP NEXT SESSION TO:</div>
      <div class="es-actions" style="flex-wrap:wrap;gap:5px;margin-top:6px;">
        ${alts}
        <button class="btn ghost sm" style="font-size:10px;padding:5px 10px;color:var(--ink-dim);" data-stall-dismiss="${exIdx}">DISMISS</button>
      </div>
    </div>`;
}

// Phase-2: Rep range adaptation card — rendered when 2 consecutive sessions hit threshold
function repRangeAdaptCard(exIdx) {
  if (!LIFT_SESSION_ACTIVE) return "";
  if (!LIFT_DAY) return "";
  const bothDone = LIFT_SET_DONE[exIdx]?.s1 && LIFT_SET_DONE[exIdx]?.s2;
  if (!bothDone) return "";
  const adaptation = getRepRangeAdaptation(LIFT_DAY, exIdx);
  if (!adaptation) return "";
  const ex = STATE.exercises[LIFT_DAY]?.[exIdx];
  if (!ex) return "";
  const icon = adaptation.action === "widen" ? "📈" : "📉";
  const color = adaptation.action === "widen" ? "var(--good)" : "#d4a017";
  return `
    <div class="extra-set-suggestion" data-rep-adapt="${exIdx}" style="border-left-color:${color};">
      <div class="es-label" style="color:${color};">${icon} REP RANGE ADJUSTMENT</div>
      <div class="es-text">${escapeHtml(adaptation.reason)}</div>
      <div class="es-text" style="margin-top:3px;font-size:11px;">
        ${ex.repMin}–${ex.repMax} reps → <strong>${adaptation.newMin}–${adaptation.newMax} reps</strong>
      </div>
      <div class="es-actions">
        <button class="btn-add-set" style="background:${color};" data-apply-rep-adapt="${exIdx}">APPLY</button>
        <button class="btn-skip-set" data-dismiss-rep-adapt="${exIdx}">SKIP</button>
      </div>
    </div>`;
}

function resetDraftSlotForExercise(day, idx) {
  if (!LIFT_DRAFT || LIFT_DRAFT.day !== day) return;
  const p = progressionFor(day, idx);
  LIFT_DRAFT.sets[idx] = { s1w: p.weight, s1r: p.reps, s2w: p.weight, s2r: p.reps };
  if (LIFT_SET_DONE[idx]) LIFT_SET_DONE[idx] = { s1: false, s2: false };
  if (LIFT_SET_RPE[idx]) LIFT_SET_RPE[idx] = { s1: null, s2: null };
  if (LIFT_EXTRA_SETS[idx]) LIFT_EXTRA_SETS[idx] = { dismissed: false, sets: [] };
  if (LIFT_TECHNIQUES[idx] !== undefined) LIFT_TECHNIQUES[idx] = null;
  LIFT_DISMISSED_BANNERS.delete(`${idx}-1`);
  LIFT_DISMISSED_BANNERS.delete(`${idx}-2`);
}

function buildExerciseSwap(canonEx, name, dbMatch) {
  const equipment = dbMatch?.equipment || detectEquipment(name, dbMatch) || canonEx.equipment;
  return {
    name,
    exerciseKey: exerciseKeyFor(name),
    repMin: canonEx.repMin,
    repMax: canonEx.repMax,
    start: dbMatch?.start ?? defaultStartWeightForExercise({ name, equipment }),
    equipment,
  };
}

function renderLiftExercises() {
  const wrap = $("#lift-exercises");
  const RPE_HINTS = {
    6: "Easy — 4+ reps in tank",
    7: "Moderate — 3 reps in tank",
    8: "Hard — 2 reps in tank",
    9: "Very hard — 1 rep in tank",
    10: "Max effort — nothing left",
  };

  // Helper: build one set block (set 1 or set 2)
  function setBlock(idx, setNum, ex, draftSet, isBW) {
    const setKey = `s${setNum}`;
    const wField = `s${setNum}w`;
    const rField = `s${setNum}r`;
    const inc = incrementFor(ex);
    const isDone = LIFT_SET_DONE[idx]?.[setKey] || false;
    const curRpe = LIFT_SET_RPE[idx]?.[setKey] || null;
    const wPlaceholder = isBW ? '+kg' : 'kg';

    const rpeBtns = [6,7,8,9,10].map(n =>
      `<button class="rpe-btn${curRpe === n ? " active" : ""}" data-ex="${idx}" data-set="${setNum}" data-rpe="${n}">${n}</button>`
    ).join("");

    // Bromley suggestion — only shown when set is DONE, RPE logged, and not dismissed
    let bromleyHtml = "";
    if (isDone && curRpe != null && !LIFT_DISMISSED_BANNERS.has(`${idx}-${setNum}`)) {
      const sugg = bromleyWeightSuggestion(idx, setNum);
      if (sugg) {
        const autoApplied = applyBromleySuggestionAutomatically(idx, setNum, sugg);
        if (autoApplied || !shouldShowBromleyInfo(sugg)) {
          bromleyHtml = "";
        } else {
        bromleyHtml = `
          <div class="bromley-banner ${sugg.color}" data-bb="${idx}-${setNum}">
            <div class="bb-label">📊 ${sugg.label}</div>
            <div class="bb-text">${escapeHtml(sugg.text)}</div>
          </div>`;
        }
      }
    }

    return `
      <div class="set-block ${isDone ? 'set-done' : ''}" data-set-block="${idx}-${setNum}">
        <div class="set-input-row">
          <div class="set-label">Set ${setNum}</div>
          <input type="number" inputmode="decimal" step="${inc}" placeholder="${wPlaceholder}" value="${draftSet[wField] ?? ''}" data-ex="${idx}" data-field="${wField}" />
          <input type="number" inputmode="numeric" placeholder="reps" value="${draftSet[rField] ?? ''}" data-ex="${idx}" data-field="${rField}" />
          <div class="timer-btn" data-ex="${idx}" data-set="${setNum}" title="Start rest timer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 3h6"/></svg>
          </div>
        </div>
        <div class="set-controls-row">
          <div class="set-rpe-inline">
            <span class="rpe-label">RPE</span>
            ${rpeBtns}
          </div>
          <button class="btn-set-done" data-ex="${idx}" data-set="${setNum}">
            ${isDone ? '<span class="done-check">✓</span> DONE' : '<span class="done-check">○</span> DONE'}
          </button>
        </div>
        <div class="set-flow-hint" data-rpe-hint="${idx}-${setNum}">${curRpe ? escapeHtml(RPE_HINTS[curRpe]) : ""}</div>
        ${bromleyHtml}
      </div>
    `;
  }

  // Helper: extra set blocks for exercises that have them added
  function extraSetsHtml(idx, ex, isBW) {
    const extra = LIFT_EXTRA_SETS[idx]?.sets || [];
    if (!extra.length) return "";
    const inc = incrementFor(ex);
    return extra.map((es, si) => {
      const setNum = si + 3; // Set 3, Set 4, etc.
      const isDone = es.done || false;
      const curRpe = es.rpe || null;
      const rpeBtns = [6,7,8,9,10].map(n =>
        `<button class="rpe-btn${curRpe === n ? " active" : ""}" data-ex="${idx}" data-extraset="${si}" data-rpe="${n}">${n}</button>`
      ).join("");
      return `
        <div class="set-block ${isDone ? 'set-done' : ''}" data-extra-block="${idx}-${si}" style="border-top-style: dashed; border-top-color: var(--good);">
          <div class="set-input-row">
            <div class="set-label" style="color:var(--good);">${es.technique ? escapeHtml(es.technique.replace(/_/g, " ").toUpperCase()) : `Set ${setNum}`}</div>
            <input type="number" inputmode="decimal" step="${inc}" placeholder="${isBW ? '+kg' : 'kg'}" value="${es.weight ?? ''}" data-ex="${idx}" data-extraset="${si}" data-extrafield="weight" />
            <input type="number" inputmode="numeric" placeholder="reps" value="${es.reps ?? ''}" data-ex="${idx}" data-extraset="${si}" data-extrafield="reps" />
            <div class="timer-btn" data-ex="${idx}" data-set="${setNum}" title="Start rest timer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 3h6"/></svg>
            </div>
          </div>
          <div class="set-controls-row">
            <div class="set-rpe-inline">
              <span class="rpe-label">RPE</span>
              ${rpeBtns}
            </div>
            <button class="btn-set-done btn-extra-done" data-ex="${idx}" data-extraset="${si}">
              ${isDone ? '<span class="done-check">✓</span> DONE' : '<span class="done-check">○</span> DONE'}
            </button>
          </div>
          <div class="set-flow-hint" data-extra-rpe-hint="${idx}-${si}">${curRpe ? escapeHtml(RPE_HINTS[curRpe]) : ""}</div>
        </div>`;
    }).join("");
  }

  // Helper: extra set suggestion card
  function extraSetSuggCard(idx, ex) {
    if (!LIFT_SESSION_ACTIVE) return "";
    const sugg = extraSetSuggestion(idx);
    if (!sugg) return "";
    const alreadyAdded = (LIFT_EXTRA_SETS[idx]?.sets || []).length;
    const toAdd = Math.max(0, sugg.suggestedSets - alreadyAdded);
    if (toAdd === 0) return "";
    return `
      <div class="extra-set-suggestion" data-extra-sugg="${idx}">
        <div class="es-label">➕ ADD ${toAdd} SET${toAdd > 1 ? "S" : ""}?</div>
        <div class="es-text">${escapeHtml(sugg.reason)}</div>
        <div class="es-text" style="margin-top:6px;"><strong>Recommended Change:</strong> Add ${toAdd} set${toAdd > 1 ? "s" : ""}.<br><strong>Expected Benefit:</strong> More stimulus while RPE and remaining-session fatigue are low.<br><strong>Risk:</strong> Extra volume can exceed recovery if joints or readiness feel poor.</div>
        <div class="es-actions">
          <button class="btn-add-set" data-ex="${idx}" data-addsets="${toAdd}" data-weight="${sugg.weight ?? ''}" data-reps="${sugg.reps ?? ''}">+ ADD SET${toAdd > 1 ? "S" : ""}</button>
          <button class="btn-skip-set" data-ex="${idx}">SKIP</button>
        </div>
      </div>`;
  }

  function intensityTechniqueCard(idx, ex) {
    // PHASE 2: Advanced techniques locked behind restraint gate
    const itGate = phase2RestraintGate();
    if (!itGate.canAddStress) return ""; // suppress before full rotation / deload / poor readiness
    if (!LIFT_SESSION_ACTIVE) return "";
    if (LIFT_TECHNIQUES[idx]) return "";
    if (isLeadLift(LIFT_DAY, idx)) return "";
    const db = typeof findDbMatch === "function" ? findDbMatch(ex.name) : null;
    const isAccessory = db?.type !== "compound" || idx >= 3;
    if (!isAccessory) return "";
    const wave = juggernautWave(0, LIFT_DAY);
    if (wave.name === "DELOAD") return "";
    if (!LIFT_SET_DONE[idx]?.s1 || !LIFT_SET_DONE[idx]?.s2) return "";
    const rpes = [LIFT_SET_RPE[idx]?.s1, LIFT_SET_RPE[idx]?.s2].filter(v => v != null);
    if (rpes.length < 2) return "";
    const avgRpe = rpes.reduce((a,b) => a + b, 0) / rpes.length;
    if (avgRpe >= 9) return "";
    const recs = mrvLiftRecommendationsForDay(LIFT_DAY);
    const muscle = exercisePrimaryMuscle(ex);
    const needsVolume = recs.some(r => r.action === "add" && r.muscle === muscle);
    if (!needsVolume && avgRpe > 7.5) return "";
    return `
      <div class="extra-set-suggestion" data-technique-sugg="${idx}" style="border-left-color:var(--accent);">
        <div class="es-label">INTENSITY OPTION</div>
        <div class="es-text">Accessory work is in range at RPE ${avgRpe.toFixed(1)}. Use one technique only if joints feel good.</div>
        <div class="es-actions">
          <button class="btn-add-set" data-technique="drop_set" data-ex="${idx}">DROP SET</button>
          <button class="btn-add-set" data-technique="rest_pause" data-ex="${idx}">REST-PAUSE</button>
          <button class="btn-skip-set" data-technique-skip="${idx}">SKIP</button>
        </div>
      </div>
    `;
  }

  wrap.innerHTML = mrvLiftActionPanel() + STATE.exercises[LIFT_DAY].map((canonEx, idx) => {
    const swap = LIFT_DRAFT.swappedExercises?.[idx];
    const ex = swap ? { ...canonEx, ...swap } : canonEx;
    const p = progressionFor(LIFT_DAY, idx);
    const verdictLabel = {
      PROGRESS: "✓ PROGRESS", BEAT: "↑ BEAT REPS", DELOAD: "↓ DELOAD",
      DELOAD_WAVE: "🔄 DELOAD WEEK", REALIZE: "📈 AMRAP TEST", START: "○ START"
    }[p.verdict] || p.verdict;
    const verdictCls = p.verdict === "DELOAD_WAVE" ? "deload" : p.verdict.toLowerCase();
    const draftSet = LIFT_DRAFT.sets[idx];
    const isBW = isBodyweightExercise(ex);
    const eq = detectEquipment(ex.name, ex);
    const inc = incrementFor(ex);
    const swapBadge = swap ? `<span class="tag" style="margin-left:6px; color: var(--accent); border-color: var(--accent);">SWAPPED</span>` : "";
    const clearSwapBtn = swap ? `<span data-clear-swap="${idx}" style="float:right;cursor:pointer;color:var(--ink-dim);font-size:9px;text-decoration:none;font-family:var(--f-mono);font-weight:700;padding:4px 4px 4px 8px;margin:-4px -4px -4px 0;letter-spacing:0.06em;opacity:0.8;">✕</span>` : "";
    const EQUIPMENT_TYPES = ["auto", "cable", "machine", "smith", "db", "barbell", "bodyweight"];
    const eqBadge = `
      <span class="tag" style="margin-left:6px; opacity:0.7; cursor:pointer;" 
        title="Tap to change equipment type" data-eq-badge="${idx}"
        onclick="openEquipmentPicker(${idx})">${eq.toUpperCase()} · +${inc}kg ✎</span>`;
    const bothDone = LIFT_SET_DONE[idx]?.s1 && LIFT_SET_DONE[idx]?.s2;
    const allExtraDone = (LIFT_EXTRA_SETS[idx]?.sets || []).every(es => es.done);
    const doneClass = bothDone && allExtraDone && !(extraSetSuggestion(idx)) ? "ex-done" : "";

    // Working weight for deload percentage display
    const lastSessions = STATE.sessions.filter(s => s.day === LIFT_DAY).sort((a,b) => a.date.localeCompare(b.date));
    const workingWeight = lastSessions.length ? (lastSessions[lastSessions.length-1].sets[idx]?.s1w ?? p.weight) : p.weight;

    // Juggernaut wave context for this exercise card
    const todayDayNum = Math.max(1, daysBetween(STATE.profile.programStart, todayISO()) + 1);
    const wave = juggernautWave(todayDayNum, LIFT_DAY);
    const isRealizationWeek = wave.name === "REALIZATION";
    const isDeloadWeek = wave.name === "DELOAD";
    // Realization week AMRAP card — only for lead exercise (idx 0)
    const isThisLeadLift = isLeadLift(LIFT_DAY, idx);
    const leadBadge = isThisLeadLift ? `<span class="tag" style="margin-left:6px; color:var(--accent); border-color:var(--accent); font-size:9px;">⭐ LEAD</span>` : "";
    const amrapCardHtml = (p.verdict === "REALIZE" && isThisLeadLift && !bothDone) ? `
      <div style="margin:10px 0 6px; padding:8px 12px; background:rgba(224,48,32,0.08); border:1.5px solid var(--accent); border-radius:10px;">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.14em;color:var(--accent);margin-bottom:3px;">📈 REALIZATION WEEK — AMRAP</div>
        <div style="font-size:12px;color:var(--ink);line-height:1.5;">Hit as many reps as possible on your last set. Stop 1 rep before technical breakdown. Cap: 20 reps. This result recalculates your training weights for next cycle.</div>
      </div>` : "";
    // Deload week reminder
    const deloadHtml = (isDeloadWeek && isThisLeadLift) ? `
      <div style="margin:10px 0 6px; padding:8px 12px; background:rgba(46,139,87,0.08); border:1px solid var(--good); border-radius:10px;">
        <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.14em;color:var(--good);margin-bottom:3px;">🔄 DELOAD WEEK</div>
        <div style="font-size:12px;color:var(--ink-mid);line-height:1.5;">Lower weight, lower volume. Feel fresh, recover fully. Fitness is NOT lost in one week — fatigue IS cleared.</div>
      </div>` : "";
    const displayTargetWeight = LIFT_SESSION_ACTIVE && draftSet
      ? (draftSet.s1w ?? draftSet.s2w ?? p.weight)
      : p.weight;
    const displayTargetReps = LIFT_SESSION_ACTIVE && draftSet
      ? (draftSet.s1r ?? draftSet.s2r ?? p.reps)
      : p.reps;

    return `
      <div class="exercise-card ${doneClass}" data-ex-idx="${idx}">
        <div class="ex-num">${String(idx+1).padStart(2,'0')}</div>
        <div class="ex-name">${ex.name}${swapBadge}${leadBadge}</div>
        <div class="ex-meta">
          ${isThisLeadLift ? `JTM ${escapeHtml(p.wavePhase || wave.name)}` : `${ex.repMin}-${ex.repMax} REPS`} &middot;
          <span class="verdict ${verdictCls}" style="margin-left:4px;">${verdictLabel}</span>
          ${eqBadge}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
          ${clearSwapBtn}<span class="swap-link" data-ex="${idx}" style="cursor:pointer;color:var(--ink-mid);font-size:10px;font-family:var(--f-mono);font-weight:700;letter-spacing:0.1em;text-decoration:underline;padding:4px 0;">SWAP EXERCISE</span>
        </div>
        <div class="prescription">
          <div>
            <div class="lbl">Target${p.wavePhase ? ` <span style="font-weight:400;opacity:0.6;font-size:9px;">${p.wavePhase}</span>` : ""}</div>
            <div class="val">${fmtPrescribedWeight(displayTargetWeight, ex)} · ${displayTargetReps} reps</div>
          </div>
        </div>
        ${(() => {
          const barType = ex.barType || getBarType(ex);
          if (barType === "none" || isBW) return "";
          const plates = fmtPlates(displayTargetWeight, barType);
          if (!plates) return "";
          const barKg = BAR_WEIGHTS[barType] ?? 20;
          return `<div style="font-family:var(--f-mono);font-size:10px;color:var(--ink-dim);margin-top:5px;letter-spacing:0.06em;">
            🏋 ${escapeHtml(BAR_LABELS[barType] || barType)} · <span style="color:var(--ink);">${plates}</span>
          </div>`;
        })()}
        ${(() => {
          const cues = getFormCues(ex.name);
          if (!cues || !cues.length) return "";
          return `<details style="margin-top:8px;">
            <summary style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.14em;color:var(--ink-dim);cursor:pointer;list-style:none;display:flex;align-items:center;gap:4px;">
              <span>▶ FORM CUES</span>
            </summary>
            <div style="margin-top:6px;padding:8px 10px;background:var(--bg-elev-2);border-radius:8px;border-left:2px solid var(--ink-dim);">
              ${cues.map((c,i) => `<div style="font-size:11px;color:var(--ink-mid);line-height:1.5;${i>0?"margin-top:4px;":""}">${i+1}. ${escapeHtml(c)}</div>`).join("")}
            </div>
          </details>`;
        })()}
        ${p.last ? `<div class="last-perf">Last: ${p.last}</div>` : ''}
        ${p.verdict === "DELOAD" ? `<div class="last-perf" style="color:var(--bad);margin-top:2px;">↓ Below rep range — reducing weight</div>` : ''}
        ${p.verdict === "DELOAD_WAVE" ? `<div class="last-perf" style="color:var(--good);margin-top:2px;">🔄 Deload week — ${fmtWeight(p.weight)}kg${workingWeight > 0 ? ` (${Math.round(p.weight / workingWeight * 100)}% of ${fmtWeight(workingWeight)}kg)` : ""}</div>` : ''}
        ${p.verdict === "PROGRESS" ? `<div class="last-perf" style="color:var(--good);margin-top:2px;">↑ Earned progression — adding ${inc}kg</div>` : ''}
        ${p.verdict === "REALIZE" ? `<div class="last-perf" style="color:var(--accent);margin-top:2px;">📈 Hold weight, push AMRAP on final set</div>` : ''}
        ${deloadHtml}
        ${amrapCardHtml}
        ${setBlock(idx, 1, ex, draftSet, isBW)}
        ${setBlock(idx, 2, ex, draftSet, isBW)}
        ${extraSetsHtml(idx, ex, isBW)}
        ${extraSetSuggCard(idx, ex)}
        ${intensityTechniqueCard(idx, ex)}
        ${stallSwapCard(idx)}
        ${repRangeAdaptCard(idx)}
      </div>
    `;
  }).join("");

  wrap.querySelectorAll(".lift-mrv-action-btn").forEach(btn => {
    btn.addEventListener("click", () => applyMrvLiftRecommendation(+btn.dataset.mrvIdx));
  });

  // Wire up weight/rep inputs
  wrap.querySelectorAll("input[data-field]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = +e.target.dataset.ex;
      const field = e.target.dataset.field;
      const val = e.target.value === "" ? null : parseFloat(e.target.value);
      LIFT_DRAFT.sets[idx][field] = val;
      if (field === "s1w" && val !== null) {
        const s2Input = wrap.querySelector(`input[data-ex="${idx}"][data-field="s2w"]`);
        if (s2Input && (s2Input.value === "" || LIFT_DRAFT.sets[idx].s2w === null)) {
          s2Input.value = e.target.value;
          LIFT_DRAFT.sets[idx].s2w = val;
        }
      }
    });
  });

  // Wire extra set inputs
  wrap.querySelectorAll("input[data-extrafield]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = +e.target.dataset.ex;
      const si  = +e.target.dataset.extraset;
      const field = e.target.dataset.extrafield;
      const val = e.target.value === "" ? null : parseFloat(e.target.value);
      if (LIFT_EXTRA_SETS[idx]?.sets[si]) LIFT_EXTRA_SETS[idx].sets[si][field] = val;
    });
  });

  // Wire up timer buttons
  wrap.querySelectorAll(".timer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.ex;
      const setNum = +btn.dataset.set;
      const ex = STATE.exercises[LIFT_DAY][idx];
      RestTimer.start({ ex, exIdx: idx, setNum, day: LIFT_DAY });
    });
  });

  // Wire up swap links
  wrap.querySelectorAll(".swap-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.stopPropagation();
      openSwapSheet(+link.dataset.ex);
    });
  });

  // Wire up clear swap buttons
  wrap.querySelectorAll("[data-clear-swap]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.clearSwap;
      if (LIFT_DRAFT?.swappedExercises) delete LIFT_DRAFT.swappedExercises[idx];
      resetDraftSlotForExercise(LIFT_DAY, idx);
      renderLiftExercises();
      toast("SWAP CLEARED");
    });
  });

  // Wire up RPE buttons (standard sets)
  wrap.querySelectorAll(".rpe-btn:not([data-extraset])").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx    = +btn.dataset.ex;
      const setNum = +btn.dataset.set;
      const setKey = `s${setNum}`;
      const rpe    = +btn.dataset.rpe;
      LIFT_SET_RPE[idx][setKey] = LIFT_SET_RPE[idx][setKey] === rpe ? null : rpe;
      const cur = LIFT_SET_RPE[idx][setKey];
      btn.closest(".set-block").querySelectorAll(".rpe-btn").forEach(b => {
        b.classList.toggle("active", +b.dataset.rpe === cur);
      });
      const hint = btn.closest(".set-block")?.querySelector(".set-flow-hint");
      if (hint) hint.textContent = cur ? RPE_HINTS[cur] : "";
      // Refresh Bromley banner for this set in-place
      _refreshBromleyBanner(idx, setNum);
    });
  });

  // Wire up RPE buttons (extra sets)
  wrap.querySelectorAll(".rpe-btn[data-extraset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.ex;
      const si  = +btn.dataset.extraset;
      const rpe = +btn.dataset.rpe;
      if (!LIFT_EXTRA_SETS[idx]?.sets[si]) return;
      LIFT_EXTRA_SETS[idx].sets[si].rpe = LIFT_EXTRA_SETS[idx].sets[si].rpe === rpe ? null : rpe;
      const cur = LIFT_EXTRA_SETS[idx].sets[si].rpe;
      btn.closest(".set-block").querySelectorAll(".rpe-btn").forEach(b => {
        b.classList.toggle("active", +b.dataset.rpe === cur);
      });
      const hint = btn.closest(".set-block")?.querySelector(".set-flow-hint");
      if (hint) hint.textContent = cur ? RPE_HINTS[cur] : "";
    });
  });

  function nextUnfinishedSetBlock(fromBlock) {
    const blocks = Array.from(wrap.querySelectorAll(".set-block"));
    const start = Math.max(0, blocks.indexOf(fromBlock) + 1);
    return blocks.slice(start).find(block => {
      if (block.dataset.setBlock) {
        const parts = block.dataset.setBlock.split("-").map(Number);
        return !LIFT_SET_DONE[parts[0]]?.[`s${parts[1]}`];
      }
      if (block.dataset.extraBlock) {
        const parts = block.dataset.extraBlock.split("-").map(Number);
        return !LIFT_EXTRA_SETS[parts[0]]?.sets?.[parts[1]]?.done;
      }
      return false;
    });
  }

  function guideToNextSet(fromBlock) {
    const next = nextUnfinishedSetBlock(fromBlock);
    if (!next) return;
    next.classList.add("set-next-focus");
    setTimeout(() => next.classList.remove("set-next-focus"), 1200);
    setTimeout(() => next.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

  // Wire up DONE buttons (standard sets)
  wrap.querySelectorAll(".btn-set-done:not(.btn-extra-done)").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx    = +btn.dataset.ex;
      const setNum = +btn.dataset.set;
      const setKey = `s${setNum}`;
      LIFT_SET_DONE[idx][setKey] = !LIFT_SET_DONE[idx][setKey];
      const isDone = LIFT_SET_DONE[idx][setKey];
      const block  = btn.closest(".set-block");
      block.classList.toggle("set-done", isDone);
      btn.innerHTML = isDone ? '<span class="done-check">✓</span> DONE' : '<span class="done-check">○</span> DONE';
      const bothDone = LIFT_SET_DONE[idx].s1 && LIFT_SET_DONE[idx].s2;
      block.closest(".exercise-card").classList.toggle("ex-done", bothDone && !(extraSetSuggestion(idx)) && !(LIFT_EXTRA_SETS[idx]?.sets?.length));
      updateSessionDurationDisplay();
      if (isDone) {
        RestTimer.start({ ex: STATE.exercises[LIFT_DAY][idx], exIdx: idx, setNum, day: LIFT_DAY });
        // Show Bromley banner
        _refreshBromleyBanner(idx, setNum);
        // After Set 2 done: check extra set suggestion
        if (setNum === 2) _refreshExtraSetSugg(idx);
        guideToNextSet(block);
      }
    });
  });

  // Wire up DONE buttons (extra sets)
  wrap.querySelectorAll(".btn-extra-done").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.ex;
      const si  = +btn.dataset.extraset;
      if (!LIFT_EXTRA_SETS[idx]?.sets[si]) return;
      LIFT_EXTRA_SETS[idx].sets[si].done = !LIFT_EXTRA_SETS[idx].sets[si].done;
      const isDone = LIFT_EXTRA_SETS[idx].sets[si].done;
      const block  = btn.closest(".set-block");
      block.classList.toggle("set-done", isDone);
      btn.innerHTML = isDone ? '<span class="done-check">✓</span> DONE' : '<span class="done-check">○</span> DONE';
      updateSessionDurationDisplay();
      if (isDone) {
        const setNum = si + 3;
        RestTimer.start({ ex: STATE.exercises[LIFT_DAY][idx], exIdx: idx, setNum, day: LIFT_DAY });
        // Check if more extra sets should be suggested
        _refreshExtraSetSugg(idx);
        guideToNextSet(block);
      }
    });
  });

  // Wire up Bromley APPLY buttons
  wrap.querySelectorAll(".btn-bb-apply").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx     = +btn.dataset.ex;
      const setNum  = +btn.dataset.set;
      const newW    = btn.dataset.weight !== "" ? parseFloat(btn.dataset.weight) : null;
      const newR    = btn.dataset.reps   !== "" ? parseInt(btn.dataset.reps)    : null;
      const nextSet = setNum + 1;
      if (nextSet <= 2) {
        if (newW != null) {
          LIFT_DRAFT.sets[idx][`s${nextSet}w`] = newW;
          const wInp = wrap.querySelector(`input[data-ex="${idx}"][data-field="s${nextSet}w"]`);
          if (wInp) wInp.value = newW;
        }
        if (newR != null) {
          LIFT_DRAFT.sets[idx][`s${nextSet}r`] = newR;
          const rInp = wrap.querySelector(`input[data-ex="${idx}"][data-field="s${nextSet}r"]`);
          if (rInp) rInp.value = newR;
        }
        toast(`SET ${nextSet} UPDATED → ${newW != null ? newW + "kg" : ""}${newR != null ? " × " + newR + " reps" : ""}`);
      } else {
        toast("NOTED FOR NEXT SESSION");
      }
      btn.closest(".bromley-banner")?.remove();
      LIFT_DISMISSED_BANNERS.add(`${idx}-${setNum}`);
    });
  });

  // Wire up Bromley DISMISS buttons
  wrap.querySelectorAll(".btn-bb-dismiss").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.ex;
      const setNum = +btn.dataset.set;
      LIFT_DISMISSED_BANNERS.add(`${idx}-${setNum}`);
      btn.closest(".bromley-banner")?.remove();
    });
  });

  // Wire up ADD SET buttons
  wrap.querySelectorAll(".btn-add-set").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.technique) return;
      const idx    = +btn.dataset.ex;
      const toAdd  = +btn.dataset.addsets;
      const weight = btn.dataset.weight !== "" ? parseFloat(btn.dataset.weight) : null;
      const reps = btn.dataset.reps !== "" ? parseInt(btn.dataset.reps, 10) : null;
      if (!LIFT_EXTRA_SETS[idx]) LIFT_EXTRA_SETS[idx] = { dismissed: false, sets: [] };
      for (let i = 0; i < toAdd; i++) {
        LIFT_EXTRA_SETS[idx].sets.push({ weight, reps, rpe: null, done: false, source: "mrv_projection" });
      }
      // Remove suggestion card and re-render just this exercise card
      _rerenderExCard(idx);
    });
  });

  // Wire accessory intensity technique buttons
  wrap.querySelectorAll("[data-technique]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.ex;
      const technique = btn.dataset.technique;
      const ex = STATE.exercises[LIFT_DAY][idx];
      const p = progressionFor(LIFT_DAY, idx);
      const inc = incrementFor(ex);
      const baseWeight = LIFT_DRAFT.sets[idx]?.s2w ?? LIFT_DRAFT.sets[idx]?.s1w ?? p.weight;
      const weight = technique === "drop_set"
        ? Math.max(0, Math.round((baseWeight * 0.7) / inc) * inc)
        : baseWeight;
      const reps = technique === "drop_set"
        ? Math.max(ex.repMin || 10, Math.round((ex.repMax || 15) * 0.8))
        : 4;
      if (!LIFT_EXTRA_SETS[idx]) LIFT_EXTRA_SETS[idx] = { dismissed: false, sets: [] };
      LIFT_EXTRA_SETS[idx].sets.push({ weight, reps, rpe: null, done: false, technique, source: "intensity" });
      LIFT_TECHNIQUES[idx] = technique;
      recordAdaptiveDecision({
        action: technique,
        to: ex.name,
        day: LIFT_DAY,
        reason: `${technique.replace(/_/g, " ")} added as an accessory intensity technique.`,
        confidence: 0.62,
        targetMuscle: exercisePrimaryMuscle(ex),
      });
      _rerenderExCard(idx);
      toast(`${technique === "drop_set" ? "DROP SET" : "REST-PAUSE"} ADDED`);
    });
  });

  // Wire up SKIP SET buttons
  wrap.querySelectorAll(".btn-skip-set").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.techniqueSkip) {
        LIFT_TECHNIQUES[+btn.dataset.techniqueSkip] = "skipped";
        btn.closest(".extra-set-suggestion")?.remove();
        return;
      }
      const idx = +btn.dataset.ex;
      if (!LIFT_EXTRA_SETS[idx]) LIFT_EXTRA_SETS[idx] = { dismissed: false, sets: [] };
      LIFT_EXTRA_SETS[idx].dismissed = true;
      btn.closest(".extra-set-suggestion")?.remove();
    });
  });

  // Phase-2: Wire stall swap alternative buttons
  wrap.querySelectorAll("[data-swap-alt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx  = +btn.dataset.swapAlt;
      const name = btn.dataset.swapName;
      if (!LIFT_DRAFT?.swappedExercises) LIFT_DRAFT.swappedExercises = {};
      const canonEx = STATE.exercises[LIFT_DAY][idx];
      const dbMatch = EXERCISE_DB.find(e => e.name === name) || findDbMatch(name);
      LIFT_DRAFT.swappedExercises[idx] = buildExerciseSwap(canonEx, name, dbMatch);
      resetDraftSlotForExercise(LIFT_DAY, idx);
      btn.closest("[data-stall-swap]")?.remove();
      _rerenderExCard(idx);
      toast(`NEXT SESSION: ${name.slice(0, 28)}`);
    });
  });

  // Phase-2: Wire stall dismiss button
  wrap.querySelectorAll("[data-stall-dismiss]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest("[data-stall-swap]")?.remove();
    });
  });

  // Phase-2: Wire rep range APPLY buttons
  wrap.querySelectorAll("[data-apply-rep-adapt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.applyRepAdapt;
      const adaptation = getRepRangeAdaptation(LIFT_DAY, idx);
      if (!adaptation) return;
      applyRepRangeAdaptation(LIFT_DAY, idx, adaptation);
      btn.closest("[data-rep-adapt]")?.remove();
      _rerenderExCard(idx);
      toast(`REP RANGE → ${adaptation.newMin}–${adaptation.newMax}`);
    });
  });

  // Phase-2: Wire rep range SKIP buttons
  wrap.querySelectorAll("[data-dismiss-rep-adapt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.dismissRepAdapt;
      // Reset counter so it doesn't fire again this session
      if (STATE.repRangeCounters) {
        STATE.repRangeCounters[`${LIFT_DAY}:${idx}`] = { hitTop: 0, missMin: 0 };
        saveState();
      }
      btn.closest("[data-rep-adapt]")?.remove();
    });
  });

  RestTimer.refreshButtons();
}

// ── Targeted exercise card helpers ──────────────────────────────────────────
function _refreshBromleyBanner(exIdx, setNum) {
  const block = document.querySelector(`.set-block[data-set-block="${exIdx}-${setNum}"]`);
  if (!block) return;
  // Remove existing banner
  block.querySelectorAll(".bromley-banner").forEach(b => b.remove());
  // Show new one if applicable
  const isDone = LIFT_SET_DONE[exIdx]?.[`s${setNum}`];
  const curRpe = LIFT_SET_RPE[exIdx]?.[`s${setNum}`];
  if (!isDone || curRpe == null) return;
  if (LIFT_DISMISSED_BANNERS.has(`${exIdx}-${setNum}`)) return;
  const sugg = bromleyWeightSuggestion(exIdx, setNum);
  if (!sugg) return;
  if (applyBromleySuggestionAutomatically(exIdx, setNum, sugg, { toast: true })) return;
  if (!shouldShowBromleyInfo(sugg)) return;
  const html = `
    <div class="bromley-banner ${sugg.color}" data-bb="${exIdx}-${setNum}">
      <div class="bb-label">📊 ${sugg.label}</div>
      <div class="bb-text">${escapeHtml(sugg.text)}</div>
    </div>`;
  block.insertAdjacentHTML("beforeend", html);
  // Wire buttons
  block.querySelectorAll(".btn-bb-apply").forEach(btn => {
    btn.addEventListener("click", () => {
      const newW = btn.dataset.weight !== "" ? parseFloat(btn.dataset.weight) : null;
      const newR = btn.dataset.reps   !== "" ? parseInt(btn.dataset.reps)    : null;
      const nextSet = setNum + 1;
      if (nextSet <= 2) {
        if (newW != null) {
          LIFT_DRAFT.sets[exIdx][`s${nextSet}w`] = newW;
          const w = document.querySelector(`input[data-ex="${exIdx}"][data-field="s${nextSet}w"]`);
          if (w) w.value = newW;
        }
        if (newR != null) {
          LIFT_DRAFT.sets[exIdx][`s${nextSet}r`] = newR;
          const r = document.querySelector(`input[data-ex="${exIdx}"][data-field="s${nextSet}r"]`);
          if (r) r.value = newR;
        }
        toast(`SET ${nextSet} → ${newW ?? ""}${newW && newR ? " × " : ""}${newR ? newR + " reps" : ""}`);
      } else {
        toast("NOTED FOR NEXT SESSION");
      }
      btn.closest(".bromley-banner")?.remove();
      LIFT_DISMISSED_BANNERS.add(`${exIdx}-${setNum}`);
    });
  });
  block.querySelectorAll(".btn-bb-dismiss").forEach(btn => {
    btn.addEventListener("click", () => {
      LIFT_DISMISSED_BANNERS.add(`${exIdx}-${setNum}`);
      btn.closest(".bromley-banner")?.remove();
    });
  });
  // Scroll into view
  setTimeout(() => block.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
}

function _refreshExtraSetSugg(exIdx) {
  const card = document.querySelector(`.exercise-card[data-ex-idx="${exIdx}"]`);
  if (!card) return;
  // Remove existing suggestion
  card.querySelectorAll(".extra-set-suggestion").forEach(el => el.remove());
  const canonEx = STATE.exercises[LIFT_DAY][exIdx];
  const sugg = extraSetSuggestion(exIdx);
  if (!sugg) return;
  const alreadyAdded = (LIFT_EXTRA_SETS[exIdx]?.sets || []).length;
  const toAdd = Math.max(0, sugg.suggestedSets - alreadyAdded);
  if (toAdd === 0) return;
  const html = `
    <div class="extra-set-suggestion" data-extra-sugg="${exIdx}">
      <div class="es-label">➕ ADD ${toAdd} SET${toAdd > 1 ? "S" : ""}?</div>
      <div class="es-text">${escapeHtml(sugg.reason)}</div>
      <div class="es-actions">
        <button class="btn-add-set" data-ex="${exIdx}" data-addsets="${toAdd}" data-weight="${sugg.weight ?? ''}" data-reps="${sugg.reps ?? ''}">+ ADD SET${toAdd > 1 ? "S" : ""}</button>
        <button class="btn-skip-set" data-ex="${exIdx}">SKIP</button>
      </div>
    </div>`;
  card.insertAdjacentHTML("beforeend", html);
  card.querySelector(".btn-add-set").addEventListener("click", (btn) => {
    const weight = sugg.weight;
    const reps = sugg.reps ?? null;
    if (!LIFT_EXTRA_SETS[exIdx]) LIFT_EXTRA_SETS[exIdx] = { dismissed: false, sets: [] };
    for (let i = 0; i < toAdd; i++) {
      LIFT_EXTRA_SETS[exIdx].sets.push({ weight, reps, rpe: null, done: false, source: "mrv_projection" });
    }
    _rerenderExCard(exIdx);
  });
  card.querySelector(".btn-skip-set").addEventListener("click", () => {
    if (!LIFT_EXTRA_SETS[exIdx]) LIFT_EXTRA_SETS[exIdx] = { dismissed: false, sets: [] };
    LIFT_EXTRA_SETS[exIdx].dismissed = true;
    card.querySelectorAll(".extra-set-suggestion").forEach(el => el.remove());
  });
  setTimeout(() => card.querySelector(".extra-set-suggestion")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
}

function _rerenderExCard(exIdx) {
  // Re-render just one exercise card in-place (used when extra sets are added)
  const card = document.querySelector(`.exercise-card[data-ex-idx="${exIdx}"]`);
  if (!card || !LIFT_DAY || !LIFT_DRAFT) return;
  // Just re-render the whole exercises block (it's fast, cards are lightweight)
  renderLiftExercises();
}
// Triggers only on RPE 9-10 OR missed reps to conserve API quota.

// Open a sheet to swap an exercise just for this session
// ── Exercise Database (ExRx-inspired, PPL-optimised) ─────────────────────
// Format: [name, muscleGroup, movement, equipment, type]
// muscleGroup: chest|back|shoulders|biceps|triceps|quads|hamstrings|glutes|calves|abs|forearms
// movement: push|pull|legs|arms|core
// equipment: barbell|dumbbell|cable|machine|smith|bodyweight|band|kettlebell
// type: compound|isolation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHASE 7 — EXERCISE LIBRARY + SUBSTITUTION ENGINE
// Rich metadata per exercise · substitution by role · rotation intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Phase 7 Item 2: Substitution engine
// Returns ordered substitution candidates preserving exercise role.
function getSubstitutions(exerciseName, reason) {
  reason = reason || "general";
  var meta = getExerciseMeta(exerciseName);
  var subs = [];

  // First: use curated substitutions from metadata
  if (meta && meta.substitutions && meta.substitutions.length) {
    meta.substitutions.forEach(function(name) {
      subs.push({ name: name, source: "curated", reason: reason });
    });
  }

  // Second: find DB exercises with same primary muscle and movement
  if (meta) {
    var dbFallbacks = EXERCISE_DB.filter(function(ex) {
      return ex.muscle === meta.primaryMuscle &&
             ex.name !== exerciseName &&
             !subs.some(function(s) { return s.name === ex.name; });
    }).slice(0, 4);
    dbFallbacks.forEach(function(ex) {
      subs.push({ name: ex.name, source: "db_match", reason: reason });
    });
  }

  // Annotate with reason-specific guidance
  if (reason === "pain") {
    subs = subs.filter(function(s) {
      var m = getExerciseMeta(s.name);
      return !m || m.jointStress !== "high";
    });
  }

  return subs.slice(0, 5);
}

// Phase 7 Item 3: Exercise metadata lookup (merges DB + rich metadata)
function getExerciseMeta(name) {
  if (!name) return null;
  // Exact match first
  var rich = EXERCISE_METADATA[name];
  if (rich) return rich;
  // Try fuzzy match
  var dbMatch = findDbMatch(name);
  if (dbMatch) {
    rich = EXERCISE_METADATA[dbMatch.name];
    if (rich) return rich;
    // Build minimal metadata from DB entry
    return {
      primaryMuscle: dbMatch.muscle,
      secondaryMuscles: [],
      movementPattern: dbMatch.movement,
      exerciseClass: dbMatch.type,
      jointStress: dbMatch.type === "compound" ? "moderate" : "low",
      fatigueCost: dbMatch.type === "compound" ? "high" : "low",
      progressionType: dbMatch.type === "compound" ? "load_first" : "rep_first",
      bestRepRange: dbMatch.type === "compound" ? [6,12] : [10,20],
      techniqueSensitivity: "moderate",
      loadJumpSensitivity: "moderate",
      substitutions: [],
      cues: [],
    };
  }
  return null;
}

// Phase 7 Item 4: Rotation intelligence
// Detects when an exercise has been used for 3+ cycles without variation
// Returns substitution suggestions for stale exercises.
function detectStaleExercises(day) {
  var exs = STATE.exercises[day] || [];
  var sessions = sortSessionsChronological(trainingSessionsForDay(day));
  var stale = [];

  exs.forEach(function(ex, idx) {
    if (ex.leadLift) return; // don't rotate lead lifts
    // Count how many sessions this exercise has been logged unchanged
    var consecutiveSessions = sessions.filter(function(s) {
      return s.sets && s.sets[idx] && s.sets[idx].s1r != null &&
             !(s.swappedExercises && s.swappedExercises[idx]);
    }).length;
    if (consecutiveSessions >= 12) { // 3 full 4-session cycles
      var subs = getSubstitutions(ex.name, "rotation");
      stale.push({
        idx: idx,
        name: ex.name,
        sessions: consecutiveSessions,
        message: ex.name + " used for " + consecutiveSessions + " sessions — consider a variation for fresh stimulus.",
        substitutions: subs.slice(0, 3),
      });
    }
  });

  return stale;
}

// Phase 7 Item 5: Get coaching cues for an exercise
function getExerciseCues(name) {
  var meta = getExerciseMeta(name);
  if (meta && meta.cues && meta.cues.length) return meta.cues;
  return [];
}

// Expose Phase 7 tools globally
window.ascendGetMeta        = getExerciseMeta;
window.ascendGetSubs        = getSubstitutions;
window.ascendStaleExercises = detectStaleExercises;
window.ascendGetCues        = getExerciseCues;


// Get all unique muscle groups from DB
const ALL_MUSCLES = [...new Set(EXERCISE_DB.map(e => e.muscle))].sort();
const MUSCLE_LABELS = {
  chest:"Chest", back:"Back", shoulders:"Shoulders", biceps:"Biceps",
  triceps:"Triceps", quads:"Quads", hamstrings:"Hamstrings",
  glutes:"Glutes", calves:"Calves", abs:"Core", forearms:"Forearms"
};

// ── Phase-1 data: exercise swap alternatives lookup table ─────────────────────
// Maps exercise name (lowercase) → ordered list of swap suggestions.
// Used by the stall-detection swap recommendation engine (Phase 2).
// Logic: variation first (same pattern, different angle/implement),
//        then movement-equivalent alternatives, then regression.
const SWAP_ALTERNATIVES = {
  // PUSH — Chest
  "smith incline bench press":   ["Smith Flat Bench Press","DB Incline Press","Machine Chest Press"],
  "smith flat bench press":      ["Smith Incline Bench Press","DB Flat Press","Machine Chest Press"],
  "db incline press":            ["DB Flat Press","Smith Incline Bench Press","Machine Incline Press"],
  "db flat press":               ["DB Incline Press","Smith Flat Bench Press","Cable Fly"],
  "machine chest press":         ["Smith Incline Bench Press","DB Incline Press","Cable Fly"],
  "cable fly":                   ["DB Fly","Machine Fly","DB Incline Press"],
  "db fly":                      ["Cable Fly","Machine Fly","DB Incline Press"],
  "machine fly":                 ["Cable Fly","DB Fly","Smith Flat Bench Press"],
  // PUSH — Shoulders
  "smith seated ohp":            ["DB Shoulder Press","Machine Shoulder Press","DB Arnold Press"],
  "db shoulder press":           ["Smith Seated OHP","Machine Shoulder Press","DB Arnold Press"],
  "machine shoulder press":      ["DB Shoulder Press","Smith Seated OHP","DB Arnold Press"],
  "db arnold press":             ["DB Shoulder Press","Machine Shoulder Press","Smith Seated OHP"],
  "db lateral raise":            ["Cable Lateral Raise","Machine Lateral Raise","DB Upright Row"],
  "cable lateral raise":         ["DB Lateral Raise","Machine Lateral Raise","DB Upright Row"],
  "machine lateral raise":       ["Cable Lateral Raise","DB Lateral Raise","DB Upright Row"],
  "cable rear delt fly":         ["DB Rear Delt Fly","Machine Rear Delt Fly","Face Pull"],
  "db rear delt fly":            ["Cable Rear Delt Fly","Machine Rear Delt Fly","Face Pull"],
  "face pull":                   ["Cable Rear Delt Fly","DB Rear Delt Fly","Machine Rear Delt Fly"],
  // PUSH — Triceps
  "cable pushdown":              ["DB Overhead Tricep Extension","Machine Tricep Extension","Cable Overhead Extension"],
  "db overhead tricep extension":["Cable Overhead Extension","Cable Pushdown","Machine Tricep Extension"],
  "cable overhead extension":    ["DB Overhead Tricep Extension","Cable Pushdown","Machine Tricep Extension"],
  "machine tricep extension":    ["Cable Pushdown","DB Overhead Tricep Extension","Cable Overhead Extension"],
  "smith close grip bench":      ["Cable Pushdown","DB Overhead Tricep Extension","Machine Tricep Extension"],
  // PULL — Back
  "cable row":                   ["Machine Row","DB Row","Cable Lat Pulldown"],
  "machine row":                 ["Cable Row","DB Row","Cable Lat Pulldown"],
  "db row":                      ["Cable Row","Machine Row","Cable Lat Pulldown"],
  "cable lat pulldown":          ["Machine Lat Pulldown","Cable Row","Assisted Pull-Up"],
  "machine lat pulldown":        ["Cable Lat Pulldown","Cable Row","Assisted Pull-Up"],
  "assisted pull-up":            ["Cable Lat Pulldown","Machine Lat Pulldown","Cable Row"],
  "cable straight arm pulldown": ["Cable Lat Pulldown","Machine Lat Pulldown","DB Pullover"],
  "db pullover":                 ["Cable Straight Arm Pulldown","Cable Lat Pulldown","Machine Lat Pulldown"],
  // PULL — Biceps
  "db curl":                     ["Cable Curl","Machine Curl","DB Hammer Curl"],
  "cable curl":                  ["DB Curl","Machine Curl","DB Hammer Curl"],
  "machine curl":                ["DB Curl","Cable Curl","DB Hammer Curl"],
  "db hammer curl":              ["Cable Hammer Curl","DB Curl","Machine Curl"],
  "cable hammer curl":           ["DB Hammer Curl","DB Curl","Cable Curl"],
  "db incline curl":             ["DB Curl","Cable Curl","Machine Curl"],
  "preacher curl":               ["Machine Curl","DB Incline Curl","Cable Curl"],
  // LEGS
  "hatfield squat":              ["Smith Machine Squat","Leg Press","Hack Squat"],
  "smith machine squat":         ["Hatfield Squat","Leg Press","Hack Squat"],
  "leg press":                   ["Hatfield Squat","Smith Machine Squat","Hack Squat"],
  "hack squat":                  ["Leg Press","Hatfield Squat","Smith Machine Squat"],
  "romanian deadlift":           ["DB Romanian Deadlift","Leg Curl","Cable Pull-Through"],
  "db romanian deadlift":        ["Romanian Deadlift","Leg Curl","Cable Pull-Through"],
  "leg curl":                    ["Romanian Deadlift","DB Romanian Deadlift","Nordic Curl"],
  "nordic curl":                 ["Leg Curl","DB Romanian Deadlift","Romanian Deadlift"],
  "leg extension":               ["Hatfield Squat","Leg Press","Smith Machine Squat"],
  "calf raise":                  ["Seated Calf Raise","Machine Calf Raise","DB Calf Raise"],
  "seated calf raise":           ["Calf Raise","Machine Calf Raise","DB Calf Raise"],
  "machine calf raise":          ["Calf Raise","Seated Calf Raise","DB Calf Raise"],
  "smith machine lunge":         ["DB Lunge","DB Bulgarian Split Squat","Leg Press"],
  "db lunge":                    ["Smith Machine Lunge","DB Bulgarian Split Squat","Leg Press"],
  "db bulgarian split squat":    ["Smith Machine Lunge","DB Lunge","Leg Press"],
  // ARMS (isolation)
  "ez bar curl":                 ["DB Curl","Cable Curl","Preacher Curl"],
  "db skull crusher":            ["Cable Overhead Extension","Machine Tricep Extension","Cable Pushdown"],
  "cable tricep kickback":       ["Cable Pushdown","DB Overhead Tricep Extension","Machine Tricep Extension"],
};

// Returns swap suggestions for a given exercise name. Fuzzy: lowercases + trims.
function getSwapAlternatives(name) {
  const key = (name || "").toLowerCase().trim()
    .replace(/\s*[★✦✶✸✩⭐♦●·•*]+\s*/g, " ").trim(); // strip emoji/badges
  return SWAP_ALTERNATIVES[key] || [];
}

// ── Phase-3: Plate calculator ─────────────────────────────────────────────────
// Bar weights for known bar types
const BAR_WEIGHTS = {
  barbell: 20,
  smith:   15,
  ssb:     35,   // safety squat bar / hatfield squat
  trap:    35,
  log:     27.5,
  ezbar:   10,
  none:    0,    // machines / DBs — no bar
};

const BAR_LABELS = {
  barbell: "Barbell (20kg)",
  smith:   "Smith (15kg)",
  ssb:     "SSB / Hatfield (35kg)",
  trap:    "Trap Bar (35kg)",
  log:     "Log (27.5kg)",
  ezbar:   "EZ Bar (10kg)",
  none:    "No Bar / Machine",
};

// Available plates per side (kg), ordered largest to smallest
const PLATE_SIZES = [20, 15, 10, 5, 2.5];

// Returns { barKg, perSide, remainder, platesPerSide }
// perSide is an array like [{ weight: 20, count: 1 }, { weight: 5, count: 2 }]
function calcPlates(totalKg, barType) {
  const barKg = BAR_WEIGHTS[barType ?? "barbell"] ?? 20;
  if (barType === "none") return { barKg: 0, perSide: [], remainder: 0, totalKg };
  const loadEach = (totalKg - barKg) / 2;
  if (loadEach <= 0) return { barKg, perSide: [], remainder: 0, totalKg };

  let rem = loadEach;
  const perSide = [];
  for (const p of PLATE_SIZES) {
    if (rem <= 0) break;
    const count = Math.floor(rem / p);
    if (count > 0) {
      perSide.push({ weight: p, count });
      rem = Math.round((rem - p * count) * 100) / 100;
    }
  }
  return { barKg, perSide, remainder: rem, totalKg };
}

// Format plate breakdown as a compact string: "20+10+2.5 per side"
function fmtPlates(totalKg, barType) {
  const { barKg, perSide, remainder } = calcPlates(totalKg, barType);
  if (barType === "none") return null;
  if (perSide.length === 0 && remainder === 0) return `${barKg}kg bar only`;
  const parts = perSide.map(p => p.count > 1 ? `${p.weight}×${p.count}` : `${p.weight}`);
  if (remainder > 0) parts.push(`+${remainder}`);
  return `${parts.join(" + ")} per side`;
}

// Get the bar type for an exercise (stored in ex.barType, auto-detected otherwise)
function getBarType(ex) {
  if (ex?.barType) return ex.barType;
  const eq = detectEquipment(ex?.name, ex);
  const n  = (ex?.name || "").toLowerCase();
  if (eq === "none" || eq === "machine" || eq === "cable" || eq === "db") return "none";
  if (eq === "bodyweight") return "none";
  if (n.match(/hatfield|ssb|safety.?squat/)) return "ssb";
  if (n.match(/trap.?bar|hex.?bar/))         return "trap";
  if (n.match(/log/))                        return "log";
  if (n.match(/ez.?bar|ez.?curl|preacher/))  return "ezbar";
  if (n.match(/smith/))                      return "smith";
  if (n.match(/barbell/))                    return "barbell";
  return "none"; // default: machines/cables/DBs don't need plate calc
}

// ── Phase-3: Form cue library ──────────────────────────────────────────────────
// 3 cues per exercise: execution focus, common fault to avoid, breathing/bracing
const FORM_CUES = {
  // Smith / Barbell press
  "smith incline bench press":   ["Elbows track at 45°, not flared out","Lower to upper chest — don't bounce off","Brace core, feet flat, arch natural"],
  "smith flat bench press":      ["Retract shoulder blades into the pad","Bar path slightly diagonal — touch mid-chest","Full exhale on press, inhale on descent"],
  "smith seated ohp":            ["Vertical forearms at the bottom","Press through the crown, not forward","Brace abs hard — no lower back arch"],
  // DB pressing
  "db incline press":            ["Neutral grip reduces shoulder impingement","Touch DBs at top to fully contract chest","Controlled 2-second descent"],
  "db shoulder press":           ["Elbows slightly forward of the body","Stop just short of lockout to keep tension","Don't lean back — keep ribs down"],
  "db arnold press":             ["Slow rotation — it's not a race","Full range: parallel forearms to arms up","Pause briefly at the bottom stretch"],
  // Lateral raises
  "db lateral raise":            ["Lead with elbows, not hands","Stop at shoulder height — higher recruits traps","Slight forward lean (15°) for better leverage"],
  "cable lateral raise":         ["Cable behind the body for full stretch","Don't shrug at the top","Slow negative — most growth happens here"],
  // Rear delt
  "cable rear delt fly":         ["Chest supported or standing, slight bend in elbow","Pull elbows back and out, not just back","Squeeze rear delts at peak contraction"],
  "db rear delt fly":            ["Chest-supported = more isolated than bent-over","Thumbs slightly down at top (external rotation)","No momentum — cheat reps miss the muscle"],
  "face pull":                   ["Pull to forehead level, not chin","External rotate at end — elbows high","This is a rehab and performance move — don't rush it"],
  // Triceps
  "cable pushdown":              ["Elbows pinned to sides throughout","Full lockout at bottom, full stretch at top","Don't lean into it — torso is just a support"],
  "db overhead tricep extension":["Elbows point forward, not flared","Lower behind head until full stretch","Squeeze hard at lockout — triceps shorten fully"],
  "cable overhead extension":    ["Face away from stack for full stretch","Keep upper arms vertical — they don't move","Pause at the stretch for extra hypertrophy"],
  // Back pulling
  "cable lat pulldown":          ["Pull to upper chest, not behind neck","Lean back 20°, chest up, elbows pointing down","Think 'elbows into back pockets'"],
  "machine lat pulldown":        ["Chest against pad, full stretch at top","Drive elbows down — not a bicep curl","Squeeze lats in the contracted position"],
  "cable row":                   ["Row to lower chest / belt line","Maintain neutral spine throughout","Brief pause at full contraction before releasing"],
  "machine row":                 ["Chest supported — less lower back fatigue","Focus on retracting the scapula, then elbow drive","Don't jut the head forward on each rep"],
  "db row":                      ["Opposite knee and hand on bench","Let the shoulder blade protract fully at bottom","Row past the hip — long range = more lat"],
  "cable straight arm pulldown": ["Straight arms throughout — this is a lat isolation","Hinge at the shoulder, not the elbow","Feel the stretch at the top — don't skip it"],
  // Biceps
  "db curl":                     ["Don't swing — momentum is cheating yourself","Supinate at the top for full bicep contraction","Full extension at the bottom stretches the long head"],
  "cable curl":                  ["Constant tension even at the bottom (vs DBs)","Keep elbows stationary — they're your pivot","Controlled 3-second descent"],
  "db hammer curl":              ["Neutral grip recruits brachialis and brachioradialis","Elbows stay at your sides throughout","Same tempo as a regular curl — no swinging"],
  "preacher curl":               ["Full range: don't stop short at the top","No bounce at the bottom — tears the bicep tendon","The stretch position is where growth happens"],
  // Squat patterns
  "hatfield squat":              ["Hands on safeties are for balance, not support","Push the knees out over the toes","Reach parallel or below — don't cut it short"],
  "smith machine squat":         ["Foot position forward to compensate for fixed path","Hip crease below knee at bottom","Controlled descent — don't dump the weight"],
  "leg press":                   ["Full depth without lumbar rounding (hips rolling)","Drive through heel and mid-foot, not toes","Keep constant pressure — don't lock out completely"],
  "hack squat":                  ["Close stance = more quad dominant","Let the knees travel over toes aggressively","Pause briefly at the bottom for full stretch"],
  // Hamstrings
  "romanian deadlift":           ["Hip hinge: push hips back, maintain neutral spine","Bar stays in contact with legs throughout","Feel the hamstring stretch, not lower back tightness"],
  "db romanian deadlift":        ["Same as barbell RDL — hip hinge, not squat","Slight bend in knees — fixed position","Stop when you feel the stretch, not the floor"],
  "leg curl":                    ["Full stretch at the start — let the weight down"],
  // Calves
  "calf raise":                  ["Full range: heel below platform level at bottom","Slow eccentric is where calves actually grow","Hold the peak contraction for 1 second"],
  "seated calf raise":           ["Seated isolates soleus (deeper calf muscle)","Same full range principle — go deep","Heavier weight than standing is fine here"],
  // Arms
  "db skull crusher":            ["Elbows point at the ceiling, not forward","Lower to forehead or slightly behind it","Keep upper arms fixed — only forearms move"],
};

// Returns 3 cues for an exercise, or generic cues if not in the map
function getFormCues(exName) {
  const key = (exName || "").toLowerCase().trim()
    .replace(/\s*[★✦✶✸✩⭐♦●·•*]+\s*/g, " ").trim();
  // Exact match first
  if (FORM_CUES[key]) return FORM_CUES[key];
  // Partial keyword match
  for (const [k, cues] of Object.entries(FORM_CUES)) {
    const words = k.split(" ").filter(w => w.length > 3);
    if (words.every(w => key.includes(w))) return cues;
  }
  // Generic fallback by equipment/movement type
  if (key.includes("curl"))     return ["Full range of motion is non-negotiable","Don't swing — momentum steals the stimulus","Control the eccentric — 2-3 seconds down"];
  if (key.includes("press"))    return ["Retract shoulder blades before pressing","Brace core as if expecting a punch","Controlled descent — stretch the muscle"];
  if (key.includes("row"))      return ["Drive elbows, not hands","Neutral spine throughout","Pause at the contracted position"];
  if (key.includes("extension"))return ["Lock out fully for complete muscle shortening","Fixed upper arm — only forearm moves","Slow negative for maximum tension time"];
  if (key.includes("raise"))    return ["Lead with elbows, not hands","Stop at shoulder height","Slow and controlled beats heavy and sloppy"];
  if (key.includes("squat") || key.includes("press") && key.includes("leg")) return ["Push knees out over toes","Hip crease below parallel","Brace core hard throughout"];
  return ["Full range of motion — don't cut reps short","Brace your core before every rep","Control the eccentric as much as the concentric"];
}

// Load custom exercises from STATE
function getCustomExercises() {
  return STATE.customExercises || [];
}

function saveCustomExercise(ex) {
  if (!STATE.customExercises) STATE.customExercises = [];
  const exists = STATE.customExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
  if (!exists) { STATE.customExercises.push(ex); saveState(); }
}

// ── Exercise Selector state ───────────────────────────────────────────────
let _exSelCallback = null;    // called with selected exercise name
let _exSelExIdx = null;       // which exercise slot is being changed
let _exSelScope = "all";      // all|push|pull|legs|arms|custom
let _exSelMuscle = null;      // muscle filter
let _exSelQuery = "";         // search query

function openExerciseSelector(exIdx, callback) {
  _exSelExIdx = exIdx;
  _exSelCallback = callback;
  _exSelScope = "all";
  _exSelMuscle = null;
  _exSelQuery = "";

  const overlay = document.getElementById("ex-selector-overlay");
  const label = document.getElementById("ex-selector-label");
  const search = document.getElementById("ex-search-input");

  if (exIdx != null && LIFT_DAY) {
    const ex = STATE.exercises[LIFT_DAY][exIdx];
    if (label) label.textContent = `SWAP: ${ex.name.slice(0,25)}`;
  } else {
    if (label) label.textContent = "SELECT EXERCISE";
  }
  if (search) { search.value = ""; }
  overlay?.classList.add("open");
  _renderExSelector();
  setTimeout(() => search?.focus(), 100);
}

function closeExerciseSelector() {
  document.getElementById("ex-selector-overlay")?.classList.remove("open");
}

function _renderExSelector() {
  _renderMuscleFilters();
  _renderExList();
}

function _renderMuscleFilters() {
  const row = document.getElementById("ex-muscle-filters");
  if (!row) return;
  const muscles = _exSelScope === "custom"
    ? []
    : [...new Set(
        [...EXERCISE_DB, ...getCustomExercises().map(e => ({...e, custom:true}))]
          .filter(e => _exSelScope === "all" || e.movement === _exSelScope)
          .map(e => e.muscle)
      )].sort();

  row.innerHTML = muscles.map(m =>
    `<button class="ex-filter-chip${_exSelMuscle === m ? " m-active" : ""}" data-muscle="${m}">${MUSCLE_LABELS[m] || m}</button>`
  ).join("");
  row.querySelectorAll(".ex-filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      _exSelMuscle = _exSelMuscle === btn.dataset.muscle ? null : btn.dataset.muscle;
      _renderExSelector();
    });
  });
}

const _exCollapsedGroups = new Set();

function _renderExList() {
  const list = document.getElementById("ex-list");
  if (!list) return;

  const q = _exSelQuery.toLowerCase().trim();
  const customs = getCustomExercises().map(e => ({ ...e, custom: true }));
  let allEx = _exSelScope === "custom"
    ? customs
    : [...EXERCISE_DB, ...customs];

  if (_exSelScope !== "all" && _exSelScope !== "custom") {
    allEx = allEx.filter(e => e.movement === _exSelScope);
  }
  if (_exSelMuscle) allEx = allEx.filter(e => e.muscle === _exSelMuscle);
  if (q) allEx = allEx.filter(e => e.name.toLowerCase().includes(q));

  allEx.sort((a, b) => {
    if (a.custom && !b.custom) return -1;
    if (!a.custom && b.custom) return 1;
    return a.name.localeCompare(b.name);
  });

  if (allEx.length === 0) {
    list.innerHTML = `<div class="ex-empty">
      No exercises found.<br>
      <span style="font-size:11px;opacity:0.6;">Try a different search or add a custom exercise below.</span>
    </div>`;
    return;
  }

  const grouped = {};
  allEx.forEach(e => {
    const g = e.custom ? "⭐ Custom" : (MUSCLE_LABELS[e.muscle] || e.muscle);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(e);
  });

  const currentName = _exSelExIdx != null && LIFT_DAY
    ? (LIFT_DRAFT?.swappedExercises?.[_exSelExIdx]?.name || STATE.exercises[LIFT_DAY][_exSelExIdx]?.name || "")
    : "";
  const currentGroup = currentName
    ? Object.entries(grouped).find(([, exs]) => exs.some(e => e.name === currentName))?.[0]
    : null;

  const isSearching = !!q;

  list.innerHTML = Object.entries(grouped).map(([group, exs]) => {
    const autoExpand = isSearching || group === currentGroup || group === "⭐ Custom";
    const collapsed = !autoExpand && _exCollapsedGroups.has(group);
    return `
    <div class="ex-section-hdr${collapsed ? " collapsed" : ""}" data-group="${escapeHtml(group)}">
      ${group} <span class="ex-grp-arrow">▾</span>
    </div>
    <div class="ex-grp-body${collapsed ? " collapsed" : ""}">
    ${exs.map(e => {
      const isCurrent = e.name === currentName;
      const aliases = (typeof EXERCISE_DB_ALIAS_LABELS !== "undefined" && EXERCISE_DB_ALIAS_LABELS[e.name]) ? EXERCISE_DB_ALIAS_LABELS[e.name] : [];
      return `<div class="ex-row${isCurrent ? " is-current" : ""}" data-name="${escapeHtml(e.name)}">
        <div class="ex-row-info">
          <div class="ex-row-name">${escapeHtml(e.name)}${isCurrent ? " ✓" : ""}</div>
          ${aliases.length ? `<div style="font-size:10px;color:var(--ink-dim);line-height:1.35;margin-top:2px;">Also logged as: ${escapeHtml(aliases.slice(0,3).join(", "))}</div>` : ""}
          <div class="ex-row-tags">
            <span class="ex-tag tm">${MUSCLE_LABELS[e.muscle] || e.muscle}</span>
            <span class="ex-tag mv">${e.movement}</span>
            <span class="ex-tag eq">${e.equipment}</span>
            ${e.custom ? `<span class="ex-tag cu">custom</span>` : ""}
          </div>
        </div>
        ${e.custom ? `
          <button class="ex-edit-btn" data-custom-name="${escapeHtml(e.name)}" style="padding:6px 8px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:7px;font-size:12px;cursor:pointer;flex-shrink:0;margin-right:4px;" title="Edit">✎</button>
          <button class="ex-del-btn" data-custom-name="${escapeHtml(e.name)}" style="padding:6px 8px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:7px;font-size:12px;cursor:pointer;flex-shrink:0;color:var(--ink-dim);" title="Delete">✕</button>
        ` : `<button class="ex-activation-btn" data-ex-name="${escapeHtml(e.name)}" style="padding:6px 8px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:7px;font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.08em;cursor:pointer;flex-shrink:0;color:var(--ink-mid);" title="Muscle activation">MUSCLES</button>`}
      </div>`;
    }).join("")}
    </div>`;
  }).join("");

  list.querySelectorAll(".ex-section-hdr").forEach(hdr => {
    hdr.addEventListener("click", () => {
      const grp = hdr.dataset.group;
      const body = hdr.nextElementSibling;
      if (hdr.classList.contains("collapsed")) {
        hdr.classList.remove("collapsed");
        body.classList.remove("collapsed");
        _exCollapsedGroups.delete(grp);
      } else {
        hdr.classList.add("collapsed");
        body.classList.add("collapsed");
        _exCollapsedGroups.add(grp);
      }
    });
  });

  list.querySelectorAll(".ex-row").forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("ex-edit-btn") || e.target.classList.contains("ex-del-btn") || e.target.classList.contains("ex-activation-btn")) return;
      _applyExerciseSelection(row.dataset.name);
    });
  });

  list.querySelectorAll(".ex-edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _openCustomExerciseEditor(btn.dataset.customName);
    });
  });

  list.querySelectorAll(".ex-activation-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      _openExerciseActivationEditor(btn.dataset.exName);
    });
  });

  list.querySelectorAll(".ex-del-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = btn.dataset.customName;
      if (!confirm(`Delete "${name}"?`)) return;
      STATE.customExercises = (STATE.customExercises || []).filter(ex => ex.name !== name);
      saveState();
      _renderExList();
      toast("DELETED");
    });
  });
}

function _openExerciseActivationEditor(name) {
  const db = findDbMatch(name) || EXERCISE_DB.find(e => e.name === name);
  const ex = { ...(db || {}), name };
  document.getElementById("ex-selector-overlay")?.classList.remove("open");
  window._refreshMuscleActivationEditor = () => _openExerciseActivationEditor(name);
  $("#sheet-body").innerHTML = `
    <h3>${escapeHtml(name)}</h3>
    <div class="muted" style="font-size:11px;margin-bottom:14px;letter-spacing:0.08em;">EDIT MUSCLE ACTIVATION</div>
    ${muscleActivationEditorHtmlForExercise(ex)}
    <button class="btn primary full" style="margin-top:14px;" onclick="closeSheet(); document.getElementById('ex-selector-overlay')?.classList.add('open');">DONE</button>
  `;
  openSheet();
}

function _openCustomExerciseEditor(name) {
  if (!STATE.customExercises) STATE.customExercises = [];
  const idx = STATE.customExercises.findIndex(e => e.name === name);
  const ex = idx >= 0 ? STATE.customExercises[idx] : null;
  if (!ex) return;

  const MOVEMENT_OPTS = ["push","pull","legs","arms","core"];
  const MUSCLE_OPTS   = Object.keys(MUSCLE_LABELS);
  const EQUIP_OPTS    = ["machine","cable","smith","barbell","dumbbell","bodyweight","band","kettlebell"];

  // Temporarily close the selector overlay (re-open after save)
  document.getElementById("ex-selector-overlay")?.classList.remove("open");
  window._refreshMuscleActivationEditor = () => _openCustomExerciseEditor(STATE.customExercises[idx]?.name || name);

  $("#sheet-body").innerHTML = `
    <h3>Edit Custom Exercise</h3>
    <div class="input" style="margin-bottom:10px;">
      <label>Name</label>
      <input type="text" id="cex-name" value="${escapeHtml(ex.name)}" />
    </div>
    <div class="input" style="margin-bottom:10px;">
      <label>Movement</label>
      <select id="cex-movement" style="width:100%;padding:10px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:9px;color:var(--ink);font-size:14px;">
        ${MOVEMENT_OPTS.map(m => `<option value="${m}"${ex.movement===m?" selected":""}>${m}</option>`).join("")}
      </select>
    </div>
    <div class="input" style="margin-bottom:10px;">
      <label>Primary Muscle</label>
      <select id="cex-muscle" style="width:100%;padding:10px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:9px;color:var(--ink);font-size:14px;">
        ${MUSCLE_OPTS.map(m => `<option value="${m}"${ex.muscle===m?" selected":""}>${MUSCLE_LABELS[m]}</option>`).join("")}
      </select>
    </div>
    <div class="input" style="margin-bottom:14px;">
      <label>Equipment</label>
      <select id="cex-equipment" style="width:100%;padding:10px;background:var(--bg-elev-2);border:1px solid var(--line);border-radius:9px;color:var(--ink);font-size:14px;">
        ${EQUIP_OPTS.map(e2 => `<option value="${e2}"${ex.equipment===e2?" selected":""}>${e2}</option>`).join("")}
      </select>
    </div>
    ${muscleActivationEditorHtmlForExercise(ex)}
    <div style="display:flex;gap:8px;">
      <button class="btn primary" style="flex:1;" id="btn-cex-save">SAVE</button>
      <button class="btn danger" id="btn-cex-delete">DELETE</button>
    </div>
  `;
  openSheet();

  document.getElementById("btn-cex-save").addEventListener("click", () => {
    const newName  = document.getElementById("cex-name").value.trim() || ex.name;
    const movement = document.getElementById("cex-movement").value;
    const muscle   = document.getElementById("cex-muscle").value;
    const equipment= document.getElementById("cex-equipment").value;
    const oldKey = exerciseKeyFor(ex);
    const newKey = exerciseKeyFor(newName);
    if (oldKey !== newKey && STATE.exerciseMuscleActivations?.[oldKey]) {
      STATE.exerciseMuscleActivations[newKey] = {
        ...STATE.exerciseMuscleActivations[oldKey],
        name: newName,
        updatedAt: todayISO(),
      };
      delete STATE.exerciseMuscleActivations[oldKey];
    }
    STATE.customExercises[idx] = { ...ex, name: newName, movement, muscle, equipment };
    saveState();
    closeSheet();
    // Re-open selector on custom tab
    setTimeout(() => {
      _exSelScope = "custom";
      document.querySelectorAll(".ex-scope-tab").forEach(t => t.classList.toggle("active", t.dataset.scope === "custom"));
      document.getElementById("ex-selector-overlay")?.classList.add("open");
      _renderExSelector();
    }, 180);
    toast("SAVED");
  });

  document.getElementById("btn-cex-delete").addEventListener("click", () => {
    if (!confirm(`Delete "${ex.name}"?`)) return;
    STATE.customExercises.splice(idx, 1);
    saveState();
    closeSheet();
    setTimeout(() => {
      _exSelScope = "custom";
      document.querySelectorAll(".ex-scope-tab").forEach(t => t.classList.toggle("active", t.dataset.scope === "custom"));
      document.getElementById("ex-selector-overlay")?.classList.add("open");
      _renderExSelector();
    }, 180);
    toast("DELETED");
  });
}


function showExerciseDetail(name) {
  const db   = EXERCISE_DB.find(function(e) { return e.name === name; }) || findDbMatch(name);
  const meta = getExerciseMeta(name);
  const cues = getExerciseCues(name);
  const subs = getSubstitutions(name, "general");

  var html = "";

  // Header
  html += "<h3 style=\"margin-bottom:4px;\">" + escapeHtml(name) + "</h3>";

  // Tags row
  if (db) {
    html += "<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;\">";
    html += "<span class=\"ex-tag tm\">" + (MUSCLE_LABELS[db.muscle] || db.muscle) + "</span>";
    html += "<span class=\"ex-tag mv\">" + db.movement + "</span>";
    html += "<span class=\"ex-tag eq\">" + db.equipment + "</span>";
    html += "<span class=\"ex-tag\" style=\"background:var(--bg-elev-2);\">" + db.type + "</span>";
    html += "</div>";
  }

  // Rich metadata
  if (meta) {
    html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;\">";
    html += "<div style=\"background:var(--bg-elev-1);border-radius:8px;padding:10px;\">";
    html += "<div style=\"font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);margin-bottom:4px;\">JOINT STRESS</div>";
    var jsColor = meta.jointStress === "high" ? "var(--bad)" : meta.jointStress === "moderate" ? "var(--warn)" : "var(--good)";
    html += "<div style=\"font-size:13px;font-weight:600;color:" + jsColor + ";\">" + (meta.jointStress || "—") + "</div>";
    html += "</div>";
    html += "<div style=\"background:var(--bg-elev-1);border-radius:8px;padding:10px;\">";
    html += "<div style=\"font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);margin-bottom:4px;\">FATIGUE COST</div>";
    html += "<div style=\"font-size:13px;font-weight:600;\">" + (meta.fatigueCost || "—") + "</div>";
    html += "</div>";
    html += "<div style=\"background:var(--bg-elev-1);border-radius:8px;padding:10px;\">";
    html += "<div style=\"font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);margin-bottom:4px;\">PROGRESSION</div>";
    html += "<div style=\"font-size:13px;font-weight:600;\">" + (meta.progressionType === "rep_first" ? "Rep-first" : "Load-first") + "</div>";
    html += "</div>";
    html += "<div style=\"background:var(--bg-elev-1);border-radius:8px;padding:10px;\">";
    html += "<div style=\"font-family:var(--f-mono);font-size:9px;color:var(--ink-dim);margin-bottom:4px;\">BEST RANGE</div>";
    html += "<div style=\"font-size:13px;font-weight:600;\">" + (meta.bestRepRange ? meta.bestRepRange[0] + "–" + meta.bestRepRange[1] + " reps" : "—") + "</div>";
    html += "</div>";
    html += "</div>";
  }

  // Technique cues
  if (cues && cues.length) {
    html += "<div style=\"font-family:var(--f-mono);font-size:10px;letter-spacing:0.15em;color:var(--ink-dim);margin-bottom:8px;\">TECHNIQUE CUES</div>";
    html += "<div style=\"background:var(--bg-elev-1);border-radius:8px;padding:12px;margin-bottom:14px;\">";
    cues.forEach(function(cue) {
      html += "<div style=\"font-size:13px;line-height:1.6;padding:4px 0;border-bottom:1px solid var(--line);\">";
      html += "<span style=\"color:var(--accent);margin-right:6px;\">→</span>" + escapeHtml(cue);
      html += "</div>";
    });
    html += "</div>";
  }

  // Substitutions
  if (subs && subs.length) {
    html += "<div style=\"font-family:var(--f-mono);font-size:10px;letter-spacing:0.15em;color:var(--ink-dim);margin-bottom:8px;\">SUBSTITUTIONS</div>";
    html += "<div style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;\">";
    subs.slice(0, 4).forEach(function(s) {
      html += "<span style=\"background:var(--bg-elev-2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:11px;\">" + escapeHtml(s.name) + "</span>";
    });
    html += "</div>";
  }

  // No metadata fallback
  if (!meta && !cues.length) {
    html += "<div style=\"color:var(--ink-dim);font-size:13px;margin-bottom:14px;\">Basic exercise — no detailed metadata yet.</div>";
  }

  html += "<button class=\"btn ghost\" onclick=\"closeSheet()\" style=\"width:100%;margin-top:4px;\">CLOSE</button>";

  document.getElementById("sheet-body").innerHTML = html;
  openSheet();
}


function _applyExerciseSelection(name) {
  const isDbEntry = EXERCISE_DB.some(e => e.name === name);
  const dbMatch = isDbEntry ? EXERCISE_DB.find(e => e.name === name) : null;
  const canonName = dbMatch ? dbMatch.name : name;
  const equipment = dbMatch ? dbMatch.equipment : null;

  if (_exSelExIdx == null && !_exSelCallback) {
    // Library browse mode — show exercise detail sheet
    showExerciseDetail(name);
    return;
  }

  if (_exSelCallback) {
    _exSelCallback(canonName, dbMatch);
    closeExerciseSelector();
    return;
  }

  if (_exSelExIdx != null && LIFT_DAY && LIFT_DRAFT) {
    const idx = _exSelExIdx;
    const canonEx = STATE.exercises[LIFT_DAY][idx];
    if (!canonEx) return;

    closeExerciseSelector();

    const fromName = canonEx.name;
    $("#sheet-body").innerHTML = `
      <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.12em;color:var(--ink-dim);margin-bottom:12px;">SWAP EXERCISE</div>
      <div style="font-size:13px;color:var(--ink);margin-bottom:16px;">
        <span style="color:var(--ink-dim);">${escapeHtml(fromName)}</span>
        <span style="margin:0 6px;color:var(--ink-faint);">→</span>
        <strong>${escapeHtml(canonName)}</strong>
      </div>
      <button class="btn primary full" id="btn-swap-session" style="margin-bottom:10px;">THIS SESSION ONLY</button>
      <button class="btn ghost full" id="btn-swap-permanent">REPLACE IN PROGRAM FOREVER</button>
      <div class="muted" style="font-size:10px;margin-top:8px;text-align:center;line-height:1.5;">
        "This session" is temporary — next session reverts.<br>
        "Replace in program" changes your saved program permanently.
      </div>
    `;
    openSheet();

    document.getElementById("btn-swap-session").addEventListener("click", () => {
      LIFT_DRAFT.swappedExercises = LIFT_DRAFT.swappedExercises || {};
      LIFT_DRAFT.swappedExercises[idx] = buildExerciseSwap(canonEx, canonName, dbMatch);
      resetDraftSlotForExercise(LIFT_DAY, idx);
      closeSheet();
      renderLiftExercises();
      toast(`SESSION SWAP → ${canonName.slice(0,28)}`);
    });

    document.getElementById("btn-swap-permanent").addEventListener("click", () => {
      STATE.exercises[LIFT_DAY][idx] = {
        ...STATE.exercises[LIFT_DAY][idx],
        name: canonName,
        exerciseKey: exerciseKeyFor(canonName),
        equipment: equipment || canonEx.equipment,
      };
      if (LIFT_DRAFT?.swappedExercises?.[idx]) delete LIFT_DRAFT.swappedExercises[idx];
      resetDraftSlotForExercise(LIFT_DAY, idx);
      saveState();
      closeSheet();
      renderLiftExercises();
      toast(`PROGRAM UPDATED → ${canonName.slice(0,28)}`);
    });
  }
}

// Replace old openSwapSheet with the new selector
function openSwapSheet(idx) {
  openExerciseSelector(idx, null);
}

// Browse-only library: no swap, no callback — just explore the full exercise DB
function openExerciseLibrary() {
  _exSelExIdx    = null;
  _exSelCallback = null;
  _exSelScope    = "all";
  _exSelMuscle   = null;
  _exSelQuery    = "";

  const overlay = document.getElementById("ex-selector-overlay");
  const label   = document.getElementById("ex-selector-label");
  const search  = document.getElementById("ex-search-input");

  if (label) label.textContent = "EXERCISE LIBRARY";
  if (search) search.value = "";
  overlay?.classList.add("open");
  _renderExSelector();
  setTimeout(() => search?.focus(), 100);
}

// Wire up the exercise selector on init
function initExerciseSelector() {
  document.getElementById("ex-selector-close")?.addEventListener("click", closeExerciseSelector);
  document.getElementById("ex-selector-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "ex-selector-overlay") closeExerciseSelector();
  });

  // Scope tabs
  document.getElementById("ex-scope-tabs")?.querySelectorAll(".ex-scope-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ex-scope-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      _exSelScope = tab.dataset.scope;
      _exSelMuscle = null;
      _renderExSelector();
    });
  });

  // Search
  document.getElementById("ex-search-input")?.addEventListener("input", (e) => {
    _exSelQuery = e.target.value;
    _renderExList();
  });

  // Custom add — always saves with the exact name the user typed, no DB fuzzy-matching
  document.getElementById("ex-custom-add")?.addEventListener("click", () => {
    const inp = document.getElementById("ex-custom-name");
    const name = inp?.value?.trim();
    if (!name) return;

    const duplicate = (STATE.customExercises || []).find(e => e.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      toast(`Already saved: ${duplicate.name.slice(0,28)}`);
      if (inp) inp.value = "";
      return;
    }

    saveCustomExercise({
      name, muscle: "chest", movement: "push",
      equipment: detectEquipment(name),
      type: "compound", custom: true
    });
    if (inp) inp.value = "";
    _exSelScope = "custom";
    document.querySelectorAll(".ex-scope-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.scope === "custom");
    });
    _renderExSelector();
    toast(`SAVED: ${name.slice(0,30)}`);
  });
}

// Library button wiring (Lift page + Settings page)
document.getElementById("btn-exercise-library")?.addEventListener("click", openExerciseLibrary);
document.getElementById("btn-settings-library")?.addEventListener("click", openExerciseLibrary);

$$(".day-tab").forEach(t => t.addEventListener("click", () => selectLiftDay(t.dataset.day)));
$("#lift-date").addEventListener("change", (e) => {
  LIFT_DRAFT.date = e.target.value;
  if (LIFT_DRAFT.targetedWarmup) LIFT_DRAFT.targetedWarmup.date = e.target.value;
});
$("#btn-new-pass").addEventListener("click", () => {
  clearWorkoutDraft();
  selectLiftDay(LIFT_DAY);
});

// Phase 8: START SESSION opens Targeted Warm-Up before actual workout starts.
document.getElementById("btn-start-lift").addEventListener("click", () => {
  openTargetedWarmupPage();
});

document.addEventListener("click", function(e) {
  if (!TARGETED_WARMUP_ACTIVE || !LIFT_DRAFT?.targetedWarmup) return;
  const warmup = LIFT_DRAFT.targetedWarmup;

  const roundBtn = e.target.closest("[data-tw-round][data-tw-movement]");
  if (roundBtn) {
    const movementId = roundBtn.dataset.twMovement;
    const round = Number(roundBtn.dataset.twRound);
    const item = warmup.completion.find(c => c.movementId === movementId && c.round === round);
    if (item) item.completed = !item.completed;
    renderTargetedWarmupPage();
    scheduleWorkoutAutosave();
    return;
  }

  // Swap movement (equipment substitution)
  const swapBtn = e.target.closest("[data-tw-swap]");
  if (swapBtn) {
    const oldId = swapBtn.dataset.twSwap;
    let alt;
    try { alt = JSON.parse(swapBtn.dataset.twSwapTo); } catch(_) { return; }
    const mIdx = warmup.movements.findIndex(m => m.id === oldId);
    if (mIdx >= 0 && alt?.id) {
      const oldM = warmup.movements[mIdx];
      const newId = `${LIFT_DAY.toLowerCase()}_${mIdx+1}_${alt.id}`;
      // Rebuild swap pool for the new movement (exclude siblings)
      const siblings = warmup.movements.filter((_,i) => i !== mIdx);
      const newSwapPool = Object.values(WARMUP_MOVEMENT_LIBRARY)
        .filter(a => a.id !== alt.id && a.muscles.some(mu => (alt.muscles||[]).includes(mu)) && !siblings.some(s => s.baseId === a.id))
        .slice(0, 3);
      warmup.movements[mIdx] = { ...alt, id: newId, baseId: alt.id, swapPool: newSwapPool, effort: oldM.effort };
      // Rebuild completion entries for this movement
      warmup.completion = warmup.completion.filter(c => c.movementId !== oldId);
      Array.from({ length: warmup.rounds }, (_, i) => warmup.completion.push({ movementId: newId, round: i+1, completed: false }));
      renderTargetedWarmupPage();
      scheduleWorkoutAutosave();
      toast(`SWAPPED TO ${alt.name.toUpperCase()}`);
    }
    return;
  }

  if (e.target.closest("[data-tw-ramp]")) {
    warmup.rampCompleted = !warmup.rampCompleted;
    renderTargetedWarmupPage();
    scheduleWorkoutAutosave();
    return;
  }

  const feedbackBtn = e.target.closest("[data-tw-feedback]");
  if (feedbackBtn) {
    const field = feedbackBtn.dataset.twFeedback;
    warmup.feedback[field] = feedbackBtn.dataset.val;
    warmup.feedback.saved = false;
    renderTargetedWarmupPage();
    scheduleWorkoutAutosave();
    return;
  }

  if (e.target.closest("[data-tw-save-feedback]")) {
    if (!warmup.feedback.postWarmupReadiness || !warmup.feedback.jointResponse) {
      toast("SELECT READINESS + JOINT RESPONSE FIRST");
      return;
    }
    warmup.feedback.saved = true;
    renderTargetedWarmupPage();
    scheduleWorkoutAutosave();
    toast("ASSESSMENT SAVED");
    return;
  }

  if (e.target.closest("[data-tw-back]")) {
    closeTargetedWarmupPage();
    return;
  }

  if (e.target.closest("[data-tw-start]")) {
    if (!targetedWarmupComplete(warmup)) {
      toast("COMPLETE CIRCUIT + RAMP + ASSESSMENT FIRST");
      return;
    }
    const warn = targetedWarmupWarning(warmup);
    if (warn) toast("PROCEED CONSERVATIVELY TODAY");
    activateLiftSession();
  }
});

document.addEventListener("input", function(e) {
  if (e.target.closest("#page-lift")) scheduleWorkoutAutosave();
});

document.addEventListener("click", function(e) {
  if (e.target.closest("#page-lift")) setTimeout(scheduleWorkoutAutosave, 0);
});

window.addEventListener("pagehide", saveWorkoutDraftNow);

// Energy rating buttons on lift gate
let _lsgEnergy = null;

// ── PHASE 5: Post-session feedback state ──
const P5_FEEDBACK = {
  enjoyment: null,
  sessionLengthFelt: null,
  techniqueScore: null,
  painScores: { shoulder: 0, elbow: 0, lowerback: 0, knee: 0 },
  overrideReasons: [],
};

function p5Reset() {
  P5_FEEDBACK.enjoyment = null;
  P5_FEEDBACK.sessionLengthFelt = null;
  P5_FEEDBACK.techniqueScore = null;
  P5_FEEDBACK.painScores = { shoulder: 0, elbow: 0, lowerback: 0, knee: 0 };
  P5_FEEDBACK.overrideReasons = [];
  document.querySelectorAll(".p5-btn, .p5-pain-btn").forEach(b => b.classList.remove("selected"));
  const techLabel = document.getElementById("p5-technique-label");
  if (techLabel) techLabel.textContent = "1=poor · 3=ok · 5=excellent";
  const enjLabel = document.getElementById("p5-enjoyment-label");
  if (enjLabel) enjLabel.textContent = "";
}

function p5ShowPanel() {
  const panel = document.getElementById("session-feedback-panel");
  if (panel) panel.style.display = "block";
}

function p5HidePanel() {
  const panel = document.getElementById("session-feedback-panel");
  if (panel) panel.style.display = "none";
  p5Reset();
}

// Wire feedback buttons
document.addEventListener("click", function(e) {
  // Single-select buttons
  const btn = e.target.closest(".p5-btn:not(.p5-multi)");
  if (btn) {
    const field = btn.dataset.field;
    const val = btn.dataset.val;
    if (!field || val === undefined) return;
    // Deselect siblings
    const parent = btn.parentElement;
    parent.querySelectorAll(".p5-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    P5_FEEDBACK[field] = isNaN(+val) ? val : +val;
    // Update labels
    if (field === "techniqueScore") {
      const labels = ["", "Poor — major compensation", "Inconsistent", "Acceptable", "Good form", "Excellent — full ROM"];
      const el = document.getElementById("p5-technique-label");
      if (el) el.textContent = labels[+val] || "";
    }
    if (field === "enjoyment") {
      const labels = ["", "Terrible", "Poor", "OK", "Good", "Great!"];
      const el = document.getElementById("p5-enjoyment-label");
      if (el) el.textContent = labels[+val] || "";
    }
  }

  // Multi-select override reasons
  const multiBtn = e.target.closest(".p5-btn.p5-multi");
  if (multiBtn) {
    const val = multiBtn.dataset.val;
    if (!val) return;
    const isSelected = multiBtn.classList.contains("selected");
    if (isSelected) {
      multiBtn.classList.remove("selected");
      P5_FEEDBACK.overrideReasons = P5_FEEDBACK.overrideReasons.filter(r => r !== val);
    } else {
      multiBtn.classList.add("selected");
      P5_FEEDBACK.overrideReasons.push(val);
    }
  }

  // Pain buttons
  const painBtn = e.target.closest(".p5-pain-btn");
  if (painBtn) {
    const joint = painBtn.dataset.joint;
    const val = +(painBtn.dataset.val || 0);
    if (!joint) return;
    const row = document.getElementById("p5-pain-" + joint);
    if (row) row.querySelectorAll(".p5-pain-btn").forEach(b => b.classList.remove("selected"));
    painBtn.classList.add("selected");
    P5_FEEDBACK.painScores[joint] = val;
  }
});
// Energy quick-tap removed — energy is sourced from morning check-in only

$("#btn-save-session").addEventListener("click", () => {
  if (!LIFT_DRAFT) return;
  const leadIdx = getLeadLiftIdx(LIFT_DRAFT.day);
  if (LIFT_DRAFT.sets[leadIdx]?.s1r == null || LIFT_DRAFT.sets[leadIdx]?.s1w == null) {
    toast(`Need at least the lead lift (${STATE.exercises[LIFT_DRAFT.day][leadIdx]?.name || "Ex 1"}) Set 1`);
    return;
  }
  if (!LIFT_EDITING_ID && !LIFT_SET_DONE[leadIdx]?.s1) {
    toast("MARK LEAD SET 1 DONE BEFORE SAVING");
    return;
  }

  // Build session object
  const isEditing = !!LIFT_EDITING_ID;
  // Phase 5: Build feedback object from P5_FEEDBACK state
  const p5data = !isEditing ? {
    enjoyment:         P5_FEEDBACK.enjoyment,
    sessionLengthFelt: P5_FEEDBACK.sessionLengthFelt,
    techniqueScore:    P5_FEEDBACK.techniqueScore,
    painScores:        { ...P5_FEEDBACK.painScores },
    overrideReasons:   P5_FEEDBACK.overrideReasons.length ? [...P5_FEEDBACK.overrideReasons] : null,
    // Compute max pain for quick gate checks
    maxPain: Math.max(0, ...Object.values(P5_FEEDBACK.painScores)),
  } : (STATE.sessions.find(x => x.id === LIFT_EDITING_ID)?.feedback ?? null);
  const existingSession = isEditing ? STATE.sessions.find(x => x.id === LIFT_EDITING_ID) : null;
  const warmupData = !isEditing
    ? savedTargetedWarmup(LIFT_DRAFT.targetedWarmup)
    : (existingSession?.warmup ?? null);
  const sessionWaveOverride = !isEditing
    ? juggernautWave(0, LIFT_DRAFT.day)
    : (existingSession?.waveOverride ?? juggernautWave(0, LIFT_DRAFT.day));

  const session = {
    id: isEditing ? LIFT_EDITING_ID : `s-${Date.now()}`,
    day: LIFT_DRAFT.day,
    date: LIFT_DRAFT.date,
    sets: LIFT_DRAFT.sets.map(s => ({ ...s })),
    swappedExercises: { ...(LIFT_DRAFT.swappedExercises || {}) },
    exerciseNames: LIFT_DRAFT.sets.map((_, idx) => (activeExerciseForSlot(LIFT_DRAFT.day, idx) || STATE.exercises[LIFT_DRAFT.day]?.[idx])?.name || ""),
    exerciseKeys: LIFT_DRAFT.sets.map((_, idx) => exerciseKeyFor(activeExerciseForSlot(LIFT_DRAFT.day, idx) || STATE.exercises[LIFT_DRAFT.day]?.[idx])),
    notes: (document.getElementById("lift-notes")?.value?.trim() || null),
    rpe: LIFT_SET_RPE.map(r => ({ s1: r.s1, s2: r.s2 })),
    setCompletion: LIFT_SET_DONE.map(d => ({ s1: !!d.s1, s2: !!d.s2 })),
    extraSets: LIFT_EXTRA_SETS.map(e => ({ sets: (e?.sets || []).filter(s => s.done) })),
    techniques: LIFT_TECHNIQUES.map(t => (t && t !== "skipped") ? t : null),
    energyRating: null, // sourced from morning log, not lift gate
    feedback: p5data, // Phase 5: technique, pain, enjoyment, overrides
    warmup: warmupData, // Phase 8: Targeted Warm-Up context only; ignored by volume/progression.
    waveOverride: sessionWaveOverride,
    deloadStressReview: (sessionWaveOverride.name === "DELOAD" || sessionWaveOverride.deloadSkipped)
      ? programStressReview(LIFT_DRAFT.date)
      : null,
    durationSec: isEditing
      ? (existingSession?.durationSec ?? null)
      : (LIFT_SESSION_START_MS ? Math.floor((Date.now() - LIFT_SESSION_START_MS) / 1000) : null),
  };
  const plannedSetCount = session.sets.reduce((sum, set) => sum + (set.s1r != null || set.s1w != null ? 1 : 0) + (set.s2r != null || set.s2w != null ? 1 : 0), 0);
  const completedSetCount = session.setCompletion.reduce((sum, c) => sum + (c.s1 ? 1 : 0) + (c.s2 ? 1 : 0), 0)
    + session.extraSets.reduce((sum, e) => sum + (e.sets || []).length, 0);
  session.completionSummary = {
    plannedSets: plannedSetCount,
    completedSets: completedSetCount,
    completionRatio: plannedSetCount ? Math.round((completedSetCount / plannedSetCount) * 100) / 100 : 0,
    incomplete: plannedSetCount > 0 && completedSetCount < plannedSetCount,
  };

  // PR detection BEFORE saving (so we compare against pre-save state)
  const prCount = isEditing ? 0 : prsInSession(session);

  // Persist
  if (isEditing) {
    const i = STATE.sessions.findIndex(x => x.id === LIFT_EDITING_ID);
    if (i >= 0) STATE.sessions[i] = session;
  } else {
    STATE.sessions.push(session);
    if (sessionWaveOverride.deloadSkipped && STATE.profile?.skipDeloadNext?.[LIFT_DRAFT.day]) {
      delete STATE.profile.skipDeloadNext[LIFT_DRAFT.day];
    }
  }
  updateExerciseMemoryFromSession(session);
  saveState();
  clearWorkoutDraft();

  // Build a rich toast message
  const vol = sessionVolume(session);
  const volStr = vol > 0 ? ` · ${(vol/1000).toFixed(1)}t` : "";
  const durStr = session.durationSec ? ` · ${Math.floor(session.durationSec/60)}min` : "";
  const prStr  = prCount > 0 ? ` · 🏆${prCount} PR${prCount > 1 ? "s" : ""}` : "";
  if (isEditing) {
    toast("SESSION UPDATED");
  } else {
    toast(`${LIFT_DRAFT.day} SAVED${durStr}${volStr}${prStr}`);
    // Phase 6: post-session review
    setTimeout(() => showPostSessionReview(session), 1800);

    // Juggernaut: after Realization week, recalculate working max from AMRAP performance
    const saveWave = juggernautWaveForSession(session);
    if (saveWave.name === "REALIZATION") {
      // Check lead exercise (idx 0) AMRAP reps
      const leadIdx = getLeadLiftIdx(session.day);
      const leadSet = session.sets[leadIdx];
      const amrapReps = leadSet?.s2r ?? null;
      const amrapWeight = leadSet?.s2w ?? null;
      const amrapDone = typeof sessionSetDone === "function" ? sessionSetDone(session, leadIdx, "s2") : !!session.setCompletion?.[leadIdx]?.s2;
      const amrapRpe = session.rpe?.[leadIdx]?.s2 ?? null;
      if (amrapDone && amrapRpe != null && amrapRpe >= 7 && amrapReps != null && amrapWeight != null && amrapReps > 0) {
        const leadEx = STATE.exercises?.[session.day]?.[leadIdx];
        const rawCurrentWM = getWorkingMax(session.day, leadIdx, leadEx) || 0;
        const currentWM = leadEx ? (reconciledLeadTrainingMax(session.day, leadIdx, leadEx, rawCurrentWM) || rawCurrentWM) : rawCurrentWM;
        const targetReps = JUG_TM_PCTS.REALIZATION?.reps || STATE.exercises[session.day]?.[leadIdx]?.repMin || 1;
        const newWM = recalcWorkingMax(session.day, leadIdx, amrapReps, amrapWeight, { currentTM: currentWM, targetReps, rpe: amrapRpe });
        if (newWM > 0 && (!currentWM || newWM >= currentWM)) {
          setWorkingMax(session.day, leadIdx, newWM, leadEx);
          saveState();
          const oneRmDisplay = Math.round(estimateOneRm(amrapWeight, amrapReps));
          setTimeout(() => toast(`🏆 NEW TM: ${newWM}kg (1RM ≈ ${oneRmDisplay}kg × 90%) — next cycle weights updated`), 2000);
        } else if (newWM > 0 && currentWM && newWM < currentWM) {
          setTimeout(() => toast(`TM HELD AT ${fmtWeight(currentWM)}kg — low AMRAP not auto-applied`), 2000);
        }
      } else {
        setTimeout(() => toast("TM HELD — AMRAP needs final-set DONE + RPE"), 2000);
      }
    }

    // Phase-1: update rep range adaptation counters on every save
    updateRepRangeCounters(session);

    // Phase-2: on DELOAD week, run weekly program check and store changes for next cycle
    if (saveWave.name === "DELOAD") {
      const changes = weeklyProgramCheck(session.day);
      savePendingProgramChanges(session.day, changes);
      if (changes.length > 0) {
        const stalledCount = changes.filter(c => c.type === "stall_deload").length;
        setTimeout(() => toast(`📋 PROGRAM REVIEW: ${stalledCount > 0 ? stalledCount + " stall(s) detected · " : ""}review at next session start`), 3000);
      }
    }
  }
  // Phase 5: hide feedback panel and reset state
  p5HidePanel();
  // Reset draft (back to a fresh recommendation for the same day)
  selectLiftDay(LIFT_DRAFT.day);
});

function renderLiftHistory() {
  const wrap = $("#lift-history");
  const sessions = STATE.sessions
    .filter(s => s.day === LIFT_DAY)
    .sort((a, b) => b.date.localeCompare(a.date));
  $("#lift-history-meta").textContent = `${sessions.length} ${LIFT_DAY} SESSION${sessions.length !== 1 ? 'S' : ''}`;
  if (sessions.length === 0) {
    wrap.innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">No sessions yet</div></div>`;
    return;
  }
  wrap.innerHTML = sessions.map(s => {
    const ex1 = exerciseFor(s, 0);
    const vol = Math.round(sessionVolume(s) / 100) / 10; // tonnes
    const dur = s.durationSec ? `${Math.floor(s.durationSec/60)}min` : null;
    const meta = [
      `${ex1.name.split(" ").slice(0,2).join(" ")}: ${fmtWeight(s.sets[0]?.s1w)}×${s.sets[0]?.s1r},${s.sets[0]?.s2r}`,
      vol > 0 ? `${vol}t` : null,
      dur,
      s.notes ? "📝" : null,
    ].filter(Boolean).join(" · ");
    return `
      <div class="row tap" data-id="${s.id}">
        <div class="row-spread">
          <div>
            <div style="font-family:var(--f-display);font-weight:700;font-size:18px;letter-spacing:0.04em;">${formatDate(s.date)}</div>
            <div class="muted" style="font-size:11px;margin-top:2px;">${meta}</div>
          </div>
          <div class="muted" style="font-size:18px;">›</div>
        </div>
      </div>
    `;
  }).join("");
  wrap.querySelectorAll(".row.tap").forEach(el => {
    el.addEventListener("click", () => openSessionSheet(el.dataset.id));
  });
}

function openSessionSheet(id) {
  const s = STATE.sessions.find(x => x.id === id);
  if (!s) return;
  const dur = s.durationSec
    ? `${Math.floor(s.durationSec/60)}:${String(s.durationSec%60).padStart(2,'0')}`
    : null;
  $("#sheet-body").innerHTML = `
    <h3>${s.day} · ${formatDate(s.date)}</h3>
    <div class="muted" style="font-size:11px;margin-bottom:14px;letter-spacing:0.08em;">
      SESSION DETAIL${dur ? ` · ${dur} DURATION` : ''}
      ${s.swappedExercises && Object.keys(s.swappedExercises).length ? ` · ${Object.keys(s.swappedExercises).length} SWAP(S)` : ''}
    </div>
    ${s.notes ? `<div style="background:var(--bg-elev-2);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--ink-mid);margin-bottom:14px;line-height:1.5;border-left:3px solid var(--accent);">${escapeHtml(s.notes)}</div>` : ''}
    ${s.sets.map((st, i) => {
      const ex = exerciseFor(s, i);
      const wasSwapped = !!(s.swappedExercises && s.swappedExercises[i]);
      return `
      <div class="row" style="margin-bottom:6px;">
        <div class="row-spread">
          <div>
            <div style="font-family:var(--f-display);font-weight:700;font-size:14px;letter-spacing:0.04em;">${String(i+1).padStart(2,'0')} ${ex.name}${wasSwapped ? ' <span style="font-size:9px;color:var(--accent);">·SWAPPED</span>' : ''}</div>
          </div>
          <div style="font-family:var(--f-mono);font-size:13px;">${fmtWeight(st.s1w)}×${st.s1r} · ${fmtWeight(st.s2w)}×${st.s2r}</div>
        </div>
      </div>
    `;}).join("")}
    <div style="display:flex; gap:8px; margin-top:14px;">
      <button class="btn primary" style="flex:1;" id="btn-edit-session">EDIT</button>
      <button class="btn danger" id="btn-del-session">DELETE</button>
    </div>
  `;
  openSheet();
  $("#btn-edit-session").addEventListener("click", () => {
    closeSheet();
    loadDraftFromSession(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#btn-del-session").addEventListener("click", () => {
    if (!confirm("Delete this session? Cannot be undone.")) return;
    STATE.sessions = STATE.sessions.filter(x => x.id !== id);
    saveState();
    closeSheet();
    selectLiftDay(LIFT_DAY);
    toast("DELETED");
  });
}
