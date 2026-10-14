// Who is accountable where. Public officials in their official roles only.
// Names are from news reports of the Sept 2025 GBA appointments — officers get transferred often,
// so the UI always shows the "as of" date and the source, and asks users to verify.

export type CorpId = 'central' | 'east' | 'west' | 'north' | 'south' | 'outside';

export interface Corp {
  id: CorpId; en: string; kn: string;
  head?: { name: string; roleEn: string; roleKn: string; asOf: string; source: string };
  noteEn?: string; noteKn?: string;
}

const DH = 'https://www.deccanherald.com/amp/story/india%2Fkarnataka%2Fbengaluru%2Fgba-is-born-5-corporations-to-govern-city-heads-named-3709253';
const role = { roleEn: 'Commissioner (IAS)', roleKn: 'ಆಯುಕ್ತರು (ಐಎಎಸ್)', asOf: 'Sept 2025', source: DH };

export const CORPS: Record<CorpId, Corp> = {
  central: { id: 'central', en: 'Bengaluru Central City Corporation', kn: 'ಬೆಂಗಳೂರು ಕೇಂದ್ರ ನಗರ ಪಾಲಿಕೆ', head: { name: 'Rajendra Cholan P', ...role } },
  east: { id: 'east', en: 'Bengaluru East City Corporation', kn: 'ಬೆಂಗಳೂರು ಪೂರ್ವ ನಗರ ಪಾಲಿಕೆ', head: { name: 'Ramesh D S', ...role } },
  west: { id: 'west', en: 'Bengaluru West City Corporation', kn: 'ಬೆಂಗಳೂರು ಪಶ್ಚಿಮ ನಗರ ಪಾಲಿಕೆ', head: { name: 'Rajendra K V', ...role } },
  north: { id: 'north', en: 'Bengaluru North City Corporation', kn: 'ಬೆಂಗಳೂರು ಉತ್ತರ ನಗರ ಪಾಲಿಕೆ', head: { name: 'Pommala Sunil Kumar', ...role } },
  south: { id: 'south', en: 'Bengaluru South City Corporation', kn: 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ ನಗರ ಪಾಲಿಕೆ', head: { name: 'Ramesh K N', ...role } },
  outside: {
    id: 'outside', en: 'Outside GBA limits (gram panchayat / town / NHAI)', kn: 'ಜಿಬಿಎ ಮಿತಿಯ ಹೊರಗೆ (ಗ್ರಾಮ ಪಂಚಾಯಿತಿ / ಪಟ್ಟಣ / ಎನ್‌ಎಚ್‌ಎಐ)',
    noteEn: 'Roads here are run by the local panchayat or town body; national highways by NHAI; NICE Road by its private concessionaire.',
    noteKn: 'ಇಲ್ಲಿನ ರಸ್ತೆಗಳು ಸ್ಥಳೀಯ ಪಂಚಾಯಿತಿ ಅಥವಾ ಪಟ್ಟಣ ಸಂಸ್ಥೆಯ ಅಧೀನ; ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿಗಳು ಎನ್‌ಎಚ್‌ಎಐ; ನೈಸ್ ರಸ್ತೆ ಖಾಸಗಿ ಸಂಸ್ಥೆ.',
  },
};

// Approximate area → corporation mapping (by assembly constituency, as reported in Sept 2025).
// Boundaries split some constituencies, so treat edge areas as indicative.
export const AREA_CORP: Record<string, CorpId> = {
  gandhinagar: 'central', shivajinagar: 'central', mg: 'central', richmond: 'central', ulsoor: 'central', wilson: 'central', domlur: 'central', indiranagar: 'central',
  whitefield: 'east', marathahalli: 'east', krpuram: 'east', mahadevapura: 'east', hoodi: 'east', kundalahalli: 'east', brookefield: 'east', kadugodi: 'east',
  varthur: 'east', panathur: 'east', gunjur: 'east', kaikondrahalli: 'east', kalyannagar: 'east',
  hebbal: 'north', yeshwanthpur: 'north', peenya: 'north', manyata: 'north',
  malleswaram: 'west', rajajinagar: 'west', vijayanagar: 'west', basavanagudi: 'west', kengeri: 'west',
  koramangala: 'south', madiwala: 'south', hsr: 'south', btm: 'south', jayanagar: 'south', jpnagar: 'south', banashankari: 'south',
  bellandur: 'south', ecity: 'outside', bannerghatta: 'south', sarjapur: 'outside', dommasandra: 'outside',
};

export interface Contact { icon: string; en: string; kn: string; value: string; href: string }
// Official public channels (numbers widely published by the agencies themselves).
export const CONTACTS: Contact[] = [
  { icon: '🏛️', en: 'GBA / civic helpline (potholes, footpaths, garbage)', kn: 'ಜಿಬಿಎ ಸಹಾಯವಾಣಿ (ಗುಂಡಿ, ಫುಟ್‌ಪಾತ್, ಕಸ)', value: '1533', href: 'tel:1533' },
  { icon: '🚓', en: 'Police / traffic emergency', kn: 'ಪೊಲೀಸ್ / ಸಂಚಾರ ತುರ್ತು', value: '112', href: 'tel:112' },
  { icon: '🚦', en: 'Bengaluru Traffic Police (website, e-challan, complaints)', kn: 'ಬೆಂಗಳೂರು ಸಂಚಾರ ಪೊಲೀಸ್ (ಜಾಲತಾಣ, ದೂರು)', value: 'btp.karnataka.gov.in', href: 'https://btp.karnataka.gov.in' },
  { icon: '💡', en: 'BESCOM (street lights, poles, wires)', kn: 'ಬೆಸ್ಕಾಂ (ಬೀದಿ ದೀಪ, ಕಂಬ, ತಂತಿ)', value: '1912', href: 'tel:1912' },
  { icon: '🚰', en: 'BWSSB (drains, manholes, dug-up roads)', kn: 'ಬಿಡಬ್ಲ್ಯೂಎಸ್‌ಎಸ್‌ಬಿ (ಚರಂಡಿ, ಮ್ಯಾನ್‌ಹೋಲ್)', value: '1916', href: 'tel:1916' },
  { icon: '🚑', en: 'Ambulance', kn: 'ಆಂಬ್ಯುಲೆನ್ಸ್', value: '108', href: 'tel:108' },
];
