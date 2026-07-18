// Readiness calculation from daily log data

function trainingAdherenceSignal(date) {
  const sessions = [...(STATE.sessions || [])]
    .filter(s => s.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const factors = [];
  let penalty = 0;

  const last = sessions[0] || null;
  if (last) {
    const gap = daysBetween(last.date, date);
    const plannedRestDays = (STATE.dailyLogs || []).filter(d => d.restDay && d.date > last.date && d.date < date).length;
    const effectiveGap = Math.max(0, gap - plannedRestDays);
    if (effectiveGap >= 4) {
      penalty += 0.5;
      factors.push(`No workout for ${gap} days down`);
    } else if (effectiveGap >= 3) {
      penalty += 0.25;
      factors.push(`Missed training day (${gap}d gap)`);
    } else if (plannedRestDays > 0) {
      factors.push(`${plannedRestDays} planned rest day${plannedRestDays > 1 ? "s" : ""}`);
    }
  }

  const recentIncomplete = sessions.slice(0, 3).find(s => typeof sessionCompletionRatio === "function" && sessionCompletionRatio(s) < 0.85);
  if (recentIncomplete) {
    const pct = Math.round(sessionCompletionRatio(recentIncomplete) * 100);
    penalty += pct < 60 ? 0.75 : 0.5;
    factors.push(`${recentIncomplete.day} incomplete (${pct}% sets) down`);
  }

  return { penalty, factors, lastSession: last };
}

function calculateReadiness(date) {
  const log = getDailyLog(date);
  if (!log) return { score: null, factors: [], adjustment: 0 };

  let score = 3;
  const factors = [];

  if (log.recovery != null) {
    if (log.recovery >= 8)      { score += 1.5; factors.push(`Recovery ${log.recovery}/10 up`); }
    else if (log.recovery >= 6) { score += 0.5; factors.push(`Recovery ${log.recovery}/10`); }
    else if (log.recovery <= 3) { score -= 1.5; factors.push(`Recovery ${log.recovery}/10 down`); }
    else if (log.recovery <= 5) { score -= 0.5; factors.push(`Recovery ${log.recovery}/10 down`); }
  }

  if (log.restDay) {
    score += 0.25;
    factors.push("Rest day logged");
  }

  if (log.sleepOk === true)       { score += 0.5; factors.push("Slept well up"); }
  else if (log.sleepOk === false) { score -= 0.5; factors.push("Poor sleep down"); }

  const proteinTarget = STATE.cut?.proteinFloor || 160;
  if (log.protein != null && log.protein >= proteinTarget) score += 0.25;

  const recent = [...STATE.dailyLogs]
    .filter(d => d.weight != null && d.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  if (recent.length >= 4) {
    const drop3d = recent[3].weight - recent[0].weight;
    if (drop3d > 0.7) {
      score -= 0.5;
      factors.push(`Rapid weight drop (-${drop3d.toFixed(1)}kg/3d)`);
    }
  }

  const adherence = trainingAdherenceSignal(date);
  if (adherence.penalty) {
    score -= adherence.penalty;
    factors.push(...adherence.factors);
  }

  if (typeof runningRecoverySignal === "function") {
    const running = runningRecoverySignal(date);
    if (running.penalty) {
      score -= running.penalty;
      factors.push(...running.factors);
    }
  }

  score = Math.max(1, Math.min(5, Math.round(score * 2) / 2));

  let adjustment = 0;
  if (score <= 1.5)      adjustment = -0.10;
  else if (score <= 2.5) adjustment = -0.05;
  else if (score >= 4.5) adjustment = +0.025;

  return { score, factors, adjustment };
}
