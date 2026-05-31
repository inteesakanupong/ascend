// Math / rounding utilities

function roundVolume(n) {
  return Math.round((n || 0) * 10) / 10;
}

function normalizeExerciseName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function exerciseKeyFor(exOrName) {
  const explicit = typeof exOrName === "object" ? (exOrName?.exerciseKey || exOrName?.id) : null;
  const raw = explicit || (typeof exOrName === "string" ? exOrName : exOrName?.name);
  const canonical = typeof canonicalNameForExercise === "function" ? canonicalNameForExercise(raw) : raw;
  return normalizeExerciseName(canonical).replace(/\s+/g, "_");
}

function activeExerciseForSlot(day, idx) {
  const base = typeof STATE !== "undefined" ? STATE?.exercises?.[day]?.[idx] : null;
  if (!base) return null;
  const hasDraft = typeof LIFT_DRAFT !== "undefined" && LIFT_DRAFT?.day === day;
  const swap = hasDraft ? LIFT_DRAFT.swappedExercises?.[idx] : null;
  return swap ? { ...base, ...swap, leadLift: base.leadLift } : base;
}

function isActiveExerciseSwapped(day, idx) {
  return !!(typeof LIFT_DRAFT !== "undefined" && LIFT_DRAFT?.day === day && LIFT_DRAFT.swappedExercises?.[idx]);
}

function sessionExerciseKey(session, idx) {
  const savedKey = session?.exerciseKeys?.[idx];
  if (savedKey) return exerciseKeyFor(savedKey);
  const swap = session?.swappedExercises?.[idx];
  if (swap?.exerciseKey) return exerciseKeyFor(swap.exerciseKey);
  if (swap?.name) return exerciseKeyFor(swap.name);
  const savedName = session?.exerciseNames?.[idx];
  if (savedName) return exerciseKeyFor(savedName);
  return exerciseKeyFor(typeof STATE !== "undefined" ? STATE?.exercises?.[session?.day]?.[idx] : null);
}

function sessionExerciseMatches(session, idx, exOrName) {
  const key = exerciseKeyFor(exOrName);
  if (!key) return false;
  const sessionKey = sessionExerciseKey(session, idx);
  if (sessionKey === key) return true;
  const targetName = normalizeExerciseName(typeof exOrName === "string" ? exOrName : exOrName?.name);
  const sessionName = normalizeExerciseName(session?.exerciseNames?.[idx] || session?.swappedExercises?.[idx]?.name);
  return !!targetName && !!sessionName && targetName === sessionName;
}

function sessionSetDone(session, idx, setKey) {
  const completion = session?.setCompletion?.[idx];
  if (completion && Object.prototype.hasOwnProperty.call(completion, setKey)) return !!completion[setKey];
  const set = session?.sets?.[idx] || {};
  const reps = set[setKey === "s1" ? "s1r" : "s2r"];
  return reps != null && reps > 0;
}

function completedSessionSet(session, idx) {
  const set = { ...(session?.sets?.[idx] || {}) };
  if (!session?.setCompletion) return set;
  if (!sessionSetDone(session, idx, "s1")) {
    set.s1w = null;
    set.s1r = null;
  }
  if (!sessionSetDone(session, idx, "s2")) {
    set.s2w = null;
    set.s2r = null;
  }
  return set;
}

function sessionCompletionRatio(session) {
  const sets = session?.sets || [];
  if (!sets.length) return 0;
  let planned = 0;
  let done = 0;
  sets.forEach((set, idx) => {
    if (set?.s1r != null || set?.s1w != null) {
      planned++;
      if (sessionSetDone(session, idx, "s1")) done++;
    }
    if (set?.s2r != null || set?.s2w != null) {
      planned++;
      if (sessionSetDone(session, idx, "s2")) done++;
    }
  });
  return planned > 0 ? done / planned : 0;
}

function defaultStartWeightForExercise(ex) {
  if (ex?.start != null && !isNaN(+ex.start)) return +ex.start;
  const eq = typeof detectEquipment === "function" ? detectEquipment(ex?.name, ex) : ex?.equipment;
  if (eq === "bodyweight") return 0;
  return 20;
}

function roundToIncrement(weight, ex) {
  if (weight == null || isNaN(weight)) return weight ?? 0;
  const inc = incrementFor(ex);
  return Math.round(weight / inc) * inc;
}
