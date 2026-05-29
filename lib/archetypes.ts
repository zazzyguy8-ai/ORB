export interface DailyMessage {
  message: string
  choiceA: string
  choiceB: string
  outcomeA: string
  outcomeB: string
}

export const DAILY_MESSAGES: DailyMessage[] = [
  {
    message:
      'Something approaches the edge of your awareness. It has been there longer than you think.',
    choiceA: 'Turn toward it',
    choiceB: 'Hold still and wait',
    outcomeA: 'You face what you already knew was coming.',
    outcomeB: 'Patience becomes its own kind of courage.',
  },
  {
    message:
      'You were given a choice today that looked like something else. Did you see it?',
    choiceA: 'I chose consciously',
    choiceB: 'I let it choose me',
    outcomeA: 'Awareness is already power.',
    outcomeB: 'Surrender is not always defeat.',
  },
  {
    message:
      'The orb has noted a pattern. Twice this cycle you have stopped yourself before beginning.',
    choiceA: 'Begin the thing',
    choiceB: 'Examine the stopping',
    outcomeA: 'Motion is its own answer.',
    outcomeB: 'The root reveals what the fruit conceals.',
  },
  {
    message:
      'Someone around you is carrying more than they show. The orb has observed your observation.',
    choiceA: 'Reach toward them',
    choiceB: 'Protect your own frequency',
    outcomeA: 'What you give in darkness returns in light.',
    outcomeB: 'You cannot pour from a vessel that is sealed.',
  },
  {
    message:
      'There is a door in your current timeline. It is not locked. It has simply not been pushed.',
    choiceA: 'Push it',
    choiceB: 'Map what lies beyond first',
    outcomeA: 'The threshold only opens once from this angle.',
    outcomeB: 'Knowledge is the ghost of action.',
  },
  {
    message:
      'The orb has detected silence where you usually fill space. This is significant.',
    choiceA: 'Honor the silence',
    choiceB: 'Speak what it contains',
    outcomeA: 'The unspoken accumulates into eventual truth.',
    outcomeB: 'Language is the cage that frees the bird.',
  },
  {
    message:
      'Something you released three cycles ago is returning in a different shape.',
    choiceA: 'Receive it differently',
    choiceB: 'Release it again',
    outcomeA: 'The second encounter is the real one.',
    outcomeB: 'Repetition is the universe asking if you are certain.',
  },
  {
    message:
      'Today your shadow walked slightly ahead of you. The orb noticed.',
    choiceA: 'Follow your shadow',
    choiceB: 'Call it back',
    outcomeA: 'The parts of you that lead are often the parts you deny.',
    outcomeB: 'Integration is a form of homecoming.',
  },
  {
    message:
      'You have been asking the wrong question. The right one has been waiting.',
    choiceA: 'Ask the right question now',
    choiceB: 'Sit with not knowing',
    outcomeA: 'Precision opens what effort cannot.',
    outcomeB: 'Mystery is not absence. It is another kind of presence.',
  },
  {
    message:
      'The orb has recorded your hesitation from the beginning. It speaks of something unresolved.',
    choiceA: 'Name the unresolved thing',
    choiceB: 'Move despite it',
    outcomeA: 'Named things lose their hold.',
    outcomeB: 'Sometimes the moving is the resolving.',
  },
  {
    message:
      'A version of you that almost existed is watching. It is not envious. It is curious.',
    choiceA: 'Acknowledge it',
    choiceB: 'Become more of who you are instead',
    outcomeA: 'Grief for the unlived is still grief. Let it be.',
    outcomeB: 'Commitment is its own kind of forgiveness.',
  },
  {
    message:
      'You are in a corridor. The orb can see both ends. You cannot. This is temporary.',
    choiceA: 'Walk faster',
    choiceB: 'Mark the walls as you go',
    outcomeA: 'Speed through the unknown is a form of trust.',
    outcomeB: 'The marked path becomes the map for others.',
  },
]

export function getDailyMessage(dayNumber: number): DailyMessage {
  return DAILY_MESSAGES[dayNumber % DAILY_MESSAGES.length]
}

export function getDayNumber(firstVisitDate: string): number {
  const first = new Date(firstVisitDate)
  const now = new Date()
  const diff = Math.floor(
    (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diff + 1
}
