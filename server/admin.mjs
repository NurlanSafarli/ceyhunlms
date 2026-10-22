import express from 'express';
import { randomUUID } from 'node:crypto';
import { defaults, readContent } from './database.mjs';

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status = 400) => {
  throw new InputError(message, status);
};
const now = () => new Date().toISOString();
const text = (body, key, max = 2000, required = false) => {
  const value = body[key] ?? '';
  if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))
    fail(`${key}: mətnin formatını və uzunluğunu yoxlayın.`);
  if (required && !value.trim()) fail(`${key}: bu sahə mütləqdir.`);
  return value.trim();
};
const number = (body, key, min, max, integer = false) => {
  const value = body[key];
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(`${key}: ${min}–${max} aralığında ${integer ? 'tam ' : ''}ədəd daxil edin.`);
  return value;
};
const choice = (body, key, values) => {
  const v = text(body, key, 100, true);
  if (!values.includes(v)) fail(`${key}: seçim düzgün deyil.`);
  return v;
};
const date = (body, key) => {
  const v = text(body, key, 10);
  if (
    v &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      !Number.isFinite(Date.parse(v)) ||
      new Date(v).toISOString().slice(0, 10) !== v)
  )
    fail('Tarix düzgün deyil.');
  return v;
};
const bool = (body, key) => {
  if (typeof body[key] !== 'boolean') fail(`${key}: seçim düzgün deyil.`);
  return body[key] ? 1 : 0;
};
const stringArray = (value, max = 30) => {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((s) => typeof s !== 'string' || s.length > 1000)
  )
    fail('Siyahı məlumatları düzgün deyil.');
  return value.map((s) => s.trim()).filter(Boolean);
};
export const courseRow = (r) => ({
  ...JSON.parse(r.data),
  id: r.id,
  published: !!r.published,
  sort_order: r.sort_order,
});
export const csvValue = (value) =>
  `"${(/^[\s]*[=+\-@]/.test(String(value ?? '')) || /^[\t\r\n]/.test(String(value ?? '')) ? "'" : '') + String(value ?? '').replaceAll('"', '""')}"`;

export function installAdmin(app, db) {
  const exists = (table, id, label) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
    if (!row) fail(`${label} tapılmadı.`, 404);
    return row;
  };
  const body = (req) => {
    if (
      !req.is('application/json') ||
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    )
      fail('JSON məlumatları tələb olunur.');
    return req.body;
  };
  const groupId = (b) => {
    const id = text(b, 'group_id', 100);
    if (id) exists('lesson_groups', id, 'Qrup');
    return id || null;
  };
  const save = (table, id, data) => {
    const keys = Object.keys(data);
    if (id) {
      exists(table, id, 'Məlumat');
      db.prepare(`UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`).run(
        ...Object.values(data),
        id,
      );
      return id;
    }
    const newId = randomUUID();
    db.prepare(
      `INSERT INTO ${table} (id,${keys.join(',')}) VALUES (${['?', ...keys.map(() => '?')].join(',')})`,
    ).run(newId, ...Object.values(data));
    return newId;
  };
  const requiredCourse = (id) => {
    if (id !== 'undecided') exists('courses', id, 'Kurs');
  };

  app.get('/api/public/content', (_req, res) => res.json(readContent(db)));
  app.get('/api/admin/dashboard', (_req, res) =>
    res.json({
      registrations: db.prepare('SELECT COUNT(*) n FROM registrations').get().n,
      newRegistrations: db.prepare("SELECT COUNT(*) n FROM registrations WHERE status='new'").get()
        .n,
      groups: db.prepare("SELECT COUNT(*) n FROM lesson_groups WHERE status='active'").get().n,
      courses: db.prepare('SELECT COUNT(*) n FROM courses WHERE published=1').get().n,
      materials: db.prepare('SELECT COUNT(*) n FROM materials').get().n,
      results: db.prepare('SELECT COUNT(*) n FROM results').get().n,
      recent: db
        .prepare(
          'SELECT id,name,email,course,status,created_at FROM registrations ORDER BY created_at DESC LIMIT 6',
        )
        .all(),
      upcoming: db
        .prepare(
          "SELECT e.*,g.name group_name FROM exams e JOIN lesson_groups g ON g.id=e.group_id WHERE e.status='scheduled' AND e.scheduled_at>=? ORDER BY e.scheduled_at LIMIT 5",
        )
        .all(now()),
    }),
  );
  app.get('/api/admin/options', (_req, res) =>
    res.json({
      courses: readContent(db, false).courses,
      groups: db
        .prepare(
          'SELECT g.*,(SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id) member_count FROM lesson_groups g ORDER BY g.name',
        )
        .all(),
      students: db.prepare('SELECT id,name,email,course FROM registrations ORDER BY name').all(),
      exams: db
        .prepare(
          'SELECT e.*,g.name group_name FROM exams e JOIN lesson_groups g ON g.id=e.group_id ORDER BY scheduled_at DESC',
        )
        .all(),
    }),
  );
  app.get('/api/admin/settings', (_req, res) => res.json(readContent(db, false).settings));
  app.put('/api/admin/settings', (req, res) => {
    const b = body(req),
      current = readContent(db, false).settings;
    for (const [key, value] of Object.entries(b)) {
      if (!Object.hasOwn(defaults.settings, key)) fail('Naməlum məzmun sahəsi.');
      current[key] =
        typeof defaults.settings[key] === 'boolean' ? !!bool(b, key) : text(b, key, 6000);
    }
    if (!current.brandName || !current.instructorName) fail('Brend və müəllim adı boş ola bilməz.');
    if (!/^\+[1-9]\d{6,14}$/.test(current.phone))
      fail('Telefonu beynəlxalq formatda daxil edin: +994...');
    db.prepare('UPDATE site_settings SET data=? WHERE id=1').run(JSON.stringify(current));
    res.json(current);
  });

  const listSpecs = {
    courses: {
      sql: 'SELECT r.* FROM courses r',
      search: "json_extract(r.data,'$.name')",
      order: 'r.sort_order,r.id',
      map: courseRow,
    },
    faqs: {
      sql: 'SELECT r.* FROM faqs r',
      search: 'r.question',
      order: 'r.sort_order,r.id',
      map: (r) => ({ ...r, published: !!r.published }),
    },
    registrations: {
      sql: "SELECT r.*,json_extract(c.data,'$.name') course_name FROM registrations r LEFT JOIN courses c ON c.id=r.course",
      search: "r.name||' '||r.email||' '||r.phone",
      order: 'r.created_at DESC',
      status: true,
    },
    groups: {
      sql: "SELECT r.*,json_extract(c.data,'$.name') course_name,(SELECT COUNT(*) FROM group_members m WHERE m.group_id=r.id) member_count FROM lesson_groups r JOIN courses c ON c.id=r.course_id",
      search: 'r.name',
      order: 'r.created_at DESC',
      status: true,
    },
    materials: {
      sql: 'SELECT r.id,r.title,r.group_id,r.type,r.url,r.content,r.file_name,r.file_size,r.created_at,g.name group_name FROM materials r LEFT JOIN lesson_groups g ON g.id=r.group_id',
      search: 'r.title',
      order: 'r.created_at DESC',
    },
    exams: {
      sql: 'SELECT r.*,g.name group_name FROM exams r JOIN lesson_groups g ON g.id=r.group_id',
      search: "r.title||' '||g.name",
      order: 'r.scheduled_at DESC',
      status: true,
    },
    results: {
      sql: "SELECT r.*,s.name student_name,e.title exam_title,e.max_score,e.pass_score,e.group_id,g.name group_name,CASE WHEN r.status='absent' THEN 'absent' WHEN r.score>=e.pass_score THEN 'passed' ELSE 'failed' END outcome FROM results r JOIN registrations s ON s.id=r.registration_id JOIN exams e ON e.id=r.exam_id JOIN lesson_groups g ON g.id=e.group_id",
      search: "s.name||' '||e.title||' '||g.name",
      order: 'r.created_at DESC',
    },
  };
  for (const [name, spec] of Object.entries(listSpecs))
    app.get(`/api/admin/${name}`, (req, res) => {
      const q = String(req.query.q || '').slice(0, 200),
        page = Math.max(1, Math.min(100000, Math.floor(Number(req.query.page)) || 1)),
        pageSize = 20;
      let clause = ` WHERE (${spec.search}) LIKE ?`,
        params = [`%${q}%`];
      if (spec.status && req.query.status) {
        clause += ' AND r.status=?';
        params.push(String(req.query.status));
      }
      if (req.query.group_id && ['materials', 'exams'].includes(name)) {
        clause += ' AND r.group_id=?';
        params.push(String(req.query.group_id));
      }
      const total = db
        .prepare(`SELECT COUNT(*) total FROM (${spec.sql + clause})`)
        .get(...params).total;
      const items = db
        .prepare(spec.sql + clause + ` ORDER BY ${spec.order} LIMIT ? OFFSET ?`)
        .all(...params, pageSize, (page - 1) * pageSize);
      res.json({ items: spec.map ? items.map(spec.map) : items, total, page, pageSize });
    });
  app.get('/api/admin/registrations.csv', (_req, res) => {
    const columns = [
      'id',
      'name',
      'email',
      'phone',
      'course',
      'status',
      'admin_note',
      'source',
      'created_at',
    ];
    const rows = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC').all();
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="jayhun-registrations.csv"',
      })
      .send(
        '\uFEFF' +
          columns.join(',') +
          '\n' +
          rows.map((r) => columns.map((c) => csvValue(r[c])).join(',')).join('\n'),
      );
  });

  const handlers = {
    courses: (b, id) => {
      const courseId = id || text(b, 'id', 80, true);
      if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(courseId) || courseId === 'undecided')
        fail('Kurs kodu yalnız kiçik latın hərfləri, rəqəmlər və tire ilə yazılmalıdır.');
      if (!id && db.prepare('SELECT 1 FROM courses WHERE id=?').get(courseId))
        fail('Bu kurs kodu artıq mövcuddur.', 409);
      const data = { id: courseId };
      for (const key of [
        'name',
        'shortName',
        'category',
        'description',
        'duration',
        'level',
        'prerequisites',
        'outcome',
        'number',
      ])
        data[key] = text(
          b,
          key,
          key === 'description' || key === 'prerequisites' || key === 'outcome' ? 4000 : 200,
          ['name', 'duration', 'level'].includes(key),
        );
      data.shortName ||= data.name;
      data.tags = stringArray(b.tags, 15);
      data.icon = choice(b, 'icon', ['help-desk', 'system-admin', 'network-admin']);
      if (!Array.isArray(b.modules) || b.modules.length > 40)
        fail('Ən çox 40 sillabus modulu əlavə edə bilərsiniz.');
      data.modules = b.modules.map((m) => {
        if (!m || typeof m !== 'object') fail('Modul düzgün deyil.');
        return {
          title: text(m, 'title', 200, true),
          duration: text(m, 'duration', 100),
          topics: stringArray(m.topics),
          lab: text(m, 'lab', 3000),
        };
      });
      const published = bool(b, 'published'),
        sort = number(b, 'sort_order', 0, 9999, true);
      if (id) {
        exists('courses', id, 'Kurs');
        db.prepare(
          'UPDATE courses SET data=?,published=?,sort_order=?,updated_at=? WHERE id=?',
        ).run(JSON.stringify(data), published, sort, now(), id);
      } else
        db.prepare('INSERT INTO courses VALUES (?,?,?,?,?)').run(
          courseId,
          JSON.stringify(data),
          published,
          sort,
          now(),
        );
      return courseId;
    },
    faqs: (b, id) =>
      save('faqs', id, {
        question: text(b, 'question', 500, true),
        answer: text(b, 'answer', 6000, true),
        published: bool(b, 'published'),
        sort_order: number(b, 'sort_order', 0, 9999, true),
      }),
    registrations: (b, id) => {
      const email = text(b, 'email', 254, true).toLowerCase(),
        phone = text(b, 'phone', 25, true),
        course = text(b, 'course', 80, true);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-poçt düzgün deyil.');
      if (
        !/^[+\d() .-]+$/.test(phone) ||
        phone.replace(/\D/g, '').length < 7 ||
        phone.replace(/\D/g, '').length > 15
      )
        fail('Telefon düzgün deyil.');
      requiredCourse(course);
      const existing = id ? exists('registrations', id, 'Tələbə') : null;
      if (
        existing &&
        existing.course !== course &&
        db.prepare('SELECT 1 FROM group_members WHERE registration_id=?').get(id)
      )
        fail(
          'Qrupa daxil edilmiş tələbənin kursunu dəyişməzdən əvvəl qrup üzvlüyünü yoxlayın.',
          409,
        );
      return save('registrations', id, {
        name: text(b, 'name', 100, true),
        email,
        phone,
        course,
        experience: choice(b, 'experience', ['beginner', 'basic', 'working']),
        format: choice(b, 'format', ['online', 'in-person', 'either']),
        message: text(b, 'message', 1500),
        status: choice(b, 'status', ['new', 'contacted', 'enrolled', 'completed', 'cancelled']),
        admin_note: text(b, 'admin_note', 4000),
        updated_at: now(),
        ...(!id ? { consent_at: '', created_at: now(), source: 'manual' } : {}),
      });
    },
    groups: (b, id) => {
      const course_id = text(b, 'course_id', 80, true);
      exists('courses', course_id, 'Kurs');
      const capacity = number(b, 'capacity', 1, 500, true),
        start = date(b, 'start_date'),
        end = date(b, 'end_date');
      if (start && end && end < start) fail('Bitmə tarixi başlama tarixindən əvvəl ola bilməz.');
      if (id) {
        const g = exists('lesson_groups', id, 'Qrup');
        const count = db.prepare('SELECT COUNT(*) n FROM group_members WHERE group_id=?').get(id).n;
        if (capacity < count) fail('Tutum mövcud tələbə sayından az ola bilməz.', 409);
        if (count && g.course_id !== course_id)
          fail('Tələbəsi olan qrupun kursu dəyişdirilə bilməz.', 409);
      }
      return save('lesson_groups', id, {
        name: text(b, 'name', 150, true),
        course_id,
        start_date: start,
        end_date: end,
        schedule: text(b, 'schedule', 500),
        format: choice(b, 'format', ['online', 'in-person', 'hybrid']),
        capacity,
        status: choice(b, 'status', ['planned', 'active', 'completed', 'archived']),
        notes: text(b, 'notes', 4000),
        ...(!id ? { created_at: now() } : {}),
      });
    },
    materials: (b, id) => {
      const url = text(b, 'url', 2000);
      if (url) {
        try {
          const u = new URL(url);
          if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
            fail('Link http və ya https ünvanı olmalıdır.');
        } catch {
          fail('Link düzgün deyil.');
        }
      }
      return save('materials', id, {
        title: text(b, 'title', 200, true),
        group_id: groupId(b),
        type: choice(b, 'type', ['document', 'link', 'video', 'note']),
        url,
        content: text(b, 'content', 20000),
        ...(!id ? { created_at: now() } : {}),
      });
    },
    exams: (b, id) => {
      const group_id = groupId(b);
      if (!group_id) fail('İmtahan üçün qrup seçin.');
      const scheduled = text(b, 'scheduled_at', 40, true);
      if (
        !/^\d{4}-\d{2}-\d{2}T/.test(scheduled) ||
        !/(Z|[+-]\d{2}:\d{2})$/.test(scheduled) ||
        !Number.isFinite(Date.parse(scheduled))
      )
        fail('İmtahan tarixi düzgün deyil.');
      const max = number(b, 'max_score', 1, 10000),
        pass = number(b, 'pass_score', 0, max);
      if (id) {
        const old = exists('exams', id, 'İmtahan');
        const stats = db
          .prepare('SELECT COUNT(*) n,MAX(score) highest FROM results WHERE exam_id=?')
          .get(id);
        if (stats.n && old.group_id !== group_id)
          fail('Nəticəsi olan imtahanın qrupu dəyişdirilə bilməz.', 409);
        if (stats.highest > max) fail('Maksimum bal mövcud nəticədən aşağı ola bilməz.', 409);
      }
      return save('exams', id, {
        group_id,
        title: text(b, 'title', 200, true),
        scheduled_at: new Date(scheduled).toISOString(),
        duration: number(b, 'duration', 1, 1440, true),
        max_score: max,
        pass_score: pass,
        location: text(b, 'location', 500),
        notes: text(b, 'notes', 4000),
        status: choice(b, 'status', ['scheduled', 'completed', 'cancelled']),
        ...(!id ? { created_at: now() } : {}),
      });
    },
    results: (b, id) => {
      const exam_id = text(b, 'exam_id', 100, true),
        registration_id = text(b, 'registration_id', 100, true),
        exam = exists('exams', exam_id, 'İmtahan');
      exists('registrations', registration_id, 'Tələbə');
      if (
        !db
          .prepare('SELECT 1 FROM group_members WHERE group_id=? AND registration_id=?')
          .get(exam.group_id, registration_id)
      )
        fail('Tələbə imtahanın keçirildiyi qrupa daxil deyil.');
      const status = choice(b, 'status', ['graded', 'absent']),
        score = status === 'absent' ? null : number(b, 'score', 0, exam.max_score);
      return save('results', id, {
        exam_id,
        registration_id,
        score,
        status,
        feedback: text(b, 'feedback', 4000),
        ...(!id ? { created_at: now() } : {}),
      });
    },
  };
  const tables = {
    courses: 'courses',
    faqs: 'faqs',
    registrations: 'registrations',
    groups: 'lesson_groups',
    materials: 'materials',
    exams: 'exams',
    results: 'results',
  };
  for (const [name, handler] of Object.entries(handlers)) {
    app.post(`/api/admin/${name}`, (req, res) => {
      const id = handler(body(req), null);
      res.status(201).json({ id });
    });
    app.put(`/api/admin/${name}/:id`, (req, res) => {
      const id = handler(body(req), req.params.id);
      res.json({ id });
    });
    app.delete(`/api/admin/${name}/:id`, (req, res) => {
      exists(tables[name], req.params.id, 'Məlumat');
      if (
        name === 'courses' &&
        db.prepare('SELECT 1 FROM registrations WHERE course=?').get(req.params.id)
      )
        fail('Müraciətləri olan kurs silinə bilməz. Kursu yayımdan çıxara bilərsiniz.', 409);
      db.prepare(`DELETE FROM ${tables[name]} WHERE id=?`).run(req.params.id);
      res.json({ ok: true });
    });
  }
  app.get('/api/admin/groups/:id/members', (req, res) => {
    exists('lesson_groups', req.params.id, 'Qrup');
    res.json(
      db
        .prepare(
          'SELECT r.id,r.name,r.email,r.phone,r.status,m.joined_at FROM group_members m JOIN registrations r ON r.id=m.registration_id WHERE m.group_id=? ORDER BY r.name',
        )
        .all(req.params.id),
    );
  });
  app.post('/api/admin/groups/:id/members', (req, res) => {
    const g = exists('lesson_groups', req.params.id, 'Qrup'),
      b = body(req),
      student = exists('registrations', text(b, 'registration_id', 100, true), 'Tələbə');
    if (student.course !== g.course_id && student.course !== 'undecided')
      fail('Tələbənin kursu bu qrupa uyğun deyil.');
    if (['archived', 'completed'].includes(g.status))
      fail('Bağlanmış qrupa tələbə əlavə edilə bilməz.');
    if (
      db.prepare('SELECT COUNT(*) n FROM group_members WHERE group_id=?').get(g.id).n >= g.capacity
    )
      fail('Qrupda boş yer yoxdur.', 409);
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO group_members VALUES (?,?,?)').run(g.id, student.id, now());
      db.prepare("UPDATE registrations SET status='enrolled',updated_at=? WHERE id=?").run(
        now(),
        student.id,
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    res.status(201).json({ ok: true });
  });
  app.delete('/api/admin/groups/:id/members/:student', (req, res) => {
    if (
      db
        .prepare(
          'SELECT 1 FROM results r JOIN exams e ON e.id=r.exam_id WHERE e.group_id=? AND r.registration_id=?',
        )
        .get(req.params.id, req.params.student)
    )
      fail('Bu qrupda imtahan nəticələri olan tələbəni çıxarmaq mümkün deyil.', 409);
    const result = db
      .prepare('DELETE FROM group_members WHERE group_id=? AND registration_id=?')
      .run(req.params.id, req.params.student);
    if (!result.changes) fail('Qrup üzvlüyü tapılmadı.', 404);
    res.json({ ok: true });
  });
  app.post(
    '/api/admin/materials/:id/file',
    express.raw({ type: 'application/octet-stream', limit: '10mb' }),
    (req, res) => {
      exists('materials', req.params.id, 'Vəsait');
      if (!Buffer.isBuffer(req.body) || !req.body.length) fail('Fayl seçilməyib.');
      let name;
      try {
        name = decodeURIComponent(req.get('x-filename') || '');
      } catch {
        fail('Fayl adı düzgün deyil.');
      }
      if (
        name.length > 200 ||
        /[\x00-\x1f\/\\]/.test(name) ||
        !/^.+\.(pdf|docx?|pptx?|xlsx?|txt|zip|png|jpe?g|mp4)$/i.test(name)
      )
        fail('Dəstəklənən fayllar: PDF, Office, TXT, ZIP, PNG, JPG və MP4 (maksimum 10 MB).');
      db.prepare('UPDATE materials SET file_name=?,file_size=?,file_blob=? WHERE id=?').run(
        name,
        req.body.length,
        req.body,
        req.params.id,
      );
      res.json({ ok: true });
    },
  );
  app.get('/api/admin/materials/:id/file', (req, res) => {
    const m = exists('materials', req.params.id, 'Vəsait');
    if (!m.file_blob) fail('Fayl tapılmadı.', 404);
    res
      .set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(m.file_name)}`,
        'X-Content-Type-Options': 'nosniff',
      })
      .send(Buffer.from(m.file_blob));
  });
  app.delete('/api/admin/materials/:id/file', (req, res) => {
    exists('materials', req.params.id, 'Vəsait');
    db.prepare('UPDATE materials SET file_name=NULL,file_size=NULL,file_blob=NULL WHERE id=?').run(
      req.params.id,
    );
    res.json({ ok: true });
  });
}
