// Exercise memory: learn from completed sessions for smarter defaults

function updateExerciseMemoryFromSession(session) {
  const mem = ensureAdaptiveState();
  (session.sets || []).forEach((set, idx) => {
    const name = sessionExerciseName(session, idx);
    if (!name) return;
    const key = normalizeExerciseName(name);
    const profile = exerciseFatigueProfile(name);
    const setCount = sessionSetCount(session, idx);
    const rpes = [session.rpe?.[idx]?.s1, session.rpe?.[idx]?.s2].filter(v => v != null);
    const avgRpe = rpes.length ? roundVolume(rpes.reduce((a,b) => a + b, 0) / rpes.length) : null;
    const reps = [set.s1r, set.s2r].filter(v => v != null && v > 0);
    const avgReps = reps.length ? roundVolume(reps.reduce((a,b) => a + b, 0) / reps.length) : null;
    const old = mem.exerciseMemory[key] || { name, exposures: 0 };
    const exposures = (old.exposures || 0) + 1;
    const blend = (oldVal, newVal) => newVal == null ? oldVal ?? null : oldVal == null ? newVal : roundVolume((oldVal * 0.7) + (newVal * 0.3));
    mem.exerciseMemory[key] = {
      name,
      exposures,
      primaryMuscle: profile.primaryMuscle,
      movementPattern: profile.pattern,
      fatigueCost: profile.recoveryCost >= 7 ? "high" : profile.recoveryCost >= 5 ? "moderate" : "low",
      jointStress: profile.jointStress >= 7 ? "high" : profile.jointStress >= 5 ? "moderate" : "low",
      avgRpe: blend(old.avgRpe, avgRpe),
      avgReps: blend(old.avgReps, avgReps),
      avgSets: blend(old.avgSets, setCount),
      recommendation: profile.recoveryCost >= 7 ? "use sparingly when fatigue is high" : "keep if progressing",
      updated: session.date,
    };
  });
  updateAdaptiveStateSnapshot("session_saved");
}
