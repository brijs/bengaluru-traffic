import type { CategoryId } from './issues';

// Level: 0 None · 1 Low · 2 Med · 3 High
export type Level = 0 | 1 | 2 | 3;

export interface Weights { f: number; s: number; c: number; p: number } // flow, safety, comfort, pedestrian (impact at High)

export type Spot = { a: string; b: string; t: number } | null;

export type FixKind = 'repair' | 'paint' | 'tow' | 'remove' | 'light' | 'police' | 'drain' | 'shelter' | 'bus' | 'signal' | 'educate';

export interface SliderDef {
  id: string; cat: CategoryId; icon: string; issues: number[]; def: Level;
  en: string; kn: string; dEn: string; dKn: string;
  w: Weights;
  behaviour?: boolean;           // amplified by weak enforcement
  night?: 'only' | 'boost';      // matters only / more after dark
  rain?: boolean;                // only active when raining
  counts?: [number, number, number, number]; // hazard instances per level
  spot: Spot; zoom?: number;     // preview camera target + distance
  fix: FixKind;
}

export const SLIDERS: SliderDef[] = [
  // ── Road & infrastructure
  { id: 'potholes', cat: 'road', icon: '🕳️', issues: [1], def: 3, en: 'Potholes', kn: 'ರಸ್ತೆ ಗುಂಡಿಗಳು',
    dEn: 'Vehicles crawl and swerve around craters; two-wheelers fall.', dKn: 'ಗುಂಡಿಗಳ ಸುತ್ತ ವಾಹನಗಳು ತೆವಳುತ್ತವೆ, ಓರೆಯಾಗುತ್ತವೆ; ದ್ವಿಚಕ್ರ ಸವಾರರು ಬೀಳುತ್ತಾರೆ.',
    w: { f: .12, s: .10, c: .06, p: 0 }, counts: [0, 12, 26, 44], spot: { a: 'varthur', b: 'gunjur', t: .5 }, fix: 'repair' },
  { id: 'bumps', cat: 'road', icon: '〰️', issues: [2], def: 3, en: 'Bad speed bumps', kn: 'ಕೆಟ್ಟ ರಸ್ತೆ ಉಬ್ಬುಗಳು',
    dEn: 'Unmarked humps cause sudden hard braking and rear-end bumps.', dKn: 'ಗುರುತಿಲ್ಲದ ಉಬ್ಬುಗಳಿಂದ ಹಠಾತ್ ಬ್ರೇಕ್ ಮತ್ತು ಹಿಂಬದಿ ಡಿಕ್ಕಿ.',
    w: { f: .05, s: .05, c: .04, p: 0 }, counts: [0, 5, 10, 16], spot: { a: 'silk_board', b: 'hsr', t: .5 }, fix: 'paint' },
  { id: 'markings', cat: 'road', icon: '🛣️', issues: [3, 8, 11], def: 3, en: 'Faded lanes & missing signs', kn: 'ಮಾಸಿದ ಲೇನ್ ಗೆರೆ ಮತ್ತು ಫಲಕಗಳು',
    dEn: 'Without lines, vehicles drift and squeeze — merges turn into fights.', dKn: 'ಗೆರೆಗಳಿಲ್ಲದೆ ವಾಹನಗಳು ಅಡ್ಡಾದಿಡ್ಡಿ — ವಿಲೀನಗಳು ಜಗಳವಾಗುತ್ತವೆ.',
    w: { f: .05, s: .06, c: .02, p: .01 }, spot: { a: 'trinity', b: 'domlur', t: .5 }, fix: 'paint' },
  { id: 'darkRoads', cat: 'road', icon: '🌑', issues: [4, 14], def: 2, night: 'only', en: 'Dark roads & unlit medians', kn: 'ಕತ್ತಲೆ ರಸ್ತೆ ಮತ್ತು ಬೆಳಕಿಲ್ಲದ ಮೀಡಿಯನ್',
    dEn: 'At night, people, cattle and kerbs become invisible.', dKn: 'ರಾತ್ರಿ ಜನ, ಜಾನುವಾರು, ಕರ್ಬ್‌ಗಳು ಕಾಣಿಸುವುದಿಲ್ಲ.',
    w: { f: .01, s: .10, c: .02, p: .08 }, counts: [0, 4, 9, 15], spot: { a: 'bellandur', b: 'ibblur', t: .5 }, fix: 'light' },
  { id: 'obstacles', cat: 'road', icon: '🚧', issues: [6, 18, 82], def: 2, en: 'Protruding barriers & road-edge obstacles', kn: 'ಚಾಚಿದ ಬ್ಯಾರಿಕೇಡ್ ಮತ್ತು ಅಂಚಿನ ಅಡ್ಡಿಗಳು',
    dEn: 'Barricades, poles and garbage piles eat a lane and cause sudden swerves.', dKn: 'ಬ್ಯಾರಿಕೇಡ್, ಕಂಬ, ಕಸದ ರಾಶಿ ಲೇನ್ ನುಂಗುತ್ತವೆ; ಹಠಾತ್ ತಿರುವು.',
    w: { f: .05, s: .06, c: .02, p: 0 }, counts: [0, 5, 10, 17], spot: { a: 'silk_board', b: 'btm', t: .3 }, fix: 'remove' },
  { id: 'workZones', cat: 'road', icon: '⛏️', issues: [9, 12, 13, 17, 81], def: 2, en: 'Dug-up roads & work zones', kn: 'ಅಗೆದ ರಸ್ತೆ ಮತ್ತು ಕಾಮಗಾರಿ ವಲಯ',
    dEn: 'Trenches, open manholes and mud close lanes with no warning.', dKn: 'ಕಂದಕ, ತೆರೆದ ಮ್ಯಾನ್‌ಹೋಲ್, ಮಣ್ಣು — ಎಚ್ಚರಿಕೆ ಇಲ್ಲದೆ ಲೇನ್ ಬಂದ್.',
    w: { f: .08, s: .06, c: .03, p: .04 }, counts: [0, 3, 7, 11], spot: { a: 'silk_board', b: 'bommanahalli', t: .45 }, fix: 'repair' },
  { id: 'waterlogging', cat: 'road', icon: '🌊', issues: [10, 83], def: 2, rain: true, en: 'Waterlogging (when it rains)', kn: 'ನೀರು ನಿಲ್ಲುವುದು (ಮಳೆಯಾದಾಗ)',
    dEn: 'Flooded dips stall vehicles and freeze whole corridors.', dKn: 'ಮುಳುಗಿದ ತಗ್ಗುಗಳಲ್ಲಿ ವಾಹನಗಳು ನಿಲ್ಲುತ್ತವೆ, ಇಡೀ ಮಾರ್ಗ ಸ್ತಬ್ಧ.',
    w: { f: .15, s: .05, c: .05, p: .03 }, counts: [0, 4, 8, 13], spot: { a: 'agara', b: 'silk_board', t: .72 }, fix: 'drain' },
  { id: 'junctions', cat: 'road', icon: '✖️', issues: [15, 16, 19, 20, 32, 38], def: 2, en: 'Poor junctions & merges', kn: 'ಕಳಪೆ ಜಂಕ್ಷನ್ ಮತ್ತು ವಿಲೀನ',
    dEn: 'No turn lanes, no yielding: vehicles block the box and gridlock spreads.', dKn: 'ತಿರುವು ಲೇನ್ ಇಲ್ಲ, ದಾರಿ ಬಿಡುವುದಿಲ್ಲ: ಜಂಕ್ಷನ್ ಬಂದ್, ಗ್ರಿಡ್‌ಲಾಕ್ ಹರಡುತ್ತದೆ.',
    w: { f: .08, s: .05, c: .02, p: .02 }, counts: [0, 3, 6, 10], spot: { a: 'mekhri', b: 'hebbal', t: .92 }, fix: 'paint' },
  { id: 'parking', cat: 'road', icon: '🅿️', issues: [21], def: 3, en: 'Roadside parking', kn: 'ರಸ್ತೆಬದಿ ಪಾರ್ಕಿಂಗ್',
    dEn: 'Parked cars swallow the left lane on busy roads.', dKn: 'ನಿಲ್ಲಿಸಿದ ಕಾರುಗಳು ಜನನಿಬಿಡ ರಸ್ತೆಗಳ ಎಡ ಲೇನ್ ನುಂಗುತ್ತವೆ.',
    w: { f: .09, s: .02, c: .03, p: .04 }, counts: [0, 6, 13, 22], spot: { a: 'south_end', b: 'jayanagar', t: .6 }, fix: 'tow' },
  // ── Pedestrians
  { id: 'footpaths', cat: 'peds', icon: '🚶', issues: [5, 64, 68], def: 3, en: 'No / blocked footpaths', kn: 'ಫುಟ್‌ಪಾತ್ ಇಲ್ಲ / ಅಡ್ಡಿ',
    dEn: 'Pedestrians and vendors spill into the lane; a lane is lost.', dKn: 'ಪಾದಚಾರಿಗಳು ಮತ್ತು ವ್ಯಾಪಾರಿಗಳು ಲೇನ್‌ಗೆ — ಒಂದು ಲೇನ್ ನಷ್ಟ.',
    w: { f: .05, s: .02, c: .01, p: .20 }, counts: [0, 3, 6, 10], spot: { a: 'malleswaram', b: 'majestic', t: .3 }, fix: 'repair' },
  { id: 'crossings', cat: 'peds', icon: '🦓', issues: [7, 40, 47], def: 3, en: 'No zebra crossings / jaywalking', kn: 'ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಇಲ್ಲ / ಎಲ್ಲೆಂದರಲ್ಲಿ ದಾಟುವುದು',
    dEn: 'People dash across mid-block; drivers slam the brakes.', dKn: 'ಜನ ಮಧ್ಯದಲ್ಲೇ ಓಡಿ ದಾಟುತ್ತಾರೆ; ಚಾಲಕರು ಹಠಾತ್ ಬ್ರೇಕ್ ಹಾಕುತ್ತಾರೆ.',
    w: { f: .04, s: .03, c: .01, p: .18 }, spot: { a: 'majestic', b: 'kr_circle', t: .3 }, fix: 'paint' },
  // ── Driver behaviour
  { id: 'signalJump', cat: 'behavior', icon: '🚨', issues: [22, 39], def: 3, behaviour: true, en: 'Signal jumping', kn: 'ಸಿಗ್ನಲ್ ಜಂಪಿಂಗ್',
    dEn: 'Red-light runners cause T-bone crashes at junctions.', dKn: 'ಕೆಂಪು ದೀಪ ದಾಟುವವರಿಂದ ಜಂಕ್ಷನ್‌ಗಳಲ್ಲಿ ಡಿಕ್ಕಿ.',
    w: { f: .02, s: .10, c: .02, p: .06 }, spot: { a: 'anil_kumble', b: 'trinity', t: .9 }, fix: 'police' },
  { id: 'wrongWay', cat: 'behavior', icon: '⛔', issues: [23], def: 3, behaviour: true, en: 'Wrong-way riding', kn: 'ವಿರುದ್ಧ ದಿಕ್ಕಿನ ಸವಾರಿ',
    dEn: 'Riders coming head-on force everyone to brake.', dKn: 'ಎದುರಿನಿಂದ ಬರುವ ಸವಾರರಿಂದ ಎಲ್ಲರಿಗೂ ಹಠಾತ್ ಬ್ರೇಕ್.',
    w: { f: .02, s: .09, c: .03, p: .02 }, spot: { a: 'koramangala', b: 'agara', t: .5 }, fix: 'police' },
  { id: 'phones', cat: 'behavior', icon: '📱', issues: [24, 65], def: 3, behaviour: true, en: 'Phones & distracted riding', kn: 'ಫೋನ್ ಮತ್ತು ಗಮನವಿಲ್ಲದ ಚಾಲನೆ',
    dEn: 'Slow starts at green, drifting, late reactions.', dKn: 'ಹಸಿರು ದೀಪದಲ್ಲಿ ತಡ ಆರಂಭ, ಅಲೆದಾಟ, ತಡವಾದ ಪ್ರತಿಕ್ರಿಯೆ.',
    w: { f: .05, s: .07, c: .03, p: .03 }, spot: { a: 'domlur', b: 'indiranagar', t: .6 }, fix: 'educate' },
  { id: 'weaving', cat: 'behavior', icon: '🔀', issues: [25, 28, 29, 34], def: 3, behaviour: true, en: 'Lane cutting & weaving', kn: 'ಲೇನ್ ಕತ್ತರಿಸುವುದು ಮತ್ತು ನುಸುಳುವುದು',
    dEn: 'Constant cut-ins make everyone brake — stop-and-go waves.', dKn: 'ನಿರಂತರ ನುಸುಳುವಿಕೆ — ಎಲ್ಲರಿಗೂ ಬ್ರೇಕ್, ನಿಲ್ಲು-ಹೋಗು ಅಲೆಗಳು.',
    w: { f: .05, s: .07, c: .04, p: 0 }, spot: { a: 'kr_puram', b: 'marathahalli', t: .7 }, fix: 'educate' },
  { id: 'tailgating', cat: 'behavior', icon: '💥', issues: [30, 31, 42, 43], def: 3, behaviour: true, en: 'Tailgating & sudden moves', kn: 'ಅಂತರವಿಲ್ಲದ ಹಿಂಬಾಲನೆ ಮತ್ತು ಹಠಾತ್ ಚಲನೆ',
    dEn: 'Zero gap + sudden braking = rear-end chain crashes.', dKn: 'ಅಂತರವಿಲ್ಲ + ಹಠಾತ್ ಬ್ರೇಕ್ = ಸರಣಿ ಡಿಕ್ಕಿ.',
    w: { f: .04, s: .08, c: .03, p: 0 }, spot: { a: 'marathahalli', b: 'bellandur', t: .5 }, fix: 'educate' },
  { id: 'honking', cat: 'behavior', icon: '📢', issues: [26, 60], def: 2, behaviour: true, en: 'Excessive honking', kn: 'ಅತಿಯಾದ ಹಾರ್ನ್',
    dEn: "Noise doesn't move traffic — it just raises everyone's stress.", dKn: 'ಶಬ್ದದಿಂದ ಸಂಚಾರ ಸಾಗುವುದಿಲ್ಲ — ಎಲ್ಲರ ಒತ್ತಡ ಮಾತ್ರ ಹೆಚ್ಚುತ್ತದೆ.',
    w: { f: 0, s: .01, c: .22, p: .03 }, spot: { a: 'majestic', b: 'kr_market', t: .5 }, fix: 'educate' },
  { id: 'footpathRiding', cat: 'behavior', icon: '🛵', issues: [33], def: 3, behaviour: true, en: 'Riding on footpaths', kn: 'ಫುಟ್‌ಪಾತ್ ಮೇಲೆ ಸವಾರಿ',
    dEn: 'Bikes bypass jams on the footpath and scatter pedestrians.', dKn: 'ಜಾಮ್ ತಪ್ಪಿಸಲು ಬೈಕ್‌ಗಳು ಫುಟ್‌ಪಾತ್ ಮೇಲೆ — ಪಾದಚಾರಿಗಳಿಗೆ ಅಪಾಯ.',
    w: { f: 0, s: .03, c: .01, p: .12 }, spot: { a: 'dairy_circle', b: 'koramangala', t: .5 }, fix: 'police' },
  { id: 'midStops', cat: 'behavior', icon: '🚌', issues: [35, 61, 67], def: 2, behaviour: true, en: 'Mid-road stops (bus, cab, auto)', kn: 'ರಸ್ತೆ ಮಧ್ಯೆ ನಿಲುಗಡೆ (ಬಸ್, ಕ್ಯಾಬ್, ಆಟೋ)',
    dEn: 'Buses and autos stop in the lane; traffic piles up behind.', dKn: 'ಬಸ್ ಮತ್ತು ಆಟೋಗಳು ಲೇನ್‌ನಲ್ಲೇ ನಿಲ್ಲುತ್ತವೆ; ಹಿಂದೆ ಉದ್ದನೆಯ ಸಾಲು.',
    w: { f: .07, s: .03, c: .03, p: .01 }, spot: { a: 'dairy_circle', b: 'silk_board', t: .75 }, fix: 'bus' },
  { id: 'speeding', cat: 'behavior', icon: '🏎️', issues: [36, 37, 41], def: 2, behaviour: true, night: 'boost', en: 'Speeding, drunk & tired driving', kn: 'ಅತಿವೇಗ, ಕುಡಿದು ಮತ್ತು ದಣಿದು ಚಾಲನೆ',
    dEn: 'Mostly at night: fewer crashes, but far deadlier ones.', dKn: 'ಹೆಚ್ಚಾಗಿ ರಾತ್ರಿ: ಡಿಕ್ಕಿಗಳು ಕಡಿಮೆ, ಆದರೆ ಮಾರಣಾಂತಿಕ.',
    w: { f: 0, s: .10, c: .01, p: .04 }, spot: { a: 'airport', b: 'hebbal', t: .45 }, zoom: 120, fix: 'police' },
  { id: 'safetyGear', cat: 'behavior', icon: '⛑️', issues: [44, 45, 46], def: 3, behaviour: true, en: 'No helmets / seatbelts / triple riding', kn: 'ಹೆಲ್ಮೆಟ್ / ಸೀಟ್‌ಬೆಲ್ಟ್ ಇಲ್ಲ / ತ್ರಿಬಲ್ ರೈಡಿಂಗ್',
    dEn: "Doesn't slow traffic — but turns small crashes into injuries.", dKn: 'ಸಂಚಾರ ನಿಧಾನಿಸುವುದಿಲ್ಲ — ಆದರೆ ಸಣ್ಣ ಡಿಕ್ಕಿಯನ್ನೂ ಗಾಯವಾಗಿಸುತ್ತದೆ.',
    w: { f: 0, s: .09, c: 0, p: 0 }, spot: { a: 'koramangala', b: 'ibblur', t: .4 }, fix: 'police' },
  // ── Vehicles & cargo
  { id: 'nightLights', cat: 'vehicles', icon: '🔦', issues: [27, 48, 54, 55, 62, 66], def: 2, night: 'only', en: 'Night glare & missing vehicle lights', kn: 'ರಾತ್ರಿ ಪ್ರಖರತೆ ಮತ್ತು ದೀಪವಿಲ್ಲದ ವಾಹನಗಳು',
    dEn: 'High beams blind; dark trucks and cycles appear from nowhere.', dKn: 'ಹೈ ಬೀಮ್ ಕಣ್ಣು ಕುಕ್ಕುತ್ತದೆ; ದೀಪವಿಲ್ಲದ ಲಾರಿ, ಸೈಕಲ್ ದಿಢೀರ್ ಪ್ರತ್ಯಕ್ಷ.',
    w: { f: 0, s: .09, c: .02, p: .04 }, spot: { a: 'tumkur_end', b: 'tumkur', t: .5 }, fix: 'light' },
  { id: 'heavy', cat: 'vehicles', icon: '🚛', issues: [49, 50, 53, 57, 58], def: 3, en: 'Trucks, tankers & slow vehicles in the mix', kn: 'ಮಿಶ್ರ ಸಂಚಾರದಲ್ಲಿ ಲಾರಿ, ಟ್ಯಾಂಕರ್, ನಿಧಾನ ವಾಹನಗಳು',
    dEn: 'Moving bottlenecks in the fast lane.', dKn: 'ವೇಗದ ಲೇನ್‌ನಲ್ಲಿ ಚಲಿಸುವ ಅಡಚಣೆಗಳು.',
    w: { f: .07, s: .06, c: .03, p: .01 }, spot: { a: 'bommanahalli', b: 'ecity', t: .5 }, fix: 'police' },
  { id: 'cargo', cat: 'vehicles', icon: '📦', issues: [51, 56], def: 2, en: 'Unsecured & oversize cargo', kn: 'ಭದ್ರಪಡಿಸದ ಮತ್ತು ಹೊರಚಾಚಿದ ಸರಕು',
    dEn: 'Rods stick out and loads spill onto the road.', dKn: 'ಕಂಬಿಗಳು ಹೊರಚಾಚುತ್ತವೆ, ಸರಕು ರಸ್ತೆಗೆ ಚೆಲ್ಲುತ್ತದೆ.',
    w: { f: .01, s: .05, c: .01, p: 0 }, spot: { a: 'mysore_end', b: 'mysore_rd', t: .5 }, fix: 'police' },
  { id: 'breakdowns', cat: 'vehicles', icon: '🛠️', issues: [52, 59, 76], def: 3, en: 'Breakdowns & slow towing', kn: 'ಕೆಟ್ಟು ನಿಂತ ವಾಹನ ಮತ್ತು ತಡವಾದ ಟೋಯಿಂಗ್',
    dEn: 'One stalled vehicle blocks a lane for ages.', dKn: 'ಕೆಟ್ಟು ನಿಂತ ಒಂದು ವಾಹನ ಗಂಟೆಗಟ್ಟಲೆ ಲೇನ್ ಬಂದ್ ಮಾಡುತ್ತದೆ.',
    w: { f: .06, s: .02, c: .02, p: 0 }, spot: { a: 'nagawara', b: 'kr_puram', t: .6 }, fix: 'tow' },
  // ── Other road users
  { id: 'animals', cat: 'others', icon: '🐄', issues: [63], def: 3, en: 'Stray cattle & dogs', kn: 'ಬೀಡಾಡಿ ದನ ಮತ್ತು ನಾಯಿಗಳು',
    dEn: 'Cows resting in the lane; sudden stops.', dKn: 'ಲೇನ್‌ನಲ್ಲೇ ಮಲಗಿದ ದನಗಳು; ಹಠಾತ್ ನಿಲುಗಡೆ.',
    w: { f: .04, s: .05, c: .02, p: 0 }, counts: [0, 3, 7, 11], spot: { a: 'jp_nagar', b: 'konanakunte', t: .4 }, fix: 'shelter' },
  // ── Signals & enforcement
  { id: 'signals', cat: 'signals', icon: '🚦', issues: [69, 70, 71], def: 2, en: 'Bad or broken signals', kn: 'ಕೆಟ್ಟ ಅಥವಾ ಕೆಟ್ಟುಹೋದ ಸಿಗ್ನಲ್‌ಗಳು',
    dEn: 'Dead or mistimed signals waste green time and create chaos.', dKn: 'ಕೆಲಸ ಮಾಡದ / ತಪ್ಪು ಸಮಯದ ಸಿಗ್ನಲ್‌ಗಳಿಂದ ಹಸಿರು ಸಮಯ ವ್ಯರ್ಥ, ಗೊಂದಲ.',
    w: { f: .08, s: .03, c: .03, p: .03 }, counts: [0, 2, 4, 7], spot: { a: 'anil_kumble', b: 'richmond', t: .88 }, fix: 'signal' },
  { id: 'enforcement', cat: 'signals', icon: '👮', issues: [72, 73, 74], def: 3, en: 'Weak enforcement', kn: 'ದುರ್ಬಲ ಕಾನೂನು ಜಾರಿ',
    dEn: 'Multiplies every behaviour problem — no fear of a challan.', dKn: 'ಎಲ್ಲಾ ವರ್ತನೆ ಸಮಸ್ಯೆಗಳನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ — ಚಲನ್ ಭಯವಿಲ್ಲ.',
    w: { f: .01, s: .03, c: .01, p: .01 }, spot: { a: 'agara', b: 'silk_board', t: .9 }, zoom: 160, fix: 'police' },
  { id: 'emergency', cat: 'signals', icon: '🚑', issues: [75], def: 2, en: 'No way for ambulances', kn: 'ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ದಾರಿಯಿಲ್ಲ',
    dEn: 'Ambulances get stuck; crash sites stay blocked longer.', dKn: 'ಆಂಬ್ಯುಲೆನ್ಸ್ ಸಿಲುಕುತ್ತದೆ; ಅಪಘಾತ ಸ್ಥಳ ಹೆಚ್ಚು ಹೊತ್ತು ಬಂದ್.',
    w: { f: .02, s: .06, c: .01, p: 0 }, spot: { a: 'marathahalli', b: 'bellandur', t: .35 }, fix: 'police' },
  // ── Environment & demand
  { id: 'haze', cat: 'environment', icon: '🌫️', issues: [77, 79], def: 1, en: 'Dust, smoke & glare', kn: 'ಧೂಳು, ಹೊಗೆ ಮತ್ತು ಪ್ರಖರತೆ',
    dEn: 'Low visibility: everyone slows down, mistakes rise.', dKn: 'ಕಡಿಮೆ ಗೋಚರತೆ: ಎಲ್ಲರೂ ನಿಧಾನ, ತಪ್ಪುಗಳು ಹೆಚ್ಚು.',
    w: { f: .03, s: .04, c: .01, p: .01 }, spot: { a: 'mekhri', b: 'hebbal', t: .5 }, zoom: 220, fix: 'remove' },
  { id: 'demand', cat: 'environment', icon: '🚗', issues: [84, 85], def: 3, en: 'Too many private vehicles', kn: 'ಅತಿಯಾದ ಖಾಸಗಿ ವಾಹನಗಳು',
    dEn: 'Weak buses & last-mile links put everyone in a car — roads overflow.', dKn: 'ಕಡಿಮೆ ಬಸ್ ಮತ್ತು ಕೊನೆಯ-ಮೈಲಿ ಸಂಪರ್ಕದಿಂದ ಎಲ್ಲರೂ ಕಾರಿನಲ್ಲಿ — ರಸ್ತೆ ತುಂಬಿ ತುಳುಕುತ್ತದೆ.',
    w: { f: .22, s: .03, c: .06, p: .02 }, spot: { a: 'agara', b: 'silk_board', t: .5 }, zoom: 260, fix: 'bus' },
];

export const SLIDER_BY_ID: Record<string, SliderDef> = Object.fromEntries(SLIDERS.map((s) => [s.id, s]));

export type Levels = Record<string, Level>;
export const defaultLevels = (): Levels => Object.fromEntries(SLIDERS.map((s) => [s.id, s.def])) as Levels;
export const zeroLevels = (): Levels => Object.fromEntries(SLIDERS.map((s) => [s.id, 0])) as Levels;
