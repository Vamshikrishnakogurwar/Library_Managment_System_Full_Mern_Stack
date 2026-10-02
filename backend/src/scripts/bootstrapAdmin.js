import readline from 'readline';
import bcrypt from 'bcrypt';
import { getDbPool } from '../config/database.js';

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function bootstrap() {
  console.log('====================================================');
  console.log('   LibraFlow Secure Admin Bootstrap Utility');
  console.log('====================================================\n');

  // Check if args or env provided
  let username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  let email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  let fullName = process.env.ADMIN_BOOTSTRAP_FULLNAME || 'System Administrator';

  if (!username) {
    username = await ask('Enter Administrator Username: ');
  }
  if (!email) {
    email = await ask('Enter Administrator Email: ');
  }
  if (!password) {
    password = await ask('Enter Administrator Password (min 8 chars): ');
  }

  if (!username || !email || !password || password.length < 8) {
    console.error('❌ Error: Username, Email, and Password (>= 8 chars) are required.');
    process.exit(1);
  }

  const pool = getDbPool();

  try {
    const [existing] = await pool.query("SELECT id, username, email FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (existing.length > 0) {
      console.log(`ℹ️ An ADMIN user already exists: ${existing[0].username} (${existing[0].email})`);
      if (process.env.ADMIN_BOOTSTRAP_USERNAME || process.argv.includes('--skip-existing')) {
        console.log('Skipping additional admin creation.');
        process.exit(0);
      }
      const proceed = await ask('Do you wish to create an additional ADMIN user? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Operation aborted.');
        process.exit(0);
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [res] = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, status)
       VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')`,
      [username, email, passwordHash, fullName]
    );

    console.log(`\n✅ Administrator account successfully created! User ID: ${res.insertId}`);
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log('You can now log in to the LibraFlow Admin Portal.\n');
  } catch (err) {
    console.error('❌ Failed to bootstrap admin:', err.message);
  } finally {
    await pool.end();
  }
}

bootstrap();
