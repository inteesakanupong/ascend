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
    if (gap >= 4) {
      penalty += 0.5;
      factors.push(`No workout for ${gap} days ↓`);
    } else if (gap >= 3) {
      penalty += 0.25;
      factors.push(`Missed training day (${gap}d gap)`);
    }
  }

  const recentIncomplete = sessions.slice(0, 3).find(s => typeof sessionCompletionRatio === "function" && sessionCompletionRatio(s) < 0.85);
  if (recentIncomplete) {
    const pct = Math.round(sessionCompletionRatio(recentIncomplete) * 100);
    penalty += pct < 60 ? 0.75 : 0.5;
    factors.push(`${recentIncomplete.day} incomplete (${pct}% sets) ↓`);
  }

  return { penalty, factors, lastSession: last };
}

function calculateReadiness(date) {
  const log = getDailyLog(date);
  if (!log) return { score: null, factors: [], adjustment: 0 };

  let score = 3; // baseline
  const factors = [];

  // Recovery rating (1-10) — primary signal
  if (log.recovery != null) {
    if (log.recovery >= 8)      { score += 1.5; factors.push(`Recovery ${log.recovery}/10 ↑`); }
    else if (log.recovery >= 6) { score += 0.5; factors.push(`Recovery ${log.recovery}/10`);   }
    else if (log.recovery <= 3) { score -= 1.5; factors.push(`Recovery ${log.recovery}/10 ↓`); }
    else if (log.recovery <= 5) { score -= 0.5; factors.push(`Recovery ${log.recovery}/10 ↓`); }
  }

  // Sleep habit hit
  if (log.habits?.sleep)      { score += 0.5; factors.push("Slept well ↑"); }
  else if (log.habits && log.habits.sleep === false) { score -= 0.5; factors.push("Poor sleep ↓"); }

  // Protein hit (recovery proxy)
  if (log.habits?.protein)    { score += 0.25; }

  // 3-day weight trend (rapid drop = under-recovered)
  const recent = [...STATE.dailyLogs]
    .filter(d => d.weight != null && d.date <= date)
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  if (recent.length >= 4) {
    const drop3d = recent[3].weight - recent[0].weight;
    if (drop3d > 0.7) { score -= 0.5; factors.push(`Rapid weight drop (-${drop3d.toFixed(1)}kg/3d)`); }
  }

  const adherence = trainingAdherenceSignal(date);
  if (adherence.penalty) {
    score -= adherence.penalty;
    factors.push(...adherence.factors);
  }

  // Clamp 1-5
  score = Math.max(1, Math.min(5, Math.round(score * 2) / 2));

  // Translate to intensity adjustment %
  let adjustment = 0;
  if (score <= 1.5)      adjustment = -0.10;  // -10%
  else if (score <= 2.5) adjustment = -0.05;  // -5%
  else if (score >= 4.5) adjustment = +0.025; // +2.5% push
  // 3-4 = no adjustment (default progression)

  return { score, factors, adjustment };
}
