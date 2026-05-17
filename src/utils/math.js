// Math / rounding utilities

function roundVolume(n) {
  return Math.round((n || 0) * 10) / 10;
}

function normalizeExerciseName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function roundToIncrement(weight, ex) {
  if (weight == null || isNaN(weight)) return weight ?? 0;
  const inc = incrementFor(ex);
  return Math.round(weight / inc) * inc;
}
