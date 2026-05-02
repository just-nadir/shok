import 'dotenv/config';
import bcrypt from 'bcrypt';
import { query } from '../src/db/pool';

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await query(
    `INSERT INTO admins (username, password_hash)
     VALUES ('admin', $1)
     ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
    [hash]
  );
  console.log('Admin yaratildi. Login: admin, Parol: admin123');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
