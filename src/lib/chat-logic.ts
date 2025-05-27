
import type { LanguageCode } from '@/types';

interface FAQ {
  id: string;
  keywords: {
    en: string[];
    te: string[];
  };
  responses: {
    en: string;
    te: string;
  };
}

const faqs: FAQ[] = [
  {
    id: 'greeting',
    keywords: {
      en: ['hello', 'hi', 'hey', 'greetings'],
      te: ['నమస్కారం', 'హాయ్', 'హలో'],
    },
    responses: {
      en: 'Hello! I am TeRA, your T-Fiber assistant. How can I help you today?',
      te: 'నమస్కారం! నేను TeRA, మీ T-ఫైబర్ సహాయకుడిని. ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?',
    },
  },
  {
    id: 'plans',
    keywords: {
      en: ['plans', 'packages', 'offers', 'internet plans', 'broadband plans'],
      te: ['ప్లాన్స్', 'ప్యాకేజీలు', 'ఆఫర్స్', 'ఇంటర్నెట్ ప్లాన్స్', 'బ్రాడ్‌బ్యాండ్ ప్లాన్స్'],
    },
    responses: {
      en: 'You can find our latest T-Fiber plans on our official website. We offer a variety of high-speed internet packages tailored to your needs.',
      te: 'మీరు మా తాజా T-ఫైబర్ ప్లాన్‌లను మా అధికారిక వెబ్‌సైట్‌లో కనుగొనవచ్చు. మేము మీ అవసరాలకు అనుగుణంగా వివిధ రకాల హై-స్పీడ్ ఇంటర్నెట్ ప్యాకేజీలను అందిస్తాము.',
    },
  },
  {
    id: 'tfiber_info',
    keywords: {
      en: ['what is tfiber', 'about tfiber', 'tfiber'],
      te: ['టి-ఫైబర్ అంటే ఏమిటి', 'టి-ఫైబర్ గురించి', 'టి-ఫైబర్'],
    },
    responses: {
      en: 'T-Fiber is a project by the Government of Telangana to provide high-speed internet connectivity across the state, including rural areas.',
      te: 'టి-ఫైబర్ అనేది తెలంగాణ ప్రభుత్వం గ్రామీణ ప్రాంతాలతో సహా రాష్ట్రవ్యాప్తంగా హై-స్పీడ్ ఇంటర్నెట్ కనెక్టివిటీని అందించే ప్రాజెక్ట్.',
    },
  },
  {
    id: 'support',
    keywords: {
      en: ['support', 'customer care', 'help', 'issue', 'problem'],
      te: ['సపోర్ట్', 'కస్టమర్ కేర్', 'సహాయం', 'సమస్య'],
    },
    responses: {
      en: 'For support, please visit our contact page on the T-Fiber website or call our helpline.',
      te: 'సహాయం కోసం, దయచేసి T-ఫైబర్ వెబ్‌సైట్‌లోని మా సంప్రదింపు పేజీని సందర్శించండి లేదా మా హెల్ప్‌లైన్‌కు కాల్ చేయండి.',
    },
  },
   {
    id: 'pincode_generic_question',
    keywords: {
        en: ['service area', 'availability', 'check service', 'my area'],
        te: ['సేవా ప్రాంతం', 'లభ్యత', 'సేవను తనిఖీ చేయండి', 'నా ప్రాంతం'],
    },
    responses: {
        en: 'To check for service availability, please provide your 6-digit pin code.',
        te: 'సేవా లభ్యతను తనిఖీ చేయడానికి, దయచేసి మీ 6-అంకెల పిన్ కోడ్‌ను అందించండి.',
    },
  },
];

const serviceablePinCodes: string[] = ['500001', '500033', '500081', '501510', '502319']; // Example pin codes

export const detectLanguage = (text: string): LanguageCode => {
  // Basic heuristic: if Telugu characters are present, assume Telugu. Otherwise, English.
  // Telugu Unicode range: U+0C00 to U+0C7F
  const teluguRegex = /[\u0C00-\u0C7F]/;
  return teluguRegex.test(text) ? 'te' : 'en';
};

export const getFaqResponse = (text: string, lang: LanguageCode): string | null => {
  const lowerText = text.toLowerCase();
  for (const faq of faqs) {
    const keywords = faq.keywords[lang] || faq.keywords.en; // Fallback to English keywords
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return faq.responses[lang] || faq.responses.en; // Fallback to English response
    }
  }
  return null;
};

const teluguToArabicDigitMap: { [key: string]: string } = {
  '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4',
  '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9',
};

const convertTeluguNumeralsToArabic = (teluguNumber: string): string => {
  return teluguNumber.split('').map(char => teluguToArabicDigitMap[char] || char).join('');
};

export const checkForPinCode = (text: string): string | null => {
  // Regex to match 6 ASCII digits (group 1) OR 6 Telugu digits (group 2)
  // \b ensures word boundaries to avoid partial matches within larger numbers
  const pincodeRegex = /\b(?:([0-9]{6})|([౦-౯]{6}))\b/;
  const match = text.match(pincodeRegex);

  if (match) {
    if (match[1]) { // ASCII digits matched (group 1)
      return match[1];
    }
    if (match[2]) { // Telugu digits matched (group 2)
      return convertTeluguNumeralsToArabic(match[2]);
    }
  }
  return null;
};

export const checkPinCodeServiceability = (pinCode: string, lang: LanguageCode): string => {
  if (serviceablePinCodes.includes(pinCode)) {
    return lang === 'en' 
      ? `Great news! T-Fiber service is available in your area (Pin Code: ${pinCode}).`
      : `శుభవార్త! మీ ప్రాంతంలో (పిన్ కోడ్: ${pinCode}) T-ఫైబర్ సేవ అందుబాటులో ఉంది.`;
  } else {
    return lang === 'en'
      ? `We are expanding rapidly! Currently, T-Fiber service is not available for Pin Code: ${pinCode}, but please check back soon.`
      : `మేము వేగంగా విస్తరిస్తున్నాము! ప్రస్తుతం, పిన్ కోడ్: ${pinCode} కోసం T-ఫైబర్ సేవ అందుబాటులో లేదు, దయచేసి త్వరలో మళ్ళీ తనిఖీ చేయండి.`;
  }
};

export const defaultResponses = {
  en: "I'm sorry, I couldn't understand that. Can you please rephrase or ask something else about T-Fiber services?",
  te: "క్షమించండి, నేను దానిని అర్థం చేసుకోలేకపోయాను. దయచేసి మళ్లీ చెప్పగలరా లేదా T-ఫైబర్ సేవల గురించి వేరే ఏదైనా అడగగలరా?",
};

export const welcomeMessages = {
  en: "Hello! I'm TeRA, your T-Fiber assistant. How can I help you with our services, plans, or check serviceability in your area today?",
  te: "నమస్కారం! నేను TeRA, మీ T-ఫైబర్ సహాయకుడిని. ఈ రోజు మా సేవలు, ప్లాన్‌లు లేదా మీ ప్రాంతంలో సేవా లభ్యతను తనిఖీ చేయడంలో నేను మీకు ఎలా సహాయపడగలను?",
}
