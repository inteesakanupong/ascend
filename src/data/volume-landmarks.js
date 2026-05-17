// MEV/MAV/MRV volume landmarks per muscle group
const VOLUME_LANDMARKS = {
  chest:    { mv: 4, mev: 8,  mav: 16, mrv: 22 },
  back:     { mv: 6, mev: 10, mav: 20, mrv: 26 },
  shoulders:{ mv: 4, mev: 8,  mav: 16, mrv: 22 },
  biceps:   { mv: 4, mev: 8,  mav: 16, mrv: 20 },
  triceps:  { mv: 4, mev: 6,  mav: 14, mrv: 18 },
  quads:    { mv: 4, mev: 8,  mav: 16, mrv: 20 },
  hamstrings:{ mv: 3, mev: 6, mav: 14, mrv: 18 },
  glutes:   { mv: 0, mev: 4,  mav: 12, mrv: 16 },
  calves:   { mv: 6, mev: 8,  mav: 14, mrv: 20 },
  forearms: { mv: 2, mev: 4,  mav: 10, mrv: 14 },
  abs:      { mv: 0, mev: 6,  mav: 14, mrv: 20 },
};
