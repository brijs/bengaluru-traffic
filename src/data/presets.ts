import { defaultLevels, zeroLevels, type Level, type Levels } from './sliders';
import type { AgencyId } from './issues';

export interface Preset {
  id: string; icon: string; en: string; kn: string; dEn: string; dKn: string;
  levels: () => Levels; clock: number; rain: boolean; event: boolean; surge: number;
  focus: { x: number; z: number; dist: number };
}

const withL = (base: Levels, patch: Record<string, Level>): Levels => ({ ...base, ...patch });

export const PRESETS: Preset[] = [
  { id: 'today', icon: '🏙️', en: 'Bengaluru Today', kn: 'ಇಂದಿನ ಬೆಂಗಳೂರು', dEn: 'Weekday morning with every issue at the level from your list.', dKn: 'ನಿಮ್ಮ ಪಟ್ಟಿಯ ಮಟ್ಟದಲ್ಲಿ ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳಿರುವ ವಾರದ ದಿನದ ಬೆಳಿಗ್ಗೆ.',
    levels: defaultLevels, clock: 9 * 60, rain: false, event: false, surge: 1, focus: { x: 60, z: 40, dist: 1200 } },
  { id: 'dream', icon: '🌈', en: 'Dream Bengaluru', kn: 'ಕನಸಿನ ಬೆಂಗಳೂರು', dEn: 'Every issue fixed. Same city, same people — just working roads.', dKn: 'ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳು ಸರಿಯಾಗಿವೆ. ಅದೇ ನಗರ, ಅದೇ ಜನ — ಸರಿಯಾದ ರಸ್ತೆಗಳು ಮಾತ್ರ.',
    levels: zeroLevels, clock: 9 * 60, rain: false, event: false, surge: 1, focus: { x: 60, z: 40, dist: 1200 } },
  { id: 'monsoon', icon: '⛈️', en: 'Monsoon Evening', kn: 'ಮಳೆಗಾಲದ ಸಂಜೆ', dEn: 'Evening rush, heavy rain, flooded underpasses near Silk Board and Bellandur.', dKn: 'ಸಂಜೆ ದಟ್ಟಣೆ, ಭಾರಿ ಮಳೆ, ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಮತ್ತು ಬೆಳ್ಳಂದೂರು ಬಳಿ ಮುಳುಗಿದ ಅಂಡರ್‌ಪಾಸ್‌ಗಳು.',
    levels: () => withL(defaultLevels(), { waterlogging: 3 }), clock: 18 * 60 + 20, rain: true, event: false, surge: 1.05, focus: { x: 250, z: 230, dist: 420 } },
  { id: 'match', icon: '🏏', en: 'Match Day at Chinnaswamy', kn: 'ಚಿನ್ನಸ್ವಾಮಿಯಲ್ಲಿ ಪಂದ್ಯದ ದಿನ', dEn: 'Evening match: crowds cross everywhere, cars park on every road around Cubbon Park.', dKn: 'ಸಂಜೆ ಪಂದ್ಯ: ಎಲ್ಲೆಡೆ ಜನಸಂದಣಿ, ಕಬ್ಬನ್ ಉದ್ಯಾನದ ಸುತ್ತ ಎಲ್ಲಾ ರಸ್ತೆಗಳಲ್ಲಿ ಪಾರ್ಕಿಂಗ್.',
    levels: () => withL(defaultLevels(), { parking: 3, honking: 3, crossings: 3 }), clock: 19 * 60, rain: false, event: true, surge: 1.1, focus: { x: 10, z: -140, dist: 260 } },
  { id: 'orr', icon: '💻', en: 'Friday ORR Rush', kn: 'ಶುಕ್ರವಾರದ ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ದಟ್ಟಣೆ', dEn: 'Tech corridors overflowing: Marathahalli, Bellandur, Silk Board at 9:30 am.', dKn: 'ತುಂಬಿ ತುಳುಕುವ ಟೆಕ್ ಕಾರಿಡಾರ್‌ಗಳು: ಬೆಳಿಗ್ಗೆ 9:30ಕ್ಕೆ ಮಾರತ್ತಹಳ್ಳಿ, ಬೆಳ್ಳಂದೂರು, ಸಿಲ್ಕ್ ಬೋರ್ಡ್.',
    levels: () => withL(defaultLevels(), { demand: 3 }), clock: 9 * 60 + 30, rain: false, event: false, surge: 1.22, focus: { x: 420, z: 120, dist: 520 } },
  { id: 'night', icon: '🌙', en: 'Late Night', kn: 'ತಡರಾತ್ರಿ', dEn: 'Empty roads at 11:30 pm: speeding, drunk drivers, dark stretches and lorries.', dKn: 'ರಾತ್ರಿ 11:30ರ ಖಾಲಿ ರಸ್ತೆಗಳು: ಅತಿವೇಗ, ಕುಡಿದ ಚಾಲಕರು, ಕತ್ತಲೆ ರಸ್ತೆಗಳು ಮತ್ತು ಲಾರಿಗಳು.',
    levels: () => withL(defaultLevels(), { speeding: 3, nightLights: 3, darkRoads: 3 }), clock: 23 * 60 + 30, rain: false, event: false, surge: 1, focus: { x: -20, z: -520, dist: 380 } },
];

export interface Solution {
  id: string; icon: string; en: string; kn: string; dEn: string; dKn: string; who: AgencyId[];
  set: Record<string, Level>;
}

export const SOLUTIONS: Solution[] = [
  { id: 'transit', icon: '🚌', en: 'Buses every 5 minutes + metro feeders', kn: 'ಪ್ರತಿ 5 ನಿಮಿಷಕ್ಕೆ ಬಸ್ + ಮೆಟ್ರೋ ಫೀಡರ್', dEn: 'Thousands more BMTC buses, feeder routes and last-mile autos at every metro station. Fewer cars on the road.', dKn: 'ಸಾವಿರಾರು ಹೆಚ್ಚುವರಿ ಬಿಎಂಟಿಸಿ ಬಸ್, ಫೀಡರ್ ಮಾರ್ಗಗಳು ಮತ್ತು ಪ್ರತಿ ಮೆಟ್ರೋ ನಿಲ್ದಾಣದಲ್ಲಿ ಕೊನೆಯ-ಮೈಲಿ ಆಟೋಗಳು. ರಸ್ತೆಯಲ್ಲಿ ಕಡಿಮೆ ಕಾರುಗಳು.', who: ['BMTC', 'BMRCL'], set: { demand: 0 } },
  { id: 'potholes', icon: '🛠️', en: 'Pothole-free roads drive', kn: 'ಗುಂಡಿ-ಮುಕ್ತ ರಸ್ತೆ ಅಭಿಯಾನ', dEn: 'Fix every pothole within 48 hours, restore dug-up roads, cover manholes.', dKn: '48 ಗಂಟೆಗಳಲ್ಲಿ ಎಲ್ಲಾ ಗುಂಡಿ ದುರಸ್ತಿ, ಅಗೆದ ರಸ್ತೆ ಮರುಸ್ಥಾಪನೆ, ಮ್ಯಾನ್‌ಹೋಲ್ ಮುಚ್ಚಳ.', who: ['GBA', 'BWSSB'], set: { potholes: 0, workZones: 1 } },
  { id: 'paint', icon: '🎨', en: 'Paint, signs, lights & clean edges', kn: 'ಬಣ್ಣ, ಫಲಕ, ದೀಪ ಮತ್ತು ಸ್ವಚ್ಛ ಅಂಚುಗಳು', dEn: 'Thermoplastic lane lines, proper speed bumps, street lights, and removal of barricades and garbage.', dKn: 'ಥರ್ಮೋಪ್ಲಾಸ್ಟಿಕ್ ಲೇನ್ ಗೆರೆ, ಸರಿಯಾದ ಉಬ್ಬುಗಳು, ಬೀದಿ ದೀಪ, ಬ್ಯಾರಿಕೇಡ್ ಮತ್ತು ಕಸ ತೆರವು.', who: ['GBA', 'BESCOM', 'BTP'], set: { markings: 0, bumps: 0, darkRoads: 0, obstacles: 0 } },
  { id: 'walk', icon: '🚶', en: 'Footpaths & zebra crossings everywhere', kn: 'ಎಲ್ಲೆಡೆ ಫುಟ್‌ಪಾತ್ ಮತ್ತು ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್', dEn: 'Continuous footpaths, vending zones, bollards against bikes, and signal-controlled crossings.', dKn: 'ನಿರಂತರ ಫುಟ್‌ಪಾತ್, ವ್ಯಾಪಾರ ವಲಯ, ಬೈಕ್ ತಡೆಗೆ ಬೊಲ್ಲಾರ್ಡ್, ಸಿಗ್ನಲ್ ಇರುವ ಕ್ರಾಸಿಂಗ್.', who: ['GBA', 'BTP'], set: { footpaths: 0, crossings: 0, footpathRiding: 0 } },
  { id: 'parking', icon: '🅿️', en: 'Parking bays & bus bays', kn: 'ಪಾರ್ಕಿಂಗ್ ಮತ್ತು ಬಸ್ ಬೇಗಳು', dEn: 'Paid parking off the road, pick-up zones for cabs and autos, bus bays at every stop.', dKn: 'ರಸ್ತೆಯಿಂದ ಹೊರಗೆ ಶುಲ್ಕದ ಪಾರ್ಕಿಂಗ್, ಕ್ಯಾಬ್ / ಆಟೋಗಳಿಗೆ ಪಿಕ್‌ಅಪ್ ವಲಯ, ಪ್ರತಿ ನಿಲ್ದಾಣದಲ್ಲಿ ಬಸ್ ಬೇ.', who: ['GBA', 'BMTC', 'BTP'], set: { parking: 0, midStops: 0 } },
  { id: 'signals', icon: '🚦', en: 'Adaptive signals & better junctions', kn: 'ಅಡಾಪ್ಟಿವ್ ಸಿಗ್ನಲ್ ಮತ್ತು ಉತ್ತಮ ಜಂಕ್ಷನ್', dEn: 'Signals that read the queues, green waves, box-junction markings and proper turn lanes.', dKn: 'ಸಾಲನ್ನು ಓದುವ ಸಿಗ್ನಲ್, ಗ್ರೀನ್ ವೇವ್, ಬಾಕ್ಸ್ ಜಂಕ್ಷನ್ ಗುರುತು ಮತ್ತು ಸರಿಯಾದ ತಿರುವು ಲೇನ್.', who: ['BTP', 'GBA'], set: { signals: 0, junctions: 0 } },
  { id: 'cameras', icon: '📸', en: 'Cameras + auto-challan + points', kn: 'ಕ್ಯಾಮೆರಾ + ಸ್ವಯಂ ಚಲನ್ + ಅಂಕ ವ್ಯವಸ್ಥೆ', dEn: 'Every violation gets a challan, repeat offenders lose their licence. Behaviour issues shrink.', dKn: 'ಪ್ರತಿ ಉಲ್ಲಂಘನೆಗೂ ಚಲನ್, ಪುನರಾವರ್ತಿತರಿಗೆ ಪರವಾನಗಿ ರದ್ದು. ವರ್ತನೆ ಸಮಸ್ಯೆಗಳು ಕುಗ್ಗುತ್ತವೆ.', who: ['BTP', 'RTO'], set: { enforcement: 0, signalJump: 1, wrongWay: 1 } },
  { id: 'school', icon: '🎓', en: 'Driver education & honk-free drive', kn: 'ಚಾಲಕ ಶಿಕ್ಷಣ ಮತ್ತು ಹಾರ್ನ್-ಮುಕ್ತ ಅಭಿಯಾನ', dEn: 'Stricter licence tests, lane-discipline training, campaigns on phones and honking.', dKn: 'ಕಠಿಣ ಪರವಾನಗಿ ಪರೀಕ್ಷೆ, ಲೇನ್ ಶಿಸ್ತು ತರಬೇತಿ, ಫೋನ್ ಮತ್ತು ಹಾರ್ನ್ ಕುರಿತು ಅಭಿಯಾನ.', who: ['RTO', 'CIT'], set: { weaving: 1, tailgating: 1, honking: 0, phones: 1 } },
  { id: 'safety', icon: '⛑️', en: 'Helmet, seatbelt & night-safety drive', kn: 'ಹೆಲ್ಮೆಟ್, ಸೀಟ್‌ಬೆಲ್ಟ್ ಮತ್ತು ರಾತ್ರಿ ಸುರಕ್ಷತಾ ಅಭಿಯಾನ', dEn: 'Helmets & belts for all, breathalyser checks, speed cameras, working lights on every vehicle.', dKn: 'ಎಲ್ಲರಿಗೂ ಹೆಲ್ಮೆಟ್ ಮತ್ತು ಬೆಲ್ಟ್, ಬ್ರೀತ್ ಅನಲೈಸರ್ ತಪಾಸಣೆ, ವೇಗ ಕ್ಯಾಮೆರಾ, ಪ್ರತಿ ವಾಹನಕ್ಕೂ ದೀಪ.', who: ['BTP', 'RTO'], set: { safetyGear: 0, speeding: 0, nightLights: 0 } },
  { id: 'freight', icon: '🚛', en: 'Truck timings & load rules', kn: 'ಲಾರಿ ಸಮಯ ಮತ್ತು ಸರಕು ನಿಯಮ', dEn: 'Trucks only at night on set routes, tankers with speed limiters, secured loads.', dKn: 'ನಿಗದಿತ ಮಾರ್ಗದಲ್ಲಿ ರಾತ್ರಿ ಮಾತ್ರ ಲಾರಿ, ವೇಗ ಮಿತಿಕಾರಕದ ಟ್ಯಾಂಕರ್, ಭದ್ರ ಸರಕು.', who: ['BTP', 'RTO'], set: { heavy: 0, cargo: 0 } },
  { id: 'rescue', icon: '🚑', en: 'Quick towing & green corridors', kn: 'ತ್ವರಿತ ಟೋಯಿಂಗ್ ಮತ್ತು ಗ್ರೀನ್ ಕಾರಿಡಾರ್', dEn: 'Tow trucks on every corridor, and everyone moves aside for sirens.', dKn: 'ಪ್ರತಿ ಮಾರ್ಗದಲ್ಲೂ ಟೋ ವಾಹನ, ಸೈರನ್‌ಗೆ ಎಲ್ಲರೂ ದಾರಿ ಬಿಡುತ್ತಾರೆ.', who: ['BTP', 'CIT'], set: { breakdowns: 0, emergency: 0 } },
  { id: 'cattle', icon: '🐄', en: 'Cattle shelters & animal care', kn: 'ಗೋಶಾಲೆ ಮತ್ತು ಪ್ರಾಣಿ ಆರೈಕೆ', dEn: 'Shelters and owner fines keep cattle off the roads.', dKn: 'ಆಶ್ರಯ ತಾಣಗಳು ಮತ್ತು ಮಾಲೀಕರಿಗೆ ದಂಡ — ದನಗಳು ರಸ್ತೆಯಿಂದ ದೂರ.', who: ['GBA'], set: { animals: 0 } },
  { id: 'drains', icon: '🌧️', en: 'Storm drains & underpass pumps', kn: 'ಮಳೆನೀರು ಚರಂಡಿ ಮತ್ತು ಅಂಡರ್‌ಪಾಸ್ ಪಂಪ್', dEn: 'Desilted drains and pumps so roads stay dry in the monsoon.', dKn: 'ಹೂಳು ತೆಗೆದ ಚರಂಡಿ ಮತ್ತು ಪಂಪ್‌ಗಳು — ಮಳೆಗಾಲದಲ್ಲೂ ರಸ್ತೆ ಒಣ.', who: ['GBA', 'BWSSB'], set: { waterlogging: 0 } },
];
