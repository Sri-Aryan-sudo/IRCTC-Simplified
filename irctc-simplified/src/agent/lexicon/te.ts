/**
 * Telugu lexicon — supplements (not replaces) the English lexicon.
 * See src/agent/lexicon/en.ts for the shape/rationale.
 */

import type { lexicon as EnLexicon } from './en';

export const lexicon: typeof EnLexicon = {
  today: ['ఈరోజు'],
  dayAfterTomorrow: ['ఎల్లుండి'],
  tomorrow: ['రేపు'],
  timePreferences: {
    MORNING: ['ఉదయం'],
    AFTERNOON: ['మధ్యాహ్నం'],
    EVENING: ['సాయంత్రం'],
    NIGHT: ['రాత్రి'],
  },
  classHints: {
    '1A': ['ఫస్ట్ క్లాస్'],
    '2A': ['సెకండ్ ఏసీ'],
    '3A': ['థర్డ్ ఏసీ', 'ఏసీ'],
    SL: ['స్లీపర్'],
    CC: ['చైర్ కార్'],
  },
  confirmationMust: ['కన్ఫర్మ్ కావాలి', 'కన్ఫర్మ్ మాత్రమే'],
  confirmationPrefer: ['కన్ఫర్మ్ కావాలి అనుకుంటున్నాను', 'కన్ఫర్మ్'],
  priceCheapest: ['చౌకైన', 'తక్కువ ధర'],
  speedFastest: ['వేగవంతమైన', 'త్వరగా'],
  tatkalIntent: ['తత్కాల్'],
  explainIntent: ['వివరించండి', 'అర్థం ఏమిటి'],
  fromPrefixes: ['నుండి '],
  toPrefixes: ['కి ', 'వెళ్ళాలి '],
  numberWords: {
    ఒకటి: 1,
    రెండు: 2,
    మూడు: 3,
    నాలుగు: 4,
    ఐదు: 5,
  },
};
