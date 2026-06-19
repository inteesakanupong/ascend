// Profile page renderer

function renderTrainingMax() {
  const wrap = document.getElementById("stats-training-max");
  if (!wrap) return;

  const DAY_COLORS = { PUSH: "var(--push)", PULL: "var(--pull)", ARMS: "var(--arms)", LEGS: "var(--legs)" };

  const rows = DAY_ORDER.map(day => {
    const leadIdx   = getLeadLiftIdx(day);
    const ex        = STATE.exercises[day]?.[leadIdx];
    if (!ex) return null;

    const wm        = getWorkingMax(day, leadIdx, ex);
    const prescription = progressionFor(day, leadIdx);
    const lastSess  = STATE.sessions.filter(s => s.day === day)
                        .sort((a,b) => b.date.localeCompare(a.date))[0];
    const lastW     = lastSess?.sets?.[leadIdx]?.s1w ?? null;
    const displayWM = prescription?.weight ?? wm ?? lastW ?? ex.start;
    const displayReps = prescription?.reps ?? ex.repMin;
    const sourceLabel = prescription?.verdict === "START" && lastW == null
      ? "START WEIGHT"
      : "NEXT PRESCRIPTION";

    // Wave position
    const wave      = juggernautWave(0, day);
    const waveColors = { ACCUMULATION: "#4a9eff", INTENSIFICATION: "#d4a017", REALIZATION: "var(--accent)", DELOAD: "var(--good)" };
    const waveColor  = waveColors[wave.name] || "var(--ink-dim)";

    // Session history for mini sparkline (last 8 sessions)
    const history = STATE.sessions
      .filter(s => s.day === day)
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(-8)
      .map(s => s.sets?.[leadIdx]?.s1w ?? null)
      .filter(v => v != null);

    // Build sparkline SVG
    let sparkline = "";
    if (history.length >= 2) {
      const W = 80, H = 24, pad = 2;
      const minV = Math.min(...history);
      const maxV = Math.max(...history);
      const range = maxV - minV || 1;
      const pts = history.map((v, i) => {
        const x = pad + (i / (history.length - 1)) * (W - pad * 2);
        const y = H - pad - ((v - minV) / range) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      sparkline = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;">
        <polyline points="${pts}" fill="none" stroke="${DAY_COLORS[day]}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;
    }

    return { day, ex, displayWM, displayReps, sourceLabel, prescription, wm, lastW, wave, waveColor, sparkline, history };
  }).filter(Boolean);

  if (rows.every(r => r.history.length === 0)) {
    wrap.innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">Log sessions to track training maxes</div></div>`;
    return;
  }

  wrap.innerHTML = rows.map(r => `
    <div style="padding:12px 14px; border-bottom:1px solid var(--line);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
        <div>
          <span class="day-chip ${r.day.toLowerCase()}" style="font-size:9px;padding:2px 8px;">${r.day}</span>
          <span style="font-weight:700;font-size:13px;margin-left:7px;">${r.ex.name}</span>
          ${r.wm ? `<span style="font-family:var(--f-mono);font-size:9px;color:var(--good);margin-left:5px;letter-spacing:0.06em;">AMRAP MAX SET</span>` : ""}
        </div>
        <div style="font-family:var(--f-display);font-weight:900;font-size:24px;line-height:1;letter-spacing:0.01em;">${fmtWeight(r.displayWM)}<span style="font-size:11px;font-weight:400;color:var(--ink-dim);">kg</span></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <span style="display:inline-block; font-family:var(--f-mono); font-size:9px; font-weight:700; letter-spacing:0.1em; color:${r.waveColor}; padding:2px 7px; background:${r.waveColor}22; border-radius:4px;">
            CYCLE ${r.wave.cycleNum} · WK ${r.wave.waveWeek}/4 · ${r.wave.name}
          </span>
        </div>
        ${r.sparkline ? `<div>${r.sparkline}</div>` : ""}
      </div>

      <div style="font-size:11px;color:var(--ink-mid);line-height:1.5;margin-bottom:8px;">
        <span style="font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:0.1em;color:var(--ink-dim);">${r.sourceLabel}</span>
        · ${fmtWeight(r.displayWM)}kg × ${r.displayReps}
        ${r.prescription?.note ? `<div style="margin-top:2px;color:var(--ink-dim);">${escapeHtml(r.prescription.note)}</div>` : ""}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:4px;">
        <div style="background:var(--bg-elev-2); border-radius:8px; padding:7px 8px; text-align:center;">
          <div style="font-family:var(--f-mono);font-size:9px;color:#4a9eff;font-weight:700;letter-spacing:0.1em;">LAST</div>
          <div style="font-weight:700;font-size:14px;margin-top:2px;">${r.lastW != null ? fmtWeight(r.lastW) : "—"}</div>
          <div style="font-family:var(--f-mono);font-size:8px;color:var(--ink-dim);">completed</div>
        </div>
        <div style="background:var(--bg-elev-2); border-radius:8px; padding:7px 8px; text-align:center;">
          <div style="font-family:var(--f-mono);font-size:9px;color:#d4a017;font-weight:700;letter-spacing:0.1em;">NEXT</div>
          <div style="font-weight:700;font-size:14px;margin-top:2px;">${fmtWeight(r.displayWM)}</div>
          <div style="font-family:var(--f-mono);font-size:8px;color:var(--ink-dim);">Lift tab</div>
        </div>
        <div style="background:var(--bg-elev-2); border-radius:8px; padding:7px 8px; text-align:center;">
          <div style="font-family:var(--f-mono);font-size:9px;color:var(--accent);font-weight:700;letter-spacing:0.1em;">AMRAP MAX</div>
          <div style="font-weight:700;font-size:14px;margin-top:2px;">${r.wm != null ? fmtWeight(r.wm) : "—"}</div>
          <div style="font-family:var(--f-mono);font-size:8px;color:var(--ink-dim);">stored</div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderPRs() {
  const wrap = $("#stats-prs");
  // For each (day, exIdx), find best ever
  const records = [];
  DAY_ORDER.forEach(day => {
    STATE.exercises[day].forEach((ex, idx) => {
      const pr = personalRecord(day, idx);
      if (!pr) return;
      records.push({ day, name: ex.name, exIdx: idx, ...pr });
    });
  });
  // Most recent PRs first
  records.sort((a, b) => b.date.localeCompare(a.date));
  $("#stats-prs-meta").textContent = `${records.length} EXERCISE${records.length !== 1 ? 'S' : ''}`;
  if (records.length === 0) {
    wrap.innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">Log a session to set your first PR</div></div>`;
    return;
  }
  wrap.innerHTML = records.map(r => `
    <div class="row" style="padding:10px 12px;">
      <div class="row-spread">
        <div>
          <span class="day-chip ${r.day.toLowerCase()}" style="font-size:9px;padding:2px 8px;">${r.day}</span>
          <span style="font-weight:600;font-size:13px;margin-left:6px;">${r.name}</span>
          <div class="muted" style="font-size:10px;margin-top:2px;font-family:var(--f-mono);">${formatDate(r.date)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--f-display);font-weight:800;font-size:20px;">${fmtWeight(r.w)}<span class="muted" style="font-size:10px;">kg</span></div>
          <div class="muted" style="font-size:10px;">×${r.r} reps</div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderVolume() {
  const wrap = $("#stats-volume");
  const v = weeklyVolume(6);
  // Only show day-types that have at least one non-zero week
  const activeDays = DAY_ORDER.filter(d => v[d].some(x => x > 0));
  if (activeDays.length === 0) {
    wrap.innerHTML = `<div class="empty"><div class="glyph">○</div><div class="label">Log sessions to track tonnage</div></div>`;
    return;
  }
  // Find global max so all bars share scale
  const allValues = activeDays.flatMap(d => v[d]);
  const maxVal = Math.max(...allValues, 1);

  wrap.innerHTML = activeDays.map(day => {
    const weeks = v[day];
    const bars = weeks.map((val, i) => {
      const pct = (val / maxVal) * 100;
      const isThisWeek = i === weeks.length - 1;
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0;">
          <div style="height:50px; width:100%; display:flex; align-items:flex-end; justify-content:center; padding: 0 2px;">
            <div style="
              width: 100%;
              height: ${pct}%;
              background: ${isThisWeek ? `var(--${day.toLowerCase()})` : 'var(--bg-elev-3)'};
              border-radius: 3px 3px 0 0;
              min-height: ${val > 0 ? '2px' : '0'};
              transition: height 400ms;
            "></div>
          </div>
          <div style="font-size:9px; color: var(--ink-dim); font-family: var(--f-mono);">${val > 999 ? (val/1000).toFixed(1) + 'k' : val}</div>
        </div>
      `;
    }).join("");
    return `
      <div style="display: grid; grid-template-columns: 60px 1fr; gap: 8px; align-items: center; margin-bottom: 12px;">
        <div>
          <div class="day-chip ${day.toLowerCase()}" style="font-size:9px; padding: 2px 8px;">${day}</div>
        </div>
        <div style="display: flex; gap: 3px; align-items: flex-end;">
          ${bars}
        </div>
      </div>
    `;
  }).join("");
}

function renderMeasurements() {
  const wrap = $("#stats-measurements");
  const list = [...(STATE.measurements || [])].sort((a, b) => b.date.localeCompare(a.date));
  $("#stats-meas-meta").textContent = list.length === 0 ? "NONE" : `${list.length} ENTR${list.length !== 1 ? 'IES' : 'Y'}`;
  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty" style="padding:20px;"><div class="label" style="font-size:11px;">Track waist, neck, hip every 1-2 weeks</div></div>`;
    return;
  }
  // Compute deltas vs first entry (chronologically) for each metric
  const first = list[list.length - 1];
  const fmt = (cur, init) => {
    if (cur == null) return "—";
    const d = init != null ? cur - init : 0;
    return `${cur}<span class="muted" style="font-size:10px;font-family:var(--f-mono);">${init != null && cur !== init ? ` (${d>=0?'+':''}${d.toFixed(1)})` : ''}</span>`;
  };
  wrap.innerHTML = list.map((m, i) => {
    const isLatest = i === 0;
    const sex = STATE.profile.sex || "male";
    const height = STATE.profile.height;
    const bf = navyBFpct(sex, m.neck, m.waist, m.hip, height);
    const bfDelta = i < list.length - 1
      ? navyBFpct(sex, list[list.length-1].neck, list[list.length-1].waist, list[list.length-1].hip, height)
      : null;
    const bfStr = bf != null
      ? ` · <span style="color:var(--accent);font-weight:700;">${bf}% BF</span>${bfDelta != null ? ` <span class="muted" style="font-size:9px;">(${bf > bfDelta ? "+" : ""}${(bf - bfDelta).toFixed(1)})</span>` : ""}`
      : "";
    return `
      <div class="row tap" data-id="${m.id}" style="padding:10px 12px; ${isLatest ? 'border-color: var(--accent);' : ''}">
        <div class="row-spread">
          <div>
            <div style="font-family:var(--f-display);font-weight:700;font-size:14px;letter-spacing:0.04em;">${formatDate(m.date)}</div>
            <div class="muted" style="font-size:11px;margin-top:4px;font-family:var(--f-mono);">
              N <span class="hl">${fmt(m.neck, first.neck)}</span> ·
              W <span class="hl">${fmt(m.waist, first.waist)}</span> ·
              H <span class="hl">${fmt(m.hip, first.hip)}</span>${bfStr}
            </div>
          </div>
          <div class="muted" style="font-size:18px;">›</div>
        </div>
      </div>
    `;
  }).join("");
  wrap.querySelectorAll(".row.tap").forEach(el => {
    el.addEventListener("click", () => openMeasurementSheet(el.dataset.id));
  });
}

function openMeasurementSheet(id) {
  const m = id ? STATE.measurements.find(x => x.id === id) : null;
  const isNew = !m;
  const today = todayISO();
  $("#sheet-body").innerHTML = `
    <h3>${isNew ? 'New' : 'Edit'} Measurement</h3>
    <div class="muted" style="font-size:11px;margin-bottom:14px;letter-spacing:0.08em;">CM · NECK / WAIST / HIP</div>
    <div class="input" style="margin-bottom:10px;">
      <label>Date</label>
      <input type="date" id="meas-date" value="${m ? m.date : today}" />
    </div>
    <div class="input-grid">
      <div class="input"><label>Neck (cm)</label><input type="number" step="0.1" id="meas-neck" value="${m?.neck ?? ''}" /></div>
      <div class="input"><label>Waist (cm)</label><input type="number" step="0.1" id="meas-waist" value="${m?.waist ?? ''}" /></div>
    </div>
    <div class="input-grid" style="margin-top:10px;">
      <div class="input"><label>Hip (cm)</label><input type="number" step="0.1" id="meas-hip" value="${m?.hip ?? ''}" /></div>
      <div class="input"><label>Other (note)</label><input type="text" id="meas-notes" value="${m?.notes ?? ''}" placeholder="optional" /></div>
    </div>
    <div style="display:flex; gap:8px; margin-top:14px;">
      <button class="btn primary" style="flex:1;" id="btn-meas-save">SAVE</button>
      ${!isNew ? `<button class="btn danger" id="btn-meas-del">DELETE</button>` : ''}
    </div>
  `;
  openSheet();
  $("#btn-meas-save").addEventListener("click", () => {
    const entry = {
      id: m?.id || `m-${Date.now()}`,
      date:  $("#meas-date").value,
      neck:  $("#meas-neck").value === ""  ? null : parseFloat($("#meas-neck").value),
      waist: $("#meas-waist").value === "" ? null : parseFloat($("#meas-waist").value),
      hip:   $("#meas-hip").value === ""   ? null : parseFloat($("#meas-hip").value),
      notes: $("#meas-notes").value || null,
    };
    if (entry.neck == null && entry.waist == null && entry.hip == null) {
      toast("ENTER AT LEAST ONE MEASUREMENT");
      return;
    }
    if (!STATE.measurements) STATE.measurements = [];
    if (m) {
      const i = STATE.measurements.findIndex(x => x.id === m.id);
      if (i >= 0) STATE.measurements[i] = entry;
    } else {
      STATE.measurements.push(entry);
    }
    saveState();
    closeSheet();
    renderMeasurements();
    toast("SAVED");
  });
  const delBtn = document.getElementById("btn-meas-del");
  if (delBtn) delBtn.addEventListener("click", () => {
    if (!confirm("Delete this measurement?")) return;
    STATE.measurements = STATE.measurements.filter(x => x.id !== m.id);
    saveState();
    closeSheet();
    renderMeasurements();
    toast("DELETED");
  });
}

function renderSettings() {
  $("#set-bodyweight").value   = STATE.profile.bodyweight;
  $("#set-bodyfat").value      = STATE.profile.bodyFatPct ?? STATE.athleteProfile?.bodyFatPercent ?? "";
  $("#set-start").value        = STATE.profile.programStart;
  $("#set-name").value         = STATE.profile.name ?? "";
  $("#set-height").value       = STATE.profile.height ?? "";
  $("#set-age").value          = STATE.profile.age ?? "";
  $("#set-sex").value          = STATE.profile.sex ?? "";
  $("#set-activity").value     = STATE.profile.activityLevel ?? "moderate";
  $("#set-stepgoal").value     = STATE.profile.stepGoal ?? 10000;
  updateTDEEDisplay();
  $("#set-p1-target").value = STATE.cut.p1Target;
  $("#set-p1-weeks").value  = STATE.cut.p1Weeks;
  $("#set-db-weeks").value  = STATE.cut.dbWeeks;
  $("#set-p2-target").value = STATE.cut.p2Target;
  $("#set-p2-weeks").value  = STATE.cut.p2Weeks;
  $("#set-p1-kcal").value = STATE.cut.p1Kcal;
  $("#set-db-kcal").value = STATE.cut.dbKcal;
  $("#set-p2-kcal").value = STATE.cut.p2Kcal;
  $("#set-protein").value = STATE.cut.proteinFloor;
  // Timer (defensive — older state may not have STATE.timer)
  if (!STATE.timer) STATE.timer = { compoundSec: 180, midSec: 120, isolationSec: 90, sound: true };
  $("#set-rest-compound").value = STATE.timer.compoundSec;
  $("#set-rest-mid").value      = STATE.timer.midSec;
  $("#set-rest-iso").value      = STATE.timer.isolationSec;
  $("#set-rest-sound").checked  = !!STATE.timer.sound;

  // Exercise program editor
  const wrap = $("#set-exercises");
  wrap.innerHTML = DAY_ORDER.map(day => `
    <div class="prog-day-label" data-prog-day="${day}">
      <span><span class="prog-day-arrow">▾</span>${day} <span style="color:var(--ink-faint);font-weight:400;">(${STATE.exercises[day].length})</span></span>
      <button class="prog-add-btn" data-add-day="${day}">+ ADD</button>
    </div>
    <div class="prog-ex-list" data-day="${day}">
      ${STATE.exercises[day].map((ex, idx) => `
        <div class="prog-ex-row" data-day="${day}" data-idx="${idx}">
          <div class="prog-drag-handle" title="Hold to reorder">⠿</div>
          ${ex.leadLift ? `<div class="prog-lead-dot" title="Lead lift"></div>` : ""}
          <div class="prog-ex-info" data-edit-day="${day}" data-edit-idx="${idx}">
            <div class="prog-ex-name">${idx+1}. ${ex.name}</div>
            <div class="prog-ex-meta">${ex.repMin}–${ex.repMax} reps · ${fmtWeight(ex.start)}kg start · ${detectEquipment(ex.name, ex).toUpperCase()}</div>
          </div>
          <button class="prog-del-btn" data-del-day="${day}" data-del-idx="${idx}" title="Remove">✕</button>
        </div>
      `).join("")}
    </div>
  `).join("");

  // Apply persisted collapse state to rendered DOM
  DAY_ORDER.forEach(day => {
    if (_progCollapsed.has(day)) {
      const hdr = wrap.querySelector(`.prog-day-label[data-prog-day="${day}"]`);
      const list = wrap.querySelector(`.prog-ex-list[data-day="${day}"]`);
      if (hdr) hdr.classList.add("collapsed");
      if (list) list.classList.add("collapsed");
    }
  });

  // Collapsible day headers
  wrap.querySelectorAll(".prog-day-label").forEach(hdr => {
    hdr.addEventListener("click", (e) => {
      if (e.target.closest(".prog-add-btn")) return; // don't collapse on ADD click
      const day = hdr.dataset.progDay;
      const list = wrap.querySelector(`.prog-ex-list[data-day="${day}"]`);
      const collapsed = hdr.classList.toggle("collapsed");
      if (list) list.classList.toggle("collapsed", collapsed);
      if (collapsed) _progCollapsed.add(day); else _progCollapsed.delete(day);
    });
  });

  // Wire edit taps
  wrap.querySelectorAll(".prog-ex-info").forEach(el => {
    el.addEventListener("click", () => openExerciseSheet(el.dataset.editDay, +el.dataset.editIdx));
  });

  // Wire delete buttons
  wrap.querySelectorAll(".prog-del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.delDay;
      const idx = +btn.dataset.delIdx;
      if (STATE.exercises[day].length <= 1) { toast("Need at least 1 exercise"); return; }
      if (!confirm(`Remove ${STATE.exercises[day][idx].name}?`)) return;
      STATE.exercises[day].splice(idx, 1);
      saveState();
      renderSettings();
      toast("REMOVED");
    });
  });

  // Wire add buttons — opens exercise selector, then prompts for details
  wrap.querySelectorAll("[data-add-day]").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.addDay;
      openExerciseSelector(null, (name, dbEntry) => {
        // Open a quick config sheet for rep range
        closeExerciseSelector();
        setTimeout(() => openAddExerciseSheet(day, name, dbEntry), 200);
      });
    });
  });

  // Drag-to-reorder
  _initProgramDrag(wrap);
  renderCustomFoodsList();
  renderGeminiSettings();
}

function renderGeminiSettings() {
  const k = getGeminiKey();
  const inp = document.getElementById("set-gemini-key-input");
  const status = document.getElementById("gemini-key-status");
  if (!inp) return;
  // Show masked key if set, blank if not
  inp.value = k ? k : "";
  inp.placeholder = k ? "\u2022".repeat(12) + " (key set)" : "AIza\u2026";
  if (status) status.textContent = k ? "\u2713 KEY SET" : "NOT SET";
  updateGeminiKeyBadge();
}
