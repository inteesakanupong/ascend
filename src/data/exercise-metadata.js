// Rich exercise metadata: muscles, joint stress, cues, substitutions
const EXERCISE_METADATA = {
  // ── CHEST ──────────────────────────────────────────────────────────────
  "Smith Incline Bench Press": {
    primaryMuscle: "chest", secondaryMuscles: ["shoulders","triceps"],
    movementPattern: "horizontal_push", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Barbell Incline Bench Press","Dumbbell Incline Bench Press","Machine Incline Press"],
    cues: ["Retract scapula","Slight arch","Drive bar in arc toward chin","Full ROM — touch chest"]
  },
  "Dumbbell Incline Bench Press": {
    primaryMuscle: "chest", secondaryMuscles: ["shoulders","triceps"],
    movementPattern: "horizontal_push", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "high",
    substitutions: ["Smith Incline Bench Press","Machine Incline Press","Barbell Incline Bench Press"],
    cues: ["Neutral-to-prone grip","Full stretch at bottom","Don't flare elbows excessively"]
  },
  "Dumbbell Fly": {
    primaryMuscle: "chest", secondaryMuscles: [],
    movementPattern: "chest_fly", exerciseClass: "isolation",
    jointStress: "moderate", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [12,20],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Cable Fly","Cable Low Fly","Machine Fly"],
    cues: ["Slight elbow bend maintained","Lead with elbows","Stretch at bottom — don't overextend shoulder"]
  },
  "Cable Fly": {
    primaryMuscle: "chest", secondaryMuscles: [],
    movementPattern: "chest_fly", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [12,20],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Dumbbell Fly","Cable Low Fly","Machine Fly"],
    cues: ["Constant tension throughout","Slight forward lean","Squeeze at peak contraction"]
  },
  // ── SHOULDERS ──────────────────────────────────────────────────────────
  "DB Lateral Raise": {
    primaryMuscle: "shoulders", secondaryMuscles: ["upper_traps"],
    movementPattern: "shoulder_abduction", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [15,25],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Cable Lateral Raise (1-arm)","Machine Lateral Raise","Lean-Away Cable Lateral Raise"],
    cues: ["Lead with elbows","Avoid shrugging","Slight forward lean","Control the eccentric","Thumb slightly down"]
  },
  "Cable Lateral Raise (1-arm)": {
    primaryMuscle: "shoulders", secondaryMuscles: [],
    movementPattern: "shoulder_abduction", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [15,25],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["DB Lateral Raise","Machine Lateral Raise","DB Lateral Raise"],
    cues: ["Constant tension from cable","Lead with elbow","Slight forward lean"]
  },
  "Face Pull (cable)": {
    primaryMuscle: "shoulders", secondaryMuscles: ["upper_traps","rear_delts"],
    movementPattern: "shoulder_external_rotation", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [15,25],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Cable Rear Delt Fly","DB Rear Delt Fly","Band Pull Apart"],
    cues: ["Pull to forehead level","External rotate at top","Elbows high throughout"]
  },
  "Smith Seated OHP": {
    primaryMuscle: "shoulders", secondaryMuscles: ["triceps","upper_traps"],
    movementPattern: "vertical_push", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Dumbbell Shoulder Press","Machine Shoulder Press","Barbell Overhead Press"],
    cues: ["Bar path straight up","Core braced","Don't hyperextend lumbar"]
  },
  // ── BACK ───────────────────────────────────────────────────────────────
  "Cable Row": {
    primaryMuscle: "back", secondaryMuscles: ["biceps","rear_delts"],
    movementPattern: "horizontal_pull", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Machine Row","DB Row","Barbell Row"],
    cues: ["Retract scapula at finish","Don't lean back excessively","Pull to lower chest/upper abs"]
  },
  "Lat Pulldown (pronated)": {
    primaryMuscle: "back", secondaryMuscles: ["biceps"],
    movementPattern: "vertical_pull", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Lat Pulldown (neutral)","Assisted Pull-Up","Cable Pulldown"],
    cues: ["Slight lean back","Pull to upper chest","Depress and retract scapula first","Full arm extension at top"]
  },
  // ── BICEPS ─────────────────────────────────────────────────────────────
  "Cable Curl": {
    primaryMuscle: "biceps", secondaryMuscles: ["forearms"],
    movementPattern: "elbow_flexion", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,20],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["DB Curl","Incline DB Curl","EZ Bar Curl"],
    cues: ["Full extension at bottom","Squeeze at top","Don't swing"]
  },
  "Incline DB Curl": {
    primaryMuscle: "biceps", secondaryMuscles: [],
    movementPattern: "elbow_flexion", exerciseClass: "isolation",
    jointStress: "moderate", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,18],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Cable Curl","DB Curl","Bayesian Cable Curls"],
    cues: ["Long head stretch emphasized","Don't let shoulders elevate","Supinate at top","Slow eccentric"]
  },
  // ── TRICEPS ────────────────────────────────────────────────────────────
  "Cable OH Tricep Extension": {
    primaryMuscle: "triceps", secondaryMuscles: [],
    movementPattern: "elbow_extension", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,20],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["DB Overhead Tricep Extension","Rope OH Extension","Cross-body Cable Extension"],
    cues: ["Long head stretch at bottom","Keep elbows stationary","Full lockout"]
  },
  "Tricep Pushdown (rope)": {
    primaryMuscle: "triceps", secondaryMuscles: [],
    movementPattern: "elbow_extension", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [12,20],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Triceps Pushdown (Straight bar)","Cable OH Tricep Extension","Machine Dip"],
    cues: ["Elbows tight to sides","Spread rope at bottom","Full extension"]
  },
  "JM Smith Press": {
    primaryMuscle: "triceps", secondaryMuscles: ["chest"],
    movementPattern: "elbow_extension", exerciseClass: "compound",
    jointStress: "high", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Cable OH Tricep Extension","Tricep Pushdown (rope)","Cross-body Cable Extension","Machine Dip"],
    cues: ["Bar path toward chin","Elbows tracking forward","Don't let wrists collapse","Reduce load if elbow pain"]
  },
  // ── LEGS ───────────────────────────────────────────────────────────────
  "Hatfield Squat": {
    primaryMuscle: "quads", secondaryMuscles: ["glutes","hamstrings"],
    movementPattern: "squat", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Leg Press","Hack Squat","Front Squat"],
    cues: ["Upright torso","Knees track toes","Depth to parallel or below","Brace core"]
  },
  "Romanian Deadlift": {
    primaryMuscle: "hamstrings", secondaryMuscles: ["glutes","lower_back"],
    movementPattern: "hip_hinge", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Leg Curl","Single-leg RDL","Good Morning"],
    cues: ["Hinge at hips","Bar close to legs","Feel hamstring stretch","Neutral spine throughout","Soft knee bend"]
  },
  "Bulgarian Split Squat": {
    primaryMuscle: "quads", secondaryMuscles: ["glutes","hamstrings"],
    movementPattern: "lunge", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Single-leg Leg Press","Hack Squat","Leg Press","Split Squat Machine"],
    cues: ["Front foot forward enough","Torso upright or slight lean","Don't let knee cave","Slow eccentric"]
  },
  "Hip Thrust (Smith)": {
    primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"],
    movementPattern: "hip_extension", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [8,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Barbell Hip Thrust","Cable Pull-Through","Glute Bridge"],
    cues: ["Chin tucked","Ribs down","Full hip extension at top","Squeeze glutes","Feet flat"]
  },
  "Leg Press": {
    primaryMuscle: "quads", secondaryMuscles: ["glutes","hamstrings"],
    movementPattern: "squat", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [8,20],
    techniqueSensitivity: "low", loadJumpSensitivity: "low",
    substitutions: ["Hack Squat","Hatfield Squat","Machine Squat"],
    cues: ["Full ROM — don't cut short","Don't lock out knees completely","Feet position changes emphasis"]
  },
  "Leg Extension": {
    primaryMuscle: "quads", secondaryMuscles: [],
    movementPattern: "knee_extension", exerciseClass: "isolation",
    jointStress: "moderate", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [12,20],
    techniqueSensitivity: "low", loadJumpSensitivity: "moderate",
    substitutions: ["Leg Press","Sissy Squat"],
    cues: ["Full extension at top","Control the descent","Pause at top"]
  },
  "Leg Curl": {
    primaryMuscle: "hamstrings", secondaryMuscles: [],
    movementPattern: "knee_flexion", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,20],
    techniqueSensitivity: "low", loadJumpSensitivity: "moderate",
    substitutions: ["Romanian Deadlift","Glute Ham Raise","Nordic Curl"],
    cues: ["Full ROM","Don't let hips lift","Squeeze at top","Slow eccentric"]
  },
  // ── ALEX LEONIDAS / UNCONVENTIONAL EXERCISES ──────────────────────────
  // Source: Alex Leonidas (Alpha Destiny) YouTube, alexleonidas.com
  // These exercises are central to his Naturally Enhanced philosophy:
  // yoke development, stretch-mediated hypertrophy, unconventional overload.

  "AD Press": {
    // The Alpha Destiny Press — seated OHP at 70-80° back angle.
    // Alex credits this for breaking through intermediate plateaus.
    // The layback lets elbows get behind torso at bottom, maximising
    // anterior delt stretch and upper chest involvement.
    primaryMuscle: "shoulders", secondaryMuscles: ["chest","triceps"],
    movementPattern: "vertical_push", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Smith Seated OHP","Dumbbell Shoulder Press","Barbell Overhead Press"],
    cues: [
      "Set pad to 70-80° — NOT fully upright",
      "Let elbows drift behind torso at bottom for anterior delt stretch",
      "Drive bar straight up — don't push it forward",
      "Core braced — the back support is for stability, not to sag into",
      "Full lockout at top"
    ]
  },

  "Sissy Squat": {
    // Alex advocates this as a pure quad isolator superior to leg extension
    // for sweep development. High technique sensitivity — knees must be healthy.
    primaryMuscle: "quads", secondaryMuscles: [],
    movementPattern: "knee_extension", exerciseClass: "isolation",
    jointStress: "high", fatigueCost: "moderate",
    progressionType: "rep_first", bestRepRange: [8,20],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Leg Extension","Leg Press","Hack Squat"],
    cues: [
      "Hold something for balance — this is a knee-dominant movement",
      "Lean back as you descend — do NOT maintain an upright torso",
      "Full knee flexion — feel the quad stretch at the bottom",
      "Don't do these with knee pain — substitute leg extension instead",
      "Bodyweight first, then add load via plate or vest"
    ]
  },

  "Good Morning": {
    // Alex's favourite hip hinge — he prefers it over RDL for hamstring/erector
    // development, citing smoother recovery and bigger posterior chain gains.
    // He reported glutes, hamstrings, and spinal erectors all grew faster than with RDL.
    primaryMuscle: "hamstrings", secondaryMuscles: ["glutes","lower_back"],
    movementPattern: "hip_hinge", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [6,10],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Romanian Deadlift","Stiff-Leg Deadlift","Cable Pull-Through"],
    cues: [
      "Bar high on traps — not low-bar squat position",
      "Soft knee bend — this is a hip hinge not a squat",
      "Push hips BACK — feel the hamstring stretch at the bottom",
      "Neutral spine throughout — don't round",
      "Alex: start light and go high rep (6-10) — treat it as a hypertrophy movement"
    ]
  },


  // ── END ALEX LEONIDAS EXERCISES ─────────────────────────────────────────
  // ── ALEX LEONIDAS SIGNATURE EXERCISES ────────────────────────────────────
  // Source: Alex Leonidas (Alpha Destiny) YouTube + alexleonidas.com
  // Yoke training, unconventional overload, stretch-mediated hypertrophy.

  "AD Press": {
    primaryMuscle: "shoulders", secondaryMuscles: ["chest","triceps"],
    movementPattern: "vertical_push", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Smith Seated OHP","Dumbbell Shoulder Press","Barbell Overhead Press"],
    cues: ["Set pad to 70-80 degrees not fully upright","Let elbows drift behind torso at bottom for anterior delt stretch","Drive bar straight up","Core braced","Full lockout at top"]
  },
  "Sissy Squat": {
    primaryMuscle: "quads", secondaryMuscles: [],
    movementPattern: "knee_extension", exerciseClass: "isolation",
    jointStress: "high", fatigueCost: "moderate",
    progressionType: "rep_first", bestRepRange: [8,20],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Leg Extension","Leg Press","Hack Squat"],
    cues: ["Hold something for balance","Lean back as you descend","Full knee flexion for quad stretch","Don't use with knee pain","Bodyweight first then add load"]
  },
  "Good Morning": {
    primaryMuscle: "hamstrings", secondaryMuscles: ["glutes","lower_back"],
    movementPattern: "hip_hinge", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [6,10],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Romanian Deadlift","Stiff-Leg Deadlift","Cable Pull-Through"],
    cues: ["Bar high on traps","Soft knee bend - hip hinge not a squat","Push hips back for hamstring stretch","Neutral spine throughout","Alex prefers 6-10 reps as a hypertrophy movement"]
  },
  "Chest Expander Pull-Apart": {
    primaryMuscle: "shoulders", secondaryMuscles: ["upper_traps","rear_delts"],
    movementPattern: "shoulder_horizontal_abduction", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [5,15],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "high",
    substitutions: ["Face Pull (cable)","Cable Rear Delt Fly","Band Pull-Apart"],
    cues: ["Spring-based chest expander preferred over band","Full extension on every rep","Overhand and underhand grip variations for full yoke coverage","Alex: beat face pulls for rear delt and trap density"]
  },
  "Dual Rope Pushdown": {
    primaryMuscle: "triceps", secondaryMuscles: [],
    movementPattern: "elbow_extension", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,20],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Tricep Pushdown (rope)","Cable OH Tricep Extension","Triceps Pushdown (Straight bar)"],
    cues: ["Two separate ropes not one","Arms extend back behind hips at bottom - hits long head","Elbows stay close to body","Elbow-friendly and great warmup before extensions"]
  },
  "Seated Leg Curl": {
    primaryMuscle: "hamstrings", secondaryMuscles: [],
    movementPattern: "knee_flexion", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [8,20],
    techniqueSensitivity: "low", loadJumpSensitivity: "moderate",
    substitutions: ["Leg Curl","Nordic Curl","Glute Ham Raise"],
    cues: ["Seated preferred over lying - emphasises lengthened position","Full extension at top","Squeeze hard at full flexion","Alex: hip hinges alone failed his hamstrings - leg curls are mandatory"]
  },
  "Box Squat": {
    primaryMuscle: "glutes", secondaryMuscles: ["hamstrings","quads"],
    movementPattern: "squat", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [4,8],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Hatfield Squat","Leg Press","Safety Bar Squat"],
    cues: ["Sit BACK and DOWN not just down","Sit fully on the box then drive up","Wider stance toes out","Box at parallel or below","More posterior chain than free squat"]
  },
  "Weighted Pull-Up": {
    primaryMuscle: "back", secondaryMuscles: ["biceps","rear_delts"],
    movementPattern: "vertical_pull", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "load_first", bestRepRange: [3,10],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Lat Pulldown (pronated)","Lat Pulldown (neutral)","Assisted Pull-Up"],
    cues: ["Dead hang start - full scapular depression first","Pull chest to bar","Controlled descent","Overhand neutral or underhand all valid","Alex: built elite-level back almost exclusively from pull-ups"]
  },
  "Pendlay Row": {
    primaryMuscle: "back", secondaryMuscles: ["biceps","rear_delts"],
    movementPattern: "horizontal_pull", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [4,8],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Cable Row","Barbell Row","T-Bar Row","DB Row"],
    cues: ["Bar on floor between every rep - dead stop","Torso parallel to floor","Explosive pull controlled descent","Pull to lower chest or upper abs"]
  },
  "Reverse Hyperextension": {
    primaryMuscle: "glutes", secondaryMuscles: ["hamstrings","lower_back"],
    movementPattern: "hip_extension", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,25],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Hip Thrust (Smith)","Cable Pull-Through","Glute Bridge"],
    cues: ["Lie face-down hips at edge of bench","Squeeze glutes and raise legs","Full hip extension at top","No spinal flexion - back stays neutral","High reps work well 15-25 per set"]
  },
  "Preacher Curl": {
    primaryMuscle: "biceps", secondaryMuscles: [],
    movementPattern: "elbow_flexion", exerciseClass: "isolation",
    jointStress: "moderate", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [8,15],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Incline DB Curl","Cable Curl","Bayesian Cable Curls"],
    cues: ["Upper arm flat on pad","Full extension at bottom - long head stretch","Supinate wrist as you curl","Don't bounce at the bottom","Alex prefers EZ bar or DB preacher"]
  },
  "Hack Deadlift": {
    primaryMuscle: "quads", secondaryMuscles: ["glutes","upper_traps"],
    movementPattern: "squat", exerciseClass: "compound",
    jointStress: "moderate", fatigueCost: "high",
    progressionType: "load_first", bestRepRange: [4,8],
    techniqueSensitivity: "high", loadJumpSensitivity: "moderate",
    substitutions: ["Hack Squat","Leg Press","Hatfield Squat"],
    cues: ["Bar starts directly behind your calves","Very upright torso - think squat not deadlift","Knees track over toes","Requires good ankle mobility - elevate heels if needed","Start very light - movement pattern is awkward initially"]
  },
  "Standing Cable Crunch": {
    primaryMuscle: "abs", secondaryMuscles: [],
    movementPattern: "spinal_flexion", exerciseClass: "isolation",
    jointStress: "low", fatigueCost: "low",
    progressionType: "rep_first", bestRepRange: [10,20],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Cable Crunch","Hanging Leg Raise","Ab Rollout"],
    cues: ["Stand not kneel - increases ROM and stretch","Hinge at hips as you crunch","Rope at forehead don't pull with arms","Feel abs elongate at top before crunching"]
  },
  "Overhead Barbell Extension": {
    primaryMuscle: "triceps", secondaryMuscles: [],
    movementPattern: "elbow_extension", exerciseClass: "isolation",
    jointStress: "moderate", fatigueCost: "low",
    progressionType: "load_first", bestRepRange: [6,12],
    techniqueSensitivity: "moderate", loadJumpSensitivity: "moderate",
    substitutions: ["Cable OH Tricep Extension","EZ Bar Skullcrusher","DB Overhead Tricep Extension"],
    cues: ["Bar starts behind head for full long head stretch","Elbows stay pointed at ceiling","Lower slowly - the stretch is the stimulus","Alex avoids flat skullcrushers - no long head stretch"]
  },


  "Ab Rollout": {
    primaryMuscle: "abs", secondaryMuscles: ["shoulders","lats"],
    movementPattern: "anti_extension", exerciseClass: "compound",
    jointStress: "low", fatigueCost: "moderate",
    progressionType: "rep_first", bestRepRange: [8,15],
    techniqueSensitivity: "high", loadJumpSensitivity: "high",
    substitutions: ["Cable Crunch","Hanging Leg Raise","Plank"],
    cues: ["Neutral spine","Don't let hips sag","Full extension only if stable","Pull back with lats"]
  },
};
