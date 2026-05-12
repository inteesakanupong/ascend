# Ascend Program Calibration v1 — Implementation Spec

## Purpose

This document defines the next implementation cycle for Ascend. The goal is to consolidate setup, exercise calibration, diet calibration, body composition, readiness foundations, and deterministic lifter analysis into one coherent coaching system.

Ascend should evolve from a collection of adaptive features into a self-calibrating hypertrophy and diet coaching system.

## Product Direction

Ascend should remain:

- local-first
- deterministic
- explainable
- mobile-first
- lightweight
- training-and-nutrition focused

Do not turn the app into a chatbot-first AI trainer. The core coaching decisions should come from deterministic logic, trend analysis, and user-entered athlete data.

## Current Architecture Constraint

Ascend is currently a single-file PWA-style application centered on `index.html`. Implement changes incrementally and avoid destructive rewrites.

Prioritize:

- small helper functions
- backward-compatible state migrations
- clear localStorage persistence
- UI additions that fit the existing visual system
- explainable adaptive decisions

Avoid:

- large framework migration
- backend dependency
- mandatory Health Connect dependency
- destructive state replacement
- opaque recommendation logic

---

# 1. Unified Program Calibration

## Goal

Combine the current rerun setup, exercise setup, and diet setup into a single unified calibration flow.

Suggested UI label:

- Program Calibration
- Athlete Calibration
- Recalibrate Program

## Proposed Flow

Settings → Program Calibration

Sections:

1. Body & Goal
2. Diet Targets
3. Strength Baseline
4. Exercise Preferences
5. Recovery Profile
6. Review & Apply

## Why

Training, diet, MRV, exercise swaps, recovery, and bodyweight trend should not be treated as separate systems. Diet affects recovery. Recovery affects MRV. MRV affects volume and exercise swaps. Exercise selection affects fatigue. Fatigue affects training performance and diet interpretation.

The calibration flow should become the source of truth for coaching assumptions.

## Required State Objects

Create or normalize these objects:

```js
athleteProfile = {
  bodyweightKg: null,
  bodyFatPercent: null,
  leanMassKg: null,
  goal: "cut", // cut | maintain | lean_gain | hypertrophy
  trainingExperience: "unknown", // novice | intermediate | advanced | unknown
  recoveryProfile: "unknown", // low | moderate | high | unknown
  benchmarkLifts: {
    benchPress: null,
    squat: null,
    bentOverRow: null,
    deadlift: null,
    overheadPress: null,
    barbellCurl: null
  }
}
```

```js
dietProfile = {
  calorieTarget: null,
  proteinTarget: null,
  carbTarget: null,
  fatTarget: null,
  weeklyWeightChangeTarget: null,
  source: "ascend"
}
```

```js
healthSignals = {
  source: "manual",
  date: null,
  sleepHours: null,
  sleepScore: null,
  restingHR: null,
  steps: null,
  activeCalories: null,
  bodyweightKg: null,
  bodyFatPercent: null,
  leanMassKg: null
}
```

```js
lifterAnalysis = {
  strengthBalance: {},
  bodyTrend: {},
  dietOutcome: {},
  fatigueRisks: [],
  progressionDrivers: [],
  recommendations: []
}
```

## State Migration Requirement

Existing user data must not be deleted. If existing state lacks these fields, initialize them with defaults.

Example:

```js
function normalizeAthleteProfile(state) {
  state.athleteProfile = {
    ...defaultAthleteProfile(),
    ...(state.athleteProfile || {})
  };
  return state;
}
```

---

# 2. Six Benchmark Lift Calibration

## Required Inputs

Add six benchmark lift fields:

- Bench Press
- Squat
- Bent-Over Row
- Deadlift
- Overhead Press
- Barbell Curl

Each should support:

- weight
- reps or estimated max basis if already supported
- unit consistency with current app settings

## Purpose

These lifts should help estimate:

- training experience
- relative strength profile
- push/pull balance
- upper/lower balance
- hinge fatigue exposure
- initial MRV modifiers
- initial progression aggressiveness
- appropriate exercise difficulty

## Important Guardrail

Do not let benchmark strength fully determine MRV.

MRV should be estimated from multiple factors:

```js
mrvEstimate =
  baseMuscleMRV
  + trainingAgeModifier
  + strengthLevelModifier
  + recoveryModifier
  + calorieStatusModifier
  + bodyFatModifier
  - jointStressPenalty
  - recentFatiguePenalty;
```

Benchmark lifts should mainly inform `strengthLevelModifier`, not override recovery, diet, pain, and recent fatigue.

## Suggested Strength Profile Output

```js
strengthProfile = {
  pressing: "intermediate",
  squatting: "novice_intermediate",
  hinge: "intermediate_high_fatigue",
  pulling: "intermediate",
  verticalPress: "novice",
  armIsolation: "moderate"
};
```

---

# 3. Exercise Weight Calculation Audit

## Goal

Review and harden exercise load progression logic.

## Audit Checklist

Check whether the app correctly handles:

- estimated 1RM vs previous working weight
- planned reps vs completed reps
- RPE values
- missing history
- unit conversion kg/lb
- compound vs isolation progression differences
- unrealistic jumps for small exercises
- regression after one bad session
- excessive progression after one good session

## Recommended Logic

Compounds should progress more conservatively from performance trend.

```js
if (exerciseType === "compound") {
  loadJump = conservativeProgressionFromPerformanceTrend();
}
```

Isolations should prioritize rep progression before load jumps.

```js
if (exerciseType === "isolation") {
  prioritizeRepProgressionBeforeLoadJump();
}
```

## Guardrails

Do not increase load if:

- RPE is too high
- reps missed target
- joint pain increased
- readiness is poor
- previous increase failed

Do not reduce load aggressively after one bad session unless pain or repeated performance decline is present.

---

# 4. Diet Logic Audit

## Goal

Make diet logic more reliable, trend-based, and body-composition aware.

## Audit Checklist

Check whether diet calculations:

- use weekly weight trend instead of daily noise
- include calorie floors
- include protein floors
- include fat floors
- avoid aggressive macro cuts
- account for body fat percentage
- distinguish cut, maintenance, and lean gain
- factor in performance decline
- factor in rapid weight loss
- use adherence before adjusting targets

## Recommended Rule

Do not change calories from one weigh-in.

```js
if (weightTrendTooFast && performanceDeclining) {
  reduceDeficitAggressiveness();
  warnUser();
}
```

Use rolling averages:

```js
weightTrend = rollingAverage(weightEntries, 7);
bodyFatTrend = rollingAverage(bodyFatEntries, 14);
```

## Calorie/Macro Guardrails

Add or verify:

- minimum calorie floor
- minimum protein floor
- minimum fat floor
- maximum weekly calorie reduction
- confirmation prompt for aggressive changes

---

# 5. Body Fat Percentage Support

## Required UI Locations

Add body fat percentage input to:

1. Program Calibration / Settings
2. Weigh Page / Body Log

## Purpose

Body fat percentage should support:

- lean mass estimate
- fat mass estimate
- protein target refinement
- diet phase suitability
- recomposition tracking
- physique trend analysis

## Calculation

```js
leanBodyMassKg = bodyweightKg * (1 - bodyFatPercent / 100);
fatMassKg = bodyweightKg * (bodyFatPercent / 100);
```

## Guardrail

Body fat from consumer scales should be treated as trend data, not exact daily truth.

Do not make major diet or training decisions from a single body fat entry.

Use rolling trend interpretation:

```js
bodyFatTrend = rollingAverage(bodyFatEntries, 14);
```

## Diet Interpretation Rules

```js
if (bodyFatHigh && goal === "hypertrophy") {
  suggestRecompOrSlowCut();
}

if (bodyFatLow && recoveryPoor && goal === "cut") {
  warnRecoveryRisk();
}

if (bodyFatModerate && performanceImproving) {
  allowLeanGainOrMaintenance();
}
```

---

# 6. Health Connect Foundation

## Goal

Prepare the architecture for Health Connect without making Health Connect required now.

## Immediate Implementation

Create normalized `healthSignals` data structure with `source: "manual"`.

```js
healthSignals = {
  source: "manual",
  date: null,
  sleepHours: null,
  sleepScore: null,
  restingHR: null,
  steps: null,
  activeCalories: null,
  bodyweightKg: null,
  bodyFatPercent: null,
  leanMassKg: null
};
```

Future source values:

```js
source: "health_connect"
source: "arboleaf_via_health_connect"
source: "manual"
```

## Principle

Ascend should not care whether weight/body composition came from manual entry, Arboleaf, Health Connect, or future import. It should only consume normalized data.

## Nutrition Ownership

Ascend remains source of truth for:

- calories
- macros
- meals
- training logs
- MRV logic
- adaptive recommendations

Health Connect should supply:

- weight
- body composition if available
- sleep
- steps
- resting HR
- activity load

Do not make Health Connect the calorie authority.

---

# 7. Weight & Stats Page Improvements

## Goal

Add deterministic lifter analysis without AI.

The page should answer:

- What is happening to my body?
- What is happening to my performance?
- Is my diet supporting my training?
- Is fatigue accumulating?
- Am I cutting, maintaining, gaining, recomping, or stalling?

## Recommended Sections

### Body Trend

Show:

- current weight
- 7-day average
- 28-day trend
- body fat trend
- estimated lean mass
- estimated fat mass

Example:

```txt
Weight: 96.8 kg
7-day trend: -0.4 kg/week
Body fat trend: -0.3%
Lean mass estimate: stable
```

### Diet Outcome

Show:

- calorie average
- protein average
- adherence score
- target vs actual rate of change
- deterministic recommendation

Example:

```txt
Calories are producing a moderate cut. Performance is stable. Maintain target.
```

### Lifter Profile

Based on benchmark lifts:

```txt
Pressing strength: intermediate
Pulling strength: novice-intermediate
Lower body strength: intermediate
Hinge strength: high fatigue cost
Arm isolation strength: moderate
```

### Training Response

Show:

- best progressing lifts
- stalled lifts
- high-fatigue exercises
- poor-completion exercises
- muscles near MRV
- muscles below MEV

Example:

```txt
Best response: Incline DB Press
Fatigue risk: Deadlift and Bent-Over Row in same week
Understimulated: Hamstrings
Near MRV: Triceps
```

### Coaching Verdict

A short deterministic summary:

```txt
You are cutting at a sustainable rate while maintaining most performance. Upper pushing volume is near recovery limit. Keep calories stable and reduce direct triceps volume this week.
```

---

# 8. UI Audit Targets

## Main UI Risks

The visual identity is strong. The primary risk is cognitive load.

Audit whether:

- users know what to do today
- Program Review is clearly separated from Start Lift
- adaptive changes are explained before applying
- exercise swaps and set changes are visually distinct
- users can dismiss or undo recommendations
- diet settings and weigh-in settings are connected
- body fat percentage appears where users expect it
- the Weight/Stats page is actionable instead of decorative
- dangerous changes require confirmation

## Recommended Adaptive Change UI

Each adaptive recommendation should show:

```txt
Recommended Change
Reason
Expected Benefit
Risk
Apply / Dismiss
```

Example:

```txt
Reduce triceps isolation by 2 sets

Reason:
Triceps volume is high from pressing overlap and elbow irritation is elevated.

Expected benefit:
Lower elbow stress while preserving chest pressing.

Risk:
Direct triceps volume may temporarily drop below specialization range.
```

---

# 9. Implementation Order

Implement in this order:

1. Create/normalize `athleteProfile`, `dietProfile`, `healthSignals`, and `lifterAnalysis` objects.
2. Add Program Calibration UI entry point in Settings.
3. Add body fat percentage to Program Calibration and Weigh/Body Log.
4. Add six benchmark lift inputs.
5. Add lean mass and fat mass calculations.
6. Add bodyweight/body fat rolling trend helpers.
7. Audit diet calculations and add safety floors.
8. Audit exercise load progression logic.
9. Improve Weight/Stats page with deterministic lifter analysis.
10. Add Health Connect-ready source field and normalized manual health signals.
11. Add explanation blocks for adaptive set changes and exercise swaps.
12. Test state migration from existing saved data.

---

# 10. Definition of Done

This update is complete when Ascend can:

- run one unified Program Calibration flow
- store body fat percentage in settings and weigh entries
- estimate lean mass and fat mass from bodyweight/body fat
- use six benchmark lifts to classify training profile
- use benchmark lifts as modifiers, not absolute MRV determinants
- avoid destructive localStorage migration
- compute bodyweight and body fat trends from rolling averages
- apply safer diet adjustment rules
- avoid excessive load progression jumps
- expose a `healthSignals` object ready for future Health Connect integration
- show deterministic lifter analysis on the Weight/Stats page
- explain adaptive set and swap recommendations before applying changes

---

# 11. Non-Goals

Do not implement full native Health Connect integration in this cycle.

Do not add backend requirements.

Do not treat Arboleaf/body fat scale readings as exact daily truth.

Do not use AI-generated training decisions.

Do not make aggressive calorie changes from one weigh-in.

Do not increase MRV only because strength is high.

Do not silently change a user program without explanation.
