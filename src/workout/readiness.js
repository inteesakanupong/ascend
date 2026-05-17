// Readiness calculation from daily log data

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
