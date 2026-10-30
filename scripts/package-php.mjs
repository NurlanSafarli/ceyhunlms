import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('dist-php/', root);
await rm(out, { recursive: true, force: true });
await mkdir(new URL('jayhuntech/shared/', out), { recursive: true });
await cp(new URL('dist/', root), new URL('public_html/', out), { recursive: true });
for (const [source, destination] of [
  ['php/api.php', 'public_html/api.php'],
  ['php/htaccess.txt', 'public_html/.htaccess'],
  ['php/app.php', 'jayhuntech/app.php'],
  ['php/bootstrap.php', 'jayhuntech/bootstrap.php'],
  ['php/config.example.php', 'jayhuntech/config.example.php'],
  ['shared/default-content.json', 'jayhuntech/shared/default-content.json'],
  ['server/legacy-solutions.json', 'jayhuntech/shared/legacy-solutions.json'],
])
  await cp(new URL(source, root), new URL(destination, out));
await writeFile(
  new URL('QURASDIRMA.txt', out),
  `PHP 8.2+, PDO SQLite, mbstring, GD, Apache mod_rewrite və HTTPS tələb olunur.
Hostinqdə Node.js tələb olunmur. Sayt faylları əvvəlcədən yığılıb.

public_html/ içindəkiləri domenin public_html qovluğuna yükləyin.
Əvvəl assets/ və brands/, ən sonda index.html yüklənsin.
jayhuntech/ qovluğu public_html-dən kənarda, onunla eyni səviyyədə yerləşməlidir.
Mövcud config.php və data/ qovluğunu qoruyun; paketdə parol və baza yoxdur.
Mövcud .htaccess-də xüsusi hostinq qaydalarını qoruyun.
İlk quraşdırmada config.example.php əsasında config.php yaradın və admin parolunu təyin edin.
İlk girişdən sonra konfiqurasiyadakı ilkin parolu silin.

Partnyorlar: Admin → Sayt məzmunu → Partnyorlar və müştərilər.
Yeni şirkəti yadda saxlayın, sonra loqosunu seçin (PNG/JPG/WebP, maksimum 5 MB).
PHP faylları və frontend birlikdə yenilənməlidir. Mövcud baza qorunur.

GitHub Pages PHP_API_ORIGIN aktivləşdirildikdə PHP API-yə qoşulur.
Admin: https://jayhuntech.az/admin
Yoxlama: /api/health; /admin; Pages-dən qeydiyyat və şirkətlər siyahısı.
`,
);
console.log('PHP hosting package prepared in dist-php/ (no Node server, credentials or database).');
