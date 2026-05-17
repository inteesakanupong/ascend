// Targeted Warm-Up static data: movement library and day/lift defaults
const WARMUP_MOVEMENT_LIBRARY = {
  // ── LOWER BODY ──
  hamstring_curl:    { id: "ham_curl",    name: "Hamstring Curl",            prescription: "15-20 reps",    purpose: "Posterior-chain activation before squats and hinges.",  equipment: ["machine","cable"],       muscles: ["hamstrings"] },
  rdl_light:         { id: "rdl_light",   name: "Light RDL",                 prescription: "12-15 reps",    purpose: "Hip hinge pattern and hamstring warm-up.",              equipment: ["barbell","dumbbell"],    muscles: ["hamstrings","glutes"] },
  glute_bridge:      { id: "glute_br",    name: "Glute Bridge / Hip Thrust", prescription: "15-20 reps",    purpose: "Glute activation before any lower-body session.",       equipment: ["bodyweight","barbell"],  muscles: ["glutes"] },
  reverse_hyper:     { id: "rev_hyper",   name: "Back Extension / Rev Hyper",prescription: "15-20 reps",    purpose: "Low back and glute pump, decompresses spine.",          equipment: ["machine","bodyweight"],  muscles: ["glutes","hamstrings"] },
  leg_extension:     { id: "leg_ext",     name: "Leg Extension",             prescription: "15-20 reps",    purpose: "Quad activation and knee prep before squatting.",       equipment: ["machine"],              muscles: ["quads"] },
  tke:               { id: "tke",         name: "Terminal Knee Extension",   prescription: "15-20 reps",    purpose: "VMO and knee stability warm-up.",                       equipment: ["cable","band"],          muscles: ["quads"] },
  calf_raise:        { id: "calf_r",      name: "Calf Raise",                prescription: "15-20 reps",    purpose: "Ankle and lower-leg preparation.",                      equipment: ["machine","bodyweight"],  muscles: ["calves"] },
  dead_bug:          { id: "dead_bug",    name: "Dead Bug",                   prescription: "8-10 reps/side","purpose": "Trunk anti-extension bracing before loaded hinge.",   equipment: ["bodyweight"],            muscles: ["abs"] },
  ab_wheel:          { id: "ab_wheel",    name: "Ab Rollout / Plank",        prescription: "10-12 reps",    purpose: "Core bracing before heavy lower-body work.",            equipment: ["bodyweight","machine"],  muscles: ["abs"] },
  // ── UPPER – PUSH ──
  triceps_pressdown: { id: "tri_press",   name: "Triceps Pressdown",         prescription: "15-20 reps",    purpose: "Elbow-friendly triceps blood flow before pressing.",    equipment: ["cable","machine"],       muscles: ["triceps"] },
  band_pull_apart:   { id: "bpa",         name: "Band Pull-Apart",           prescription: "20-25 reps",    purpose: "Rear-delt and scapular activation before pressing.",    equipment: ["band","cable"],          muscles: ["shoulders","back"] },
  face_pull:         { id: "face_pull",   name: "Face Pull",                 prescription: "15-20 reps",    purpose: "Rear delt and external rotator warm-up.",              equipment: ["cable","machine"],       muscles: ["shoulders","back"] },
  scap_pushup:       { id: "scap_pu",     name: "Scap Push-Up / Protraction","prescription": "10-15 reps",  purpose: "Scapular mobility and serratus activation.",            equipment: ["bodyweight"],            muscles: ["shoulders","chest"] },
  ext_rotation:      { id: "ext_rot",     name: "DB External Rotation",      prescription: "12-15 reps/side","purpose": "Rotator cuff activation before overhead or bench.", equipment: ["dumbbell","cable","band"],muscles: ["shoulders"] },
  lat_raise_light:   { id: "lat_raise",   name: "Light Lateral Raise",       prescription: "15-20 reps",    purpose: "Medial delt pump and shoulder joint prep.",            equipment: ["dumbbell","cable","machine"],muscles: ["shoulders"] },
  // ── UPPER – PULL ──
  straight_arm_pd:   { id: "sa_pd",       name: "Straight-Arm Pulldown",     prescription: "12-15 reps",    purpose: "Lat activation before rows and pulldowns.",            equipment: ["cable","machine"],       muscles: ["back"] },
  scap_row:          { id: "scap_row",    name: "Scapular Row / Shrug",      prescription: "10-15 reps",    purpose: "Mid and lower trap activation before pulling.",        equipment: ["cable","machine","band"],muscles: ["back","shoulders"] },
  cable_curl:        { id: "cable_curl",  name: "Cable Curl",                prescription: "12-15 reps",    purpose: "Elbow flexor warm-up before curls.",                   equipment: ["cable"],                 muscles: ["biceps"] },
  db_curl:           { id: "db_curl",     name: "DB Curl",                   prescription: "12-15 reps",    purpose: "Elbow flexor and bicep warm-up.",                      equipment: ["dumbbell"],              muscles: ["biceps"] },
  reverse_curl:      { id: "rev_curl",    name: "Reverse Curl",              prescription: "12-15 reps",    purpose: "Forearm and brachialis warm-up before heavy curls.",   equipment: ["barbell","dumbbell","cable"],muscles: ["forearms","biceps"] },
  // ── BODYWEIGHT FALLBACKS ──
  bw_squat:          { id: "bw_squat",    name: "Bodyweight Squat",          prescription: "15-20 reps",    purpose: "Hip and knee movement prep without loading.",           equipment: ["bodyweight"],            muscles: ["quads","glutes"] },
  inchworm:          { id: "inchworm",    name: "Inchworm Walk-Out",         prescription: "8-10 reps",     purpose: "Full-body activation and hamstring elongation.",        equipment: ["bodyweight"],            muscles: ["hamstrings","abs","shoulders"] },
  arm_circle:        { id: "arm_circ",   name: "Arm Circle / Shoulder CARs", prescription: "10 reps/dir",   purpose: "Shoulder joint mobility and rotator cuff prep.",       equipment: ["bodyweight"],            muscles: ["shoulders"] },
};

const TARGETED_WARMUP_DEFAULTS = {
  squat: {
    label: "Squat",
    rampSets: "2-4 easy squat ramp sets before the first working set.",
    movements: [
      { id: "squat_hamstring_curl", name: "Hamstring Curl", prescription: "15-25 reps", purpose: "Posterior-chain activation to prepare knees and hips before squatting." },
      { id: "squat_reverse_hyper", name: "Reverse Hyper / Back Extension", prescription: "15-20 reps", purpose: "Glutes, low back, and hips. Easy pump, no fatigue." },
      { id: "squat_brace", name: "Ab Pulldown / Dead Bug", prescription: "10-15 reps", purpose: "Trunk bracing before loading the squat pattern." },
    ],
  },
  bench: {
    label: "Bench",
    rampSets: "2-4 easy bench ramp sets before the first working set.",
    movements: [
      { id: "bench_triceps", name: "Triceps Pressdown", prescription: "15-25 reps", purpose: "Elbow-friendly triceps pump before pressing." },
      { id: "bench_upper_back", name: "Face Pull / Band Pull-Apart", prescription: "15-25 reps", purpose: "Upper-back and rear-delt activation for a stable press." },
      { id: "bench_shoulder_control", name: "DB External Rotation / Scap Push-Up", prescription: "10-15 reps", purpose: "Shoulder control and scapular movement before loading." },
    ],
  },
  deadlift: {
    label: "Deadlift",
    rampSets: "2-4 easy deadlift ramp sets before the first working set.",
    movements: [
      { id: "deadlift_hamstring_curl", name: "Hamstring Curl", prescription: "15-25 reps", purpose: "Hamstring activation before hip hinging." },
      { id: "deadlift_reverse_hyper", name: "Reverse Hyper / Back Extension", prescription: "15-20 reps", purpose: "Glutes, low back, and hips. Easy pump, no fatigue." },
      { id: "deadlift_brace", name: "Ab Pulldown / Plank", prescription: "10-15 reps or 20-30 sec", purpose: "Brace rehearsal before pulling from the floor." },
    ],
  },
  overhead: {
    label: "Overhead",
    rampSets: "2-4 easy overhead press ramp sets before the first working set.",
    movements: [
      { id: "overhead_triceps", name: "Triceps Pressdown", prescription: "15-25 reps", purpose: "Elbow-friendly triceps pump before pressing overhead." },
      { id: "overhead_upper_back", name: "Face Pull / Band Pull-Apart", prescription: "15-25 reps", purpose: "Upper-back and rear-delt activation for shoulder position." },
      { id: "overhead_shoulder", name: "Lateral Raise / Wall Slide", prescription: "10-15 reps", purpose: "Easy shoulder warm-up without fatigue." },
    ],
  },
};

const TARGETED_WARMUP_DAY_DEFAULTS = {
  PUSH: {
    label: "Push",
    rampSets: "2-4 easy press ramp sets before the first working set.",
    movements: [
      { id: "push_triceps_pressdown", name: "Triceps Pressdown", prescription: "15-25 reps", purpose: "Elbow-friendly triceps pump before pressing." },
      { id: "push_face_pull", name: "Face Pull / Band Pull-Apart", prescription: "15-25 reps", purpose: "Upper-back and rear-delt activation for pressing stability." },
      { id: "push_external_rotation", name: "DB External Rotation / Scap Push-Up", prescription: "10-15 reps", purpose: "Shoulder control and scapular movement before loading." },
    ],
  },
  PULL: {
    label: "Pull",
    rampSets: "2-4 easy row or pulldown ramp sets before the first working set.",
    movements: [
      { id: "pull_straight_arm_pulldown", name: "Straight-Arm Pulldown", prescription: "12-20 reps", purpose: "Lat activation before rows and pulldowns." },
      { id: "pull_face_pull", name: "Face Pull / Band Pull-Apart", prescription: "15-25 reps", purpose: "Rear-delt, trap, and scapular control before pulling." },
      { id: "pull_curl", name: "Cable Curl / DB Curl", prescription: "12-20 reps", purpose: "Easy elbow flexor warm-up without fatigue." },
    ],
  },
  ARMS: {
    label: "Arms",
    rampSets: "1-3 easy ramp sets on the first arm exercise before working sets.",
    movements: [
      { id: "arms_pressdown", name: "Triceps Pressdown", prescription: "15-25 reps", purpose: "Elbow-friendly triceps blood flow before extensions." },
      { id: "arms_curl", name: "Cable Curl / DB Curl", prescription: "12-20 reps", purpose: "Biceps and elbow flexor warm-up before heavier arm work." },
      { id: "arms_wrist", name: "Reverse Curl / Wrist Extension", prescription: "12-20 reps", purpose: "Forearm and elbow preparation for curls and extensions." },
    ],
  },
  LEGS: {
    label: "Legs",
    rampSets: "2-4 easy squat or hinge ramp sets before the first working set.",
    movements: [
      { id: "legs_hamstring_curl", name: "Hamstring Curl", prescription: "15-25 reps", purpose: "Posterior-chain activation to prepare knees and hips." },
      { id: "legs_reverse_hyper", name: "Reverse Hyper / Back Extension", prescription: "15-20 reps", purpose: "Glutes, low back, and hips. Easy pump, no fatigue." },
      { id: "legs_brace", name: "Ab Pulldown / Dead Bug", prescription: "10-15 reps", purpose: "Trunk bracing before loading the lower body." },
    ],
  },
};

const TARGETED_WARMUP_MUSCLE_OPTIONS = {
  chest:      { id: "muscle_chest_scap_pushup", name: "Scap Push-Up / Cable Fly Warm-Up", prescription: "10-15 reps", purpose: "Chest and scapular control before pressing." },
  shoulders:  { id: "muscle_shoulders_face_pull", name: "Face Pull / Band Pull-Apart", prescription: "15-25 reps", purpose: "Shoulder position and rear-delt activation." },
  triceps:    { id: "muscle_triceps_pressdown", name: "Triceps Pressdown", prescription: "15-25 reps", purpose: "Elbow-friendly triceps pump before pressing or extensions." },
  back:       { id: "muscle_back_straight_arm", name: "Straight-Arm Pulldown", prescription: "12-20 reps", purpose: "Lat and upper-back activation before pulling." },
  biceps:     { id: "muscle_biceps_curl", name: "Cable Curl / DB Curl", prescription: "12-20 reps", purpose: "Elbow flexor warm-up before curls and pulling." },
  forearms:   { id: "muscle_forearms_reverse_curl", name: "Reverse Curl / Wrist Extension", prescription: "12-20 reps", purpose: "Forearm and elbow preparation." },
  quads:      { id: "muscle_quads_leg_extension", name: "Leg Extension / Terminal Knee Extension", prescription: "15-25 reps", purpose: "Quad and knee preparation before squats or presses." },
  hamstrings: { id: "muscle_hamstrings_curl", name: "Hamstring Curl", prescription: "15-25 reps", purpose: "Hamstring activation before squats and hinges." },
  glutes:     { id: "muscle_glutes_reverse_hyper", name: "Reverse Hyper / Back Extension", prescription: "15-20 reps", purpose: "Glutes, low back, and hips. Easy pump, no fatigue." },
  calves:     { id: "muscle_calves_raise", name: "Calf Raise / Tibialis Raise", prescription: "12-20 reps", purpose: "Ankle and lower-leg preparation." },
  abs:        { id: "muscle_abs_brace", name: "Ab Pulldown / Dead Bug", prescription: "10-15 reps", purpose: "Trunk bracing before loaded movement." },
};
