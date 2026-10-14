// UI strings. Names of places/issues live with their data (en/kn fields).
// Kannada translations were written by the developer — please have a native speaker review.

export type Lang = 'en' | 'kn';

const en = {
  'app.title': 'Namma Roads',
  'app.sub': 'Bengaluru traffic simulator',
  'tab.issues': 'Issues', 'tab.solutions': 'Fixes', 'tab.scenes': 'Scenarios', 'tab.book': 'All issues', 'tab.stats': 'Stats',
  'lv.0': 'None', 'lv.1': 'Low', 'lv.2': 'Med', 'lv.3': 'High',
  'score.title': 'City score', 'score.flow': 'Flow', 'score.safety': 'Safety', 'score.comfort': 'Calm', 'score.ped': 'Walkability',
  'grade.dream': 'Namma Dream', 'grade.smooth': 'Smooth', 'grade.ok': 'Manageable', 'grade.struggle': 'Struggling', 'grade.chaos': 'Total chaos',
  'm.kmh': 'avg km/h', 'm.acc': 'crashes/hr', 'm.inj': 'injuries/hr', 'm.honk': 'honks/min', 'm.stress': 'stress', 'm.ped': 'ped. scares/hr', 'm.resp': 'ambulance min', 'm.trips': 'trips/hr', 'm.active': 'vehicles',
  'cam.top': 'Map', 'cam.tilt': '3D', 'cam.follow': 'Follow', 'cam.street': 'Street', 'cam.cockpit': 'Driver seat', 'cam.reset': 'Whole city',
  'time.pause': 'Pause', 'time.play': 'Play',
  'tog.rain': 'Rain', 'tog.event': 'Match day', 'tog.overlay': 'Traffic colours', 'tog.markers': 'Issue markers', 'tog.sound': 'Sound',
  'preview': 'Preview', 'info': 'Details', 'close': 'Close',
  'pv.title': 'Watching', 'pv.live': 'Live here', 'pv.on': 'Issue ON', 'pv.off': 'Issue OFF', 'pv.before': 'See it without this issue',
  'pv.fixall': 'Fix it everywhere', 'pv.ghost': 'Shown as an example (slider is at None)', 'pv.night': 'This issue matters after dark — switched to night.',
  'pv.rain': 'This issue appears when it rains — rain switched on.', 'pv.global': 'This issue affects the whole city.',
  'who': 'Who can fix it', 'fixidea': 'Fix ideas', 'linked': 'Issues from the list', 'custom': 'edited on map',
  'hz.fix': 'Fix it', 'hz.worse': 'Make it worse', 'hz.watch': 'Watch here',
  'hz.fixed': 'Fixed!', 'hz.worsened': 'Worse!',
  'v.follow': 'Follow', 'v.fix': 'Fix this driver', 'v.tow': 'Tow it now', 'v.clear': 'Clear the crash', 'v.unfollow': 'Stop following', 'v.next': 'Another car',
  'v.crashed': 'Crashed', 'v.waitamb': 'waiting for an ambulance', 'v.minor': 'minor crash — arguing on the road', 'v.broken': 'Broken down', 'v.dwell': 'Stopped in the lane', 'v.fine': 'Driving well 😇',
  'v.speed': 'Speed', 'v.stress': 'Stress', 'v.trip': 'On the road for',
  'tr.phone': 'On the phone', 'tr.jump': 'Jumps signals', 'tr.weave': 'Weaves & cuts lanes', 'tr.tail': 'Tailgates', 'tr.sudden': 'Brakes suddenly', 'tr.honker': 'Honks a lot',
  'tr.fpride': 'Rides on footpaths', 'tr.stopper': 'Stops mid-road', 'tr.speeder': 'Speeding', 'tr.drunk': 'Drunk', 'tr.nolight': 'No lights', 'tr.glare': 'High beam', 'tr.nohelmet': 'No helmet', 'tr.nobelt': 'No seatbelt', 'tr.cargo': 'Unsafe cargo',
  'vt.0': 'Two-wheeler', 'vt.1': 'Auto', 'vt.2': 'Car', 'vt.3': 'BMTC bus', 'vt.4': 'Truck', 'vt.5': 'Water tanker', 'vt.6': 'Tractor', 'vt.7': 'Ambulance',
  'rider.title': 'Wrong-way rider', 'rider.desc': 'Coming head-on in the left lane to save a U-turn.', 'rider.fix': 'Stop this rider', 'rider.worse': 'More riders',
  'ped.title': 'Pedestrian crossing mid-road', 'ped.desc': 'No zebra crossing or signal nearby, so people dash across.', 'ped.fix': 'Help them across safely', 'cow.title': 'Cattle crossing', 'walker.title': 'Walking on the road (no footpath)',
  'sol.apply': 'Apply', 'sol.applied': 'Applied ✓', 'sol.undo': 'Undo', 'sol.who': 'Who', 'sol.intro': 'One-tap programmes. Each one fixes a group of issues — watch the map and the score.',
  'sc.intro': 'Jump into a situation. Every scenario keeps your controls editable.',
  'book.search': 'Search issues…', 'book.all': 'All', 'book.goto': 'Open slider', 'book.src.yours': 'Your list', 'book.src.added': 'Added', 'book.src.new': 'New',
  'book.sev': 'Severity', 'book.freq': 'Frequency', 'book.count': '{n} issues',
  'legend.title': 'Traffic', 'legend.free': 'flowing', 'legend.slow': 'slow', 'legend.jam': 'jam', 'legend.stop': 'stopped',
  'toast.up': 'Score +{n}! Traffic is breathing easier.', 'toast.down': 'Score −{n}. That hurt the city.',
  'toast.m50': 'Halfway there! Swalpa adjust maadi — keep going.', 'toast.m70': 'Smooth roads! Silk Board would be proud.', 'toast.m85': 'Namma Dream Bengaluru! 🎉',
  'toast.crash': 'Crash on {road}', 'toast.applied': '{name} applied', 'toast.preset': 'Scenario: {name}',
  'help.title': 'Welcome to Namma Roads', 'help.body': 'A playful simulator of Bengaluru traffic. Every slider is an issue from real roads. Turn issues up or down, click anything on the map, apply fixes — and watch the score, the jams, the honking and the crashes change.',
  'help.t1': 'Drag to pan, scroll or pinch to zoom, right-drag / two fingers to rotate.', 'help.t2': '👁 Preview flies you to a spot where the issue is hurting traffic.',
  'help.t3': 'Click a marker, vehicle or person to fix it — or make it worse.', 'help.t4': 'Try the Fixes tab, then compare with Bengaluru Today.',
  'help.go': "Let's go", 'help.lang': 'Language',
  'fx.peep': 'PEEP!', 'fx.pom': 'POM POM!', 'fx.honk': 'HONK!', 'fx.beep': 'BEEP!', 'fx.fixed': 'Fixed!', 'fx.towed': 'Towed', 'fx.amb': 'Ambulance!',
  'stats.parts': 'Score breakdown', 'stats.today': 'So far today', 'stats.crashes': 'crashes', 'stats.injuries': 'injuries', 'stats.honks': 'honks',
  'est.note': 'Score mixes an instant estimate from the sliders with what the simulation actually measures.',
  'night': 'Night', 'day': 'Day',
  'kn.note': 'Kannada translation by the developer — native review welcome.',
  'search.ph': 'Search a place, road, landmark…', 'search.osm': 'Search businesses & buildings (OpenStreetMap)', 'search.osmnote': 'Business search sends your text to OpenStreetMap (nominatim.openstreetmap.org). Locations are placed approximately on this stylized map.',
  'search.go': 'Go there', 'search.from': 'Start from here', 'search.to': 'Drive to here', 'search.loading': 'Searching OpenStreetMap…', 'search.error': 'Could not reach OpenStreetMap — check your connection.', 'search.none': 'No match in Bengaluru on OpenStreetMap.', 'search.tryosm': 'Not a mapped place — press Shift+Enter or the button below to search businesses.',
  'trip.title': 'Simulate a drive', 'trip.pickfrom': 'pick 🟢 a start', 'trip.pickto': 'pick 🏁 a destination', 'trip.start': 'Start drive', 'trip.car': 'Your red Wagon R', 'trip.time': 'Time', 'trip.dist': 'Distance ≈', 'trip.avg': 'Avg speed', 'trip.stress': 'Stress',
  'trip.stops': 'Stops', 'trip.waiting': 'Standing still', 'trip.honked': 'Honked at you', 'trip.near': 'Near misses', 'trip.free': 'Same drive on empty roads: ≈ {m}', 'trip.lost': 'lost to traffic: {m}', 'trip.again': 'Drive again', 'trip.stop': 'Stop drive',
  'trip.arrived': 'You made it!', 'trip.crashed': 'Your car was in a crash.', 'trip.stuck': 'Drive stopped.', 'vt.8': 'Your Wagon R', 'vol.title': 'Traffic volume', 'search.btn': 'Search',
  'drive.take': 'Take the wheel', 'drive.auto': 'Autopilot', 'drive.free': 'Self-drive from 🟢', 'drive.help': '↑ accelerate · ↓ brake · ← → change lane, or pick the turn near a junction · C camera · Esc autopilot', 'drive.red': '🔴 Red light!', 'drive.blocked': 'No gap — lane blocked', 'drive.next': 'Next', 'drive.straight': 'Straight', 'drive.left': 'Left', 'drive.right': 'Right', 'drive.jumped': 'You jumped a red light! 🚨',
  'toast.go': 'Go there', 'where.who': "Who's in charge?", 'where.asof': 'As of', 'where.source': 'source', 'where.contacts': 'Report a problem (official channels)',
  'where.caveat': 'Officials are transferred often and Bengaluru\'s civic and police structure is being reorganised — check the source before contacting. Ward-level engineers and traffic inspectors are not published reliably, and corporator posts are vacant until GBA elections, so they are not listed. No photos are shown to avoid misidentifying anyone.', 'reset': 'Reset', 'reset.confirm': 'Tap again to reset', 'reset.done': 'Back to Bengaluru Today — everything reset',
  'theme.auto': 'Theme: auto', 'theme.light': 'Theme: light', 'theme.dark': 'Theme: dark',
  'pv.another': 'Another spot', 'pv.next': 'Next issue', 'compass.north': 'North up', 'rot.left': 'Rotate left', 'rot.right': 'Rotate right',
  'dept.title': 'Department report card', 'dept.note': 'Each department is graded on the issues it can fix. Fix issues — or apply programmes — to raise its grade.',
  'dept.toast': '{name} {d} → grade {g}', 'dept.allclear': 'All clear 🎉', 'q.title': 'Graphics', 'q.low': 'Low', 'q.med': 'Medium', 'q.high': 'High',
};

const kn: Record<keyof typeof en, string> = {
  'app.title': 'ನಮ್ಮ ರಸ್ತೆ',
  'app.sub': 'ಬೆಂಗಳೂರು ಸಂಚಾರ ಸಿಮ್ಯುಲೇಟರ್',
  'tab.issues': 'ಸಮಸ್ಯೆಗಳು', 'tab.solutions': 'ಪರಿಹಾರಗಳು', 'tab.scenes': 'ಸನ್ನಿವೇಶಗಳು', 'tab.book': 'ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳು', 'tab.stats': 'ಅಂಕಿಅಂಶ',
  'lv.0': 'ಇಲ್ಲ', 'lv.1': 'ಕಡಿಮೆ', 'lv.2': 'ಮಧ್ಯಮ', 'lv.3': 'ಹೆಚ್ಚು',
  'score.title': 'ನಗರದ ಅಂಕ', 'score.flow': 'ಸಂಚಾರ', 'score.safety': 'ಸುರಕ್ಷತೆ', 'score.comfort': 'ಶಾಂತಿ', 'score.ped': 'ನಡಿಗೆ',
  'grade.dream': 'ನಮ್ಮ ಕನಸು', 'grade.smooth': 'ಸುಗಮ', 'grade.ok': 'ಪರವಾಗಿಲ್ಲ', 'grade.struggle': 'ಕಷ್ಟ', 'grade.chaos': 'ಸಂಪೂರ್ಣ ಗೊಂದಲ',
  'm.kmh': 'ಸರಾಸರಿ ಕಿ.ಮೀ/ಗಂ', 'm.acc': 'ಡಿಕ್ಕಿ/ಗಂ', 'm.inj': 'ಗಾಯ/ಗಂ', 'm.honk': 'ಹಾರ್ನ್/ನಿಮಿಷ', 'm.stress': 'ಒತ್ತಡ', 'm.ped': 'ಪಾದಚಾರಿ ಅಪಾಯ/ಗಂ', 'm.resp': 'ಆಂಬ್ಯುಲೆನ್ಸ್ ನಿಮಿಷ', 'm.trips': 'ಪ್ರಯಾಣ/ಗಂ', 'm.active': 'ವಾಹನಗಳು',
  'cam.top': 'ನಕ್ಷೆ', 'cam.tilt': '3D', 'cam.follow': 'ಹಿಂಬಾಲಿಸು', 'cam.street': 'ರಸ್ತೆ ನೋಟ', 'cam.cockpit': 'ಚಾಲಕನ ಆಸನ', 'cam.reset': 'ಇಡೀ ನಗರ',
  'time.pause': 'ನಿಲ್ಲಿಸು', 'time.play': 'ಆರಂಭಿಸು',
  'tog.rain': 'ಮಳೆ', 'tog.event': 'ಪಂದ್ಯದ ದಿನ', 'tog.overlay': 'ಸಂಚಾರ ಬಣ್ಣಗಳು', 'tog.markers': 'ಸಮಸ್ಯೆ ಗುರುತುಗಳು', 'tog.sound': 'ಶಬ್ದ',
  'preview': 'ನೋಡಿ', 'info': 'ವಿವರ', 'close': 'ಮುಚ್ಚಿ',
  'pv.title': 'ವೀಕ್ಷಣೆ', 'pv.live': 'ಇಲ್ಲಿ ಈಗ', 'pv.on': 'ಸಮಸ್ಯೆ ಇದೆ', 'pv.off': 'ಸಮಸ್ಯೆ ಇಲ್ಲ', 'pv.before': 'ಈ ಸಮಸ್ಯೆ ಇಲ್ಲದೆ ನೋಡಿ',
  'pv.fixall': 'ಎಲ್ಲೆಡೆ ಸರಿಪಡಿಸಿ', 'pv.ghost': 'ಉದಾಹರಣೆಯಾಗಿ ತೋರಿಸಲಾಗಿದೆ (ಸ್ಲೈಡರ್ "ಇಲ್ಲ"ದಲ್ಲಿದೆ)', 'pv.night': 'ಈ ಸಮಸ್ಯೆ ಕತ್ತಲಾದ ಮೇಲೆ ಮುಖ್ಯ — ರಾತ್ರಿಗೆ ಬದಲಿಸಲಾಗಿದೆ.',
  'pv.rain': 'ಈ ಸಮಸ್ಯೆ ಮಳೆಯಾದಾಗ ಕಾಣುತ್ತದೆ — ಮಳೆ ಆರಂಭಿಸಲಾಗಿದೆ.', 'pv.global': 'ಈ ಸಮಸ್ಯೆ ಇಡೀ ನಗರದ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುತ್ತದೆ.',
  'who': 'ಯಾರು ಸರಿಪಡಿಸಬಹುದು', 'fixidea': 'ಪರಿಹಾರದ ಸಲಹೆಗಳು', 'linked': 'ಪಟ್ಟಿಯಲ್ಲಿನ ಸಮಸ್ಯೆಗಳು', 'custom': 'ನಕ್ಷೆಯಲ್ಲಿ ಬದಲಿಸಲಾಗಿದೆ',
  'hz.fix': 'ಸರಿಪಡಿಸಿ', 'hz.worse': 'ಇನ್ನಷ್ಟು ಹದಗೆಡಿಸಿ', 'hz.watch': 'ಇಲ್ಲಿ ನೋಡಿ',
  'hz.fixed': 'ಸರಿಯಾಯಿತು!', 'hz.worsened': 'ಹದಗೆಟ್ಟಿತು!',
  'v.follow': 'ಹಿಂಬಾಲಿಸು', 'v.fix': 'ಈ ಚಾಲಕನನ್ನು ಸರಿಪಡಿಸಿ', 'v.tow': 'ಈಗಲೇ ಟೋ ಮಾಡಿ', 'v.clear': 'ಅಪಘಾತ ತೆರವುಗೊಳಿಸಿ', 'v.unfollow': 'ಹಿಂಬಾಲಿಸುವುದು ನಿಲ್ಲಿಸಿ', 'v.next': 'ಇನ್ನೊಂದು ವಾಹನ',
  'v.crashed': 'ಡಿಕ್ಕಿ', 'v.waitamb': 'ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗಾಗಿ ಕಾಯುತ್ತಿದೆ', 'v.minor': 'ಸಣ್ಣ ಡಿಕ್ಕಿ — ರಸ್ತೆಯಲ್ಲೇ ಜಗಳ', 'v.broken': 'ಕೆಟ್ಟು ನಿಂತಿದೆ', 'v.dwell': 'ಲೇನ್‌ನಲ್ಲೇ ನಿಂತಿದೆ', 'v.fine': 'ಚೆನ್ನಾಗಿ ಚಾಲನೆ 😇',
  'v.speed': 'ವೇಗ', 'v.stress': 'ಒತ್ತಡ', 'v.trip': 'ರಸ್ತೆಯಲ್ಲಿ',
  'tr.phone': 'ಫೋನ್‌ನಲ್ಲಿ', 'tr.jump': 'ಸಿಗ್ನಲ್ ಜಂಪ್', 'tr.weave': 'ಲೇನ್ ನುಸುಳುವಿಕೆ', 'tr.tail': 'ಅಂತರವಿಲ್ಲದ ಹಿಂಬಾಲನೆ', 'tr.sudden': 'ಹಠಾತ್ ಬ್ರೇಕ್', 'tr.honker': 'ಅತಿಯಾದ ಹಾರ್ನ್',
  'tr.fpride': 'ಫುಟ್‌ಪಾತ್ ಸವಾರಿ', 'tr.stopper': 'ರಸ್ತೆ ಮಧ್ಯೆ ನಿಲುಗಡೆ', 'tr.speeder': 'ಅತಿವೇಗ', 'tr.drunk': 'ಕುಡಿದಿದ್ದಾರೆ', 'tr.nolight': 'ದೀಪವಿಲ್ಲ', 'tr.glare': 'ಹೈ ಬೀಮ್', 'tr.nohelmet': 'ಹೆಲ್ಮೆಟ್ ಇಲ್ಲ', 'tr.nobelt': 'ಸೀಟ್‌ಬೆಲ್ಟ್ ಇಲ್ಲ', 'tr.cargo': 'ಅಪಾಯಕಾರಿ ಸರಕು',
  'vt.0': 'ದ್ವಿಚಕ್ರ ವಾಹನ', 'vt.1': 'ಆಟೋ', 'vt.2': 'ಕಾರು', 'vt.3': 'ಬಿಎಂಟಿಸಿ ಬಸ್', 'vt.4': 'ಲಾರಿ', 'vt.5': 'ನೀರಿನ ಟ್ಯಾಂಕರ್', 'vt.6': 'ಟ್ರ್ಯಾಕ್ಟರ್', 'vt.7': 'ಆಂಬ್ಯುಲೆನ್ಸ್',
  'rider.title': 'ವಿರುದ್ಧ ದಿಕ್ಕಿನ ಸವಾರ', 'rider.desc': 'ಯು-ಟರ್ನ್ ಉಳಿಸಲು ಎಡ ಲೇನ್‌ನಲ್ಲಿ ಎದುರಿನಿಂದ ಬರುತ್ತಿದ್ದಾರೆ.', 'rider.fix': 'ಈ ಸವಾರನನ್ನು ತಡೆಯಿರಿ', 'rider.worse': 'ಇನ್ನಷ್ಟು ಸವಾರರು',
  'ped.title': 'ರಸ್ತೆ ಮಧ್ಯೆ ದಾಟುತ್ತಿರುವ ಪಾದಚಾರಿ', 'ped.desc': 'ಹತ್ತಿರ ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಅಥವಾ ಸಿಗ್ನಲ್ ಇಲ್ಲ, ಹಾಗಾಗಿ ಜನ ಓಡಿ ದಾಟುತ್ತಾರೆ.', 'ped.fix': 'ಸುರಕ್ಷಿತವಾಗಿ ದಾಟಿಸಿ', 'cow.title': 'ರಸ್ತೆ ದಾಟುತ್ತಿರುವ ದನಗಳು', 'walker.title': 'ರಸ್ತೆಯಲ್ಲೇ ನಡಿಗೆ (ಫುಟ್‌ಪಾತ್ ಇಲ್ಲ)',
  'sol.apply': 'ಅನ್ವಯಿಸಿ', 'sol.applied': 'ಅನ್ವಯಿಸಲಾಗಿದೆ ✓', 'sol.undo': 'ರದ್ದುಮಾಡಿ', 'sol.who': 'ಯಾರು', 'sol.intro': 'ಒಂದೇ ಟ್ಯಾಪ್ ಕಾರ್ಯಕ್ರಮಗಳು. ಪ್ರತಿಯೊಂದೂ ಸಮಸ್ಯೆಗಳ ಗುಂಪನ್ನು ಸರಿಪಡಿಸುತ್ತದೆ — ನಕ್ಷೆ ಮತ್ತು ಅಂಕ ಗಮನಿಸಿ.',
  'sc.intro': 'ಒಂದು ಸನ್ನಿವೇಶಕ್ಕೆ ಜಿಗಿಯಿರಿ. ನಿಯಂತ್ರಣಗಳನ್ನು ನಂತರವೂ ಬದಲಿಸಬಹುದು.',
  'book.search': 'ಸಮಸ್ಯೆಗಳನ್ನು ಹುಡುಕಿ…', 'book.all': 'ಎಲ್ಲಾ', 'book.goto': 'ಸ್ಲೈಡರ್ ತೆರೆಯಿರಿ', 'book.src.yours': 'ನಿಮ್ಮ ಪಟ್ಟಿ', 'book.src.added': 'ಸೇರಿಸಿದ್ದು', 'book.src.new': 'ಹೊಸದು',
  'book.sev': 'ತೀವ್ರತೆ', 'book.freq': 'ಆವರ್ತನ', 'book.count': '{n} ಸಮಸ್ಯೆಗಳು',
  'legend.title': 'ಸಂಚಾರ', 'legend.free': 'ಸುಗಮ', 'legend.slow': 'ನಿಧಾನ', 'legend.jam': 'ಜಾಮ್', 'legend.stop': 'ಸ್ತಬ್ಧ',
  'toast.up': 'ಅಂಕ +{n}! ಸಂಚಾರ ಸ್ವಲ್ಪ ಉಸಿರಾಡುತ್ತಿದೆ.', 'toast.down': 'ಅಂಕ −{n}. ನಗರಕ್ಕೆ ನೋವಾಯಿತು.',
  'toast.m50': 'ಅರ್ಧ ದಾರಿ ಬಂದಿದ್ದೀರಿ! ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ — ಮುಂದುವರಿಸಿ.', 'toast.m70': 'ಸುಗಮ ರಸ್ತೆಗಳು! ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಹೆಮ್ಮೆ ಪಡುತ್ತದೆ.', 'toast.m85': 'ನಮ್ಮ ಕನಸಿನ ಬೆಂಗಳೂರು! 🎉',
  'toast.crash': '{road} ನಲ್ಲಿ ಡಿಕ್ಕಿ', 'toast.applied': '{name} ಅನ್ವಯಿಸಲಾಗಿದೆ', 'toast.preset': 'ಸನ್ನಿವೇಶ: {name}',
  'help.title': 'ನಮ್ಮ ರಸ್ತೆಗೆ ಸ್ವಾಗತ', 'help.body': 'ಬೆಂಗಳೂರು ಸಂಚಾರದ ಆಟದಂತಹ ಸಿಮ್ಯುಲೇಟರ್. ಪ್ರತಿ ಸ್ಲೈಡರ್ ನಿಜವಾದ ರಸ್ತೆಗಳ ಒಂದು ಸಮಸ್ಯೆ. ಸಮಸ್ಯೆಗಳನ್ನು ಹೆಚ್ಚಿಸಿ ಅಥವಾ ಕಡಿಮೆ ಮಾಡಿ, ನಕ್ಷೆಯಲ್ಲಿ ಯಾವುದನ್ನಾದರೂ ಕ್ಲಿಕ್ ಮಾಡಿ, ಪರಿಹಾರ ಅನ್ವಯಿಸಿ — ಅಂಕ, ಜಾಮ್, ಹಾರ್ನ್ ಮತ್ತು ಅಪಘಾತಗಳು ಬದಲಾಗುವುದನ್ನು ನೋಡಿ.',
  'help.t1': 'ಎಳೆದು ಸರಿಸಿ, ಸ್ಕ್ರೋಲ್ / ಪಿಂಚ್ ಮಾಡಿ ಜೂಮ್, ಬಲ-ಎಳೆತ / ಎರಡು ಬೆರಳಿನಿಂದ ತಿರುಗಿಸಿ.', 'help.t2': '👁 ನೋಡಿ — ಸಮಸ್ಯೆ ಸಂಚಾರಕ್ಕೆ ತೊಂದರೆ ಕೊಡುತ್ತಿರುವ ಸ್ಥಳಕ್ಕೆ ಕರೆದೊಯ್ಯುತ್ತದೆ.',
  'help.t3': 'ಗುರುತು, ವಾಹನ ಅಥವಾ ವ್ಯಕ್ತಿಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಸರಿಪಡಿಸಿ — ಅಥವಾ ಹದಗೆಡಿಸಿ.', 'help.t4': 'ಪರಿಹಾರಗಳ ಟ್ಯಾಬ್ ಪ್ರಯತ್ನಿಸಿ, ನಂತರ "ಇಂದಿನ ಬೆಂಗಳೂರು" ಜೊತೆ ಹೋಲಿಸಿ.',
  'help.go': 'ಶುರು ಮಾಡೋಣ', 'help.lang': 'ಭಾಷೆ',
  'fx.peep': 'ಪೀಪ್!', 'fx.pom': 'ಪೋಂ ಪೋಂ!', 'fx.honk': 'ಹಾರ್ನ್!', 'fx.beep': 'ಬೀಪ್!', 'fx.fixed': 'ಸರಿಯಾಯಿತು!', 'fx.towed': 'ಟೋ ಮಾಡಲಾಗಿದೆ', 'fx.amb': 'ಆಂಬ್ಯುಲೆನ್ಸ್!',
  'stats.parts': 'ಅಂಕದ ವಿಭಜನೆ', 'stats.today': 'ಇಂದು ಇಲ್ಲಿಯವರೆಗೆ', 'stats.crashes': 'ಡಿಕ್ಕಿಗಳು', 'stats.injuries': 'ಗಾಯಗಳು', 'stats.honks': 'ಹಾರ್ನ್‌ಗಳು',
  'est.note': 'ಅಂಕವು ಸ್ಲೈಡರ್‌ಗಳಿಂದ ತಕ್ಷಣದ ಅಂದಾಜು ಮತ್ತು ಸಿಮ್ಯುಲೇಶನ್ ಅಳೆದದ್ದರ ಮಿಶ್ರಣ.',
  'night': 'ರಾತ್ರಿ', 'day': 'ಹಗಲು',
  'kn.note': 'ಕನ್ನಡ ಅನುವಾದ ಡೆವಲಪರ್‌ನಿಂದ — ಸ್ಥಳೀಯ ಭಾಷಿಕರ ಪರಿಶೀಲನೆಗೆ ಸ್ವಾಗತ.',
  'search.ph': 'ಸ್ಥಳ, ರಸ್ತೆ, ಹೆಗ್ಗುರುತು ಹುಡುಕಿ…', 'search.osm': 'ವ್ಯಾಪಾರ ಮತ್ತು ಕಟ್ಟಡಗಳನ್ನು ಹುಡುಕಿ (ಓಪನ್‌ಸ್ಟ್ರೀಟ್‌ಮ್ಯಾಪ್)', 'search.osmnote': 'ವ್ಯಾಪಾರ ಹುಡುಕಾಟವು ನಿಮ್ಮ ಪಠ್ಯವನ್ನು ಓಪನ್‌ಸ್ಟ್ರೀಟ್‌ಮ್ಯಾಪ್‌ಗೆ ಕಳುಹಿಸುತ್ತದೆ. ಸ್ಥಳಗಳನ್ನು ಈ ನಕ್ಷೆಯಲ್ಲಿ ಅಂದಾಜಾಗಿ ತೋರಿಸಲಾಗುತ್ತದೆ.',
  'search.go': 'ಅಲ್ಲಿಗೆ ಹೋಗಿ', 'search.from': 'ಇಲ್ಲಿಂದ ಆರಂಭಿಸಿ', 'search.to': 'ಇಲ್ಲಿಗೆ ಚಾಲನೆ', 'search.loading': 'ಓಪನ್‌ಸ್ಟ್ರೀಟ್‌ಮ್ಯಾಪ್‌ನಲ್ಲಿ ಹುಡುಕಲಾಗುತ್ತಿದೆ…', 'search.error': 'ಓಪನ್‌ಸ್ಟ್ರೀಟ್‌ಮ್ಯಾಪ್ ತಲುಪಲಾಗಲಿಲ್ಲ — ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.', 'search.none': 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ.', 'search.tryosm': 'ನಕ್ಷೆಯಲ್ಲಿಲ್ಲ — ವ್ಯಾಪಾರ ಹುಡುಕಲು Shift+Enter ಅಥವಾ ಕೆಳಗಿನ ಗುಂಡಿ ಒತ್ತಿ.',
  'trip.title': 'ಚಾಲನೆಯನ್ನು ಅನುಕರಿಸಿ', 'trip.pickfrom': '🟢 ಆರಂಭ ಆಯ್ಕೆಮಾಡಿ', 'trip.pickto': '🏁 ಗಮ್ಯ ಆಯ್ಕೆಮಾಡಿ', 'trip.start': 'ಚಾಲನೆ ಆರಂಭಿಸಿ', 'trip.car': 'ನಿಮ್ಮ ಕೆಂಪು ವ್ಯಾಗನ್ ಆರ್', 'trip.time': 'ಸಮಯ', 'trip.dist': 'ದೂರ ≈', 'trip.avg': 'ಸರಾಸರಿ ವೇಗ', 'trip.stress': 'ಒತ್ತಡ',
  'trip.stops': 'ನಿಲುಗಡೆಗಳು', 'trip.waiting': 'ನಿಂತಿದ್ದ ಸಮಯ', 'trip.honked': 'ನಿಮಗೆ ಹಾರ್ನ್', 'trip.near': 'ಅಪಾಯದ ಕ್ಷಣಗಳು', 'trip.free': 'ಖಾಲಿ ರಸ್ತೆಯಲ್ಲಿ ಇದೇ ಚಾಲನೆ: ≈ {m}', 'trip.lost': 'ಸಂಚಾರದಲ್ಲಿ ಕಳೆದದ್ದು: {m}', 'trip.again': 'ಮತ್ತೆ ಚಾಲನೆ', 'trip.stop': 'ಚಾಲನೆ ನಿಲ್ಲಿಸಿ',
  'trip.arrived': 'ತಲುಪಿದಿರಿ!', 'trip.crashed': 'ನಿಮ್ಮ ಕಾರು ಡಿಕ್ಕಿಯಲ್ಲಿ ಸಿಲುಕಿತು.', 'trip.stuck': 'ಚಾಲನೆ ನಿಂತಿದೆ.', 'vt.8': 'ನಿಮ್ಮ ವ್ಯಾಗನ್ ಆರ್', 'vol.title': 'ಸಂಚಾರ ಪ್ರಮಾಣ', 'search.btn': 'ಹುಡುಕಿ',
  'drive.take': 'ಸ್ಟೀರಿಂಗ್ ಹಿಡಿಯಿರಿ', 'drive.auto': 'ಸ್ವಯಂ ಚಾಲನೆ', 'drive.free': '🟢 ನಿಂದ ನೀವೇ ಚಾಲನೆ', 'drive.help': '↑ ವೇಗ · ↓ ಬ್ರೇಕ್ · ← → ಲೇನ್ ಬದಲಿಸಿ, ಅಥವಾ ಜಂಕ್ಷನ್ ಬಳಿ ತಿರುವು ಆಯ್ಕೆ · C ಕ್ಯಾಮೆರಾ · Esc ಸ್ವಯಂ ಚಾಲನೆ', 'drive.red': '🔴 ಕೆಂಪು ದೀಪ!', 'drive.blocked': 'ಅಂತರವಿಲ್ಲ — ಲೇನ್ ಬಂದ್', 'drive.next': 'ಮುಂದೆ', 'drive.straight': 'ನೇರ', 'drive.left': 'ಎಡ', 'drive.right': 'ಬಲ', 'drive.jumped': 'ನೀವು ಕೆಂಪು ದೀಪ ದಾಟಿದಿರಿ! 🚨',
  'toast.go': 'ಅಲ್ಲಿಗೆ ಹೋಗಿ', 'where.who': 'ಯಾರು ಹೊಣೆ?', 'where.asof': 'ದಿನಾಂಕದಂತೆ', 'where.source': 'ಮೂಲ', 'where.contacts': 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ (ಅಧಿಕೃತ ಮಾರ್ಗಗಳು)',
  'where.caveat': 'ಅಧಿಕಾರಿಗಳು ಆಗಾಗ ವರ್ಗಾವಣೆಯಾಗುತ್ತಾರೆ ಮತ್ತು ಬೆಂಗಳೂರಿನ ನಾಗರಿಕ ಹಾಗೂ ಪೊಲೀಸ್ ವ್ಯವಸ್ಥೆ ಪುನರ್‌ರಚನೆಯಾಗುತ್ತಿದೆ — ಸಂಪರ್ಕಿಸುವ ಮೊದಲು ಮೂಲ ಪರಿಶೀಲಿಸಿ. ವಾರ್ಡ್ ಮಟ್ಟದ ಎಂಜಿನಿಯರ್ ಮತ್ತು ಸಂಚಾರ ನಿರೀಕ್ಷಕರ ಮಾಹಿತಿ ನಿಖರವಾಗಿ ಪ್ರಕಟವಾಗಿಲ್ಲ; ಜಿಬಿಎ ಚುನಾವಣೆವರೆಗೆ ಕಾರ್ಪೊರೇಟರ್ ಸ್ಥಾನಗಳು ಖಾಲಿ. ತಪ್ಪು ಗುರುತಿಸುವಿಕೆ ತಪ್ಪಿಸಲು ಫೋಟೋ ತೋರಿಸಲಾಗಿಲ್ಲ.', 'reset': 'ಮರುಹೊಂದಿಸಿ', 'reset.confirm': 'ಮರುಹೊಂದಿಸಲು ಮತ್ತೆ ಒತ್ತಿ', 'reset.done': 'ಇಂದಿನ ಬೆಂಗಳೂರಿಗೆ ಹಿಂತಿರುಗಿದೆ — ಎಲ್ಲವೂ ಮರುಹೊಂದಿಸಲಾಗಿದೆ',
  'theme.auto': 'ಥೀಮ್: ಸ್ವಯಂ', 'theme.light': 'ಥೀಮ್: ಬೆಳಕು', 'theme.dark': 'ಥೀಮ್: ಗಾಢ',
  'pv.another': 'ಇನ್ನೊಂದು ಸ್ಥಳ', 'pv.next': 'ಮುಂದಿನ ಸಮಸ್ಯೆ', 'compass.north': 'ಉತ್ತರ ಮೇಲೆ', 'rot.left': 'ಎಡಕ್ಕೆ ತಿರುಗಿಸಿ', 'rot.right': 'ಬಲಕ್ಕೆ ತಿರುಗಿಸಿ',
  'dept.title': 'ಇಲಾಖೆಗಳ ವರದಿ ಪತ್ರ', 'dept.note': 'ಪ್ರತಿ ಇಲಾಖೆಯನ್ನು ಅದು ಸರಿಪಡಿಸಬಹುದಾದ ಸಮಸ್ಯೆಗಳ ಮೇಲೆ ಶ್ರೇಣೀಕರಿಸಲಾಗಿದೆ. ಸಮಸ್ಯೆಗಳನ್ನು ಸರಿಪಡಿಸಿ — ಅಥವಾ ಕಾರ್ಯಕ್ರಮ ಅನ್ವಯಿಸಿ — ಶ್ರೇಣಿ ಹೆಚ್ಚಿಸಿ.',
  'dept.toast': '{name} {d} → ಶ್ರೇಣಿ {g}', 'dept.allclear': 'ಎಲ್ಲವೂ ಸರಿ 🎉', 'q.title': 'ಗ್ರಾಫಿಕ್ಸ್', 'q.low': 'ಕಡಿಮೆ', 'q.med': 'ಮಧ್ಯಮ', 'q.high': 'ಹೆಚ್ಚು',
};

const dict = { en, kn };
export type Key = keyof typeof en;

let lang: Lang = 'en';
try { const s = localStorage.getItem('nr.lang'); if (s === 'en' || s === 'kn') lang = s; } catch { /* storage unavailable */ }
const listeners: (() => void)[] = [];

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem('nr.lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
export const onLang = (f: () => void) => listeners.push(f);

export function t(k: Key, vars?: Record<string, string | number>): string {
  let s = dict[lang][k] ?? en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace('{' + a + '}', String(b));
  return s;
}
/** Pick the language variant of a {en, kn} object. */
export const L = (o: { en: string; kn: string }) => (lang === 'kn' ? o.kn : o.en);
export const LK = (en: string, kn: string) => (lang === 'kn' ? kn : en);
