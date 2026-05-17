// Workout session persistence: autosave, resume, draft management

const WORKOUT_DRAFT_KEY = "ascend-active-workout-draft";
const WORKOUT_DRAFT_TTL_MS = 36 * 60 * 60 * 1000;

function workoutDraftIsMeaningful() {
  if (!LIFT_DRAFT || LIFT_EDITING_ID) return false;
  if (TARGETED_WARMUP_ACTIVE || LIFT_SESSION_ACTIVE) return true;
  if (LIFT_DRAFT.targetedWarmup) return true;
  return false;
}

function currentWorkoutDraftSnapshot() {
  if (!workoutDraftIsMeaningful()) return null;
  if (LIFT_DRAFT) LIFT_DRAFT.notes = document.getElementById("lift-notes")?.value?.trim() || null;
  return {
    v: 1,
    appVersion: APP_VERSION,
    savedAt: Date.now(),
    day: LIFT_DAY,
    draft: JSON.parse(JSON.stringify(LIFT_DRAFT)),
    sessionActive: !!LIFT_SESSION_ACTIVE,
    targetedWarmupActive: !!TARGETED_WARMUP_ACTIVE,
    sessionStartMs: LIFT_SESSION_START_MS,
    setDone: JSON.parse(JSON.stringify(LIFT_SET_DONE || [])),
    setRpe: JSON.parse(JSON.stringify(LIFT_SET_RPE || [])),
    extraSets: JSON.parse(JSON.stringify(LIFT_EXTRA_SETS || [])),
    techniques: JSON.parse(JSON.stringify(LIFT_TECHNIQUES || [])),
    dismissedBanners: Array.from(LIFT_DISMISSED_BANNERS || []),
    energyRating: _lsgEnergy ?? null,
    feedback: JSON.parse(JSON.stringify(P5_FEEDBACK || {})),
  };
}

function saveWorkoutDraftNow() {
  if (WORKOUT_DRAFT_RESTORING) return;
  const snap = currentWorkoutDraftSnapshot();
  try {
    if (!snap) return;
    localStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify(snap));
  } catch (e) {
    console.warn("workout draft autosave failed", e);
  }
}

function scheduleWorkoutAutosave() {
  if (WORKOUT_DRAFT_RESTORING) return;
  clearTimeout(_workoutDraftTimer);
  _workoutDraftTimer = setTimeout(saveWorkoutDraftNow, 250);
}

function clearWorkoutDraft() {
  clearTimeout(_workoutDraftTimer);
  try { localStorage.removeItem(WORKOUT_DRAFT_KEY); } catch (_) {}
}

function readWorkoutDraft() {
  try {
    const raw = localStorage.getItem(WORKOUT_DRAFT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap?.savedAt || Date.now() - snap.savedAt > WORKOUT_DRAFT_TTL_MS) {
      clearWorkoutDraft();
      return null;
    }
    if (!snap.day || !snap.draft || !STATE.exercises?.[snap.day]) {
      clearWorkoutDraft();
      return null;
    }
    return snap;
  } catch (e) {
    console.warn("workout draft read failed", e);
    clearWorkoutDraft();
    return null;
  }
}

function workoutDraftSummary(snap = readWorkoutDraft()) {
  if (!snap) return null;
  const minsAgo = Math.max(0, Math.round((Date.now() - snap.savedAt) / 60000));
  const stage = snap.sessionActive ? "working sets" : snap.targetedWarmupActive ? "warm-up" : "loaded session";
  return { ...snap, minsAgo, stage };
}

function renderWorkoutResumeCard() {
  const card = document.getElementById("workout-resume-card");
  if (!card) return;
  const snap = workoutDraftSummary();
  if (!snap || LIFT_SESSION_ACTIVE || TARGETED_WARMUP_ACTIVE || LIFT_EDITING_ID) {
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }
  card.style.display = "";
  card.innerHTML = `
    <div class="card" style="border-left:3px solid var(--accent);margin-bottom:14px;">
      <div class="card-head">
        <div>
          <div class="card-label">Interrupted Workout</div>
          <div style="font-family:var(--f-display);font-size:22px;font-weight:900;">${escapeHtml(snap.day)} draft saved</div>
        </div>
        <div class="card-meta">${escapeHtml(snap.stage.toUpperCase())} · ${snap.minsAgo} MIN AGO</div>
      </div>
      <div class="muted" style="font-size:12px;line-height:1.5;margin:8px 0 12px;">
        Resume your in-progress session from local storage, or discard it and load a clean pass.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button class="btn ghost" id="btn-discard-workout-draft">DISCARD</button>
        <button class="btn primary" id="btn-resume-workout-draft">RESUME</button>
      </div>
    </div>
  `;
  document.getElementById("btn-resume-workout-draft")?.addEventListener("click", restoreWorkoutDraft);
  document.getElementById("btn-discard-workout-draft")?.addEventListener("click", () => {
    // Clear from localStorage first
    clearWorkoutDraft();
    // Reset in-memory state so autosave timer can't re-write the draft
    LIFT_DRAFT = null;
    LIFT_SESSION_ACTIVE = false;
    TARGETED_WARMUP_ACTIVE = false;
    LIFT_SESSION_START_MS = null;
    renderWorkoutResumeCard();
    toast("DRAFT DISCARDED");
  });
}

function restoreWorkoutDraft() {
  const snap = readWorkoutDraft();
  if (!snap) {
    toast("NO WORKOUT DRAFT FOUND");
    renderWorkoutResumeCard();
    return;
  }
  WORKOUT_DRAFT_RESTORING = true;
  try {
    LIFT_DAY = snap.day;
    LIFT_EDITING_ID = null;
    LIFT_DRAFT = {
      ...snap.draft,
      sets: Array.isArray(snap.draft.sets) ? snap.draft.sets.map(s => ({ ...s })) : [],
      swappedExercises: { ...(snap.draft.swappedExercises || {}) },
    };
    LIFT_SESSION_ACTIVE = !!snap.sessionActive;
    TARGETED_WARMUP_ACTIVE = !!snap.targetedWarmupActive && !LIFT_SESSION_ACTIVE;
    LIFT_SESSION_START_MS = LIFT_SESSION_ACTIVE ? (snap.sessionStartMs || Date.now()) : null;
    LIFT_SET_DONE = Array.isArray(snap.setDone) ? snap.setDone.map(s => ({ s1: !!s.s1, s2: !!s.s2 })) : STATE.exercises[LIFT_DAY].map(() => ({ s1: false, s2: false }));
    LIFT_SET_RPE = Array.isArray(snap.setRpe) ? snap.setRpe.map(r => ({ s1: r.s1 ?? null, s2: r.s2 ?? null })) : STATE.exercises[LIFT_DAY].map(() => ({ s1: null, s2: null }));
    LIFT_EXTRA_SETS = Array.isArray(snap.extraSets) ? snap.extraSets.map(e => ({ dismissed: !!e?.dismissed, sets: Array.isArray(e?.sets) ? e.sets.map(s => ({ ...s })) : [] })) : STATE.exercises[LIFT_DAY].map(() => ({ dismissed: false, sets: [] }));
    LIFT_TECHNIQUES = Array.isArray(snap.techniques) ? snap.techniques.map(t => t ?? null) : STATE.exercises[LIFT_DAY].map(() => null);
    STATE.exercises[LIFT_DAY].forEach((_, idx) => {
      if (!LIFT_DRAFT.sets[idx]) {
        const p = progressionFor(LIFT_DAY, idx);
        LIFT_DRAFT.sets[idx] = { s1w: p.weight, s1r: p.reps, s2w: p.weight, s2r: p.reps };
      }
      if (!LIFT_SET_DONE[idx]) LIFT_SET_DONE[idx] = { s1: false, s2: false };
      if (!LIFT_SET_RPE[idx]) LIFT_SET_RPE[idx] = { s1: null, s2: null };
      if (!LIFT_EXTRA_SETS[idx]) LIFT_EXTRA_SETS[idx] = { dismissed: false, sets: [] };
      if (LIFT_TECHNIQUES[idx] === undefined) LIFT_TECHNIQUES[idx] = null;
    });
    LIFT_DISMISSED_BANNERS = new Set(Array.isArray(snap.dismissedBanners) ? snap.dismissedBanners : []);
    _lsgEnergy = snap.energyRating ?? LIFT_DRAFT.energyRating ?? null;
    if (snap.feedback) {
      P5_FEEDBACK.enjoyment = snap.feedback.enjoyment ?? null;
      P5_FEEDBACK.sessionLengthFelt = snap.feedback.sessionLengthFelt ?? null;
      P5_FEEDBACK.techniqueScore = snap.feedback.techniqueScore ?? null;
      P5_FEEDBACK.painScores = { shoulder: 0, elbow: 0, lowerback: 0, knee: 0, ...(snap.feedback.painScores || {}) };
      P5_FEEDBACK.overrideReasons = Array.isArray(snap.feedback.overrideReasons) ? [...snap.feedback.overrideReasons] : [];
    }
    $$(".day-tab").forEach(t => t.classList.toggle("active", t.dataset.day === LIFT_DAY));
    const dateEl = document.getElementById("lift-date");
    if (dateEl) dateEl.value = LIFT_DRAFT.date || todayISO();
    const notesEl = document.getElementById("lift-notes");
    if (notesEl) notesEl.value = LIFT_DRAFT.notes || "";
    $("#lift-recommended").textContent = `RESUMED · ${LIFT_DAY}`;
    const gate = document.getElementById("lift-start-gate");
    const warmupPage = document.getElementById("targeted-warmup-page");
    const exWrap = document.getElementById("lift-exercises");
    const saveBtn = document.getElementById("btn-save-session");
    const activeBar = document.getElementById("session-active-bar");
    renderWorkoutResumeCard();
    if (LIFT_SESSION_ACTIVE) {
      if (gate) gate.style.display = "none";
      if (warmupPage) warmupPage.style.display = "none";
      if (exWrap) exWrap.style.display = "";
      if (saveBtn) saveBtn.style.display = "";
      if (activeBar) activeBar.classList.add("visible");
      renderLiftExercises();
      updateSessionDurationDisplay();
    } else if (TARGETED_WARMUP_ACTIVE) {
      openTargetedWarmupPage();
    } else {
      if (gate) gate.style.display = "";
      if (warmupPage) warmupPage.style.display = "none";
      if (exWrap) exWrap.style.display = "none";
      if (saveBtn) saveBtn.style.display = "none";
      if (activeBar) activeBar.classList.remove("visible");
    }
    renderLiftHistory();
    toast("WORKOUT DRAFT RESUMED");
  } finally {
    WORKOUT_DRAFT_RESTORING = false;
    scheduleWorkoutAutosave();
  }
}
