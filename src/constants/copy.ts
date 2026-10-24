
export const decisionTypeCopy = {
  title: 'What decision do\nyou want to make?',
  subtitle: 'Choose one. You can always come back.',
  continue: 'Continue',
};

export const namingCopy = {
  titleFor: (decisionLabel: string) => `Which two options\nare you comparing?`,
  subtitle: (decisionLabel: string) => `For ${decisionLabel}, give each option a short name.`,
  firstOption: 'First Option',
  secondOption: 'Second Option',
  helper: 'Followed by questions about yield, cost, and price for each option.',
  continue: 'Continue to Data Entry',
  continueDisabledHint: 'Fill in both names first',
  duplicateNames: 'Give each option a different name.',
  discardTitle: 'Discard this comparison?',
  discardBody: "The names you've entered won't be saved.",
  discardCancel: 'Keep editing',
  discardConfirm: 'Discard',
};

export const predefinedCopy = {
  useSaved: 'Use saved values',
  goOnline: 'Go online to use saved values',
  pickerTitle: 'Saved values',
  pickerSubtitle: 'Prepared by researchers from what farmers entered. You can still change them before continuing.',
  allProvinces: 'All provinces',
  empty: 'No saved values for this decision type yet.',
  loadError: "Couldn't load saved values. Check your connection.",
  retry: 'Retry',
  close: 'Close',
  loaded: (name: string) => `Loaded ${name}`,
  loadedBody: 'Yield, cost and price are filled in. Check them on the next steps.',
  loadedTag: 'Saved values loaded',
  removeLabel: 'Remove saved values',
  showSavedLabel: 'Saved values loaded. Show saved values',
  current: 'Loaded here',
  removed: 'Saved values removed',
  usedByFirst: 'Used for first option',
  usedBySecond: 'Used for second option',
};

export const dataEntryCopy = {
  stepContext: (optionName: string) => optionName,
  price: 'Selling price',
  priceUnit: 'per kilogram',
  scenariosHeading: 'FOR EACH CLIMATE SCENARIO',
  scenarioMeaning: [
    'The driest 1 in 5 seasons',
    'Somewhat drier than usual',
    'A typical season',
    'Somewhat wetter than usual',
    'The wettest 1 in 5 seasons',
  ],
  yield: 'Yield',
  yieldUnit: 'kg/ha',
  cost: 'Cost',
  costUnit: '₱/ha',
  addCost: 'Additional cost',
  addCostUnit: '₱/ha',
  filledCount: (n: number) => `${n} of 5 climate scenarios filled`,
  continueToOption: (nextName: string) => `Continue to ${nextName}`,
  continueToClimate: 'Continue to climate',
  errorNumbersOnly: 'Enter numbers only.',
  errorPriceMustBePositive: 'Selling price must be greater than 0.',
};

export const climateCopy = {
  title: 'How likely is each\nscenario this season?',
  subtitle: 'Use the seasonal outlook (e.g. El Niño or La Niña) if you have one. If unsure, leave it at 33 / 34 / 33.',
  dryYears: 'Driest',
  dryYearsSub: 'Below-normal rainfall (El Niño)',
  averageYears: 'Average',
  averageYearsSub: 'Calculated automatically',
  donutHint: 'Drag the white handles, or use the buttons below.',
  wetYears: 'Wettest',
  wetYearsSub: 'Above-normal rainfall (La Niña)',
  offlineNote: 'Calculated right here on your phone. No internet needed.',
  submit: 'Calculate Now',
  errorOver100: 'Total cannot exceed 100%',
  errorNoAverage: 'Leave at least 1% for average years.',
};

// A saved decision with no recommended option (both options lose money) stores result = ''.
export const decisionResultLabel = (result: string) => result || 'Both options lose money';

export const resultCopy = {
  savingPill: 'Saving…',
  savedPill: 'Saved',
  notSavedPill: 'Not saved',
  answerEyebrow: 'Forecast result',
  verdict: (winner: string) => `${winner} is the\nbetter choice.`,
  perHectare: 'per hectare',
  verdictDetail: (winner: string, loser: string) =>
    `Expected to earn more than ${loser} across this year's likely climate.`,
  earningsHeading: 'Expected earnings per hectare',
  earningsForecast: 'With your forecast',
  earningsNormal: 'Normal year (no forecast)',
  earningsSameAsNormal: 'Your forecast is a normal year',
  keepInMindHeading: 'But keep in mind',
  keepInMindBody: (favorCount: number, total: number, winner: string, loser: string) =>
    favorCount === total
      ? `${winner} earns more in every kind of year this forecast allows.`
      : `${winner} earns more in ${favorCount} of ${total} kinds of year. In the rest, ${loser} does better.`,
  bothNegativeVerdict: 'Both options are\nexpected to lose money.',
  bothNegativeDetail: (a: string, b: string) =>
    `Neither ${a} nor ${b} is expected to make a profit across this year's likely climate.`,
  seeDetails: 'See details',
  fullBreakdown: 'See full breakdown',
  hideBreakdown: 'Hide full breakdown',
  recommendedTag: 'Recommended',
  normalYearHeading: 'Compared with a normal year',
  normalYearYourForecast: 'Your forecast',
  normalYearNormal: 'Normal year',
  normalYearLegend: { dry: 'Dry', average: 'Average', wet: 'Wet' },
  normalYearSame: 'Your forecast is the same as a normal year, so these results are what you would expect in any typical season.',
  normalYearBetter: (name: string, amount: string) => `This season looks better than a normal year for ${name}: about ${amount} more per hectare.`,
  normalYearWorse: (name: string, amount: string) => `This season looks worse than a normal year for ${name}: about ${amount} less per hectare.`,
  normalYearEven: (name: string) => `This season looks about the same as a normal year for ${name}.`,
  normalYearOtherPick: (name: string) => `In a normal year, ${name} would be the better choice.`,
  normalYearNoProfit: 'In a normal year, neither option would be expected to make a profit.',
  disclaimer: 'FarmAssist is a decision-support tool. The final decision is always yours.',
  newComparison: 'Go home',
  loading: 'Computing decision…',
  paramsError: "We couldn't load this decision. Please start a new analysis.",
  computeError: "We couldn't compute this decision. Please check your inputs and try again.",
  saveErrorBanner: 'This decision could not be saved locally.',
  retry: 'Retry',
  retrying: 'Retrying…',
};

export const treeCopy = {
  heading: 'Decision tree',
  subtitle: 'Chance of each kind of year × what the option earns in it, added up.',
  rootLabel: 'Your choice',
  best: 'BEST',
  expected: 'Expected',
  outcomes: { dry: 'Dry years', average: 'Average years', wet: 'Wet years' },
  notForecast: 'not forecast',
  conclusionBest: (name: string) => `Best choice: ${name}`,
  conclusionNone: 'Both options lose money',
  formulaHeading: 'How "Expected" is worked out',
};

export const decisionDetailCopy = {
  title: 'Saved decision',
  loadError: "We couldn't load this decision.",
  notFound: 'This decision no longer exists on this device.',
  incomplete: "This decision is missing its inputs, so it can't be shown again.",
  cannotRecompute: "This decision was saved with 0% average years, which the model can't calculate.",
  retry: 'Retry',
  back: 'Back to history',
};

export const homeCopy = {
  greeting: (name?: string) => (name ? `Hi, ${name}!` : 'Hi, Farmer!'),
  offlineLabel: 'Offline',
  headingBefore: 'What ',
  headingAccent: 'decision',
  headingAfter: ' do\nyou need today?',
  subtitle: "Pick a decision problem. We'll answer it using your climate data.",
  lastDecisionHeading: 'Last Decision',
  weatherPlaceholder: 'Weather data unavailable',
  loadErrorTitle: "Couldn't load your recent decision.",
  retry: 'Retry',
  updateTitle: (v: string) => `FarmAssist ${v} is available`,
  updateDownload: 'Download',
  updateDismiss: 'Dismiss update notice',
};

export const historyCopy = {
  title: 'History',
  subtitle: (n: number) => `${n} decision${n === 1 ? '' : 's'} · all on your device`,
  filterAll: 'All',
  sortLabel: 'Sort decisions',
  sortNewest: 'Newest',
  sortOldest: 'Oldest',
  emptyTitle: 'No decisions yet',
  emptySubtitle: 'Decisions you generate will show up here.',
  emptyCta: 'Make a Decision',
  errorTitle: "Couldn't load your history.",
  retry: 'Retry',
  notSent: 'Not yet synced',
  sent: 'Synced',
  deleteTitle: 'Delete this decision?',
  deleteLabel: 'Delete decision',
  deleteBody: (result: string) => `This removes "${result}" from your history. This can't be undone.`,
  deleteCancel: "No, keep it",
  deleteConfirm: 'Delete',
  deletedToast: 'Decision deleted',
  deleteFailedTitle: 'Could not delete',
  deleteFailedBody: 'Please try again.',
  openHint: 'Opens the full result and decision tree',
};

export const profileCopy = {
  statsDecisions: 'Decisions',
  loadErrorTitle: "Couldn't load your stats.",
  loadErrorBody: 'Some information on this screen may be out of date.',
  retry: 'Retry',
  offlineTitle: 'No internet right now',
  lastSync: (lastSync: string) => `Last sync: ${lastSync}`,
  syncNow: 'Sync now',
  settingsLabel: 'Account settings',
  location: 'Location',
  syncErrorsTitle: "Couldn't finish syncing",
  syncErrorsBody: (count: number) =>
    `${count} change${count === 1 ? '' : 's'} failed to save to the cloud and won't be retried automatically. This usually means the same account or record already exists there.`,
  syncErrorDismiss: 'Dismiss',
  logOut: 'Log out',
  logoutConfirmTitle: 'Log out?',
  logoutConfirmBody: "You'll need to sign in again to sync decisions or access predefined inputs.",
  logoutCancel: 'Cancel',
  signedOutTitle: 'Welcome to FarmAssist',
  signedOutSubtitle: 'Sign in or create an account to sync your decisions and access more features.',
  signIn: 'Sign In',
  createAccount: 'Create Account',
  accountType: 'Account type',
  about: 'About FarmAssist',
  viewIntro: 'View introduction',
  editProfile: 'Edit profile',
  editTitle: 'Edit profile',
  editSubtitle: 'Update the name and email on your account.',
  nameLabel: 'NAME',
  namePlaceholder: 'Your full name',
  emailLabel: 'EMAIL',
  emailOfflineHint: 'Connect to the internet to change your email.',
  emailConfirmHint: "We'll email a confirmation link. Your current email keeps working until you confirm.",
  editCancel: 'Cancel',
  editSave: 'Save',
  editSaveFailed: "Couldn't save your profile. Please try again.",
  profileUpdated: 'Profile updated',
  emailConfirmTitle: 'Confirm your new email',
  emailConfirmBody: (email: string) => `Open the link we sent to ${email}. If a link also went to your current email, open that one too.`,
  pendingEmail: (email: string) => `Waiting for you to confirm ${email}`,
  noEmailHint: 'Add an email in Edit profile so you can reset a forgotten password yourself.',
};

export const onboardingCopy = {
  skip: 'Skip',
  next: 'Next',
  getStarted: 'Get started',
  done: 'Done',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
  close: 'Close introduction',
  pageLabel: (page: number, total: number) => `Page ${page} of ${total}`,
  slides: [
    {
      key: 'welcome',
      title: 'Welcome to FarmAssist',
      body: 'Mobile-based Decision Support System for choosing crops, crop varieties, and rain protection.',
    },
    {
      key: 'compare',
      title: 'Compare two options',
      body: 'Which crop to plant, which variety to grow, or whether to protect your crop from rain. Enter the yield, cost, and price for each option, and FarmAssist recommends the one likely to earn more.',
    },
    {
      key: 'offline',
      title: 'Works without internet',
      body: 'Everything is calculated and saved right on your phone. You can use FarmAssist in the field with no signal.',
    },
    {
      key: 'sync',
      title: 'Sign in when you are ready',
      body: 'An account backs up your decisions to the cloud and lets you load saved values prepared by researchers. You can start without one.',
    },
  ],
} as const;

export const aboutCopy = {
  title: 'About',
  back: 'Back',
  appName: 'FarmAssist',
  tagline: 'Climate-smart decisions for Filipino farmers',
  version: (v: string) => `Version ${v}`,
  whatHeading: 'WHAT IT DOES',
  whatBody: 'FarmAssist helps farmers and extension workers choose between two farming options, such as which crop to plant, which variety to grow, or whether to protect a crop from rain. You enter the expected yields, prices, and costs, and the app recommends the option likely to earn more under the coming season\'s climate. It works fully offline, and your decisions sync to the cloud once you sign in.',
  rcdaHeading: 'THE RCDA MODEL',
  rcdaBody: 'Recommendations come from Rapid Climate Decision Analysis (RCDA). It combines the seasonal rainfall forecast (the chance of a below-normal, near-normal, or above-normal season) with the profit of each option under dry, average, and wet conditions. It then compares the expected returns and shows the recommended option, the estimated profit difference, and a decision tree of possible outcomes. It is created from the prototype Rapid Climate Decision Analysis version 3.2. FarmAssist supports decisions but does not make them: the final decision stays with the farmer, and every result is only as accurate as the data entered.',
  originHeading: 'ORIGIN',
  originBody: 'This mobile application is developed through the collaborative project between the UPLB Interdisciplinary Studies Center for Integrated Natural Resources and Environment Management (UPLB-INREM) and the Institute of Computer Science (ICS) of the University of the Philippines Los Baños (UPLB).',
  creditsHeading: 'PROJECT',
  credits: [
    { icon: 'school-outline', label: 'Institution', value: 'UPLB-INREM & UPLB-ICS' },
    { icon: 'person-outline', label: 'Developer', value: 'Clarence Manzanido\nUPLB BSCS Student' },
  ],
  contactHeading: 'CONTACT',
  contactLabel: 'Send feedback',
  contactEmail: 'camanzanido@up.edu.ph',
  footer: 'Made for farmers, extension workers, and researchers.',
} as const;

export const authCopy = {
  brand: 'FarmAssist',
  loginSubtitle: 'Sign in to save your decisions to the cloud. You can also keep using the app without an account.',
  email: 'Email',
  loginLabel: 'Username or email',
  loginPlaceholder: 'juan.dc or you@email.com',
  loginRequired: 'Enter your username or email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  lockedButton: (time: string) => `Try again in ${time}`,
  lockedMessage: 'Too many incorrect attempts. For your security, sign-in is paused for a moment.',
  attemptsLeft: (n: number) => `${n} attempt${n === 1 ? '' : 's'} left before sign-in is paused.`,
  noAccount: "Don't have an account?",
  createOne: 'Create one',
  continueOffline: 'Continue without an account',
  registerTitle: 'Create your account',
  registerSubtitle: 'For farmers and extension workers. Researcher accounts are created by a FarmAssist researcher.',
  researcherNote: 'Researcher? Ask an existing FarmAssist researcher to create your account.',
  fullName: 'Full name',
  username: 'Username',
  usernamePlaceholder: 'e.g. juan.dc (you sign in with this)',
  emailOptional: 'Email (optional)',
  noEmailNote: "Without an email you can't reset a forgotten password yourself. Ask your researcher or extension worker to reset it.",
  cityLabel: 'City / Municipality',
  provinceLabel: 'Province',
  confirmPassword: 'Confirm password',
  createAccount: 'Create account',
  creatingAccount: 'Creating account…',
  haveAccount: 'Already have an account?',
  signInInstead: 'Sign in',
};

export const forgotPasswordCopy = {
  link: 'Forgot password?',
  title: 'Reset your password',
  emailSubtitle: "Enter the email on your account. We'll send you a code to set a new password.",
  emailLabel: 'Email',
  noEmailNote: "No email on your account? Ask your researcher or extension worker to reset your password.",
  noEmailAccount: 'Enter the email you added to your account.',
  sendCode: 'Send code',
  sendFailed: "Couldn't send the code. Please try again.",
  sentBody: (email: string) => `If ${email} has an account, we sent it a code. Check your inbox and spam folder.`,
  resentTitle: 'Code sent again',
  codeLabel: 'Code from the email',
  codeInvalid: 'Enter the code from the email.',
  newPasswordLabel: 'New password',
  confirmLabel: 'Confirm new password',
  resend: 'Send a new code',
  resendIn: (s: number) => `Send a new code in ${s}s`,
  savePassword: 'Save new password',
  resetFailed: "Couldn't reset your password. Please try again.",
  changeEmail: 'Use a different email',
  doneTitle: 'Password updated',
  doneBody: 'Sign in with your new password.',
};

export const changePasswordCopy = {
  row: 'Change password',
  title: 'Change password',
  subtitle: 'You need an internet connection to change your password.',
  currentLabel: 'CURRENT PASSWORD',
  newLabel: 'NEW PASSWORD',
  confirmLabel: 'CONFIRM NEW PASSWORD',
  currentRequired: 'Enter your current password.',
  currentWrong: 'Your current password is incorrect.',
  sameAsCurrent: 'Choose a password that is different from your current one.',
  signedOut: 'Please sign in again, then change your password.',
  failed: "Couldn't change your password. Please try again.",
  cancel: 'Cancel',
  save: 'Change password',
  doneTitle: 'Password changed',
  doneBody: 'Use your new password the next time you sign in.',
};

export const startupCopy = {
  starting: 'Starting FarmAssist…',
  slowTitle: 'This is taking longer than usual.',
  slowBody: 'Your saved decisions are safe. If this screen does not go away, close FarmAssist completely and open it again.',
  errorTitle: "FarmAssist couldn't start.",
  errorBody: 'Your saved decisions are safe. Close FarmAssist completely and open it again.',
};

export const claimCopy = {
  promptTitle: 'Add offline decisions to your account?',
  promptBody: (count: number) =>
    `${count} decision${count === 1 ? ' was' : 's were'} made on this phone without signing in. ` +
    'Add them to your account so they sync? Only do this if they are yours.',
  notNow: 'Not now',
  confirm: 'Add to my account',
  doneTitle: 'Decisions added',
  doneBody: (count: number) =>
    `${count} decision${count === 1 ? '' : 's'} will sync with your account.`,
  deferredTitle: "Couldn't add them yet",
  deferredBody:
    "Your account details haven't finished downloading. The decisions are safe on this phone, and we'll ask again next time you open FarmAssist.",
  errorTitle: "Couldn't add decisions",
  errorBody: "They are still safe on this phone. We'll ask again next time you open FarmAssist.",
};

export type GlossaryKey =
  | 'scenarios' | 'price' | 'yield' | 'cost' | 'addCost'
  | 'forecast' | 'normalYear'
  | 'expectedEarnings' | 'recommended' | 'bothLose' | 'decisionTree'
  | 'offline' | 'sync';

export const GLOSSARY: Record<GlossaryKey, { term: string; definition: string }> = {
  scenarios: {
    term: 'Climate scenarios',
    definition: 'The five kinds of season FarmAssist plans for: Driest, Below Average, Average, Above Average, and Wettest. They describe how much rain a season gets compared with what is usual for your area. Driest seasons often come with El Niño; Wettest with La Niña.\n\n'
      + 'Driest: the driest 1 in 5 seasons.\n'
      + 'Below Average: drier than usual, but not the driest.\n'
      + 'Average: a typical season for your area.\n'
      + 'Above Average: wetter than usual, but not the wettest.\n'
      + 'Wettest: the wettest 1 in 5 seasons.',
  },
  price: {
    term: 'Selling price',
    definition: 'How much you expect to sell one kilogram of the harvest for, in pesos.',
  },
  yield: {
    term: 'Yield (kg/ha)',
    definition: 'How many kilograms you expect to harvest from one hectare in that kind of season.',
  },
  cost: {
    term: 'Cost (₱/ha)',
    definition: 'Your usual cost to produce one hectare in that kind of season: seeds, fertilizer, labor, land preparation, and so on.',
  },
  addCost: {
    term: 'Additional cost (₱/ha)',
    definition: 'Extra cost that only comes with that kind of season, such as covering the crop from rain, replanting after a flood, or extra irrigation in a drought. Enter 0 if there is none.',
  },
  forecast: {
    term: 'Climate forecast (%)',
    definition: 'The chance that the coming season will be dry, average, or wet, for example from the PAGASA seasonal outlook or your extension worker. You set dry and wet; average is whatever is left so the three add up to 100%.',
  },
  normalYear: {
    term: 'Normal year (33 / 34 / 33)',
    definition: 'With no forecast, a dry, average, or wet season are about equally likely: 33%, 34%, and 33%. FarmAssist compares your forecast with this, so you can see if this season looks better or worse than usual.',
  },
  expectedEarnings: {
    term: 'Expected earnings',
    definition: 'The average profit per hectare, after costs, that an option is expected to make. Each kind of season counts according to how likely the forecast says it is.',
  },
  recommended: {
    term: 'Recommended option',
    definition: 'The option with the higher expected earnings. The amount shown under it is how much more per hectare it is expected to earn than the other option.',
  },
  bothLose: {
    term: 'Both options lose money',
    definition: 'Both options are expected to earn less than they cost under this forecast, so FarmAssist does not recommend either. Try checking your prices, costs, or other options.',
  },
  decisionTree: {
    term: 'Decision tree',
    definition: 'A picture of how the result is worked out. For each option it shows the chance of a dry, average, or wet season and what the option earns in it, then adds them up into the expected earnings.',
  },
  offline: {
    term: 'Offline',
    definition: 'FarmAssist works without internet. Every decision is calculated and saved on your phone.',
  },
  sync: {
    term: 'Sync',
    definition: 'When you are signed in and online, your saved decisions are uploaded to the cloud so they are kept safe and can help researchers. This happens automatically.',
  },
};

export const helpCopy = {
  title: 'How to use',
  back: 'Back',
  intro: 'FarmAssist compares two farming options and tells you which one is likely to earn more this season, based on the climate forecast.',
  stepsHeading: 'STEP BY STEP',
  steps: [
    { icon: 'apps-outline', title: 'Choose a decision', body: 'On Home, pick Crop Choice, Crop Variety, or Protect from Rain.' },
    { icon: 'create-outline', title: 'Name your two options', body: 'For example, two crops or two varieties. When signed in and online, you can load saved values for your area.' },
    { icon: 'calculator-outline', title: 'Enter the numbers', body: 'For each option, enter the selling price, then the yield, cost, and additional cost for each of the five climate scenarios.' },
    { icon: 'partly-sunny-outline', title: 'Set the forecast', body: 'Enter the chance of a dry and a wet season. If you have no forecast, leave it at 33 / 34 / 33.' },
    { icon: 'ribbon-outline', title: 'Read the result', body: 'See the better option, how much more it may earn per hectare, and how this season compares with a normal year. Tap "See full breakdown" for the decision tree. Every result is saved to History.' },
  ] as const,
  termsHeading: 'TERMS USED IN THE APP',
  termsHint: 'Tap a term to see what it means.',
  openHelp: 'How to use FarmAssist',
  helpLabel: 'Help: how to use FarmAssist',
  termHelpLabel: (term: string) => `What does ${term} mean?`,
  sheetClose: 'Got it',
  learnHow: 'Learn how it works',
};
