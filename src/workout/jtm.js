// Juggernaut Method wave logic and training max management

function juggernautWave(dayNum, day) {
  // Session-based: each group of ~4 sessions of the same day = one full cycle
  // Week 1 = sessions 1-4, Week 2 = sessions 5-8 etc... but per day type.
  // Better: count completed sessions for this day to determine wave week.
  let weekNum;
  if (day && STATE.sessions) {
    const completedForDay = trainingSessionsForDay(day).length;
    // Next session number determines the wave position
    const nextSessionNum = completedForDay + 1;
    weekNum = Math.ceil(nextSessionNum / 1); // each session is in a week
    // Use session number directly: session 1-4 = weeks 1-4 of cycle 1
    // session 5-8 = weeks 1-4 of cycle 2, etc.
    weekNum = nextSessionNum;
  } else {
    weekNum = Math.max(1, Math.ceil(dayNum / 7));
  }
  const waveWeek = ((weekNum - 1) % 4) + 1; // 1, 2, 3, 4, 1, 2, 3, 4...
  const cycleNum  = Math.floor((weekNum - 1) / 4) + 1;
  return { ...JUG_WAVES[waveWeek - 1], waveWeek, weekNum, cycleNum };
}

function juggernautWaveForSession(session) {
  if (!session?.day) return juggernautWave(1, null);
  const sessions = sortSessionsChronological(trainingSessionsForDay(session.day));
  let sessionNum = sessions.findIndex(s => s.id === session.id) + 1;
  if (sessionNum <= 0) sessionNum = sessions.length || 1;
  const waveWeek = ((sessionNum - 1) % 4) + 1;
  const cycleNum = Math.floor((sessionNum - 1) / 4) + 1;
  return { ...JUG_WAVES[waveWeek - 1], waveWeek, weekNum: sessionNum, cycleNum };
}

function getWorkingMax(day, exIdx) {
  const key = `wm_${day}_${exIdx}`;
  return STATE.profile[key] ?? null;
}

function setWorkingMax(day, exIdx, value) {
  const key = `wm_${day}_${exIdx}`;
  STATE.profile[key] = value;
}
