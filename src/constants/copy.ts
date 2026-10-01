
export const decisionTypeCopy = {
  title: 'What decision do\nyou want to make?',
  subtitle: 'Choose one. You can always come back.',
  continue: 'Continue',
};

export const namingCopy = {
  titleFor: (decisionLabel: string) => `Which two options\nare you comparing?`,
  subtitle: (decisionLabel: string) => `For ${decisionLabel}, give each option a short name.`,
  firstOption: 'FIRST OPTION',
  secondOption: 'SECOND OPTION',
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
  answerEyebrow: 'THE RESULT',
  verdict: (winner: string) => `${winner} is the\nbetter choice.`,
  perHectare: 'per hectare',
  verdictDetail: (winner: string, loser: string) =>
    `Expected to earn more than ${loser} across this year's likely climate.`,
  earningsHeading: 'Expected earnings per hectare',
  keepInMindHeading: 'But keep in mind',
  keepInMindBody: (favorCount: number, total: number, winner: string, loser: string) =>
    favorCount === total
      ? `${winner} earns more in every kind of year this forecast allows.`
      : `${winner} earns more in ${favorCount} of ${total} kinds of year. In the rest, ${loser} does better.`,
  bothNegativeVerdict: 'Both options are\nexpected to lose money.',
  bothNegativeDetail: (a: string, b: string) =>
    `Neither ${a} nor ${b} is expected to make a profit across this year's likely climate.`,
  detailTable: 'Detailed table',
  seeDetails: 'See details',
  fullBreakdown: 'See full breakdown',
  hideBreakdown: 'Hide full breakdown',
  recommendedTag: 'Recommended',
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
  lastDecisionHeading: 'LAST DECISION',
  weatherPlaceholder: 'Weather data unavailable',
  loadErrorTitle: "Couldn't load your recent decision.",
  retry: 'Retry',
};

export const historyCopy = {
  title: 'History',
  subtitle: (n: number) => `${n} decision${n === 1 ? '' : 's'} · all on your device`,
  filterAll: 'All',
  emptyTitle: 'No decisions yet',
  emptySubtitle: 'Decisions you generate will show up here.',
  emptyCta: 'Make a Decision',
  errorTitle: "Couldn't load your history.",
  retry: 'Retry',
  notSent: 'Not yet synced',
  sent: 'Synced',
  deleteTitle: 'Delete this decision?',
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
  offlineBody: (pending: number, lastSync: string) =>
    `${pending} decision${pending === 1 ? '' : 's'} will send once you're back online. Last sync: ${lastSync}.`,
  syncNow: 'Try to sync now',
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
      body: 'Mobile-based Decision Support System for crop selection, crop protection, and harvest decisions.',
    },
    {
      key: 'compare',
      title: 'Compare two options',
      body: 'Which crop to plant, whether to protect a crop, or whether to harvest now or wait. Enter the yield, cost, and price for each option, and FarmAssist recommends the one likely to earn more.',
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
  whatBody: 'FarmAssist helps farmers and extension workers choose between two farming options, such as which crop to plant, whether to protect a crop, or whether to harvest now or wait. You enter the expected yields, prices, and costs, and the app recommends the option likely to earn more under the coming season\'s climate. It works fully offline, and your decisions sync to the cloud once you sign in.',
  rcdaHeading: 'THE RCDA MODEL',
  rcdaBody: 'Recommendations come from Rapid Climate Decision Analysis (RCDA). It combines the seasonal rainfall forecast (the chance of a below-normal, near-normal, or above-normal season) with the profit of each option under dry, average, and wet conditions. It then compares the expected returns and shows the recommended option, the estimated profit difference, and a decision tree of possible outcomes. It is created from the prototype Rapid Climate Decision Analysis version 3.2.',
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
  iAm: 'I am a…',
  fullName: 'Full name',
  username: 'Username',
  cityLabel: 'City / Municipality',
  provinceLabel: 'Province',
  confirmPassword: 'Confirm password',
  createAccount: 'Create account',
  creatingAccount: 'Creating account…',
  haveAccount: 'Already have an account?',
  signInInstead: 'Sign in',
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
