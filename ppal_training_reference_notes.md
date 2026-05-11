# PPAL Training Reference Database — Research Notes

This document accompanies `ppal_training_reference_database.json`.

## Scope

The database compiles structured lessons from:

- JuggernautAI official app/website claims
- Reddit field reports from JuggernautAI users
- Reddit field reports from Juggernaut Method 2.0 users
- Renaissance Periodization / RP Diet Coach official materials
- Reddit RP Diet Coach user discussions
- Volume landmark summaries

## Evidence Quality Warning

This database intentionally separates evidence types.

Reddit posts are treated as **field reports**, not scientific proof. Official app listings are treated as **feature claims**, not guaranteed outcomes. Secondary programming summaries are treated as **technical references**, not original source material.

## Key Product Lessons For PPAL

### 1. Multi-horizon adaptation matters

JuggernautAI’s strongest product pattern is not “AI language.” It is adaptive logic across multiple time horizons:

- set-to-set
- day-to-day
- week-to-week
- block-to-block
- program-to-program

PPAL should copy this structural idea.

### 2. Subjective feedback needs guardrails

Community reports suggest that repeated easy ratings can drive volume too high. PPAL should use subjective feedback only when supported by objective data.

Recommended rule:

```js
canIncreaseVolume =
  easyFeedback &&
  performanceStableOrImproving &&
  readinessNotPoor &&
  jointPainNotElevated
```

### 3. Accessory work is the first reduction lever

When readiness is poor, reduce accessory work before destroying the structure of the primary workout.

### 4. MRV is not a target

MRV should act as a ceiling warning. Productive hypertrophy work should usually live around personalized MAV.

### 5. Nutrition should adapt from weekly trend

RP Diet Coach’s useful pattern is weekly calorie/macro review based on weigh-ins and progress. PPAL should use rolling bodyweight averages, not single-day noise.

### 6. Macro reductions need safety floors

Anecdotal RP Diet issue reports show why apps need guardrails against extreme calorie or carb drops.

### 7. User override should be allowed

Good coaching software should recommend clearly, but the athlete should retain control. Overrides should be logged and used to calibrate future recommendations.

## Recommended PPAL Use

Use the JSON file to seed:

- coach memory rules
- MRV set autoregulation
- nutrition review logic
- adaptive decision explanations
- deload probability logic
- exercise swap guardrails
- readiness check-in logic

## Do Not Use This For

- medical advice
- guaranteed prediction of results
- direct copying of JuggernautAI or RP proprietary systems
- replacing formal evidence review
