export interface Question {
  id: number
  text: string
  options: string[]
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Which fear follows you the longest?',
    options: [
      'Being forgotten',
      'Never becoming enough',
      'Losing control',
      'Being truly seen',
    ],
  },
  {
    id: 2,
    text: 'What do you protect most carefully?',
    options: ['Your time', 'Your emotions', 'Your image', 'Your dreams'],
  },
  {
    id: 3,
    text: 'How do you disappear?',
    options: [
      'Into silence',
      'Into distraction',
      'Into other people',
      'Into creation',
    ],
  },
  {
    id: 4,
    text: 'What do others misread about you?',
    options: ['My coldness', 'My ambition', 'My silence', 'My chaos'],
  },
  {
    id: 5,
    text: 'Which world do you secretly inhabit?',
    options: [
      'The one you\'ve built alone',
      'The one that hasn\'t come yet',
      'The one others see',
      'The one beneath this one',
    ],
  },
  {
    id: 6,
    text: 'What breaks you that shouldn\'t?',
    options: [
      'Being ignored',
      'Being misunderstood',
      'Being needed too much',
      'Being replaced',
    ],
  },
  {
    id: 7,
    text: 'Which lie do you tell most fluently?',
    options: ['I\'m fine', 'I don\'t care', 'I\'m not angry', 'I\'m ready'],
  },
  {
    id: 8,
    text: 'What do you want that you\'ve never said aloud?',
    options: [
      'To be chosen first',
      'To disappear and be searched for',
      'To leave everything',
      'To be truly known',
    ],
  },
  {
    id: 9,
    text: 'How do you handle power?',
    options: [
      'I refuse it',
      'I collect it quietly',
      'I share it',
      'I fear it',
    ],
  },
  {
    id: 10,
    text: 'What do you do when you\'re falling apart?',
    options: [
      'Isolate',
      'Perform normality',
      'Seek someone',
      'Create something',
    ],
  },
  {
    id: 11,
    text: 'Which feeling visits you uninvited?',
    options: ['Longing', 'Rage', 'Grief', 'Numbness'],
  },
  {
    id: 12,
    text: 'What are you always preparing for?',
    options: [
      'The worst',
      'The moment everything changes',
      'Being left',
      'Being seen',
    ],
  },
  {
    id: 13,
    text: 'What would others find if they searched your history?',
    options: [
      'Evidence of obsession',
      'Evidence of abandonment',
      'Evidence of dreams',
      'Evidence of masks',
    ],
  },
  {
    id: 14,
    text: 'What signal do you send that you don\'t intend to?',
    options: [
      'That I\'m unavailable',
      'That I\'m unkind',
      'That I\'m unaffected',
      'That I\'m unstable',
    ],
  },
  {
    id: 15,
    text: 'The orb has been watching. What does it know that you don\'t?',
    options: [
      'That I\'m closer than I think',
      'That someone is watching me',
      'That I\'ve already decided',
      'That I\'m more dangerous than I appear',
    ],
  },
]
