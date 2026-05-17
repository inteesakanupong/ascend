// Set type classification and load-drop detection

function classifySet(s1w, s1r, s2w, s2r, ex) {
  if (!s1w || s1w === 0) {
    // Could be bodyweight or missing
    const isBW = ex && (ex.equipment === "bodyweight" || ex.name.toLowerCase().includes("bodyweight") ||
                        ex.name.toLowerCase().includes("pullup") || ex.name.toLowerCase().includes("push-up") ||
                        ex.name.toLowerCase().includes("dip"));
    return isBW ? "bodyweight" : "working";
  }
  // Large drop between set 1 and set 2 = likely load-finding
  if (s2w != null && s1w > 0 && s2w > 0) {
    const dropPct = (s1w - s2w) / s1w;
    if (dropPct > 0.25) return "load_finding"; // >25% drop = load-finding, not double progression
  }
  // Reps well below minimum = either warm-up or failed
  if (s1r != null && ex && ex.repMin && s1r < Math.max(1, ex.repMin - 3)) {
    return s1r <= 3 ? "warmup" : "failed";
  }
  return "working";
}

function detectLoadDrop(sets, exIdx, ex) {
  const s = sets && sets[exIdx];
  if (!s) return null;
  const s1w = s.s1w || 0;
  const s2w = s.s2w;
  if (!s1w || !s2w || s2w >= s1w) return null;
  const dropPct = (s1w - s2w) / s1w;
  if (dropPct >= 0.20) { // 20%+ drop is suspicious
    return {
      s1w, s2w,
      dropPct: Math.round(dropPct * 100),
      message: "Large load drop detected between sets (" + s1w + "kg → " + s2w + "kg, -" + Math.round(dropPct*100) + "%). Was " + s1w + "kg too heavy?",
      setType: "load_finding"
    };
  }
  return null;
}
