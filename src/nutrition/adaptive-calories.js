// Deterministic adaptive calorie and goal coaching stored with each backup.

function nutritionCoachTemplate() {
  return {
    version: 1,
    enabled: false,
    stage: "checkpoint",
    checkpointWeight: null,
    finalGoalWeight: null,
    startWeight: null,
    startedAt: null,
    currentKcal: null,
    startingKcal: null,
    weeklyLossTargetKg: 0.6,
    adjustmentStepKcal: 100,
    minCompleteDays: 5,
    lastReviewDate: null,
    lastDecision: null,
    reviews: [],
    recovery: { active: false, startedAt: null, reason: null },
  };
}

function nutritionStateLatestWeight(state) {
  const logs = (state.dailyLogs || [])
    .filter(d => typeof d.weight === "number")
    .sort((a, b) => a.date.localeCompare(b.date));
  return logs[logs.length - 1]?.weight ?? state.profile?.bodyweight ?? 80;
}

function nutritionCalorieFloor(state, weight) {
  const sexFloor = state.profile?.sex === "female" ? 1200 : 1500;
  return Math.max(sexFloor, Math.round((weight || 80) * 22));
}

function initialAdaptiveCalories(state, weight) {
  const p = state.profile || {};
  const tdee = typeof computeTDEE === "function"
    ? computeTDEE(p.sex, weight, p.height, p.age, p.activityLevel)
    : null;
  const estimate = tdee || Math.round((weight || 80) * 33);
  return Math.max(nutritionCalorieFloor(state, weight), Math.round((estimate * 0.77) / 50) * 50);
}

function migrateNutritionCoachState(state) {
  const existing = state.nutritionCoach;
  state.nutritionCoach = {
    ...nutritionCoachTemplate(),
    ...(existing || {}),
    recovery: { ...nutritionCoachTemplate().recovery, ...(existing?.recovery || {}) },
    reviews: Array.isArray(existing?.reviews) ? existing.reviews : [],
  };

  const needsInitialPlan = !existing || (!existing.enabled && !existing.startedAt);
  if (needsInitialPlan && state.onboarded && state.cut?.mode === "cut") {
    const weight = nutritionStateLatestWeight(state);
    const oldGoal = Number(state.cut?.p1Target);
    const finalGoal = oldGoal > 0 && oldGoal < weight
      ? oldGoal
      : Math.max(50, Math.round((weight - 10) * 2) / 2);
    const checkpoint = Math.max(
      finalGoal,
      Math.round(weight - Math.min(7, Math.max(3, weight - finalGoal)))
    );
    const kcal = initialAdaptiveCalories(state, weight);
    const startedAt = typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10);
    state.nutritionCoach = {
      ...nutritionCoachTemplate(),
      enabled: true,
      checkpointWeight: checkpoint,
      finalGoalWeight: finalGoal,
      startWeight: weight,
      startedAt,
      currentKcal: kcal,
      startingKcal: kcal,
      lastDecision: `Plan reset to ${kcal} kcal with a ${checkpoint} kg checkpoint.`,
    };
    state.profile.dietProgramStartedAt = startedAt;
    state.profile.programStart = startedAt;
    state.profile.bodyweight = weight;
    state.cut.p1Target = checkpoint;
    state.cut.p1Weeks = Math.max(6, Math.ceil((weight - checkpoint) / 0.6));
    state.cut.p2Target = finalGoal;
    state.cut.p2Weeks = Math.max(4, Math.ceil((checkpoint - finalGoal) / 0.5));
    state.cut.p1Kcal = kcal;
    state.cut.p2Kcal = Math.max(nutritionCalorieFloor(state, checkpoint), kcal - 100);
    state.dietProfile = {
      ...(state.dietProfile || {}),
      calorieTarget: kcal,
      weeklyWeightChangeTarget: -0.6,
      source: "adaptive",
    };
  }
  return state;
}

function activateAdaptiveNutritionPlan(input = {}) {
  const weight = latestWeighIn()?.weight ?? STATE.profile.bodyweight ?? 80;
  const finalGoal = Number(input.finalGoalWeight ?? STATE.nutritionCoach?.finalGoalWeight ?? STATE.cut.p2Target ?? 75);
  const checkpoint = Number(input.checkpointWeight ?? Math.max(finalGoal, Math.round(weight - 7)));
  const requestedKcal = Number(input.currentKcal) || initialAdaptiveCalories(STATE, weight);
  const kcal = Math.max(nutritionCalorieFloor(STATE, weight), requestedKcal);
  const startedAt = todayISO();
  STATE.nutritionCoach = {
    ...nutritionCoachTemplate(),
    enabled: true,
    checkpointWeight: checkpoint,
    finalGoalWeight: finalGoal,
    startWeight: weight,
    startedAt,
    currentKcal: kcal,
    startingKcal: kcal,
    lastDecision: `Plan reset to ${kcal} kcal with a ${checkpoint} kg checkpoint.`,
  };
  STATE.profile.bodyweight = weight;
  STATE.profile.programStart = startedAt;
  STATE.profile.dietProgramStartedAt = startedAt;
  STATE.cut.mode = "cut";
  STATE.cut.p1Target = checkpoint;
  STATE.cut.p1Weeks = Math.max(6, Math.ceil((weight - checkpoint) / 0.6));
  STATE.cut.p2Target = finalGoal;
  STATE.cut.p2Weeks = Math.max(4, Math.ceil((checkpoint - finalGoal) / 0.5));
  STATE.cut.p1Kcal = kcal;
  STATE.cut.p2Kcal = Math.max(nutritionCalorieFloor(STATE, checkpoint), kcal - 100);
  STATE.dietProfile = {
    ...(STATE.dietProfile || {}),
    calorieTarget: kcal,
    weeklyWeightChangeTarget: -0.6,
    source: "adaptive",
  };
  return STATE.nutritionCoach;
}

function isFoodLogComplete(log) {
  if (!log || log.kcal == null) return false;
  if (log.foodLogComplete != null) return !!log.foodLogComplete;
  const target = STATE.nutritionCoach?.currentKcal || STATE.cut?.p1Kcal || 0;
  return Number(log.kcal) >= Math.max(1000, Math.round(target * 0.55));
}

function nutritionDateOffset(iso, days) {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nutritionLogsInWindow(endDate, days) {
  const start = nutritionDateOffset(endDate, -(days - 1));
  return (STATE.dailyLogs || []).filter(d => d.date >= start && d.date <= endDate);
}

function adaptiveWeightRate(endDate = todayISO()) {
  const logs = nutritionLogsInWindow(endDate, 14)
    .filter(d => typeof d.weight === "number")
    .sort((a, b) => a.date.localeCompare(b.date));
  if (logs.length < 6) return { rate: null, weighIns: logs.length };
  const startMs = isoToDate(logs[0].date).getTime();
  const points = logs.map(d => ({
    x: (isoToDate(d.date).getTime() - startMs) / 86400000,
    y: d.weight,
  }));
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const denominator = points.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0);
  if (!denominator) return { rate: null, weighIns: logs.length };
  const slope = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) / denominator;
  return { rate: -(slope * 7), weighIns: logs.length };
}

function adaptiveNutritionStatus(date = todayISO()) {
  const plan = STATE.nutritionCoach || nutritionCoachTemplate();
  const complete = nutritionLogsInWindow(date, 7).filter(isFoodLogComplete);
  const complete14 = nutritionLogsInWindow(date, 14).filter(isFoodLogComplete);
  const target = plan.currentKcal || STATE.cut.p1Kcal;
  const avgKcal = complete.length
    ? Math.round(complete.reduce((sum, d) => sum + Number(d.kcal), 0) / complete.length)
    : null;
  const overDays = complete.filter(d => d.kcal > (target || 0) + 150).length;
  const avgKcal14 = complete14.length
    ? Math.round(complete14.reduce((sum, d) => sum + Number(d.kcal), 0) / complete14.length)
    : null;
  const overDays14 = complete14.filter(d => d.kcal > (target || 0) + 150).length;
  const onPlan = d => {
    const proteinOk = d.protein != null && d.protein >= (STATE.cut.proteinFloor || 160);
    const dayTarget = Math.max(nutritionCalorieFloor(STATE, d.weight || STATE.profile.bodyweight), target - (isRestDay(d.date) ? 150 : 0));
    const caloriesOk = d.kcal <= dayTarget + 100;
    const stepsOk = d.steps != null && d.steps >= (STATE.profile.stepGoal || 10000);
    return proteinOk && caloriesOk && stepsOk;
  };
  const onPlanDays = complete.filter(onPlan).length;
  const recoveryOnPlanDays = plan.recovery?.startedAt
    ? complete14.filter(d => d.date >= plan.recovery.startedAt && onPlan(d)).length
    : 0;
  const weight = adaptiveWeightRate(date);
  const currentWeight = latestWeighIn()?.weight || STATE.profile.bodyweight;
  const weeklyBudget = Array.from({ length: 7 }, (_, i) => {
    const day = nutritionDateOffset(date, i);
    return Math.max(nutritionCalorieFloor(STATE, currentWeight), target - (isRestDay(day) ? 150 : 0));
  }).reduce((a, b) => a + b, 0);
  return {
    enabled: !!plan.enabled,
    plan,
    target,
    weeklyBudget,
    completeDays: complete.length,
    onPlanDays,
    recoveryOnPlanDays,
    avgKcal,
    overDays,
    completeDays14: complete14.length,
    avgKcal14,
    overDays14,
    rate: weight.rate,
    weighIns: weight.weighIns,
    recoveryActive: !!plan.recovery?.active,
  };
}

function evaluateAdaptiveNutrition(options = {}) {
  const date = options.date || todayISO();
  const plan = STATE.nutritionCoach;
  if (!plan?.enabled) return adaptiveNutritionStatus(date);
  const status = adaptiveNutritionStatus(date);

  if (plan.recovery?.active) {
    if (status.recoveryOnPlanDays >= 7) {
      plan.recovery = { active: false, startedAt: null, reason: null };
      plan.lastDecision = "Recovery complete. Seven fully logged days were on plan; normal weekly reviews resumed.";
    } else {
      plan.lastDecision = `Recovery day ${Math.min(7, status.recoveryOnPlanDays + 1)} of 7: hit calories, protein, steps, and mark the food log complete.`;
      return adaptiveNutritionStatus(date);
    }
  }

  const clearOverage = status.completeDays14 >= 5 && status.overDays14 >= 2 && status.avgKcal14 > status.target + 200;
  const gainingWithOverage = status.rate != null && status.rate < -0.15 && status.avgKcal != null && status.avgKcal > status.target + 100;
  if (clearOverage || gainingWithOverage) {
    plan.recovery = {
      active: true,
      startedAt: date,
      reason: clearOverage ? "Repeated calorie overages" : "Weight gain plus calorie overage",
    };
    plan.lastDecision = "Seven-day recovery started. Return to the target; do not compensate with a crash diet.";
    return adaptiveNutritionStatus(date);
  }

  const due = options.force || !plan.lastReviewDate || daysBetween(plan.lastReviewDate, date) >= 7;
  if (!due) return status;
  if (status.completeDays < (plan.minCompleteDays || 5) || status.weighIns < 6) {
    plan.lastDecision = `No calorie change: ${status.completeDays}/5 complete food logs and ${status.weighIns}/6 weigh-ins available.`;
    return adaptiveNutritionStatus(date);
  }

  let adjustment = 0;
  let reason = "Weight is moving at the planned rate.";
  if (status.rate > 0.9) {
    adjustment = plan.adjustmentStepKcal || 100;
    reason = "Loss was faster than 0.9 kg/week, so calories increased to protect recovery.";
  } else if (status.rate < 0.25 && status.avgKcal <= status.target + 100) {
    adjustment = -(plan.adjustmentStepKcal || 100);
    reason = "Loss was below 0.25 kg/week despite adequate logging and adherence.";
  }
  const floor = nutritionCalorieFloor(STATE, latestWeighIn()?.weight || STATE.profile.bodyweight);
  const oldKcal = plan.currentKcal;
  plan.currentKcal = Math.max(floor, oldKcal + adjustment);
  STATE.cut.p1Kcal = plan.currentKcal;
  STATE.dietProfile.calorieTarget = plan.currentKcal;
  plan.lastReviewDate = date;
  plan.lastDecision = adjustment
    ? `${adjustment > 0 ? "+" : ""}${adjustment} kcal: ${reason}`
    : `Calories held at ${plan.currentKcal}: ${reason}`;
  plan.reviews.push({
    date,
    oldKcal,
    newKcal: plan.currentKcal,
    adjustment,
    rate: status.rate,
    completeDays: status.completeDays,
    avgKcal: status.avgKcal,
    reason,
  });
  plan.reviews = plan.reviews.slice(-24);
  return adaptiveNutritionStatus(date);
}

function openAdaptiveGoalSheet() {
  const plan = STATE.nutritionCoach || nutritionCoachTemplate();
  const weight = latestWeighIn()?.weight ?? STATE.profile.bodyweight ?? 80;
  $("#sheet-body").innerHTML = `
    <h3>Adjust Goal</h3>
    <div class="muted" style="font-size:11px;line-height:1.5;margin-bottom:14px;">Resetting starts a new adaptive review period. Training history and food logs stay intact.</div>
    <div class="input"><label>Checkpoint weight (kg)</label><input id="adaptive-checkpoint" type="number" step="0.5" value="${plan.checkpointWeight ?? Math.max(50, weight - 7)}"></div>
    <div class="input" style="margin-top:10px;"><label>Final goal weight (kg)</label><input id="adaptive-final-goal" type="number" step="0.5" value="${plan.finalGoalWeight ?? STATE.cut.p2Target ?? 75}"></div>
    <div class="input" style="margin-top:10px;"><label>Starting calories</label><input id="adaptive-start-kcal" type="number" step="50" value="${plan.currentKcal ?? initialAdaptiveCalories(STATE, weight)}"></div>
    <button class="btn primary full" style="margin-top:14px;" id="adaptive-apply-goal">START RESET PLAN</button>`;
  openSheet();
  document.getElementById("adaptive-apply-goal")?.addEventListener("click", () => {
    const checkpointWeight = Number(document.getElementById("adaptive-checkpoint").value);
    const finalGoalWeight = Number(document.getElementById("adaptive-final-goal").value);
    const currentKcal = Number(document.getElementById("adaptive-start-kcal").value);
    if (!(finalGoalWeight < checkpointWeight && checkpointWeight < weight)) {
      toast("GOALS MUST BE BELOW CURRENT WEIGHT");
      return;
    }
    activateAdaptiveNutritionPlan({ checkpointWeight, finalGoalWeight, currentKcal });
    saveState();
    closeSheet();
    renderToday();
    if (document.getElementById("page-weigh")?.classList.contains("active")) renderWeigh();
    toast("ADAPTIVE PLAN RESET");
  });
}
