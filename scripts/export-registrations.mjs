import { DatabaseSync } from 'node:sqlite';
import { databasePath } from '../server/config.mjs';

const db = new DatabaseSync(databasePath(), { readOnly: true });
const rows = db
  .prepare(
    'SELECT id,name,email,phone,course,experience,format,message,consent_at,created_at FROM registrations ORDER BY created_at DESC',
  )
  .all();
const columns = [
  'id',
  'name',
  'email',
  'phone',
  'course',
  'experience',
  'format',
  'message',
  'consent_at',
  'created_at',
];
function csv(value) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution, including after leading whitespace.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
process.stdout.write('\uFEFF' + columns.join(',') + '\n');
for (const row of rows) process.stdout.write(columns.map((key) => csv(row[key])).join(',') + '\n');
db.close();
