import sharp from 'sharp';
import { transferDatabase } from '../server/database-transfer.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/app.mjs';
import { openDatabase, defaults } from '../server/database.mjs';
import { createAdmin, verifyPassword } from '../server/auth.mjs';

const dir = mkdtempSync(join(tmpdir(), 'jayhun-admin-')),
  dbPath = join(dir, 'admin.sqlite');
const password = randomBytes(24).toString('hex');
let instance, server, base, cookie, csrf, student, student2, group, material, exam, result;
const validStudent = {
  name: 'Admin Sınaq',
  email: 'admin-student@example.test',
  phone: '+994501234567',
  course: 'help-desk',
  experience: 'beginner',
  format: 'online',
  message: '',
  status: 'new',
  admin_note: '',
};
const validGroup = {
  name: 'Help Desk A',
  course_id: 'help-desk',
  start_date: '2026-11-01',
  end_date: '2027-01-01',
  schedule: 'B.e. 19:00',
  format: 'online',
  capacity: 1,
  status: 'active',
  notes: '',
};
async function call(path, { method = 'GET', body, auth = true, headers = {}, raw } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = (response.headers.get('content-type') || '').includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, status: response.status, data };
}
before(async () => {
  instance = createApp({
    dbPath,
    rateLimit: 100,
    adminCredentials: { username: 'test-admin', password },
  });
  server = instance.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password }),
  });
  assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie').split(';')[0];
  csrf = (await response.json()).csrfToken;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  instance?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('every private resource requires login, including exports and downloads', async () => {
  for (const path of [
    'dashboard',
    'options',
    'settings',
    'courses',
    'faqs',
    'registrations',
    'groups',
    'materials',
    'exams',
    'results',
    'registrations.csv',
    'materials/unknown/file',
    'groups/unknown/members',
  ])
    assert.equal((await call('/api/admin/' + path, { auth: false })).status, 401, path);
  for (const method of ['POST', 'PUT', 'DELETE'])
    assert.equal(
      (await call('/api/admin/courses/test', { method, auth: false, body: {} })).status,
      401,
    );
  assert.equal((await call('/api/public/content', { auth: false })).status, 200);
});
test('authentication uses HTTP-only cookies, hashed passwords and hashed session tokens', async () => {
  const login = await call('/api/admin/login', {
    method: 'POST',
    auth: false,
    body: { username: 'test-admin', password },
  });
  assert.equal(login.status, 200);
  const header = login.response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Path=\/api/);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const user = db.prepare('SELECT * FROM admin_users').get();
  assert.notEqual(user.password_hash, password);
  assert.ok(verifyPassword(password, user.password_hash));
  assert.equal(
    db.prepare('SELECT 1 FROM admin_sessions WHERE token_hash=?').get(cookie.split('=')[1]),
    undefined,
  );
  db.close();
  assert.equal(
    (
      await call('/api/admin/login', {
        method: 'POST',
        auth: false,
        body: { username: 'test-admin', password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.equal((await call('/api/admin/session')).status, 200);
});
test('CSRF and cross-origin writes are rejected without changing content', async () => {
  assert.equal(
    (
      await call('/api/admin/settings', {
        method: 'PUT',
        body: { brandName: 'Hacked' },
        headers: { 'X-CSRF-Token': '' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call('/api/admin/settings', {
        method: 'PUT',
        body: { brandName: 'Hacked' },
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call('/api/admin/login', {
        method: 'POST',
        auth: false,
        body: { username: 'test-admin', password },
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.settings.brandName,
    'Jayhun Tech',
  );
});
test('settings and FAQ CRUD update the public site and preserve hidden content', async () => {
  assert.equal(
    (
      await call('/api/admin/settings', {
        method: 'PUT',
        body: { heroLine1: 'Yeni başlıq', showProcess: false },
      })
    ).status,
    200,
  );
  let content = (await call('/api/public/content', { auth: false })).data;
  assert.equal(content.settings.heroLine1, 'Yeni başlıq');
  assert.equal(content.settings.showProcess, false);
  assert.equal(content.settings.phone, defaults.settings.phone);
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { phone: 'javascript:alert(1)' } }))
      .status,
    400,
  );
  const created = await call('/api/admin/faqs', {
    method: 'POST',
    body: { question: 'Yeni sual?', answer: 'Cavab', published: true, sort_order: 0 },
  });
  assert.equal(created.status, 201);
  assert.ok(
    (await call('/api/public/content', { auth: false })).data.faqs.some(
      (f) => f.id === created.data.id,
    ),
  );
  assert.equal(
    (
      await call('/api/admin/faqs/' + created.data.id, {
        method: 'PUT',
        body: { question: 'Dəyişən sual?', answer: 'Gizli cavab', published: false, sort_order: 2 },
      })
    ).status,
    200,
  );
  assert.ok(
    !(await call('/api/public/content', { auth: false })).data.faqs.some(
      (f) => f.id === created.data.id,
    ),
  );
  assert.equal(
    (await call('/api/admin/faqs/' + created.data.id, { method: 'DELETE' })).status,
    200,
  );
});
test('custom course CRUD, curriculum changes and publication are enforced for registration', async () => {
  const course = {
    ...defaults.courses[0],
    id: 'custom-course',
    name: 'Xüsusi kurs',
    modules: [{ title: 'Modul', duration: '1 həftə', topics: ['Mövzu'], lab: 'Praktika' }],
    published: false,
  };
  assert.equal((await call('/api/admin/courses', { method: 'POST', body: course })).status, 201);
  assert.ok(
    !(await call('/api/public/content', { auth: false })).data.courses.some(
      (c) => c.id === course.id,
    ),
  );
  assert.equal(
    (
      await call('/api/registrations', {
        method: 'POST',
        auth: false,
        body: { ...validStudent, course: course.id, consent: true },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('/api/admin/courses/' + course.id, {
        method: 'PUT',
        body: { ...course, published: true },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.courses.find(
      (c) => c.id === course.id,
    ).modules[0].title,
    'Modul',
  );
  assert.equal((await call('/api/admin/courses/' + course.id, { method: 'DELETE' })).status, 200);
});
test('student CRUD supports search, status, CSV and duplicate protection', async () => {
  const a = await call('/api/admin/registrations', { method: 'POST', body: validStudent });
  assert.equal(a.status, 201);
  student = a.data.id;
  const b = await call('/api/admin/registrations', {
    method: 'POST',
    body: { ...validStudent, name: 'İkinci Tələbə', email: 'second@example.test' },
  });
  student2 = b.data.id;
  assert.equal(
    (await call('/api/admin/registrations', { method: 'POST', body: validStudent })).status,
    409,
  );
  assert.equal(
    (
      await call('/api/admin/registrations/' + student, {
        method: 'PUT',
        body: { ...validStudent, status: 'contacted', admin_note: 'Əlaqə saxlanılıb' },
      })
    ).status,
    200,
  );
  const list = (await call('/api/admin/registrations?q=Admin&status=contacted')).data;
  assert.equal(list.total, 1);
  assert.equal(list.items[0].source, 'manual');
  assert.equal(list.items[0].consent_at, '');
  const csv = await call('/api/admin/registrations.csv');
  assert.equal(csv.status, 200);
  assert.ok(csv.data.includes("'+994501234567"));
  assert.ok(csv.data.includes('Admin Sınaq'));
  assert.equal((await call('/api/admin/courses/help-desk', { method: 'DELETE' })).status, 409);
});
test('groups enforce capacity, membership, duplicate and course consistency', async () => {
  const created = await call('/api/admin/groups', { method: 'POST', body: validGroup });
  assert.equal(created.status, 201);
  group = created.data.id;
  assert.equal(
    (
      await call(`/api/admin/groups/${group}/members`, {
        method: 'POST',
        body: { registration_id: student },
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await call(`/api/admin/groups/${group}/members`, {
        method: 'POST',
        body: { registration_id: student2 },
      })
    ).status,
    409,
  );
  assert.equal((await call(`/api/admin/groups/${group}/members`)).data.length, 1);
  assert.equal(
    (
      await call('/api/admin/groups/' + group, {
        method: 'PUT',
        body: { ...validGroup, course_id: 'network-admin' },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call('/api/admin/groups/' + group, {
        method: 'PUT',
        body: { ...validGroup, end_date: '2026-01-01' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('/api/admin/groups/' + group, {
        method: 'PUT',
        body: { ...validGroup, capacity: 3 },
      })
    ).status,
    200,
  );
});
test('materials support safe links and private upload, replacement and download', async () => {
  assert.equal(
    (
      await call('/api/admin/materials', {
        method: 'POST',
        body: {
          title: 'Unsafe',
          type: 'link',
          url: 'javascript:alert(1)',
          group_id: group,
          content: '',
        },
      })
    ).status,
    400,
  );
  const created = await call('/api/admin/materials', {
    method: 'POST',
    body: { title: 'Dərs qeydləri', type: 'document', url: '', group_id: group, content: 'Mətn' },
  });
  assert.equal(created.status, 201);
  material = created.data.id;
  assert.equal(
    (
      await call(`/api/admin/materials/${material}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': 'notes.txt' },
        raw: Buffer.from('Dərs vəsaiti'),
      })
    ).status,
    200,
  );
  const download = await call(`/api/admin/materials/${material}/file`);
  assert.equal(download.status, 200);
  assert.equal(download.data, 'Dərs vəsaiti');
  assert.match(download.response.headers.get('content-disposition'), /^attachment/);
  assert.equal((await call(`/api/admin/materials/${material}/file`, { auth: false })).status, 401);
  assert.equal(
    (
      await call(`/api/admin/materials/${material}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': 'page.html' },
        raw: Buffer.from('<script>'),
      })
    ).status,
    400,
  );
  assert.equal((await call('/api/admin/materials')).data.items[0].file_blob, undefined);
  assert.equal(
    (await call(`/api/admin/materials/${material}/file`, { method: 'DELETE' })).status,
    200,
  );
  assert.equal((await call(`/api/admin/materials/${material}/file`)).status, 404);
});
test('exam scores require enrollment, respect bounds, and protect dependent records', async () => {
  const examData = {
    title: 'Yekun imtahan',
    group_id: group,
    scheduled_at: '2026-12-01T19:00:00+04:00',
    duration: 60,
    max_score: 100,
    pass_score: 60,
    location: 'Onlayn',
    notes: '',
    status: 'scheduled',
  };
  const created = await call('/api/admin/exams', { method: 'POST', body: examData });
  assert.equal(created.status, 201);
  exam = created.data.id;
  assert.equal(
    (await call('/api/admin/exams')).data.items[0].scheduled_at,
    '2026-12-01T15:00:00.000Z',
  );
  const resultData = {
    exam_id: exam,
    registration_id: student,
    score: 85,
    status: 'graded',
    feedback: 'Yaxşı iş',
  };
  assert.equal(
    (await call('/api/admin/results', { method: 'POST', body: { ...resultData, score: 101 } }))
      .status,
    400,
  );
  assert.equal(
    (
      await call('/api/admin/results', {
        method: 'POST',
        body: { ...resultData, registration_id: student2 },
      })
    ).status,
    400,
  );
  const added = await call('/api/admin/results', { method: 'POST', body: resultData });
  assert.equal(added.status, 201);
  result = added.data.id;
  assert.equal((await call('/api/admin/results')).data.items[0].outcome, 'passed');
  assert.equal(
    (await call('/api/admin/results', { method: 'POST', body: resultData })).status,
    409,
  );
  assert.equal(
    (
      await call('/api/admin/exams/' + exam, {
        method: 'PUT',
        body: { ...examData, max_score: 70 },
      })
    ).status,
    409,
  );
  assert.equal((await call('/api/admin/exams/' + exam, { method: 'DELETE' })).status, 409);
  assert.equal(
    (await call('/api/admin/registrations/' + student, { method: 'DELETE' })).status,
    409,
  );
  assert.equal(
    (await call(`/api/admin/groups/${group}/members/${student}`, { method: 'DELETE' })).status,
    409,
  );
  assert.equal(
    (
      await call('/api/admin/results/' + result, {
        method: 'PUT',
        body: { ...resultData, status: 'absent', score: null },
      })
    ).status,
    200,
  );
  assert.equal((await call('/api/admin/results')).data.items[0].outcome, 'absent');
});
test('related entities can be deleted in a safe, explicit order', async () => {
  for (const path of [
    `results/${result}`,
    `exams/${exam}`,
    `materials/${material}`,
    `groups/${group}/members/${student}`,
    `groups/${group}`,
    `registrations/${student}`,
    `registrations/${student2}`,
  ])
    assert.equal((await call('/api/admin/' + path, { method: 'DELETE' })).status, 200, path);
  const stats = (await call('/api/admin/dashboard')).data;
  assert.equal(stats.registrations, 0);
  assert.equal(stats.results, 0);
});
test('social profile settings validate URLs, publish changes and support hiding icons', async () => {
  const links = {
    whatsappUrl: 'https://wa.me/994513019525',
    linkedinUrl: 'https://www.linkedin.com/in/example-teacher',
    instagramUrl: 'https://www.instagram.com/example-teacher/',
  };
  assert.equal((await call('/api/admin/settings', { method: 'PUT', body: links })).status, 200);
  const published = (await call('/api/public/content', { auth: false })).data.settings;
  for (const [key, value] of Object.entries(links)) assert.equal(published[key], value);
  for (const invalid of [
    'javascript:alert(1)',
    'http://example.com',
    '//example.com',
    'https://user:password@example.com',
    'not a url',
  ]) {
    assert.equal(
      (await call('/api/admin/settings', { method: 'PUT', body: { instagramUrl: invalid } }))
        .status,
      400,
    );
    assert.equal((await call('/api/admin/settings')).data.instagramUrl, links.instagramUrl);
  }
  const cleared = await call('/api/admin/settings', {
    method: 'PUT',
    body: { linkedinUrl: '', instagramUrl: '' },
  });
  assert.equal(cleared.status, 200);
  assert.equal((await call('/api/public/content', { auth: false })).data.settings.instagramUrl, '');
});

test('logo upload validates images, survives backup and can be removed', async () => {
  const image = await sharp({
    create: { width: 100, height: 140, channels: 3, background: '#dceaff' },
  })
    .png()
    .toBuffer();
  const upload = (raw, extra = {}) =>
    call('/api/admin/logo', {
      method: 'PUT',
      raw,
      headers: { 'Content-Type': 'application/octet-stream' },
      ...extra,
    });
  assert.equal((await upload(image, { auth: false })).status, 401);
  assert.equal(
    (
      await upload(image, {
        headers: { 'Content-Type': 'application/octet-stream', 'X-CSRF-Token': 'wrong' },
      })
    ).status,
    403,
  );
  const first = await upload(image);
  assert.equal(first.status, 200);
  const photoUrl = first.data.logoUrl;
  const response = await fetch(base + photoUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/webp/);
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 100);
  assert.equal(
    (await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).status,
    400,
  );
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.settings.logoUrl,
    photoUrl,
  );
  const backup = join(dir, 'with-logo.sqlite');
  transferDatabase(dbPath, backup);
  const restored = openDatabase(backup);
  assert.ok(restored.prepare('SELECT data FROM site_logo WHERE id=1').get().data.length);
  restored.close();
  const replacement = await upload(image);
  assert.notEqual(replacement.data.logoUrl, photoUrl);
  assert.equal((await call('/api/admin/logo', { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(base + photoUrl)).status, 404);
  assert.equal((await call('/api/public/content', { auth: false })).data.settings.logoUrl, '');
});

test('instructor photo upload validates images, survives backup and can be removed', async () => {
  const image = await sharp({
    create: { width: 100, height: 140, channels: 3, background: '#dceaff' },
  })
    .png()
    .toBuffer();
  const upload = (raw, extra = {}) =>
    call('/api/admin/instructor-photo', {
      method: 'PUT',
      raw,
      headers: { 'Content-Type': 'application/octet-stream' },
      ...extra,
    });
  assert.equal((await upload(image, { auth: false })).status, 401);
  assert.equal(
    (
      await upload(image, {
        headers: { 'Content-Type': 'application/octet-stream', 'X-CSRF-Token': 'wrong' },
      })
    ).status,
    403,
  );
  const first = await upload(image);
  assert.equal(first.status, 200);
  const photoUrl = first.data.instructorPhotoUrl;
  const response = await fetch(base + photoUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/webp/);
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width, 100);
  assert.equal(
    (await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).status,
    400,
  );
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.settings.instructorPhotoUrl,
    photoUrl,
  );
  const backup = join(dir, 'with-photo.sqlite');
  transferDatabase(dbPath, backup);
  const restored = openDatabase(backup);
  assert.ok(
    restored.prepare("SELECT data FROM public_images WHERE id='instructor'").get().data.length,
  );
  restored.close();
  const replacement = await upload(image);
  assert.notEqual(replacement.data.instructorPhotoUrl, photoUrl);
  assert.equal((await call('/api/admin/instructor-photo', { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(base + photoUrl)).status, 404);
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.settings.instructorPhotoUrl,
    '',
  );
});

test('partner logos upload, survive edits, hide publicly and are removed with their company', async () => {
  const partner = { id: 'logo-company', name: 'Loqolu şirkət', published: true };
  await call('/api/admin/settings', {
    method: 'PUT',
    body: { partners: [partner], showPartners: true },
  });
  const endpoint = '/api/admin/partners/logo-company/logo';
  const raw = await sharp({
    create: {
      width: 160,
      height: 80,
      channels: 4,
      background: { r: 40, g: 90, b: 180, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const upload = { method: 'PUT', raw, headers: { 'Content-Type': 'application/octet-stream' } };
  assert.equal((await call(endpoint, { ...upload, auth: false })).status, 401);
  assert.equal(
    (await call(endpoint, { ...upload, headers: { ...upload.headers, 'X-CSRF-Token': 'wrong' } }))
      .status,
    403,
  );
  assert.equal((await call('/api/admin/partners/unknown/logo', upload)).status, 404);
  const saved = await call(endpoint, upload);
  assert.equal(saved.status, 200);
  const adminUrl = saved.data.logoUrl;
  assert.match(adminUrl, /^\/api\/admin\/partners\/logo-company\/logo\?v=/);
  assert.equal((await call(adminUrl)).status, 200);
  assert.equal((await call(adminUrl, { auth: false })).status, 401);
  let content = (await call('/api/public/content', { auth: false })).data;
  const publicUrl = content.settings.partners[0].logoUrl;
  const image = await fetch(base + publicUrl);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format, 'webp');
  assert.equal(
    (await call('/api/admin/settings')).data.instructorPhotos.some((p) => p.url === publicUrl),
    false,
  );
  partner.name = 'Yenilənmiş şirkət';
  await call('/api/admin/settings', {
    method: 'PUT',
    body: { partners: [{ ...partner, logoUrl: 'https://untrusted.example/logo.svg' }] },
  });
  content = (await call('/api/public/content', { auth: false })).data;
  assert.equal(content.settings.partners[0].name, partner.name);
  assert.equal(content.settings.partners[0].logoUrl, publicUrl);
  assert.equal(
    (await call(endpoint, { ...upload, raw: Buffer.from('<svg onload="alert(1)"/>') })).status,
    400,
  );
  assert.equal(
    (await call(endpoint, { ...upload, raw: Buffer.alloc(5 * 1024 * 1024 + 1) })).status,
    413,
  );
  assert.equal((await call('/api/admin/settings')).data.partners[0].logoUrl, adminUrl);
  const replaced = await call(endpoint, upload);
  assert.notEqual(replaced.data.logoUrl, adminUrl);
  partner.published = false;
  await call('/api/admin/settings', { method: 'PUT', body: { partners: [partner] } });
  assert.equal((await fetch(base + publicUrl)).status, 404);
  assert.equal((await call(replaced.data.logoUrl)).status, 200);
  partner.published = true;
  await call('/api/admin/settings', {
    method: 'PUT',
    body: { partners: [partner], showPartners: false },
  });
  assert.equal((await fetch(base + publicUrl)).status, 404);
  assert.equal((await call(endpoint, { method: 'DELETE' })).status, 200);
  assert.equal((await call(endpoint)).status, 404);
  assert.equal((await call('/api/admin/settings')).data.partners[0].logoUrl, undefined);
  await call(endpoint, upload);
  await call('/api/admin/settings', { method: 'PUT', body: { partners: [], showPartners: true } });
  const reopened = openDatabase(dbPath);
  assert.equal(reopened.prepare('SELECT COUNT(*) n FROM partner_logos').get().n, 0);
  reopened.close();
});

test('partners persist, retain order and hide unpublished companies from public content', async () => {
  const partners = [
    { id: 'company-b', name: 'Şirkət B MMC', published: true },
    { id: 'company-a', name: 'Şirkət A MMC', published: false },
  ];
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { partners } })).status,
    200,
  );
  assert.deepEqual((await call('/api/admin/settings')).data.partners, partners);
  assert.deepEqual((await call('/api/public/content', { auth: false })).data.settings.partners, [
    partners[0],
  ]);
  for (const invalid of [
    [...partners, partners[0]],
    [{ ...partners[0], name: '' }],
    [{ ...partners[0], name: 'x'.repeat(161) }],
    Array(101).fill(partners[0]),
    'invalid',
  ]) {
    assert.equal(
      (await call('/api/admin/settings', { method: 'PUT', body: { partners: invalid } })).status,
      400,
    );
  }
  assert.deepEqual((await call('/api/admin/settings')).data.partners, partners);
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { partners: [] } })).status,
    200,
  );
  const reopened = openDatabase(dbPath);
  assert.deepEqual(
    JSON.parse(reopened.prepare('SELECT data FROM site_settings').get().data).partners,
    [],
  );
  reopened.close();
  assert.deepEqual((await call('/api/public/content', { auth: false })).data.settings.partners, []);
});

test('IT solutions can be created, edited, hidden and deleted without reseeding', async () => {
  const solutions = [
    {
      id: 'test-solution',
      title: 'Ofis IT dəstəyi',
      description: 'Texniki dəstək xidməti.',
      published: true,
    },
  ];
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { solutions } })).status,
    200,
  );
  assert.equal(
    (await call('/api/public/content', { auth: false })).data.settings.solutions[0].title,
    solutions[0].title,
  );
  solutions[0].title = 'Yenilənmiş xidmət';
  solutions[0].published = false;
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { solutions } })).status,
    200,
  );
  assert.equal((await call('/api/admin/settings')).data.solutions[0].title, solutions[0].title);
  assert.deepEqual(
    (await call('/api/public/content', { auth: false })).data.settings.solutions,
    [],
  );
  assert.equal(
    (
      await call('/api/admin/settings', {
        method: 'PUT',
        body: { solutions: [...solutions, ...solutions] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('/api/admin/settings', {
        method: 'PUT',
        body: { solutions: [{ ...solutions[0], title: '' }] },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call('/api/admin/settings', { method: 'PUT', body: { solutions: [] } })).status,
    200,
  );
  const reopened = openDatabase(dbPath);
  assert.deepEqual(
    JSON.parse(reopened.prepare('SELECT data FROM site_settings').get().data).solutions,
    [],
  );
  reopened.close();
});

test('photo gallery preserves existing images, enforces limits and survives backup', async () => {
  const image = await sharp({
    create: { width: 40, height: 50, channels: 3, background: '#dceaff' },
  })
    .png()
    .toBuffer();
  const upload = (raw = image, auth = true) =>
    call('/api/admin/instructor-photos', {
      method: 'POST',
      raw,
      auth,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  assert.equal((await upload(image, false)).status, 401);
  await call('/api/admin/instructor-photo', {
    method: 'PUT',
    raw: image,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  for (let i = 0; i < 7; i++) assert.equal((await upload()).status, 201);
  const photos = (await call('/api/admin/settings')).data.instructorPhotos;
  assert.equal(photos.length, 8);
  assert.equal(photos[0].id, 'instructor');
  assert.equal((await upload()).status, 400);
  const snapshot = join(dir, 'gallery.sqlite');
  transferDatabase(dbPath, snapshot);
  const copy = openDatabase(snapshot);
  assert.equal(copy.prepare('SELECT COUNT(*) n FROM public_images').get().n, 8);
  copy.close();
  for (const photo of photos) {
    assert.equal((await fetch(base + photo.url)).status, 200);
    assert.equal(
      (await call(`/api/admin/instructor-photos/${photo.id}`, { method: 'DELETE' })).status,
      200,
    );
  }
  assert.equal((await upload(Buffer.from('invalid'))).status, 400);
  assert.deepEqual((await call('/api/admin/settings')).data.instructorPhotos, []);
});

test('logout immediately revokes the server-side session', async () => {
  assert.equal((await call('/api/admin/logout', { method: 'POST' })).status, 200);
  assert.equal((await call('/api/admin/session')).status, 401);
});
test('legacy registrations survive migration and deleted content stays deleted after restart', () => {
  const file = join(dir, 'legacy.sqlite');
  let db = new DatabaseSync(file);
  db.exec(
    "CREATE TABLE registrations (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,course TEXT NOT NULL,experience TEXT NOT NULL,format TEXT NOT NULL,message TEXT NOT NULL DEFAULT '',consent_at TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(email,course));INSERT INTO registrations VALUES ('old','Legacy','old@example.test','0501234567','help-desk','beginner','online','','2026-01-01','2026-01-01');",
  );
  db.close();
  db = openDatabase(file);
  assert.equal(db.prepare("SELECT status FROM registrations WHERE id='old'").get().status, 'new');
  db.exec('DELETE FROM faqs');
  db.close();
  db = openDatabase(file);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM faqs').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM registrations').get().n, 1);
  db.close();
});
test('password reset revokes sessions and bootstrap refuses to silently replace an account', () => {
  const db = openDatabase(':memory:');
  createAdmin(db, 'teacher', password);
  assert.throws(() => createAdmin(db, 'teacher', 'another-test-password'));
  const user = db.prepare('SELECT id FROM admin_users').get();
  db.prepare('INSERT INTO admin_sessions VALUES (?,?,?,?)').run(
    'hash',
    user.id,
    'csrf',
    Date.now() + 100000,
  );
  createAdmin(db, 'teacher', 'another-test-password', { replace: true });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 0);
  assert.ok(
    verifyPassword(
      'another-test-password',
      db.prepare('SELECT password_hash FROM admin_users').get().password_hash,
    ),
  );
  db.close();
});
test('repeated failed logins are rate limited', async () => {
  for (let i = 0; i < 10; i++)
    await call('/api/admin/login', {
      method: 'POST',
      auth: false,
      body: { username: 'missing', password: 'bad' },
    });
  const r = await call('/api/admin/login', {
    method: 'POST',
    auth: false,
    body: { username: 'missing', password: 'bad' },
  });
  assert.equal(r.status, 429);
  assert.ok(Number(r.response.headers.get('retry-after')) > 0);
});
