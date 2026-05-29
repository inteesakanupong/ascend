// Stats page renderer

function renderLifterAnalysis() {
  const wrap = document.getElementById("stats-lifter-analysis");
  const meta = document.getElementById("stats-calibration-meta");
  if (!wrap) return;
  const analysis = buildLifterAnalysis();
  STATE.lifterAnalysis = analysis;
  if (meta) meta.textContent = `${String(STATE.athleteProfile?.goal || "cut").toUpperCase()} · MANUAL SIGNALS`;
  const row = (label, value) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);"><span class="muted" style="font-size:11px;">${label}</span><span style="font-family:var(--f-mono);font-size:11px;font-weight:700;text-align:right;">${value}</span></div>`;
  const bt = analysis.bodyTrend, diet = analysis.dietOutcome, sb = analysis.strengthBalance, tr = analysis.trainingResponse;
  wrap.innerHTML = `<div style="padding:12px 14px;">
    <div class="card-label" style="margin-bottom:7px;">Body Trend</div>
    ${row("Current weight", bt.currentWeight != null ? `${fmtWeight(bt.currentWeight)}kg` : "—")}
    ${row("7-day average", bt.avg7 != null ? `${bt.avg7.toFixed(1)}kg` : "—")}
    ${row("28-day trend", bt.trend28 != null ? `${bt.trend28 > 0 ? "+" : ""}${bt.trend28.toFixed(2)}kg/week` : "—")}
    ${row("Body fat trend", bt.bfTrend != null ? `${bt.bfTrend.toFixed(1)}%` : "—")}
    ${row("Lean / fat mass", bt.leanMassKg != null ? `${bt.leanMassKg}kg / ${bt.fatMassKg}kg` : "—")}
    <div class="card-label" style="margin:14px 0 7px;">Diet Outcome</div>
    ${row("Calories", diet.kcalAvg != null ? `${diet.kcalAvg} avg / ${diet.targetKcal} target` : "—")}
    ${row("Protein", diet.proteinAvg != null ? `${diet.proteinAvg}g avg / ${diet.targetProtein}g floor` : "—")}
    ${row("Adherence", diet.adherence != null ? `${diet.adherence}%` : "—")}
    <div class="card-label" style="margin:14px 0 7px;">Lifter Profile</div>
    ${row("Press / pull", `${sb.pressing} / ${sb.pulling}`)}
    ${row("Squat / hinge", `${sb.squatting} / ${sb.hinge}`)}
    ${row("OHP / hinge-acc", `${sb.verticalPress} / ${sb.hingeAccessory}`)}
    <div class="card-label" style="margin:14px 0 7px;">Movement Pattern Balance</div>
    ${row("Horizontal push/pull", `${sb.pressing} / ${sb.pulling}`)}
    ${row("Vertical push", `${sb.verticalPress}`)}
    ${row("Knee-dominant", `${sb.squatting}`)}
    ${row("Hip-dominant", `${sb.hinge} (primary) · ${sb.hingeAccessory} (acc)`)}
    ${(() => {
      const pushPullImbalance = sb.pressing !== "unknown" && sb.pulling !== "unknown" && sb.pressing !== sb.pulling;
      const hingeNote = sb.hinge === "advanced" ? "High hinge load — monitor spinal fatigue." : "";
      const note = [pushPullImbalance ? "Push/pull strength imbalance detected." : "", hingeNote].filter(Boolean).join(" ");
      return note ? `<div style="font-size:11px;color:var(--ink-mid);padding:4px 0 8px;">${note}</div>` : "";
    })()}
    <div class="card-label" style="margin:14px 0 7px;">Training Response</div>
    ${row("Best response", tr.best.length ? tr.best.map(x => escapeHtml(x.name)).join(", ") : "—")}
    ${row("Stalled", tr.stalled.length ? tr.stalled.map(x => escapeHtml(x.name)).join(", ") : "—")}
    ${row("High fatigue", tr.highFatigue.length ? tr.highFatigue.map(x => escapeHtml(x.name)).join(", ") : "—")}
    ${row("Near MRV", tr.nearMrv.length ? tr.nearMrv.join(", ") : "—")}
    ${row("Below MEV", tr.belowMev.length ? tr.belowMev.join(", ") : "—")}
    ${row("MEV→MRV range", (() => {
      const muscles = ["chest","back","quads"];
      return muscles.map(m => {
        const lm = typeof effectiveMrvLandmarksForMuscle === "function" ? effectiveMrvLandmarksForMuscle(m) : VOLUME_LANDMARKS[m];
        const mrv = analysis.mrvEstimates?.[m];
        return lm ? `${MUSCLE_LABELS[m]||m} ${lm.mev}→${mrv ?? lm.mrv}` : null;
      }).filter(Boolean).join(" · ") || "—";
    })())}
    ${analysis.wavePosition ? `<div style="margin-top:10px;padding:8px 12px;background:var(--bg-elev-2);border-radius:9px;font-size:11px;font-family:var(--f-mono);letter-spacing:0.05em;">WAVE ${analysis.wavePosition.waveWeek}/4 · ${analysis.wavePosition.name} · CYCLE ${analysis.wavePosition.cycleNum} · ${analysis.wavePosition.intensityNote}</div>` : ""}
    <div style="margin-top:12px;padding:10px 12px;border-left:3px solid var(--accent);background:var(--bg-elev-2);border-radius:9px;font-size:12px;line-height:1.55;"><strong style="color:var(--ink);">Coaching verdict:</strong> ${escapeHtml(analysis.coachingVerdict)}</div>
    ${(() => {
      const overlapRisks = (analysis.fatigueRisks || []).filter(r => /overlap|redundan/i.test(r));
      const rotations = analysis.exerciseRotationSuggestions || [];
      if (!overlapRisks.length && !rotations.length) return "";
      let html = "";
      if (overlapRisks.length) {
        html += `<div style="margin-top:10px;padding:10px 12px;border-left:3px solid #e8a000;background:var(--bg-elev-2);border-radius:9px;">
          <div style="font-size:10px;letter-spacing:0.1em;color:var(--ink-dim);margin-bottom:6px;">STRESSOR OVERLAP</div>
          ${overlapRisks.map(r => `<div style="font-size:12px;line-height:1.5;margin-bottom:4px;">⚠ ${escapeHtml(r)}</div>`).join("")}
        </div>`;
      }
      if (rotations.length) {
        html += `<div style="margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);background:var(--bg-elev-2);border-radius:9px;">
          <div style="font-size:10px;letter-spacing:0.1em;color:var(--ink-dim);margin-bottom:6px;">EXERCISE ROTATION — SRN</div>
          <div style="font-size:11px;color:var(--ink-mid);margin-bottom:8px;">Exercises run 3+ blocks unchanged. Deload week is the ideal time to swap in a variation.</div>
          ${rotations.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line);font-size:12px;"><span>${escapeHtml(r.exerciseName)} <span style="color:var(--ink-dim);font-size:10px;">${r.day}</span></span><span style="font-family:var(--f-mono);font-size:11px;color:var(--accent);">${r.blocksRun} BLOCKS</span></div>`).join("")}
        </div>`;
      }
      return html;
    })()}
  </div>`;
}

function renderStats() {
  // Calendar + Lift Graph
  safeRender("stats.calendar", () => Calendar.render());
  safeRender("stats.liftGraphPills", () => LiftGraph.renderExercisePills());
  safeRender("stats.liftGraph", () => LiftGraph.drawGraph());
  safeRender("stats.lifterAnalysis", () => renderLifterAnalysis());

  // Weight chart
  const logs = STATE.dailyLogs.filter(d => typeof d.weight === "number")
                              .sort((a, b) => a.date.localeCompare(b.date));
  $("#stats-weight-meta").textContent = logs.length === 0 ? "NO DATA" : `${logs.length} WEIGH-INS`;
  $("#stats-chart").innerHTML = renderWeightChart(logs);

  // Volume Landmarks — per muscle group with frequency warnings
  const vol = weeklyVolumeByMuscle(7);
  const orderedMuscles = ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","forearms","abs"];
  const volWrap = document.getElementById("stats-vol-landmarks");

  // Compute per-muscle training frequency (how many distinct days hit each muscle in last 7 days)
  const cutoff7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10);
  const muscleDayHits = {};
  STATE.sessions.filter(s => s.date >= cutoff7).forEach(s => {
    (s.sets || []).forEach((_, i) => {
      const name = sessionExerciseName(s, i);
      if (!name) return;
      const weights = exerciseWeightedMuscles(name);
      Object.keys(weights).forEach(m => {
        if (!muscleDayHits[m]) muscleDayHits[m] = new Set();
        muscleDayHits[m].add(s.date);
      });
    });
  });

  const programMode = STATE.athleteProfile?.programMode || "hypertrophy";

  if (volWrap) {
    // Group muscles for display
    const muscleGroups = [
      { label: "UPPER PUSH", muscles: ["chest","shoulders","triceps"] },
      { label: "UPPER PULL", muscles: ["back","biceps","forearms"] },
      { label: "LOWER", muscles: ["quads","hamstrings","glutes","calves"] },
      { label: "CORE", muscles: ["abs"] },
    ];

    volWrap.innerHTML = muscleGroups.map(group => {
      const rows = group.muscles.map(m => {
        const sets = vol[m] || 0;
        const lm = typeof effectiveMrvLandmarksForMuscle === "function" ? effectiveMrvLandmarksForMuscle(m) : VOLUME_LANDMARKS[m];
        if (!lm) return "";
        const max = lm.mrv * 1.2;
        const pct = Math.min(100, (sets / max) * 100);
        const mevPct = (lm.mev / max) * 100;
        const mavPct = (lm.mav / max) * 100;
        let status = "under", label = "BELOW MEV";
        if (sets === 0) { status = "under"; label = "NOT TRAINED"; }
        else if (sets >= lm.mv && sets < lm.mev) { status = "under"; label = "MAINTENANCE"; }
        else if (sets >= lm.mev && sets <= lm.mav) { status = "optimal"; label = "IN RANGE"; }
        else if (sets > lm.mav && sets <= lm.mrv) { status = "high"; label = "NEAR MRV"; }
        else if (sets > lm.mrv) { status = "over"; label = "OVER MRV"; }

        const freq = muscleDayHits[m]?.size || 0;
        // For hypertrophy: 2x/week per muscle is ideal per Israetel
        const freqWarn = programMode === "hypertrophy" && sets > 0 && freq < 2;
        const freqNote = freqWarn
          ? `<span style="font-family:var(--f-mono);font-size:9px;color:#d4a017;letter-spacing:0.06em;">⚠ ${freq}×/WK — aim for 2×</span>`
          : `<span style="font-family:var(--f-mono);font-size:9px;color:var(--ink-faint);letter-spacing:0.06em;">${freq}×/wk</span>`;

        return `
          <div class="vol-row" style="padding:8px 0;">
            <div class="vol-row-head" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
              <span class="vol-muscle" style="font-size:12px;font-weight:600;">${MUSCLE_LABELS[m] || m}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                ${freqNote}
                <span class="vol-sets" style="font-family:var(--f-mono);font-size:10px;color:var(--ink-dim);">${sets} sets · MEV ${lm.mev} MAV ${lm.mav}</span>
              </div>
            </div>
            <div class="vol-bar-wrap" style="position:relative;height:6px;background:var(--bg-elev-3);border-radius:3px;overflow:visible;">
              <div class="vol-bar-fill ${status}" style="width:${pct}%;height:100%;border-radius:3px;"></div>
              <div class="vol-mev-mark" style="left:${mevPct}%;"></div>
              <div class="vol-mav-mark" style="left:${mavPct}%;"></div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:3px;">
              <span class="vol-status ${status}" style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.08em;">${label}</span>
            </div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-bottom:12px;">
          <div style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.14em;color:var(--ink-dim);padding:6px 0 2px;border-bottom:1px solid var(--line);margin-bottom:4px;">${group.label}</div>
          ${rows}
        </div>
      `;
    }).join("");
  }

  // Habits
  const last14 = [...STATE.dailyLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const denom = last14.length;
  $("#stats-habit-meta").textContent = `${denom}/14 DAYS LOGGED`;
  $("#stats-habits").innerHTML = HABIT_DEFS.map(h => {
    const num = last14.filter(d => d.habits && d.habits[h.key]).length;
    const pct = denom === 0 ? 0 : Math.round((num / denom) * 100);
    return `
      <div class="habit-progress">
        <div>
          <div class="name">${h.glyph} ${h.name}</div>
          <div class="bar"><div class="fill" style="width:${pct}%;"></div></div>
        </div>
        <div class="pct">${pct}%</div>
      </div>
    `;
  }).join("");

  // Lift PRs — best top set per exercise across all sessions
  const lifts = [];
  DAY_ORDER.forEach(day => {
    STATE.exercises[day].forEach((ex, idx) => {
      const sessions = STATE.sessions.filter(s => s.day === day).sort((a, b) => a.date.localeCompare(b.date));
      const maxW = sessions.reduce((m, s) => Math.max(m, s.sets[idx]?.s1w ?? 0, s.sets[idx]?.s2w ?? 0), 0);
      if (sessions.length === 0) return;
      lifts.push({ day, name: ex.name, start: ex.start, current: maxW, delta: maxW - ex.start });
    });
  });
  if (lifts.length === 0) {
    $("#stats-lifts").innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">No lift data yet</div></div>`;
  } else {
    $("#stats-lifts").innerHTML = lifts.map(l => `
      <div class="row" style="padding:10px 12px;">
        <div class="row-spread">
          <div>
            <span class="day-chip ${l.day.toLowerCase()}" style="font-size:9px;padding:2px 8px;">${l.day}</span>
            <span style="font-weight:600;font-size:13px;margin-left:6px;">${l.name}</span>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--f-display);font-weight:800;font-size:18px;">${fmtWeight(l.current)}<span class="muted" style="font-size:10px;">kg</span></div>
            <div class="muted" style="font-size:10px;font-family:var(--f-mono);">${l.delta >= 0 ? '+' : ''}${l.delta.toFixed(1)} from ${fmtWeight(l.start)}</div>
          </div>
        </div>
      </div>
    `).join("");
  }

  // Render the new sections
  safeRender("stats.personalRecords", () => renderPRs());
  safeRender("stats.weeklyVolume", () => renderVolume());
  safeRender("stats.measurements", () => renderMeasurements());
  safeRender("stats.trainingMax", () => renderTrainingMax());
  safeRender("stats.mrvRecommendations", () => renderMrvRecommendations());
}

function renderWeightChart(logs) {
  if (logs.length < 2) {
    return `<div class="empty"><div class="glyph">○</div><div class="label">Need 2+ weigh-ins for chart</div></div>`;
  }
  const W = 360, H = 180, P = 28;
  const dates = logs.map(d => isoToDate(d.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const range = maxDate - minDate || 1;
  // y range: include start weight, all logged weights, and target
  const allW = [STATE.profile.bodyweight, STATE.cut.p1Target, STATE.cut.p2Target, ...logs.map(l => l.weight)];
  const minW = Math.floor(Math.min(...allW)) - 0.5;
  const maxW = Math.ceil(Math.max(...allW)) + 0.5;
  const wRange = maxW - minW || 1;

  const x = (d) => P + ((d - minDate) / range) * (W - 2 * P);
  const y = (w) => H - P - ((w - minW) / wRange) * (H - 2 * P);

  // Build polyline for raw daily
  const rawPts = logs.map(d => `${x(isoToDate(d.date).getTime())},${y(d.weight)}`).join(" ");
  // 7-day rolling avg points
  const avgPts = logs.map(d => {
    const a = rollingAvgAt(d.date);
    return a == null ? null : `${x(isoToDate(d.date).getTime())},${y(a)}`;
  }).filter(Boolean).join(" ");

  // Target line: P1 target
  const yTarget = y(STATE.cut.p1Target);

  // Y-axis grid: 4 gridlines
  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const yi = P + (i / 4) * (H - 2 * P);
    const wi = maxW - (i / 4) * wRange;
    grid += `<line class="gridline" x1="${P}" x2="${W - P}" y1="${yi}" y2="${yi}" />`;
    grid += `<text class="axis-label" x="${P - 4}" y="${yi + 3}" text-anchor="end">${wi.toFixed(1)}</text>`;
  }

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${grid}
      <line class="target" x1="${P}" x2="${W - P}" y1="${yTarget}" y2="${yTarget}" />
      <polyline class="raw" points="${rawPts}" />
      ${logs.map(d => `<circle cx="${x(isoToDate(d.date).getTime())}" cy="${y(d.weight)}" r="2" fill="var(--ink-mid)"/>`).join("")}
      <polyline class="avg" points="${avgPts}" />
    </svg>
  `;
}
