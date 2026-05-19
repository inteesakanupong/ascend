// Guarded developer console commands for loading/removing Ascend mock data.
(function() {
  const DEV_FLAG = "ascendDev";
  const MOCK_ACTIVE_KEY = "ascend-dev-mock-active";
  const MOCK_BACKUP_KEY = "ascend-dev-mock-backup";
  const MOCK_BACKUP_RAW_KEY = "ascend-dev-mock-backup-raw";
  const MOCK_BACKUP_META_KEY = "ascend-dev-mock-backup-meta";

  function isDevEnabled() {
    const params = new URLSearchParams(window.location.search || "");
    const host = window.location.hostname;
    return params.get(DEV_FLAG) === "1" ||
      params.get(DEV_FLAG) === "true" ||
      window.location.protocol === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "";
  }

  if (!isDevEnabled()) return;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function activeTabName() {
    return document.querySelector(".tab.active")?.dataset?.tab || "today";
  }

  function refreshApp(tab) {
    try {
      if (typeof goTab === "function") goTab(tab || activeTabName());
      else window.location.reload();
    } catch (e) {
      console.warn("Ascend dev refresh failed; reloading instead.", e);
      window.location.reload();
    }
    renderMockBadge();
  }

  function persistStateDirect(nextState) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); }
    catch (e) { console.warn("Ascend mock localStorage write failed", e); }
    try { idbSet(clone(nextState)).catch(e => console.warn("Ascend mock IDB write failed", e)); }
    catch (e) { console.warn("Ascend mock IDB write failed", e); }
  }

  function backupCurrentState() {
    try {
      if (localStorage.getItem(MOCK_ACTIVE_KEY) === "1" && localStorage.getItem(MOCK_BACKUP_KEY)) {
        return { reused: true };
      }
      const stateCopy = clone(STATE);
      const raw = localStorage.getItem(STORAGE_KEY);
      localStorage.setItem(MOCK_BACKUP_KEY, JSON.stringify(stateCopy));
      if (raw) localStorage.setItem(MOCK_BACKUP_RAW_KEY, raw);
      localStorage.setItem(MOCK_BACKUP_META_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        sessions: (STATE.sessions || []).length,
        dailyLogs: (STATE.dailyLogs || []).length
      }));
      return { reused: false };
    } catch (e) {
      console.warn("Ascend mock backup failed", e);
      return { failed: true, error: e };
    }
  }

  function renderMockBadge() {
    const shouldShow = localStorage.getItem(MOCK_ACTIVE_KEY) === "1" || !!STATE?.devMockData?.active;
    let badge = document.getElementById("ascend-dev-mock-badge");
    if (!shouldShow) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "ascend-dev-mock-badge";
      badge.setAttribute("role", "status");
      badge.style.cssText = [
        "position:fixed",
        "left:12px",
        "bottom:calc(72px + env(safe-area-inset-bottom, 0px))",
        "z-index:9999",
        "background:#111110",
        "color:#fff",
        "border:1px solid #f59e0b",
        "box-shadow:0 8px 24px rgba(0,0,0,.22)",
        "font:700 11px/1.2 var(--f-mono, monospace)",
        "letter-spacing:.08em",
        "padding:8px 10px",
        "border-radius:8px",
        "pointer-events:none"
      ].join(";");
      document.body.appendChild(badge);
    }
    badge.textContent = "DEV MOCK DATA ACTIVE";
  }

  function summaryLine(label, value) {
    console.log(label.padEnd(32, " "), value);
  }

  function withTemporaryState(mutator, fn) {
    const original = STATE;
    try {
      STATE = clone(STATE);
      mutator(STATE);
      return fn();
    } finally {
      STATE = original;
    }
  }

  function warmupSummaryFor(day) {
    const previousLiftDay = typeof LIFT_DAY !== "undefined" ? LIFT_DAY : null;
    try {
      LIFT_DAY = day;
      const trend = warmupTrendAnalysis(day);
      const moves = selectWarmupMovements(day, trend).map(m => m.name);
      return { mode: trend.mode, signals: trend.signals, jointStress: trend.jointStress, movements: moves };
    } catch (e) {
      return { error: e.message || String(e) };
    } finally {
      try { LIFT_DAY = previousLiftDay; } catch (_) {}
    }
  }

  function progressionSummary() {
    const rows = [];
    DAY_ORDER.forEach(day => {
      const wave = juggernautWave(0, day);
      const leadIdx = getLeadLiftIdx(day);
      const lead = STATE.exercises[day]?.[leadIdx];
      const p = lead ? progressionFor(day, leadIdx) : null;
      rows.push({
        day,
        sessions: trainingSessionsForDay(day).length,
        nextWave: `${wave.name} C${wave.cycleNum} W${wave.waveWeek}`,
        leadLift: lead?.name || null,
        prescription: p ? `${p.verdict} ${p.weight}kg x ${p.reps}` : "missing",
        trainingMax: p?.trainingMax || getWorkingMax(day, leadIdx) || null
      });
    });
    return rows;
  }

  function accessoryExamples() {
    const examples = [
      ["PUSH", 3, "top-range lateral raise with extra-set RPE"],
      ["PULL", 1, "missed weighted pull-up branch"],
      ["ARMS", 2, "skipped/incomplete set branch"],
      ["LEGS", 1, "low-rep RDL hold/deload branch"]
    ];
    return examples.map(([day, idx, scenario]) => {
      const ex = STATE.exercises[day]?.[idx];
      const p = ex ? progressionFor(day, idx) : null;
      return {
        scenario,
        day,
        exercise: ex?.name || null,
        verdict: p?.verdict || "missing",
        target: p ? `${p.weight}kg x ${p.reps}` : null,
        confidence: p?.confidence ?? null,
        reasoning: p?.reasoning || [],
        note: p?.note || null
      };
    });
  }

  function buildWarmupScenarios() {
    return [
      {
        scenario: "standard mode candidate",
        day: "PUSH",
        result: withTemporaryState(s => {
          s.cut.mode = "maintain";
          s.dailyLogs = s.dailyLogs.map(d => ({ ...d, recovery: 7, habits: { sleep: true, protein: true } }));
          let pushSeen = 0;
          s.sessions = s.sessions.filter(sess => {
            if (sess.date >= isoDaysAgoLocal(14)) return false;
            if (sess.day !== "PUSH") return true;
            pushSeen += 1;
            return pushSeen <= 4;
          });
        }, () => warmupSummaryFor("PUSH"))
      },
      {
        scenario: "minimal mode candidate",
        day: "ARMS",
        result: warmupSummaryFor("ARMS")
      },
      {
        scenario: "complete mode candidate",
        day: "PULL",
        result: withTemporaryState(s => {
          s.cut.mode = "maintain";
        }, () => warmupSummaryFor("PULL"))
      },
      {
        scenario: "joint-stress-sensitive selection",
        day: "PUSH",
        result: withTemporaryState(s => {
          s.cut.mode = "maintain";
        }, () => warmupSummaryFor("PUSH"))
      }
    ];
  }

  function mockCalculationSnapshot() {
    const scenarios = buildWarmupScenarios();
    return {
      leadPrescriptions: progressionSummary(),
      accessoryExamples: accessoryExamples(),
      readiness: calculateReadiness(todayISO()),
      weeklyVolumeByMuscle: weeklyVolumeByMuscle(7),
      fatigue: computeFatigueSummary(7),
      warmup: DAY_ORDER.map(day => ({ day, ...warmupSummaryFor(day) })),
      warmupScenarios: scenarios.map(s => ({ scenario: s.scenario, day: s.day, ...s.result }))
    };
  }

  window.loadAscendMockData = function loadAscendMockData() {
    if (!window.AscendMockData?.buildMockState) {
      console.error("Ascend mock data builder is not loaded.");
      return null;
    }
    const backup = backupCurrentState();
    const nextState = window.AscendMockData.buildMockState(typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10));
    STATE = nextState;
    try { STATE.lifterAnalysis = typeof buildLifterAnalysis === "function" ? buildLifterAnalysis() : STATE.lifterAnalysis; }
    catch (e) { console.warn("Mock lifter analysis refresh failed", e); }
    try { if (typeof updateAdaptiveStateSnapshot === "function") updateAdaptiveStateSnapshot("dev_mock_load"); }
    catch (e) { console.warn("Mock adaptive snapshot failed", e); }
    localStorage.setItem(MOCK_ACTIVE_KEY, "1");
    persistStateDirect(STATE);
    refreshApp("today");
    console.info("Ascend DEV MOCK DATA ACTIVE.");
    console.info(backup.reused ? "Existing pre-mock backup preserved." : backup.failed ? "Backup failed; see warning above." : "Previous state backed up before mock load.");
    console.info("Run ascendMockCalculationSummary() for calculation checkpoints.");
    console.info("Run clearAscendMockData() to reset to a blank default state, or restoreAscendMockBackup() to restore the pre-mock backup.");
    return { active: true, sessions: STATE.sessions.length, dailyLogs: STATE.dailyLogs.length, backup };
  };

  window.clearAscendMockData = function clearAscendMockData() {
    const fresh = typeof freshDefaultState === "function" ? freshDefaultState() : clone(DEFAULT_STATE);
    STATE = typeof migrateState === "function" ? migrateState(fresh) : fresh;
    localStorage.removeItem(MOCK_ACTIVE_KEY);
    persistStateDirect(STATE);
    refreshApp("today");
    console.info("Ascend mock data cleared. App reset to blank/default state.");
    console.info("A pre-mock backup remains available through restoreAscendMockBackup() unless manually removed from localStorage.");
    return { active: false, sessions: STATE.sessions.length, dailyLogs: STATE.dailyLogs.length };
  };

  window.restoreAscendMockBackup = function restoreAscendMockBackup() {
    const raw = localStorage.getItem(MOCK_BACKUP_KEY) || localStorage.getItem(MOCK_BACKUP_RAW_KEY);
    if (!raw) {
      console.warn("No Ascend pre-mock backup found.");
      return null;
    }
    let restored;
    try {
      restored = JSON.parse(raw);
      restored = typeof migrateState === "function" ? migrateState(restored) : restored;
    } catch (e) {
      console.error("Could not parse Ascend pre-mock backup.", e);
      return null;
    }
    STATE = restored;
    localStorage.removeItem(MOCK_ACTIVE_KEY);
    persistStateDirect(STATE);
    refreshApp(activeTabName());
    console.info("Ascend pre-mock backup restored.");
    return { active: false, sessions: STATE.sessions.length, dailyLogs: STATE.dailyLogs.length };
  };

  window.ascendMockCalculationSummary = function ascendMockCalculationSummary() {
    if (!STATE?.devMockData?.active) {
      console.warn("Ascend mock data is not active. Run loadAscendMockData() first.");
    }

    console.group("Ascend Mock Calculation Summary");
    summaryLine("Mock active", !!STATE?.devMockData?.active);
    summaryLine("Sessions", (STATE.sessions || []).length);
    summaryLine("Daily logs", (STATE.dailyLogs || []).length);
    summaryLine("Cut mode", STATE.cut?.mode);
    summaryLine("Latest weigh-in", latestWeighIn()?.weight);

    console.group("Current JTM Lead Prescriptions");
    console.table(progressionSummary());
    console.groupEnd();

    console.group("Accessory Progression Examples");
    console.table(accessoryExamples());
    console.groupEnd();

    console.group("Readiness");
    console.log(calculateReadiness(todayISO()));
    console.groupEnd();

    console.group("Weekly Volume By Muscle (7d)");
    console.table(weeklyVolumeByMuscle(7));
    console.groupEnd();

    console.group("Fatigue Summary (7d)");
    console.log(computeFatigueSummary(7));
    console.groupEnd();

    console.group("Targeted Warm-Up - Current Cut Context");
    console.table(DAY_ORDER.map(day => ({ day, ...warmupSummaryFor(day) })));
    console.groupEnd();

    console.group("Targeted Warm-Up - Scenario Checks");
    const scenarios = buildWarmupScenarios();
    console.table(scenarios.map(s => ({
      scenario: s.scenario,
      day: s.day,
      mode: s.result.mode,
      signals: (s.result.signals || []).join(", "),
      jointStress: s.result.jointStress ? JSON.stringify(s.result.jointStress) : "",
      movements: (s.result.movements || []).join(", ")
    })));
    console.groupEnd();

    console.group("Saved Warm-Up Modes In Mock Sessions");
    console.table((STATE.sessions || [])
      .filter(s => s.warmup)
      .map(s => ({ date: s.date, day: s.day, mode: s.warmup.mode, movements: (s.warmup.movements || []).map(m => m.name).join(", ") })));
    console.groupEnd();

    console.groupEnd();
    return mockCalculationSnapshot();
  };

  function isoDaysAgoLocal(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  function indexBy(list, key) {
    return Object.fromEntries((list || []).map(item => [item[key], item]));
  }

  function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  window.ascendRunCalculationAudit = function ascendRunCalculationAudit() {
    if (!window.AscendMockData?.buildMockState) {
      console.error("Ascend mock data builder is not loaded.");
      return { passed: false, failures: [{ check: "mock builder loaded", detail: "AscendMockData.buildMockState missing" }] };
    }

    const originalState = STATE;
    let auditState;
    const checks = [];

    function check(name, condition, detail) {
      checks.push({
        check: name,
        status: condition ? "PASS" : "FAIL",
        detail: condition ? "" : detail
      });
    }

    try {
      auditState = window.AscendMockData.buildMockState(typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0, 10));
      STATE = auditState;

      const snapshot = mockCalculationSnapshot();
      const leads = indexBy(snapshot.leadPrescriptions, "day");
      const accessories = indexBy(snapshot.accessoryExamples, "day");
      const scenarios = indexBy(snapshot.warmupScenarios, "scenario");
      const volumeBefore = snapshot.weeklyVolumeByMuscle;
      const fatigue = snapshot.fatigue;

      check("mock state shape", STATE.devMockData?.active && STATE.sessions.length === 26 && STATE.dailyLogs.length === 56,
        `Expected active mock with 26 sessions/56 logs, got ${STATE.sessions.length}/${STATE.dailyLogs.length}.`);
      check("all days have explicit lead lifts", DAY_ORDER.every(day => STATE.exercises[day]?.some(ex => ex.leadLift === true)),
        "Every training day must have one explicit leadLift.");
      check("today readiness exists", !!getDailyLog(todayISO()) && snapshot.readiness.score === 1 && snapshot.readiness.adjustment === -0.1,
        `Expected readiness score 1 and -10% adjustment, got ${snapshot.readiness.score}/${snapshot.readiness.adjustment}.`);
      check("rapid weight drop detected", (snapshot.readiness.factors || []).some(f => /Rapid weight drop/.test(f)),
        "Readiness should flag rapid weight drop.");

      check("PUSH JTM accumulation", leads.PUSH?.nextWave?.includes("ACCUMULATION") && leads.PUSH.prescription === "BEAT 85kg x 10",
        `Unexpected PUSH lead prescription: ${JSON.stringify(leads.PUSH)}.`);
      check("PULL JTM realization", leads.PULL?.nextWave?.includes("REALIZATION") && leads.PULL.prescription === "REALIZE 95kg x 5",
        `Unexpected PULL lead prescription: ${JSON.stringify(leads.PULL)}.`);
      check("ARMS JTM deload", leads.ARMS?.nextWave?.includes("DELOAD") && leads.ARMS.prescription === "DELOAD_WAVE 65kg x 5",
        `Unexpected ARMS lead prescription: ${JSON.stringify(leads.ARMS)}.`);
      check("LEGS JTM intensification", leads.LEGS?.nextWave?.includes("INTENSIFICATION") && leads.LEGS.prescription === "BEAT 147.5kg x 8",
        `Unexpected LEGS lead prescription: ${JSON.stringify(leads.LEGS)}.`);

      check("cutting/high-RPE accessory hold", accessories.PUSH?.verdict === "HOLD" && accessories.PUSH.confidence <= 0.45,
        `PUSH accessory should hold under cut + high RPE + poor readiness: ${JSON.stringify(accessories.PUSH)}.`);
      check("repeated missed reps deload", accessories.PULL?.verdict === "DELOAD",
        `PULL missed reps should deload: ${JSON.stringify(accessories.PULL)}.`);
      check("skipped set holds safely", accessories.ARMS?.verdict === "HOLD" && /incomplete|skipped/i.test(accessories.ARMS.note || ""),
        `Skipped set should hold with safety note: ${JSON.stringify(accessories.ARMS)}.`);
      check("lower accessory deloads after misses", accessories.LEGS?.verdict === "DELOAD",
        `LEGS missed RDL branch should deload: ${JSON.stringify(accessories.LEGS)}.`);

      check("weekly muscle volume populated", ["chest", "back", "biceps", "quads"].every(m => volumeBefore[m] > 0),
        `Expected chest/back/biceps/quads volume, got ${JSON.stringify(volumeBefore)}.`);
      check("fatigue summary populated", fatigue.recoveryCost > 100 && fatigue.elbowStress > 20,
        `Expected high mock fatigue and elbow stress, got ${JSON.stringify(fatigue)}.`);

      const volumeWithoutWarmups = withTemporaryState(s => {
        s.sessions = s.sessions.map(sess => ({ ...sess, warmup: null }));
      }, () => weeklyVolumeByMuscle(7));
      check("warm-up data excluded from volume", sameJson(volumeBefore, volumeWithoutWarmups),
        "Removing saved warm-up objects should not change weekly muscle volume.");

      check("standard warm-up scenario", scenarios["standard mode candidate"]?.mode === "standard",
        `Expected standard mode, got ${JSON.stringify(scenarios["standard mode candidate"])}.`);
      check("minimal warm-up scenario", scenarios["minimal mode candidate"]?.mode === "minimal",
        `Expected minimal mode, got ${JSON.stringify(scenarios["minimal mode candidate"])}.`);
      check("complete warm-up scenario", scenarios["complete mode candidate"]?.mode === "complete",
        `Expected complete mode, got ${JSON.stringify(scenarios["complete mode candidate"])}.`);
      check("joint-stress-sensitive warm-up selection",
        scenarios["joint-stress-sensitive selection"]?.jointStress?.elbow === true &&
        !(scenarios["joint-stress-sensitive selection"]?.movements || []).includes("Triceps Pressdown"),
        `Expected elbow stress to avoid triceps pressdown, got ${JSON.stringify(scenarios["joint-stress-sensitive selection"])}.`);

      const failures = checks.filter(row => row.status === "FAIL");
      console.group(`Ascend Calculation Audit - ${failures.length ? "FAIL" : "PASS"}`);
      console.table(checks);
      console.groupEnd();
      return {
        passed: failures.length === 0,
        passedCount: checks.length - failures.length,
        failedCount: failures.length,
        checks,
        failures,
        snapshot
      };
    } catch (e) {
      console.error("Ascend calculation audit failed unexpectedly.", e);
      return { passed: false, failedCount: 1, failures: [{ check: "unexpected exception", detail: e.message || String(e) }] };
    } finally {
      STATE = originalState;
    }
  };

  window.ascendDevMockStatus = function ascendDevMockStatus() {
    const backupMetaRaw = localStorage.getItem(MOCK_BACKUP_META_KEY);
    return {
      devToolsEnabled: true,
      mockActive: localStorage.getItem(MOCK_ACTIVE_KEY) === "1" || !!STATE?.devMockData?.active,
      backup: backupMetaRaw ? JSON.parse(backupMetaRaw) : null,
      commands: ["loadAscendMockData()", "clearAscendMockData()", "restoreAscendMockBackup()", "ascendMockCalculationSummary()", "ascendRunCalculationAudit()"]
    };
  };

  document.addEventListener("DOMContentLoaded", renderMockBadge);
  renderMockBadge();
  console.info("Ascend dev mock commands available: loadAscendMockData(), clearAscendMockData(), ascendMockCalculationSummary(), ascendRunCalculationAudit().");
})();
