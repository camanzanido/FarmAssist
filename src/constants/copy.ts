
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
  title: 'How often does\neach scenario happen?',
  subtitle: 'Out of 10 years, how many are dry vs wet? If unsure, leave it at 33 / 34 / 33.',
  dryYears: 'Dry years',
  dryYearsSub: 'Below-average rainfall',
  averageYears: 'Average years',
  averageYearsSub: 'Calculated automatically',
  wetYears: 'Wet years',
  wetYearsSub: 'Above-average rainfall',
  offlineNote: 'Calculated right here on your phone. No internet needed.',
  submit: 'Show my answer',
  errorOver100: 'Total cannot exceed 100%',
};

export const resultCopy = {
  savingPill: 'Saving…',
  savedPill: 'Saved',
  notSavedPill: 'Not saved',
  answerEyebrow: 'THE ANSWER',
  verdict: (winner: string) => `${winner} is the\nbetter choice.`,
  perHectare: 'per hectare',
  verdictDetail: (winner: string, loser: string) =>
    `Expected to earn more than ${loser} across this year's likely climate.`,
  earningsHeading: 'Expected earnings per hectare',
  keepInMindHeading: 'But keep in mind',
  keepInMindBody: (favorCount: number, total: number, winner: string, loser: string) =>
    favorCount === total
      ? `${winner} earns more in every climate scenario used here.`
      : `In ${favorCount} of ${total} climate scenarios, ${winner} earns more. In the rest, ${loser} does better.`,
  detailTable: 'Detailed table',
  newComparison: 'Go home',
  share: 'Share',
  loading: 'Computing decision…',
  paramsError: "We couldn't load this decision. Please start a new analysis.",
  computeError: "We couldn't compute this decision. Please check your inputs and try again.",
  saveErrorBanner: 'This decision could not be saved locally.',
  retry: 'Retry',
  retrying: 'Retrying…',
};

export const homeCopy = {
  greeting: (name: string) => `Hi, ${name}`,
  offlinePill: 'Offline',
  heading: 'What decision do\nyou need today?',
  subtitle: "Pick a question. We'll answer it using your climate data.",
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
};

export const authCopy = {
  brand: 'FarmAssist',
  loginSubtitle: 'Sign in to save your decisions to the cloud. You can also keep using the app without an account.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
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
