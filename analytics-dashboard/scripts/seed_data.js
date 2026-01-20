
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually since we might not have dotenv
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or Key. Please check your .env.local file.');
  process.exit(1);
}

// Use Service Role Key if available for admin privileges (bypassing RLS), otherwise Anon Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY);

const USERS = [
  'alice@example.com',
  'bob@example.com',
  'charlie@example.com',
  'dave@example.com'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedUsers() {
  console.log('Seeding users...');
  for (const email of USERS) {
    const { error } = await supabase.from('users').upsert({
      email,
      name: email.split('@')[0],
      role: 'developer',
      department: 'Engineering',
      last_active: new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) console.error(`Error seeding user ${email}:`, error);
  }
}

async function seedDailyMetrics() {
  console.log('Seeding daily metrics...');
  const today = new Date();

  for (const email of USERS) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Random metrics
      const totalPrompts = randomInt(10, 50);
      const acceptedCount = Math.floor(totalPrompts * (randomInt(30, 80) / 100));
      const rejectedCount = totalPrompts - acceptedCount;

      const { error } = await supabase.from('daily_metrics').upsert({
        user_id: email,
        date: dateStr,
        platform: 'copilot', // simplified to just copilot for now
        total_prompts: totalPrompts,
        accepted_count: acceptedCount,
        rejected_count: rejectedCount,
        retry_count: randomInt(0, 5),
        total_tokens_used: randomInt(1000, 50000),
        avg_response_time_ms: randomInt(200, 2000),
        context_avg_files: randomInt(1, 10),
        context_avg_tokens: randomInt(500, 2000),
        file_types_worked: { ts: randomInt(10, 50), tsx: randomInt(10, 50) }
      }, { onConflict: 'user_id,date,platform' });

      if (error) console.error(`Error seeding metrics for ${email} on ${dateStr}:`, error);
    }
  }
}

async function seedQualityScores() {
  console.log('Seeding quality scores...');
  const today = new Date();

  // Go back 8 weeks
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    // Adjust to Monday
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    date.setDate(diff);
    const dateStr = date.toISOString().split('T')[0];

    for (const email of USERS) {
      const effectiveness = randomInt(50, 95);
      const bestPractices = randomInt(50, 95);
      const efficiency = randomInt(50, 95);
      const overall = Math.round((effectiveness + bestPractices + efficiency) / 3);

      const { error } = await supabase.from('quality_scores').upsert({
        user_id: email,
        week_start_date: dateStr,
        effectiveness_score: effectiveness,
        best_practices_score: bestPractices,
        efficiency_score: efficiency,
        overall_score: overall,
        insights: [
          'Good use of context files',
          'Prompt decomposition is improving',
          'High acceptance rate on Fridays'
        ],
        suggestions: [
          'Try providing more specific types in prompts',
          'Break down large functions before asking for refactoring',
          'Use /explain to understand complex logic before modifying'
        ]
      }, { onConflict: 'user_id,week_start_date' });

      if (error) console.error(`Error seeding quality scores for ${email} week ${dateStr}:`, error);
    }
  }
}

async function main() {
  try {
    await seedUsers();
    await seedDailyMetrics();
    await seedQualityScores();
    console.log('Seeding complete!');
  } catch (e) {
    console.error('Seeding failed:', e);
  }
}

main();
