const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const dotenv = loadDotEnv();
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || dotenv.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || dotenv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing config. Need EXPO_PUBLIC_SUPABASE_URL (from .env) and SUPABASE_SERVICE_ROLE_KEY ' +
    '(set as an env var, or add a SUPABASE_SERVICE_ROLE_KEY= line to your local .env — it is gitignored).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_PASSWORD = 'FarmAssistSeed123!';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Produces a 7-point curve (driest, very_dry, below_avg, average, above_avg,
// very_good, wettest) shaped like a bell around `peakIndex`, for a plausible
// yield/cost progression across climate scenarios.
function curve7(base, amplitude, peakIndex) {
  const points = [];
  for (let i = 0; i < 7; i++) {
    const distance = Math.abs(i - peakIndex);
    const factor = Math.max(0.15, 1 - distance * 0.18);
    points.push(Math.max(0, Math.round(base + amplitude * factor + randInt(-amplitude * 0.1, amplitude * 0.1))));
  }
  return points;
}

const CURVE_KEYS = ['driest', 'very_dry', 'below_avg', 'average', 'above_avg', 'very_good', 'wettest'];

function curveToFields(prefix, values) {
  const fields = {};
  CURVE_KEYS.forEach((k, i) => { fields[`${prefix}_${k}`] = values[i]; });
  return fields;
}

const RESEARCHERS = [
  { name: 'Dr. Elena Cruz', username: 'elena.cruz', email: 'elena.cruz@seed.farmassist.test' },
  { name: 'Marco Villanueva', username: 'marco.v', email: 'marco.villanueva@seed.farmassist.test' },
];

const FARMERS = [
  { name: 'Rosario Santos', username: 'rosario.s', email: 'rosario.santos@seed.farmassist.test', city: 'Los Baños', province: 'Laguna' },
  { name: 'Bayani Reyes', username: 'bayani.r', email: 'bayani.reyes@seed.farmassist.test', city: 'Tuguegarao City', province: 'Cagayan' },
  { name: 'Corazon Dela Cruz', username: 'corazon.dc', email: 'corazon.delacruz@seed.farmassist.test', city: 'Davao City', province: 'Davao del Sur' },
  { name: 'Enrico Bautista', username: 'enrico.b', email: 'enrico.bautista@seed.farmassist.test', city: 'Iloilo City', province: 'Iloilo' },
  { name: 'Marites Aquino', username: 'marites.a', email: 'marites.aquino@seed.farmassist.test', city: 'Baguio City', province: 'Benguet' },
  { name: 'Domingo Ramos', username: 'domingo.r', email: 'domingo.ramos@seed.farmassist.test', city: 'Cebu City', province: 'Cebu' },
  { name: 'Luz Fernandez', username: 'luz.f', email: 'luz.fernandez@seed.farmassist.test', city: 'Legazpi City', province: 'Albay' },
];

const DECISION_OPTIONS_BY_TYPE = {
  crop_choice: [
    ['Rice IR64', 'Corn OPV'],
    ['Cabbage', 'Mungbean'],
    ['Rice NSIC Rc222', 'Sorghum'],
  ],
  harvest: [['Harvest Now', 'Delay 2 Weeks']],
  protect: [['Apply Fungicide', 'Skip Treatment']],
};
const DECISION_TYPES = Object.keys(DECISION_OPTIONS_BY_TYPE);

function randomPastDate(monthsBack) {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - randInt(0, monthsBack));
  past.setDate(randInt(1, 28));
  return past.toISOString();
}

async function createAuthUser({ name, username, email, user_type }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name, username, user_type },
  });
  if (error) {
    if (error.message?.toLowerCase().includes('already been registered') || error.code === 'email_exists') {
      console.log(`  already exists, looking up: ${email}`);
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      const existing = list.users.find(u => u.email === email);
      if (!existing) throw new Error(`Could not find existing user for ${email}`);
      return existing.id;
    }
    throw error;
  }
  return data.user.id;
}

async function upsertProfile({ id, name, username, email, user_type }) {
  const { error } = await supabase.from('users').upsert({
    id, name, username, email, status: 'active', user_type,
  });
  if (error) throw error;
}

async function createLocation({ city, province, user_id }) {
  const { data, error } = await supabase
    .from('locations')
    .insert({ city, province, user_id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function createDecisionWithOptions({ user_id, location_id }) {
  const decisionType = pick(DECISION_TYPES);
  const [optionAName, optionBName] = pick(DECISION_OPTIONS_BY_TYPE[decisionType]);

  const driest = randInt(20, 45);
  const wettest = randInt(15, 40);
  const mid = Math.max(0, 100 - driest - wettest);

  const winnerIsA = Math.random() > 0.5;
  const profitIncrease = randInt(3000, 280000);

  const { data: decisionRow, error: decisionErr } = await supabase
    .from('decisions')
    .insert({
      decision_type: decisionType,
      datetime: randomPastDate(7),
      location_id,
      user_id,
      result: winnerIsA ? optionAName : optionBName,
      profit_increase: profitIncrease,
      climate_driest: driest,
      climate_mid: mid,
      climate_wettest: wettest,
    })
    .select('id')
    .single();
  if (decisionErr) throw decisionErr;

  const buildOption = (slot, name, peakIndex) => ({
    decision_id: decisionRow.id,
    option_slot: slot,
    option_name: name,
    price: randInt(15, 80),
    ...curveToFields('cost', curve7(randInt(20000, 90000), randInt(20000, 80000), 3)),
    ...curveToFields('add_cost', curve7(0, randInt(0, 5000), 3)),
    ...curveToFields('yield', curve7(randInt(1000, 3000), randInt(4000, 10000), peakIndex)),
  });

  const options = [
    buildOption(0, optionAName, randInt(2, 4)),
    buildOption(1, optionBName, randInt(2, 4)),
  ];

  const { error: optionsErr } = await supabase.from('decision_options').insert(options);
  if (optionsErr) throw optionsErr;
}

async function main() {
  console.log(`Seeding against ${SUPABASE_URL}\n`);

  console.log('Creating researchers...');
  for (const r of RESEARCHERS) {
    const id = await createAuthUser({ ...r, user_type: 'researcher' });
    await upsertProfile({ id, ...r, user_type: 'researcher' });
    console.log(`  ✓ ${r.name} (${r.email})`);
  }

  console.log('\nCreating farmers + locations + decisions...');
  for (const f of FARMERS) {
    const id = await createAuthUser({ name: f.name, username: f.username, email: f.email, user_type: 'farmer' });
    await upsertProfile({ id, name: f.name, username: f.username, email: f.email, user_type: 'farmer' });
    const locationId = await createLocation({ city: f.city, province: f.province, user_id: id });

    const decisionCount = randInt(3, 5);
    for (let i = 0; i < decisionCount; i++) {
      await createDecisionWithOptions({ user_id: id, location_id: locationId });
    }
    console.log(`  ✓ ${f.name} — ${f.city}, ${f.province} (${decisionCount} decisions)`);
  }

  console.log('\nDone. All seed accounts use the password:', SEED_PASSWORD);
  console.log('Farmer emails:', FARMERS.map(f => f.email).join(', '));
  console.log('Researcher emails:', RESEARCHERS.map(r => r.email).join(', '));
}

main().catch(err => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
