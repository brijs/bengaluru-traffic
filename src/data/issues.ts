// All issues from the user's sheet (IDs 1–77, verbatim English), Environment rows 78–80 (re-created:
// the sheet export truncated them) and new additions 81–85. `slider` links each issue to the
// simulator control that models it; `env:*` means it is driven by an environment toggle / preset.

export type CategoryId = 'road' | 'peds' | 'behavior' | 'vehicles' | 'others' | 'signals' | 'environment';
export type OwnerId = 'civil' | 'enforcement' | 'vehicle' | 'education' | 'signals' | 'self' | 'planning';
export type AgencyId = 'GBA' | 'BTP' | 'RTO' | 'BMTC' | 'BESCOM' | 'BWSSB' | 'BMRCL' | 'NHAI' | 'CIT';
export type Sev = 'H' | 'M' | 'L';
export type Freq = 'daily' | 'common' | 'occasional' | 'seasonal';
export type Source = 'yours' | 'added' | 'new';

export interface Issue {
  id: number; cat: CategoryId; en: string; kn: string; src: Source; sev: Sev; freq: Freq;
  owner: OwnerId; ag: AgencyId[]; fixEn: string; fixKn: string; slider: string;
}

export const CATEGORIES: Record<CategoryId, { en: string; kn: string; icon: string }> = {
  road: { en: 'Road & infrastructure', kn: 'ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ', icon: '🛣️' },
  peds: { en: 'Pedestrians & public space', kn: 'ಪಾದಚಾರಿಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸ್ಥಳ', icon: '🚶' },
  behavior: { en: 'Driver behaviour', kn: 'ಚಾಲಕರ ವರ್ತನೆ', icon: '🧠' },
  vehicles: { en: 'Vehicles & cargo', kn: 'ವಾಹನಗಳು ಮತ್ತು ಸರಕು', icon: '🚚' },
  others: { en: 'Other road users', kn: 'ಇತರ ರಸ್ತೆ ಬಳಕೆದಾರರು', icon: '🐄' },
  signals: { en: 'Signals & enforcement', kn: 'ಸಿಗ್ನಲ್ ಮತ್ತು ಕಾನೂನು ಜಾರಿ', icon: '🚦' },
  environment: { en: 'Environment & demand', kn: 'ಪರಿಸರ ಮತ್ತು ಬೇಡಿಕೆ', icon: '🌧️' },
};

export const OWNERS: Record<OwnerId, { en: string; kn: string }> = {
  civil: { en: 'Civil / road design', kn: 'ಸಿವಿಲ್ / ರಸ್ತೆ ವಿನ್ಯಾಸ' },
  enforcement: { en: 'Traffic enforcement', kn: 'ಸಂಚಾರ ಕಾನೂನು ಜಾರಿ' },
  vehicle: { en: 'Vehicle regulation', kn: 'ವಾಹನ ನಿಯಂತ್ರಣ' },
  education: { en: 'Behaviour / education', kn: 'ವರ್ತನೆ / ಶಿಕ್ಷಣ' },
  signals: { en: 'Signals & systems', kn: 'ಸಿಗ್ನಲ್ ಮತ್ತು ವ್ಯವಸ್ಥೆಗಳು' },
  self: { en: 'Me (defensive driving)', kn: 'ನಾನು (ಎಚ್ಚರಿಕೆಯ ಚಾಲನೆ)' },
  planning: { en: 'Urban & transport planning', kn: 'ನಗರ ಮತ್ತು ಸಾರಿಗೆ ಯೋಜನೆ' },
};

export const AGENCIES: Record<AgencyId, { en: string; kn: string }> = {
  GBA: { en: 'GBA / BBMP (roads, footpaths)', kn: 'ಜಿಬಿಎ / ಬಿಬಿಎಂಪಿ (ರಸ್ತೆ, ಫುಟ್‌ಪಾತ್)' },
  BTP: { en: 'Bengaluru Traffic Police', kn: 'ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್' },
  RTO: { en: 'Transport Dept / RTO', kn: 'ಸಾರಿಗೆ ಇಲಾಖೆ / ಆರ್‌ಟಿಒ' },
  BMTC: { en: 'BMTC (buses)', kn: 'ಬಿಎಂಟಿಸಿ (ಬಸ್‌ಗಳು)' },
  BESCOM: { en: 'BESCOM (lights, poles)', kn: 'ಬೆಸ್ಕಾಂ (ದೀಪ, ಕಂಬ)' },
  BWSSB: { en: 'BWSSB (water, drains)', kn: 'ಬಿಡಬ್ಲ್ಯೂಎಸ್‌ಎಸ್‌ಬಿ (ನೀರು, ಚರಂಡಿ)' },
  BMRCL: { en: 'BMRCL (Namma Metro)', kn: 'ಬಿಎಂಆರ್‌ಸಿಎಲ್ (ನಮ್ಮ ಮೆಟ್ರೋ)' },
  NHAI: { en: 'NHAI (highways)', kn: 'ಎನ್‌ಎಚ್‌ಎಐ (ಹೆದ್ದಾರಿ)' },
  CIT: { en: 'Citizens — all of us', kn: 'ನಾಗರಿಕರು — ನಾವೆಲ್ಲರೂ' },
};

type Row = [number, CategoryId, string, string, Source, Sev, Freq, OwnerId, AgencyId[], string, string, string];

const R: Row[] = [
  [1, 'road', 'Potholes', 'ರಸ್ತೆ ಗುಂಡಿಗಳು', 'yours', 'H', 'daily', 'civil', ['GBA'], 'Pothole reporting app + fixed repair SLA; better resurfacing quality', 'ಗುಂಡಿ ವರದಿ ಆ್ಯಪ್ + ನಿಗದಿತ ಅವಧಿಯಲ್ಲಿ ದುರಸ್ತಿ; ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಡಾಂಬರೀಕರಣ', 'potholes'],
  [2, 'road', 'Bad speed bumps (too high, unmarked, unpainted)', 'ಕೆಟ್ಟ ರಸ್ತೆ ಉಬ್ಬುಗಳು (ತುಂಬಾ ಎತ್ತರ, ಗುರುತು/ಬಣ್ಣ ಇಲ್ಲದವು)', 'yours', 'H', 'daily', 'civil', ['GBA'], 'Standard bump profile, paint, reflectors, advance signage', 'ಪ್ರಮಾಣಿತ ಉಬ್ಬು ವಿನ್ಯಾಸ, ಬಣ್ಣ, ರಿಫ್ಲೆಕ್ಟರ್‌ಗಳು, ಮುಂಚಿತ ಎಚ್ಚರಿಕೆ ಫಲಕ', 'bumps'],
  [3, 'road', 'No lane lines / faded markings', 'ಲೇನ್ ಗೆರೆಗಳಿಲ್ಲ / ಮಾಸಿದ ಗುರುತುಗಳು', 'yours', 'H', 'daily', 'civil', ['GBA'], "Thermoplastic paint + cat's eyes; repaint after resurfacing", 'ಥರ್ಮೋಪ್ಲಾಸ್ಟಿಕ್ ಬಣ್ಣ + ಕ್ಯಾಟ್ಸ್ ಐ; ಡಾಂಬರೀಕರಣದ ನಂತರ ಮತ್ತೆ ಬಣ್ಣ', 'markings'],
  [4, 'road', 'No street lights', 'ಬೀದಿ ದೀಪಗಳಿಲ್ಲ', 'yours', 'H', 'common', 'civil', ['GBA', 'BESCOM'], 'Lighting audit; solar or LED poles on dark stretches', 'ಬೆಳಕಿನ ಪರಿಶೀಲನೆ; ಕತ್ತಲೆಯ ಭಾಗಗಳಲ್ಲಿ ಸೌರ ಅಥವಾ LED ಕಂಬಗಳು', 'darkRoads'],
  [5, 'peds', 'No sidewalks', 'ಪಾದಚಾರಿ ಮಾರ್ಗಗಳಿಲ್ಲ', 'yours', 'H', 'daily', 'civil', ['GBA'], 'Footpath standard for every road; keep clear of vendors and parking', 'ಪ್ರತಿ ರಸ್ತೆಗೂ ಪಾದಚಾರಿ ಮಾರ್ಗ; ವ್ಯಾಪಾರ ಮತ್ತು ಪಾರ್ಕಿಂಗ್‌ನಿಂದ ಮುಕ್ತವಾಗಿಡಿ', 'footpaths'],
  [6, 'road', 'Barriers / dividers protruding into the lane', 'ಲೇನ್‌ಗೆ ಚಾಚಿಕೊಂಡಿರುವ ಬ್ಯಾರಿಕೇಡ್ / ವಿಭಾಜಕಗಳು', 'yours', 'H', 'common', 'civil', ['GBA', 'BTP'], 'Reflective paint, correct placement, remove unused barriers', 'ಪ್ರತಿಫಲಕ ಬಣ್ಣ, ಸರಿಯಾದ ಸ್ಥಾನ, ಬಳಕೆಯಲ್ಲಿಲ್ಲದ ಬ್ಯಾರಿಕೇಡ್ ತೆರವು', 'obstacles'],
  [7, 'peds', 'Missing or faded zebra crossings; no pedestrian signal phase', 'ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಇಲ್ಲ / ಮಾಸಿದೆ; ಪಾದಚಾರಿ ಸಿಗ್ನಲ್ ಇಲ್ಲ', 'added', 'H', 'daily', 'civil', ['GBA', 'BTP'], 'Crossings at junctions and schools with pedestrian phases', 'ಜಂಕ್ಷನ್ ಮತ್ತು ಶಾಲೆಗಳ ಬಳಿ ಪಾದಚಾರಿ ಸಿಗ್ನಲ್‌ನೊಂದಿಗೆ ಕ್ರಾಸಿಂಗ್', 'crossings'],
  [8, 'road', 'Missing or unreadable road signs (speed, one-way, merge)', 'ರಸ್ತೆ ಫಲಕಗಳು ಇಲ್ಲ ಅಥವಾ ಓದಲಾಗದು (ವೇಗ, ಏಕಮುಖ, ವಿಲೀನ)', 'added', 'M', 'common', 'civil', ['GBA', 'BTP'], 'Sign audit; retroreflective signs', 'ಫಲಕ ಪರಿಶೀಲನೆ; ಪ್ರತಿಫಲಿಸುವ ಫಲಕಗಳು', 'markings'],
  [9, 'road', 'Open manholes, uncovered drains, broken slabs', 'ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್‌ಗಳು, ಮುಚ್ಚದ ಚರಂಡಿ, ಒಡೆದ ಚಪ್ಪಡಿಗಳು', 'added', 'H', 'common', 'civil', ['GBA', 'BWSSB'], 'Inspection schedule; locked or bolted covers', 'ನಿಯಮಿತ ತಪಾಸಣೆ; ಬೀಗ / ಬೋಲ್ಟ್ ಹಾಕಿದ ಮುಚ್ಚಳಗಳು', 'workZones'],
  [10, 'road', 'Waterlogging; road collapse after rain', 'ಮಳೆ ನಂತರ ನೀರು ನಿಲ್ಲುವುದು; ರಸ್ತೆ ಕುಸಿತ', 'added', 'H', 'seasonal', 'civil', ['GBA', 'BWSSB'], 'Drainage upgrades; underpass pumps; better road base', 'ಚರಂಡಿ ಸುಧಾರಣೆ; ಅಂಡರ್‌ಪಾಸ್ ಪಂಪ್‌ಗಳು; ಉತ್ತಮ ರಸ್ತೆ ತಳಹದಿ', 'waterlogging'],
  [11, 'road', 'Sudden lane drops, abrupt narrowing, unmarked merges', 'ಹಠಾತ್ ಲೇನ್ ಕಡಿತ, ದಿಢೀರ್ ಕಿರಿದಾಗುವಿಕೆ, ಗುರುತಿಲ್ಲದ ವಿಲೀನ', 'added', 'M', 'common', 'civil', ['GBA'], 'Taper markings, advance warning signs', 'ಕ್ರಮೇಣ ಕಿರಿದಾಗುವ ಗುರುತುಗಳು, ಮುಂಚಿತ ಎಚ್ಚರಿಕೆ ಫಲಕಗಳು', 'markings'],
  [12, 'road', 'Roads dug up for utilities and left unrepaired', 'ಕೇಬಲ್ / ಪೈಪ್‌ಗಾಗಿ ಅಗೆದು ದುರಸ್ತಿ ಮಾಡದೆ ಬಿಟ್ಟ ರಸ್ತೆಗಳು', 'added', 'H', 'common', 'civil', ['GBA', 'BWSSB', 'BESCOM'], 'Mandatory restoration deadline; joint utility trenching', 'ಕಡ್ಡಾಯ ಮರುಸ್ಥಾಪನೆ ಗಡುವು; ಎಲ್ಲಾ ಸೇವೆಗಳಿಗೆ ಒಂದೇ ಕಂದಕ', 'workZones'],
  [13, 'road', 'Construction zones with no warning, diversion or reflectors', 'ಎಚ್ಚರಿಕೆ, ಬದಲಿ ಮಾರ್ಗ, ರಿಫ್ಲೆಕ್ಟರ್ ಇಲ್ಲದ ಕಾಮಗಾರಿ ವಲಯಗಳು', 'added', 'H', 'common', 'civil', ['GBA', 'BMRCL'], 'Work-zone safety standard; contractor penalties', 'ಕಾಮಗಾರಿ ವಲಯ ಸುರಕ್ಷತಾ ಮಾನದಂಡ; ಗುತ್ತಿಗೆದಾರರಿಗೆ ದಂಡ', 'workZones'],
  [14, 'road', 'Unlit or unmarked medians and curbs', 'ಬೆಳಕು / ಗುರುತು ಇಲ್ಲದ ಮೀಡಿಯನ್ ಮತ್ತು ಕರ್ಬ್‌ಗಳು', 'added', 'M', 'common', 'civil', ['GBA'], 'Reflective paint and studs on curbs and medians', 'ಕರ್ಬ್ ಮತ್ತು ಮೀಡಿಯನ್‌ಗಳಿಗೆ ಪ್ರತಿಫಲಕ ಬಣ್ಣ ಮತ್ತು ಸ್ಟಡ್‌ಗಳು', 'darkRoads'],
  [15, 'road', 'Poor junction design (no turn lanes, blind corners)', 'ಕಳಪೆ ಜಂಕ್ಷನ್ ವಿನ್ಯಾಸ (ತಿರುವು ಲೇನ್ ಇಲ್ಲ, ಕುರುಡು ತಿರುವುಗಳು)', 'added', 'M', 'common', 'civil', ['GBA', 'BTP'], 'Junction redesign; remove sight obstructions', 'ಜಂಕ್ಷನ್ ಮರುವಿನ್ಯಾಸ; ನೋಟಕ್ಕೆ ಅಡ್ಡಿಯಾದವುಗಳ ತೆರವು', 'junctions'],
  [16, 'road', 'Dead-end or ending roads with no signage', 'ಫಲಕವಿಲ್ಲದ ಕೊನೆಗೊಳ್ಳುವ ರಸ್ತೆಗಳು', 'added', 'L', 'occasional', 'civil', ['GBA'], 'End-of-road markers and reflectors', 'ರಸ್ತೆ ಅಂತ್ಯದ ಗುರುತುಗಳು ಮತ್ತು ರಿಫ್ಲೆಕ್ಟರ್‌ಗಳು', 'junctions'],
  [17, 'road', 'Mud, sand and gravel dragged onto road from sites', 'ಕಟ್ಟಡ ಸ್ಥಳಗಳಿಂದ ರಸ್ತೆಗೆ ಬರುವ ಮಣ್ಣು, ಮರಳು, ಜಲ್ಲಿ', 'added', 'M', 'common', 'civil', ['GBA'], 'Wheel washing at sites; fines; sweeping', 'ಸ್ಥಳದಲ್ಲೇ ಚಕ್ರ ತೊಳೆಯುವುದು; ದಂಡ; ಗುಡಿಸುವುದು', 'workZones'],
  [18, 'road', 'Poles, transformers, trees at the road edge', 'ರಸ್ತೆ ಅಂಚಿನಲ್ಲಿ ಕಂಬಗಳು, ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್‌ಗಳು, ಮರಗಳು', 'added', 'M', 'occasional', 'civil', ['GBA', 'BESCOM'], 'Relocate or mark with reflectors', 'ಸ್ಥಳಾಂತರ ಅಥವಾ ರಿಫ್ಲೆಕ್ಟರ್‌ನಿಂದ ಗುರುತು', 'obstacles'],
  [19, 'road', 'No guardrails at drops, flyover edges, water bodies', 'ಇಳಿಜಾರು, ಫ್ಲೈಓವರ್ ಅಂಚು, ಕೆರೆಗಳ ಬಳಿ ತಡೆಗೋಡೆ ಇಲ್ಲ', 'added', 'H', 'occasional', 'civil', ['GBA', 'NHAI'], 'Guardrail audit on high-risk edges', 'ಅಪಾಯದ ಅಂಚುಗಳಲ್ಲಿ ತಡೆಗೋಡೆ ಪರಿಶೀಲನೆ', 'junctions'],
  [20, 'road', 'Short or missing acceleration/deceleration lanes', 'ಚಿಕ್ಕ ಅಥವಾ ಇಲ್ಲದ ವೇಗವರ್ಧನೆ / ನಿಧಾನ ಲೇನ್‌ಗಳು', 'added', 'M', 'common', 'civil', ['GBA', 'NHAI'], 'Add merge lanes at entries and exits', 'ಪ್ರವೇಶ ಮತ್ತು ನಿರ್ಗಮನಗಳಲ್ಲಿ ವಿಲೀನ ಲೇನ್‌ಗಳು', 'junctions'],
  [21, 'road', 'No proper parking provision', 'ಸರಿಯಾದ ಪಾರ್ಕಿಂಗ್ ವ್ಯವಸ್ಥೆ ಇಲ್ಲ', 'yours', 'M', 'daily', 'civil', ['GBA', 'BTP'], 'Designated parking bays; pricing; off-street parking', 'ನಿಗದಿತ ಪಾರ್ಕಿಂಗ್ ಸ್ಥಳಗಳು; ಶುಲ್ಕ; ರಸ್ತೆಯಿಂದ ಹೊರಗಿನ ಪಾರ್ಕಿಂಗ್', 'parking'],
  [22, 'behavior', 'Ignoring stop lines and signals (no stop, no lights)', 'ಸ್ಟಾಪ್ ಲೈನ್ ಮತ್ತು ಸಿಗ್ನಲ್ ಉಲ್ಲಂಘನೆ', 'yours', 'H', 'daily', 'enforcement', ['BTP'], 'Red-light cameras with automatic challans; visible policing', 'ಸ್ವಯಂಚಾಲಿತ ಚಲನ್‌ನೊಂದಿಗೆ ರೆಡ್‌ಲೈಟ್ ಕ್ಯಾಮೆರಾ; ಕಾಣುವ ಪೊಲೀಸ್ ಉಪಸ್ಥಿತಿ', 'signalJump'],
  [23, 'behavior', 'Wrong-way driving', 'ವಿರುದ್ಧ ದಿಕ್ಕಿನ ಚಾಲನೆ', 'yours', 'H', 'daily', 'enforcement', ['BTP', 'GBA'], 'Physical deterrents, U-turn points, camera enforcement', 'ಭೌತಿಕ ತಡೆಗಳು, ಯು-ಟರ್ನ್ ಸ್ಥಳಗಳು, ಕ್ಯಾಮೆರಾ ಜಾರಿ', 'wrongWay'],
  [24, 'behavior', 'Using phones while driving or riding (go slow)', 'ಚಾಲನೆ ವೇಳೆ ಫೋನ್ ಬಳಕೆ (ನಿಧಾನ ಚಲನೆ)', 'yours', 'H', 'daily', 'enforcement', ['BTP', 'CIT'], 'Camera detection; penalties; awareness drives', 'ಕ್ಯಾಮೆರಾ ಪತ್ತೆ; ದಂಡ; ಜಾಗೃತಿ ಅಭಿಯಾನ', 'phones'],
  [25, 'behavior', 'No indicators', 'ಇಂಡಿಕೇಟರ್ ಬಳಸದಿರುವುದು', 'yours', 'M', 'daily', 'education', ['CIT', 'RTO'], 'Driving test emphasis; enforcement on lane-change violations', 'ಚಾಲನಾ ಪರೀಕ್ಷೆಯಲ್ಲಿ ಒತ್ತು; ಲೇನ್ ಬದಲಾವಣೆ ಉಲ್ಲಂಘನೆಗೆ ಜಾರಿ', 'weaving'],
  [26, 'behavior', 'Excessive honking', 'ಅತಿಯಾದ ಹಾರ್ನ್', 'yours', 'L', 'daily', 'education', ['CIT', 'BTP'], 'Silence zones; fines; honk-free campaigns', 'ಮೌನ ವಲಯಗಳು; ದಂಡ; ಹಾರ್ನ್-ಮುಕ್ತ ಅಭಿಯಾನ', 'honking'],
  [27, 'behavior', 'High beam use at night', 'ರಾತ್ರಿ ಹೈ ಬೀಮ್ ಬಳಕೆ', 'yours', 'M', 'daily', 'enforcement', ['BTP', 'CIT'], 'Enforcement; awareness; anti-glare dividers', 'ಜಾರಿ; ಜಾಗೃತಿ; ಪ್ರಖರತೆ ತಡೆ ವಿಭಾಜಕಗಳು', 'nightLights'],
  [28, 'behavior', 'Bikes weaving and squeezing through gaps', 'ಬೈಕ್‌ಗಳು ಅಂಕುಡೊಂಕಾಗಿ ಸಂದುಗಳಲ್ಲಿ ನುಸುಳುವುದು', 'yours', 'H', 'daily', 'education', ['BTP', 'CIT'], 'Lane discipline enforcement; separate two-wheeler lanes where possible', 'ಲೇನ್ ಶಿಸ್ತು ಜಾರಿ; ಸಾಧ್ಯವಿರುವಲ್ಲಿ ಪ್ರತ್ಯೇಕ ದ್ವಿಚಕ್ರ ಲೇನ್', 'weaving'],
  [29, 'behavior', 'Lane cutting and weaving by all vehicle types', 'ಎಲ್ಲಾ ವಾಹನಗಳಿಂದ ಲೇನ್ ಕತ್ತರಿಸುವುದು', 'added', 'H', 'daily', 'enforcement', ['BTP'], 'Lane-discipline cameras; bus and fast lanes', 'ಲೇನ್ ಶಿಸ್ತು ಕ್ಯಾಮೆರಾ; ಬಸ್ ಮತ್ತು ವೇಗದ ಲೇನ್‌ಗಳು', 'weaving'],
  [30, 'behavior', 'Tailgating, no safe following distance', 'ಸುರಕ್ಷಿತ ಅಂತರವಿಲ್ಲದೆ ಹಿಂಬಾಲಿಸುವುದು', 'added', 'H', 'daily', 'education', ['CIT', 'BTP'], 'Awareness; speed-and-gap enforcement', 'ಜಾಗೃತಿ; ವೇಗ ಮತ್ತು ಅಂತರ ಜಾರಿ', 'tailgating'],
  [31, 'behavior', 'Sudden braking or stopping without warning', 'ಎಚ್ಚರಿಕೆ ಇಲ್ಲದೆ ಹಠಾತ್ ಬ್ರೇಕ್ / ನಿಲುಗಡೆ', 'added', 'M', 'daily', 'education', ['CIT'], 'Awareness; remove sources of sudden stops', 'ಜಾಗೃತಿ; ಹಠಾತ್ ನಿಲುಗಡೆಯ ಕಾರಣಗಳ ನಿವಾರಣೆ', 'tailgating'],
  [32, 'road', 'U-turns and right turns from the wrong lane', 'ತಪ್ಪು ಲೇನ್‌ನಿಂದ ಯು-ಟರ್ನ್ ಮತ್ತು ಬಲ ತಿರುವು', 'added', 'M', 'daily', 'civil', ['GBA', 'BTP'], 'Designated U-turn points and turn lanes', 'ನಿಗದಿತ ಯು-ಟರ್ನ್ ಸ್ಥಳ ಮತ್ತು ತಿರುವು ಲೇನ್‌ಗಳು', 'junctions'],
  [33, 'behavior', 'Driving on shoulder or footpath to bypass jams', 'ಜಾಮ್ ತಪ್ಪಿಸಲು ಫುಟ್‌ಪಾತ್ / ರಸ್ತೆ ಅಂಚಿನಲ್ಲಿ ಚಾಲನೆ', 'added', 'H', 'daily', 'enforcement', ['BTP', 'GBA'], 'Bollards; fines; footpath barriers', 'ಬೊಲ್ಲಾರ್ಡ್‌ಗಳು; ದಂಡ; ಫುಟ್‌ಪಾತ್ ತಡೆಗಳು', 'footpathRiding'],
  [34, 'behavior', 'Overtaking on the left or on blind curves', 'ಎಡದಿಂದ ಅಥವಾ ಕುರುಡು ತಿರುವಿನಲ್ಲಿ ಓವರ್‌ಟೇಕ್', 'added', 'H', 'common', 'enforcement', ['BTP'], 'No-overtaking lines; enforcement', 'ಓವರ್‌ಟೇಕ್ ನಿಷೇಧ ಗೆರೆಗಳು; ಜಾರಿ', 'weaving'],
  [35, 'behavior', 'Cars and buses stopping mid-road to pick up or drop off', 'ಪ್ರಯಾಣಿಕರಿಗಾಗಿ ರಸ್ತೆ ಮಧ್ಯೆ ನಿಲ್ಲುವ ಕಾರು ಮತ್ತು ಬಸ್‌ಗಳು', 'added', 'M', 'daily', 'civil', ['GBA', 'BMTC', 'BTP'], 'Bus bays; pick-up zones; no-stopping enforcement', 'ಬಸ್ ಬೇಗಳು; ಪಿಕ್‌ಅಪ್ ವಲಯಗಳು; ನಿಲುಗಡೆ ನಿಷೇಧ ಜಾರಿ', 'midStops'],
  [36, 'behavior', 'Speeding, especially on empty roads at night', 'ಅತಿವೇಗ, ವಿಶೇಷವಾಗಿ ರಾತ್ರಿ ಖಾಲಿ ರಸ್ತೆಗಳಲ್ಲಿ', 'added', 'H', 'common', 'enforcement', ['BTP'], 'Speed cameras; calming at hot spots', 'ವೇಗ ಕ್ಯಾಮೆರಾ; ಅಪಾಯದ ಸ್ಥಳಗಳಲ್ಲಿ ವೇಗ ನಿಯಂತ್ರಣ', 'speeding'],
  [37, 'behavior', 'Drunk driving late at night', 'ತಡರಾತ್ರಿ ಕುಡಿದು ಚಾಲನೆ', 'added', 'H', 'occasional', 'enforcement', ['BTP'], 'Checkpoints; breathalyser drives', 'ತಪಾಸಣಾ ಕೇಂದ್ರಗಳು; ಬ್ರೀತ್ ಅನಲೈಸರ್ ಅಭಿಯಾನ', 'speeding'],
  [38, 'behavior', 'Little yielding or courtesy at merges and junctions', 'ವಿಲೀನ ಮತ್ತು ಜಂಕ್ಷನ್‌ಗಳಲ್ಲಿ ದಾರಿ ಬಿಡದಿರುವುದು', 'added', 'M', 'daily', 'education', ['CIT', 'BTP'], 'Education; box junction markings', 'ಶಿಕ್ಷಣ; ಬಾಕ್ಸ್ ಜಂಕ್ಷನ್ ಗುರುತುಗಳು', 'junctions'],
  [39, 'behavior', 'Treating lane markings and signals as optional', 'ಲೇನ್ ಗುರುತು ಮತ್ತು ಸಿಗ್ನಲ್‌ಗಳನ್ನು ಐಚ್ಛಿಕವೆಂದು ಭಾವಿಸುವುದು', 'added', 'H', 'daily', 'enforcement', ['BTP'], 'Consistent enforcement; visible penalties', 'ನಿರಂತರ ಜಾರಿ; ಗೋಚರ ದಂಡ', 'signalJump'],
  [40, 'peds', 'Stopping on zebra crossings or past the stop line', 'ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಮೇಲೆ ಅಥವಾ ಸ್ಟಾಪ್ ಲೈನ್ ದಾಟಿ ನಿಲ್ಲುವುದು', 'added', 'M', 'daily', 'enforcement', ['BTP'], 'Camera enforcement; paint stop lines clearly', 'ಕ್ಯಾಮೆರಾ ಜಾರಿ; ಸ್ಪಷ್ಟ ಸ್ಟಾಪ್ ಲೈನ್', 'crossings'],
  [41, 'behavior', 'Fatigue driving (long-haul trucks, cabs at night)', 'ದಣಿವಿನ ಚಾಲನೆ (ಲಾರಿಗಳು, ರಾತ್ರಿ ಕ್ಯಾಬ್‌ಗಳು)', 'added', 'H', 'common', 'enforcement', ['RTO', 'BTP'], 'Driver hours rules; rest stops', 'ಚಾಲನಾ ಅವಧಿ ನಿಯಮ; ವಿಶ್ರಾಂತಿ ತಾಣಗಳು', 'speeding'],
  [42, 'behavior', 'Hazard lights misused or never used', 'ಹಜಾರ್ಡ್ ದೀಪಗಳ ದುರ್ಬಳಕೆ ಅಥವಾ ಬಳಸದಿರುವುದು', 'added', 'L', 'common', 'education', ['CIT'], 'Driver education', 'ಚಾಲಕ ಶಿಕ್ಷಣ', 'tailgating'],
  [43, 'behavior', 'Reversing into traffic', 'ಸಂಚಾರದೊಳಗೆ ಹಿಮ್ಮುಖ ಚಾಲನೆ', 'added', 'M', 'common', 'education', ['CIT'], 'Education; spotters for commercial vehicles', 'ಶಿಕ್ಷಣ; ವಾಣಿಜ್ಯ ವಾಹನಗಳಿಗೆ ಮಾರ್ಗದರ್ಶಕರು', 'tailgating'],
  [44, 'behavior', 'Triple riding; children unprotected on two-wheelers', 'ತ್ರಿಬಲ್ ರೈಡಿಂಗ್; ದ್ವಿಚಕ್ರದಲ್ಲಿ ಅಸುರಕ್ಷಿತ ಮಕ್ಕಳು', 'added', 'H', 'daily', 'enforcement', ['BTP'], 'Enforcement; child helmet and seat rules', 'ಜಾರಿ; ಮಕ್ಕಳ ಹೆಲ್ಮೆಟ್ ಮತ್ತು ಆಸನ ನಿಯಮ', 'safetyGear'],
  [45, 'behavior', 'No helmets', 'ಹೆಲ್ಮೆಟ್ ಇಲ್ಲ', 'yours', 'H', 'daily', 'enforcement', ['BTP'], 'Helmet checkpoints; camera-based detection; strict follow-up', 'ಹೆಲ್ಮೆಟ್ ತಪಾಸಣೆ; ಕ್ಯಾಮೆರಾ ಪತ್ತೆ; ಕಟ್ಟುನಿಟ್ಟಿನ ಕ್ರಮ', 'safetyGear'],
  [46, 'behavior', 'No seatbelts', 'ಸೀಟ್‌ಬೆಲ್ಟ್ ಇಲ್ಲ', 'yours', 'H', 'daily', 'enforcement', ['BTP'], 'Camera detection; rear seatbelt enforcement', 'ಕ್ಯಾಮೆರಾ ಪತ್ತೆ; ಹಿಂಬದಿ ಸೀಟ್‌ಬೆಲ್ಟ್ ಜಾರಿ', 'safetyGear'],
  [47, 'peds', 'Pedestrians crossing anywhere, no gaps given', 'ಎಲ್ಲೆಂದರಲ್ಲಿ ರಸ್ತೆ ದಾಟುವ ಪಾದಚಾರಿಗಳು, ದಾರಿ ಕೊಡದ ವಾಹನಗಳು', 'added', 'M', 'daily', 'civil', ['GBA', 'CIT'], 'Crossings every few hundred metres; fences on medians', 'ಕೆಲವು ನೂರು ಮೀಟರ್‌ಗೊಮ್ಮೆ ಕ್ರಾಸಿಂಗ್; ಮೀಡಿಯನ್‌ಗಳಲ್ಲಿ ಬೇಲಿ', 'crossings'],
  [48, 'vehicles', 'No lights or partial lights on vehicles', 'ವಾಹನಗಳಿಗೆ ದೀಪಗಳಿಲ್ಲ ಅಥವಾ ಅರ್ಧ ದೀಪಗಳು', 'yours', 'H', 'daily', 'vehicle', ['RTO', 'BTP'], 'Roadworthiness checks; fines for missing lights', 'ವಾಹನ ಸಾಮರ್ಥ್ಯ ತಪಾಸಣೆ; ದೀಪವಿಲ್ಲದಿದ್ದರೆ ದಂಡ', 'nightLights'],
  [49, 'vehicles', 'Trucks (speed, size, mixed with small vehicles)', 'ಲಾರಿಗಳು (ವೇಗ, ಗಾತ್ರ, ಸಣ್ಣ ವಾಹನಗಳೊಂದಿಗೆ ಮಿಶ್ರಣ)', 'yours', 'H', 'daily', 'enforcement', ['BTP', 'RTO'], 'Time-based truck entry; truck lanes', 'ಸಮಯಾಧಾರಿತ ಲಾರಿ ಪ್ರವೇಶ; ಲಾರಿ ಲೇನ್‌ಗಳು', 'heavy'],
  [50, 'vehicles', 'Overloaded trucks', 'ಅತಿಭಾರದ ಲಾರಿಗಳು', 'yours', 'H', 'common', 'vehicle', ['RTO'], 'Weighbridges; fines; permit checks', 'ತೂಕ ಸೇತುವೆ; ದಂಡ; ಪರವಾನಗಿ ತಪಾಸಣೆ', 'heavy'],
  [51, 'vehicles', 'Oversize cargo sticking out', 'ಹೊರಚಾಚಿದ ದೊಡ್ಡ ಸರಕು', 'yours', 'H', 'common', 'vehicle', ['RTO', 'BTP'], 'Red flags, lights and escort rules; enforcement', 'ಕೆಂಪು ಬಾವುಟ, ದೀಪ ಮತ್ತು ಬೆಂಗಾವಲು ನಿಯಮ; ಜಾರಿ', 'cargo'],
  [52, 'vehicles', 'Stopped vehicles in the lane (breakdown, parked)', 'ಲೇನ್‌ನಲ್ಲಿ ನಿಂತ ವಾಹನಗಳು (ಕೆಟ್ಟು ನಿಂತ, ಪಾರ್ಕ್ ಮಾಡಿದ)', 'yours', 'H', 'daily', 'enforcement', ['BTP'], 'Quick tow response; reflective triangles; no-parking enforcement', 'ತ್ವರಿತ ಟೋಯಿಂಗ್; ಪ್ರತಿಫಲಕ ತ್ರಿಕೋನ; ನೋ-ಪಾರ್ಕಿಂಗ್ ಜಾರಿ', 'breakdowns'],
  [53, 'vehicles', 'Slow-moving vehicles in fast lanes', 'ವೇಗದ ಲೇನ್‌ನಲ್ಲಿ ನಿಧಾನ ವಾಹನಗಳು', 'yours', 'M', 'daily', 'civil', ['BTP'], 'Slow-vehicle restrictions; keep-left rules', 'ನಿಧಾನ ವಾಹನ ನಿರ್ಬಂಧ; ಎಡಕ್ಕೆ ಇರಿ ನಿಯಮ', 'heavy'],
  [54, 'vehicles', 'Missing tail lights, brake lights, reflectors (trucks, tractors, carts)', 'ಟೈಲ್ ಲೈಟ್, ಬ್ರೇಕ್ ಲೈಟ್, ರಿಫ್ಲೆಕ್ಟರ್ ಇಲ್ಲದ ಲಾರಿ, ಟ್ರ್ಯಾಕ್ಟರ್, ಗಾಡಿಗಳು', 'added', 'H', 'daily', 'vehicle', ['RTO'], 'Mandatory reflectors; inspections', 'ಕಡ್ಡಾಯ ರಿಫ್ಲೆಕ್ಟರ್; ತಪಾಸಣೆ', 'nightLights'],
  [55, 'vehicles', 'Dark vehicles with no reflective tape at night', 'ರಾತ್ರಿ ಪ್ರತಿಫಲಕ ಟೇಪ್ ಇಲ್ಲದ ಕಪ್ಪು ವಾಹನಗಳು', 'added', 'H', 'common', 'vehicle', ['RTO'], 'Retroreflective tape mandate', 'ಪ್ರತಿಫಲಕ ಟೇಪ್ ಕಡ್ಡಾಯ', 'nightLights'],
  [56, 'vehicles', 'Unsecured loads (pipes, sheets, bricks, sand)', 'ಭದ್ರಪಡಿಸದ ಸರಕು (ಪೈಪ್, ಶೀಟ್, ಇಟ್ಟಿಗೆ, ಮರಳು)', 'added', 'H', 'common', 'vehicle', ['RTO', 'BTP'], 'Load securing rules; enforcement', 'ಸರಕು ಭದ್ರತಾ ನಿಯಮ; ಜಾರಿ', 'cargo'],
  [57, 'vehicles', 'Water tankers and construction vehicles driving fast', 'ವೇಗವಾಗಿ ಓಡುವ ನೀರಿನ ಟ್ಯಾಂಕರ್ ಮತ್ತು ನಿರ್ಮಾಣ ವಾಹನಗಳು', 'added', 'M', 'common', 'enforcement', ['BTP', 'RTO'], 'Speed limiters; GPS monitoring', 'ವೇಗ ಮಿತಿಕಾರಕ; ಜಿಪಿಎಸ್ ನಿಗಾ', 'heavy'],
  [58, 'vehicles', 'Tractors, carts, handcarts in mixed traffic', 'ಮಿಶ್ರ ಸಂಚಾರದಲ್ಲಿ ಟ್ರ್ಯಾಕ್ಟರ್, ಗಾಡಿ, ತಳ್ಳುಗಾಡಿಗಳು', 'added', 'M', 'common', 'civil', ['BTP', 'GBA'], 'Time/route restrictions', 'ಸಮಯ / ಮಾರ್ಗ ನಿರ್ಬಂಧ', 'heavy'],
  [59, 'vehicles', 'Worn tyres and bad brakes', 'ಸವೆದ ಟೈರ್ ಮತ್ತು ಕೆಟ್ಟ ಬ್ರೇಕ್', 'added', 'H', 'common', 'vehicle', ['RTO'], 'Fitness certification; roadside checks', 'ಫಿಟ್ನೆಸ್ ಪ್ರಮಾಣಪತ್ರ; ರಸ್ತೆಬದಿ ತಪಾಸಣೆ', 'breakdowns'],
  [60, 'vehicles', 'Illegal modifications (loud exhausts, tinted glass)', 'ಅಕ್ರಮ ಮಾರ್ಪಾಡುಗಳು (ಜೋರು ಸೈಲೆನ್ಸರ್, ಕಪ್ಪು ಗಾಜು)', 'added', 'L', 'common', 'vehicle', ['RTO', 'BTP'], 'Enforcement; noise cameras', 'ಜಾರಿ; ಶಬ್ದ ಕ್ಯಾಮೆರಾ', 'honking'],
  [61, 'vehicles', 'Buses and autos with broken doors or overloaded passengers', 'ಮುರಿದ ಬಾಗಿಲು ಅಥವಾ ಕಿಕ್ಕಿರಿದ ಬಸ್ ಮತ್ತು ಆಟೋಗಳು', 'added', 'M', 'common', 'vehicle', ['RTO', 'BMTC'], 'Inspections; permit conditions', 'ತಪಾಸಣೆ; ಪರವಾನಗಿ ಷರತ್ತುಗಳು', 'midStops'],
  [62, 'vehicles', 'Fog lights or LED bars used in town', 'ನಗರದಲ್ಲಿ ಫಾಗ್ ಲೈಟ್ ಅಥವಾ LED ಬಾರ್ ಬಳಕೆ', 'added', 'M', 'common', 'vehicle', ['RTO', 'BTP'], 'Enforcement; awareness', 'ಜಾರಿ; ಜಾಗೃತಿ', 'nightLights'],
  [63, 'others', 'Stray animals on roads', 'ರಸ್ತೆಗಳಲ್ಲಿ ಬೀಡಾಡಿ ಪ್ರಾಣಿಗಳು', 'added', 'H', 'daily', 'civil', ['GBA'], 'Animal control; shelters; fencing on highways', 'ಪ್ರಾಣಿ ನಿಯಂತ್ರಣ; ಗೋಶಾಲೆ / ಆಶ್ರಯ; ಹೆದ್ದಾರಿ ಬೇಲಿ', 'animals'],
  [64, 'peds', 'People, joggers, kids walking on the road (no footpath)', 'ಫುಟ್‌ಪಾತ್ ಇಲ್ಲದೆ ರಸ್ತೆಯಲ್ಲೇ ನಡೆಯುವ ಜನ, ಜಾಗರ್‌ಗಳು, ಮಕ್ಕಳು', 'added', 'H', 'daily', 'civil', ['GBA'], 'Provide footpaths; separate walkways', 'ಫುಟ್‌ಪಾತ್ ಒದಗಿಸಿ; ಪ್ರತ್ಯೇಕ ನಡಿಗೆ ಮಾರ್ಗ', 'footpaths'],
  [65, 'others', 'Delivery riders rushing, wrong side, on phones', 'ಅವಸರದ ಡೆಲಿವರಿ ಸವಾರರು, ವಿರುದ್ಧ ದಿಕ್ಕು, ಫೋನ್ ಬಳಕೆ', 'added', 'M', 'daily', 'enforcement', ['BTP', 'CIT'], 'Platform rules and penalties; training', 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ನಿಯಮ ಮತ್ತು ದಂಡ; ತರಬೇತಿ', 'phones'],
  [66, 'others', 'Cyclists with no lights or reflectors', 'ದೀಪ / ರಿಫ್ಲೆಕ್ಟರ್ ಇಲ್ಲದ ಸೈಕಲ್ ಸವಾರರು', 'added', 'M', 'common', 'vehicle', ['RTO', 'CIT'], 'Light and reflector rules', 'ದೀಪ ಮತ್ತು ರಿಫ್ಲೆಕ್ಟರ್ ನಿಯಮ', 'nightLights'],
  [67, 'others', 'School buses stopping unpredictably', 'ಅನಿರೀಕ್ಷಿತವಾಗಿ ನಿಲ್ಲುವ ಶಾಲಾ ಬಸ್‌ಗಳು', 'added', 'M', 'daily', 'civil', ['GBA', 'RTO'], 'Designated school stops', 'ನಿಗದಿತ ಶಾಲಾ ನಿಲ್ದಾಣಗಳು', 'midStops'],
  [68, 'peds', 'Street vendors and carts blocking lanes', 'ಲೇನ್ ಅಡ್ಡಗಟ್ಟುವ ಬೀದಿ ವ್ಯಾಪಾರಿಗಳು ಮತ್ತು ಗಾಡಿಗಳು', 'added', 'L', 'daily', 'civil', ['GBA'], 'Vending zones', 'ವ್ಯಾಪಾರ ವಲಯಗಳು', 'footpaths'],
  [69, 'signals', "Signal timings that don't match traffic flow", 'ಸಂಚಾರಕ್ಕೆ ಹೊಂದದ ಸಿಗ್ನಲ್ ಸಮಯ', 'added', 'M', 'daily', 'signals', ['BTP'], 'Adaptive signal timing', 'ಹೊಂದಾಣಿಕೆಯ (ಅಡಾಪ್ಟಿವ್) ಸಿಗ್ನಲ್ ಸಮಯ', 'signals'],
  [70, 'signals', 'Non-functioning or unsynchronized signals', 'ಕೆಲಸ ಮಾಡದ ಅಥವಾ ಹೊಂದಾಣಿಕೆ ಇಲ್ಲದ ಸಿಗ್ನಲ್‌ಗಳು', 'added', 'H', 'common', 'signals', ['BTP', 'BESCOM'], 'Maintenance SLA; green wave coordination', 'ನಿರ್ವಹಣಾ ಗಡುವು; ಗ್ರೀನ್ ವೇವ್ ಸಮನ್ವಯ', 'signals'],
  [71, 'signals', 'Signal lights dim or hard to see in sun', 'ಬಿಸಿಲಿನಲ್ಲಿ ಕಾಣದ ಮಂದ ಸಿಗ್ನಲ್ ದೀಪಗಳು', 'added', 'M', 'common', 'signals', ['BTP'], 'LED upgrades; hoods; extra heads', 'LED ಉನ್ನತೀಕರಣ; ಹುಡ್‌ಗಳು; ಹೆಚ್ಚುವರಿ ದೀಪಗಳು', 'signals'],
  [72, 'signals', 'No visible enforcement, or only on small violations', 'ಕಾಣುವ ಜಾರಿ ಇಲ್ಲ, ಅಥವಾ ಸಣ್ಣ ಉಲ್ಲಂಘನೆಗಳಿಗೆ ಮಾತ್ರ', 'added', 'H', 'daily', 'enforcement', ['BTP'], 'Risk-based enforcement; visibility', 'ಅಪಾಯ ಆಧಾರಿತ ಜಾರಿ; ಗೋಚರತೆ', 'enforcement'],
  [73, 'signals', 'Little penalty or follow-up for repeat offenders', 'ಪುನರಾವರ್ತಿತ ಉಲ್ಲಂಘಕರಿಗೆ ಕಡಿಮೆ ದಂಡ ಅಥವಾ ಕ್ರಮ', 'added', 'H', 'daily', 'enforcement', ['BTP', 'RTO'], 'Point system; licence suspension', 'ಅಂಕ ವ್ಯವಸ್ಥೆ; ಪರವಾನಗಿ ಅಮಾನತು', 'enforcement'],
  [74, 'signals', 'Cameras present but no consistent action', 'ಕ್ಯಾಮೆರಾಗಳಿದ್ದರೂ ನಿರಂತರ ಕ್ರಮವಿಲ್ಲ', 'added', 'M', 'daily', 'enforcement', ['BTP'], 'Automated challan delivery', 'ಸ್ವಯಂಚಾಲಿತ ಚಲನ್ ವಿತರಣೆ', 'enforcement'],
  [75, 'signals', 'No emergency lane clearing for ambulances and fire trucks', 'ಆಂಬ್ಯುಲೆನ್ಸ್, ಅಗ್ನಿಶಾಮಕ ವಾಹನಗಳಿಗೆ ದಾರಿ ಬಿಡದಿರುವುದು', 'added', 'H', 'common', 'enforcement', ['BTP', 'CIT'], 'Corridors; awareness; siren-yield drives', 'ಗ್ರೀನ್ ಕಾರಿಡಾರ್; ಜಾಗೃತಿ; ಸೈರನ್‌ಗೆ ದಾರಿ ಅಭಿಯಾನ', 'emergency'],
  [76, 'signals', 'Poor roadside assistance and breakdown protocol', 'ಕಳಪೆ ರಸ್ತೆಬದಿ ನೆರವು ಮತ್ತು ವಾಹನ ಕೆಟ್ಟಾಗಿನ ಕ್ರಮ', 'added', 'M', 'common', 'enforcement', ['BTP'], 'Helplines; tow trucks', 'ಸಹಾಯವಾಣಿ; ಟೋ ವಾಹನಗಳು', 'breakdowns'],
  [77, 'environment', 'Dust, smoke or fog reducing visibility', 'ಧೂಳು, ಹೊಗೆ ಅಥವಾ ಮಂಜಿನಿಂದ ಕಡಿಮೆ ಗೋಚರತೆ', 'added', 'M', 'seasonal', 'self', ['CIT'], 'Slow down; use proper lights; adjust timing', 'ನಿಧಾನವಾಗಿ ಚಲಿಸಿ; ಸರಿಯಾದ ದೀಪ ಬಳಸಿ; ಸಮಯ ಹೊಂದಿಸಿ', 'haze'],
  [78, 'environment', 'Heavy rain reducing visibility and grip', 'ಭಾರಿ ಮಳೆಯಿಂದ ಕಡಿಮೆ ಗೋಚರತೆ ಮತ್ತು ಹಿಡಿತ', 'added', 'M', 'seasonal', 'self', ['CIT'], 'Slow down, keep bigger gaps, maintain wipers and tyres', 'ನಿಧಾನವಾಗಿ ಚಲಿಸಿ, ಹೆಚ್ಚು ಅಂತರ ಇಡಿ, ವೈಪರ್ ಮತ್ತು ಟೈರ್ ಸರಿಯಾಗಿಡಿ', 'env:rain'],
  [79, 'environment', 'Sun glare at sunrise and sunset', 'ಸೂರ್ಯೋದಯ / ಸೂರ್ಯಾಸ್ತದ ಪ್ರಖರ ಬಿಸಿಲು', 'added', 'L', 'common', 'self', ['CIT'], 'Sun visors and sunglasses; slow down on east–west roads', 'ಸನ್ ವೈಸರ್ ಮತ್ತು ಕನ್ನಡಕ; ಪೂರ್ವ–ಪಶ್ಚಿಮ ರಸ್ತೆಗಳಲ್ಲಿ ನಿಧಾನ', 'haze'],
  [80, 'environment', 'Festivals, processions, matches and big events', 'ಹಬ್ಬ, ಮೆರವಣಿಗೆ, ಕ್ರಿಕೆಟ್ ಪಂದ್ಯ ಮತ್ತು ದೊಡ್ಡ ಕಾರ್ಯಕ್ರಮಗಳು', 'added', 'M', 'occasional', 'enforcement', ['BTP', 'BMTC'], 'Event traffic plans; shuttles and parking plans; staggered exits', 'ಕಾರ್ಯಕ್ರಮ ಸಂಚಾರ ಯೋಜನೆ; ಶಟಲ್ ಮತ್ತು ಪಾರ್ಕಿಂಗ್ ಯೋಜನೆ; ಹಂತ ಹಂತದ ನಿರ್ಗಮನ', 'env:event'],
  [81, 'road', 'Metro and flyover works narrowing roads for years', 'ವರ್ಷಗಟ್ಟಲೆ ರಸ್ತೆ ಕಿರಿದಾಗಿಸುವ ಮೆಟ್ರೋ ಮತ್ತು ಫ್ಲೈಓವರ್ ಕಾಮಗಾರಿ', 'new', 'H', 'common', 'civil', ['BMRCL', 'GBA'], 'Phased works with fixed deadlines; restore lanes and footpaths quickly', 'ನಿಗದಿತ ಗಡುವಿನೊಂದಿಗೆ ಹಂತ ಹಂತದ ಕಾಮಗಾರಿ; ಲೇನ್ ಮತ್ತು ಫುಟ್‌ಪಾತ್ ಬೇಗ ಮರುಸ್ಥಾಪನೆ', 'workZones'],
  [82, 'road', 'Garbage and debris piles at the road edge', 'ರಸ್ತೆ ಅಂಚಿನಲ್ಲಿ ಕಸ ಮತ್ತು ಕಟ್ಟಡ ಅವಶೇಷಗಳ ರಾಶಿ', 'new', 'M', 'common', 'civil', ['GBA', 'CIT'], 'Scheduled clearance; blackspot cameras; fines for dumping', 'ನಿಯಮಿತ ತೆರವು; ಕಸದ ಬ್ಲ್ಯಾಕ್‌ಸ್ಪಾಟ್ ಕ್ಯಾಮೆರಾ; ಎಸೆಯುವವರಿಗೆ ದಂಡ', 'obstacles'],
  [83, 'road', 'Underpass flooding at known spots', 'ಗೊತ್ತಿರುವ ಸ್ಥಳಗಳಲ್ಲಿ ಅಂಡರ್‌ಪಾಸ್ ಪ್ರವಾಹ', 'new', 'H', 'seasonal', 'civil', ['GBA', 'BWSSB'], 'Pumps, water-level sensors and closure alerts', 'ಪಂಪ್, ನೀರಿನ ಮಟ್ಟದ ಸೆನ್ಸರ್ ಮತ್ತು ಮುಚ್ಚುವಿಕೆ ಎಚ್ಚರಿಕೆ', 'waterlogging'],
  [84, 'environment', 'Peak-hour surges at tech corridors (ORR, Whitefield, E-City)', 'ಟೆಕ್ ಕಾರಿಡಾರ್‌ಗಳಲ್ಲಿ ಪೀಕ್ ಅವರ್ ದಟ್ಟಣೆ (ಹೊರ ವರ್ತುಲ ರಸ್ತೆ, ವೈಟ್‌ಫೀಲ್ಡ್, ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ)', 'new', 'H', 'daily', 'planning', ['BTP', 'BMTC'], 'Staggered office hours, company shuttles, work-from-home days', 'ಹಂತದ ಕಚೇರಿ ಸಮಯ, ಕಂಪನಿ ಶಟಲ್, ಮನೆಯಿಂದ ಕೆಲಸದ ದಿನಗಳು', 'demand'],
  [85, 'environment', 'Poor last-mile public transport pushes people into private vehicles', 'ಕಳಪೆ ಕೊನೆಯ-ಮೈಲಿ ಸಾರಿಗೆ ಜನರನ್ನು ಖಾಸಗಿ ವಾಹನಗಳತ್ತ ತಳ್ಳುತ್ತದೆ', 'new', 'H', 'daily', 'planning', ['BMTC', 'BMRCL'], 'Feeder buses, metro-linked bikes/autos, many more BMTC buses', 'ಫೀಡರ್ ಬಸ್, ಮೆಟ್ರೋ ಸಂಪರ್ಕಿತ ಬೈಕ್ / ಆಟೋ, ಇನ್ನಷ್ಟು ಬಿಎಂಟಿಸಿ ಬಸ್‌ಗಳು', 'demand'],
];

export const ISSUES: Issue[] = R.map(([id, cat, en, kn, src, sev, freq, owner, ag, fixEn, fixKn, slider]) => ({
  id, cat, en, kn, src, sev, freq, owner, ag, fixEn, fixKn, slider,
}));

export const SEV_LABEL: Record<Sev, { en: string; kn: string }> = {
  H: { en: 'High', kn: 'ಹೆಚ್ಚು' }, M: { en: 'Medium', kn: 'ಮಧ್ಯಮ' }, L: { en: 'Low', kn: 'ಕಡಿಮೆ' },
};
export const FREQ_LABEL: Record<Freq, { en: string; kn: string }> = {
  daily: { en: 'Daily', kn: 'ದಿನನಿತ್ಯ' }, common: { en: 'Common', kn: 'ಸಾಮಾನ್ಯ' },
  occasional: { en: 'Occasional', kn: 'ಆಗಾಗ' }, seasonal: { en: 'Seasonal', kn: 'ಋತುಮಾನ' },
};
