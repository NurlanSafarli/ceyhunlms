<?php
// Jayhun Tech API — PHP port of server/*.mjs for shared hosting without Node.js.
// Same routes, schema, validation and error messages as the Node server.
declare(strict_types=1);

final class InputError extends Exception
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message);
    }
}
final class Halt extends Exception {}

function fail(string $message, int $status = 400): never
{
    throw new InputError($message, $status);
}
function now_iso(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
}
function ms(): int
{
    return (int) floor(microtime(true) * 1000);
}
function js_len(string $s): int
{
    return intdiv(strlen(mb_convert_encoding($s, 'UTF-16LE', 'UTF-8')), 2);
}
function js_trim(string $s): string
{
    return preg_replace('/^[\s\p{Z}\x{FEFF}]+|[\s\p{Z}\x{FEFF}]+$/u', '', $s) ?? trim($s);
}
function is_num(mixed $v): bool
{
    return is_int($v) || is_float($v);
}

final class App
{
    private PDO $db;
    private array $defaults;
    private array $cfg;
    private string $method;
    private string $path;
    private array $headers = [];
    private ?string $rawBody = null;
    private mixed $body = null;
    private bool $jsonParsed = false;
    private ?array $session = null;
    private array $outHeaders = [];

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg + [
            'rate_limit' => 10,
            'rate_window_ms' => 600000,
            'secure_cookies' => true,
            'production' => true,
            'admin_username' => null,
            'admin_password' => null,
            'trust_proxy' => 0,
            'public_origins' => ['https://nurlansafarli.github.io'],
        ];
        $this->defaults = json_decode(file_get_contents($cfg['defaults_path']), true);
        $this->db = Database::open($cfg['db_path'], $this->defaults, $cfg['legacy_path']);
        if ($this->cfg['admin_password'] && !$this->db->query('SELECT 1 FROM admin_users LIMIT 1')->fetch()) {
            Auth::createAdmin($this->db, $this->cfg['admin_username'] ?: 'admin', $this->cfg['admin_password']);
        }
    }

    // ---------- request helpers ----------
    private function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }
    private function contentTypeIs(string $type): bool
    {
        $len = $this->header('content-length');
        if (($this->rawBody ?? '') === '' && ($len === null || $len === '0') && $this->header('transfer-encoding') === null)
            return false;
        $ct = strtolower(trim(explode(';', $this->header('content-type') ?? '')[0]));
        if ($type === 'application/json') return $ct === 'application/json' || str_ends_with($ct, '+json');
        return $ct === $type;
    }
    private function clientIp(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $hops = (int) $this->cfg['trust_proxy'];
        if ($hops <= 0) return $remote;
        $chain = array_values(array_filter(array_map('trim', explode(',', $this->header('x-forwarded-for') ?? ''))));
        $chain[] = $remote;
        return $chain[max(0, count($chain) - 1 - $hops)];
    }
    private function query(string $key): string
    {
        $v = $_GET[$key] ?? '';
        return is_string($v) ? $v : '';
    }
    private function requireBody(): array
    {
        if (!$this->jsonParsed || !$this->contentTypeIs('application/json') || !self::isObject($this->body))
            fail('JSON məlumatları tələb olunur.');
        return $this->body;
    }
    private function rawFile(int $limit, string $missing): string
    {
        if (!$this->contentTypeIs('application/octet-stream')) fail($missing);
        if (strlen($this->rawBody ?? '') > $limit) $this->tooLarge();
        if (($this->rawBody ?? '') === '') fail($missing);
        return $this->rawBody;
    }
    private function tooLarge(): never
    {
        fail('Müraciətin həcmi icazə veriləndən böyükdür.', 413);
    }

    // ---------- response helpers ----------
    private function send(int $status, string $body, string $type): never
    {
        http_response_code($status);
        header('Content-Type: ' . $type);
        foreach ($this->outHeaders as $h) header($h, false);
        echo $body;
        throw new Halt();
    }
    private function json(mixed $data, int $status = 200): never
    {
        $this->send($status, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'application/json; charset=utf-8');
    }

    // ---------- main ----------
    public function handle(): void
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $this->path = rawurldecode(parse_url($uri, PHP_URL_PATH) ?: '/');
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) $this->headers[strtolower(str_replace('_', '-', substr($k, 5)))] = (string) $v;
        }
        if (isset($_SERVER['CONTENT_TYPE'])) $this->headers['content-type'] = $_SERVER['CONTENT_TYPE'];
        if (isset($_SERVER['CONTENT_LENGTH'])) $this->headers['content-length'] = $_SERVER['CONTENT_LENGTH'];

        header_remove('X-Powered-By');
        $this->securityHeaders();
        header('Cache-Control: no-store');
        try {
            $this->publicCors();
            $this->rawBody = file_get_contents('php://input') ?: '';
            $this->parseJson();
            $this->route();
            $this->json(['error' => 'Bu ünvan mövcud deyil.'], 404);
        } catch (Halt) {
            return;
        } catch (InputError $e) {
            $this->safeJson(['error' => $e->getMessage()], $e->status);
        } catch (PDOException $e) {
            $m = $e->getMessage();
            if (str_contains($m, 'UNIQUE constraint')) $this->safeJson(['error' => 'Bu məlumat artıq mövcuddur.'], 409);
            elseif (str_contains($m, 'FOREIGN KEY constraint'))
                $this->safeJson(['error' => 'Əlaqəli qrup, vəsait və ya nəticələr mövcuddur. Əvvəlcə əlaqəli məlumatları idarə edin.'], 409);
            else {
                error_log('Request failed: ' . $e->getCode());
                $this->safeJson(['error' => 'Server xətası. Bir az sonra yenidən cəhd edin.'], 500);
            }
        } catch (Throwable $e) {
            error_log('Request failed: ' . get_class($e));
            $this->safeJson(['error' => 'Server xətası. Bir az sonra yenidən cəhd edin.'], 500);
        }
    }
    private function safeJson(array $data, int $status): void
    {
        try {
            $this->json($data, $status);
        } catch (Halt) {
        }
    }
    private function securityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: no-referrer');
        header('Cross-Origin-Opener-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-origin');
        if ($this->cfg['production']) {
            header("Content-Security-Policy: default-src 'self';script-src 'self';style-src 'self' 'unsafe-inline';img-src 'self' data:;font-src 'self';connect-src 'self';object-src 'none';base-uri 'self';form-action 'self';frame-ancestors 'self'");
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
    // Only public content and registration are shared with the static Pages site.
    // Admin login, cookies and CSRF remain on the PHP origin.
    private function publicCors(): void
    {
        $path = rtrim($this->path, '/');
        $read = $path === '/api/public/content' || $path === '/api/public/logo'
            || $path === '/api/public/instructor-photo'
            || preg_match('#^/api/public/instructor-photos/[^/]+$#', $path);
        $register = $path === '/api/registrations';
        if (!$read && !$register) return;
        if ($read) header('Cross-Origin-Resource-Policy: cross-origin');
        header('Vary: Origin');
        $origin = $this->header('origin');
        if ($origin === null || !in_array($origin, $this->cfg['public_origins'], true)) return;
        $allowed = $read ? ['GET', 'HEAD'] : ['POST'];
        $method = $this->method === 'OPTIONS' ? $this->header('access-control-request-method') : $this->method;
        if (!in_array($method, $allowed, true)) return;
        header('Access-Control-Allow-Origin: ' . $origin);
        if ($this->method === 'OPTIONS') {
            header('Access-Control-Allow-Methods: ' . implode(', ', $allowed));
            header('Access-Control-Allow-Headers: Content-Type');
            header('Access-Control-Max-Age: 600');
            $this->send(204, '', 'text/plain');
        }
    }

    private function parseJson(): void
    {
        if (!$this->contentTypeIs('application/json')) return;
        $limit = str_starts_with(strtolower($this->path), '/api/registrations') ? 12 * 1024 : 256 * 1024;
        if (strlen($this->rawBody) > $limit) $this->tooLarge();
        $trimmed = ltrim($this->rawBody, " \t\r\n");
        if ($trimmed[0] !== '{' && $trimmed[0] !== '[') fail('Sorğu formatı düzgün deyil.');
        try {
            $this->body = json_decode($this->rawBody, true, 512, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        } catch (JsonException) {
            fail('Sorğu formatı düzgün deyil.');
        }
        // {} and [] both decode to [] — keep the distinction for array checks.
        if ($this->body === [] && $trimmed[0] === '[') $this->body = ['__list__' => true];
        $this->jsonParsed = true;
    }

    private function route(): void
    {
        $p = rtrim($this->path, '/') ?: '/';
        $m = $this->method === 'HEAD' ? 'GET' : $this->method;
        if (!preg_match('#^/api(/|$)#i', $p)) $this->json(['error' => 'Bu ünvan mövcud deyil.'], 404);

        // public
        if ($m === 'GET' && $p === '/api/health') {
            try {
                $this->db->query('SELECT 1')->fetch();
                $this->json(['status' => 'ok']);
            } catch (PDOException) {
                $this->json(['status' => 'unavailable'], 503);
            }
        }
        if ($m === 'POST' && $p === '/api/registrations') $this->register();
        if ($m === 'GET' && $p === '/api/public/content') $this->json($this->readContent(true));
        if ($m === 'GET' && $p === '/api/public/logo') {
            $logo = $this->db->query('SELECT data FROM site_logo WHERE id=1')->fetch();
            if (!$logo) $this->json(['error' => 'Loqo tapılmadı.'], 404);
            $this->publicImage($logo['data']);
        }
        if ($m === 'GET' && $p === '/api/public/instructor-photo') {
            $row = $this->one("SELECT data FROM public_images WHERE id='instructor'");
            if (!$row) $this->json(['error' => 'Şəkil tapılmadı.'], 404);
            $this->publicImage($row['data']);
        }
        if ($m === 'GET' && preg_match('#^/api/public/instructor-photos/([^/]+)$#', $p, $mm)) {
            $row = $this->one('SELECT data FROM public_images WHERE id=?', [$mm[1]]);
            if (!$row) $this->json(['error' => 'Şəkil tapılmadı.'], 404);
            $this->publicImage($row['data']);
        }

        if (preg_match('#^/api/admin(/|$)#', $p)) $this->admin($m, $p);
    }
    private function publicImage(string $data): never
    {
        header_remove('Cache-Control');
        header('Cache-Control: public, max-age=31536000, immutable');
        $this->send(200, $data, 'image/webp');
    }

    // ---------- DB helpers ----------
    private function one(string $sql, array $params = []): ?array
    {
        $st = $this->db->prepare($sql);
        $st->execute($params);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        return $r === false ? null : $r;
    }
    private function all(string $sql, array $params = []): array
    {
        $st = $this->db->prepare($sql);
        $st->execute($params);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }
    private function run(string $sql, array $params = []): int
    {
        $st = $this->db->prepare($sql);
        foreach (array_values($params) as $i => $v) {
            $type = is_int($v) ? PDO::PARAM_INT : (is_null($v) ? PDO::PARAM_NULL : PDO::PARAM_STR);
            if ($v instanceof Blob) {
                $st->bindValue($i + 1, $v->data, PDO::PARAM_LOB);
                continue;
            }
            if (is_float($v)) $type = PDO::PARAM_STR;
            $st->bindValue($i + 1, $v, $type);
        }
        $st->execute();
        return $st->rowCount();
    }
    private function count(string $sql, array $params = []): int
    {
        return (int) ($this->one($sql, $params)['n'] ?? 0);
    }
    private function tx(callable $fn): void
    {
        $this->db->exec('BEGIN');
        try {
            $fn();
            $this->db->exec('COMMIT');
        } catch (Throwable $e) {
            $this->db->exec('ROLLBACK');
            throw $e;
        }
    }

    public function readContent(bool $publishedOnly): array
    {
        $stored = json_decode($this->one('SELECT data FROM site_settings WHERE id=1')['data'], true);
        $settings = array_merge($this->defaults['settings'], $stored);
        $logo = $this->one('SELECT version FROM site_logo WHERE id=1');
        $settings['logoUrl'] = $logo ? "/api/public/logo?v={$logo['version']}" : '';
        $settings['instructorPhotos'] = array_map(
            fn($p) => [
                'id' => $p['id'],
                'url' => $p['id'] === 'instructor'
                    ? "/api/public/instructor-photo?v={$p['version']}"
                    : "/api/public/instructor-photos/{$p['id']}?v={$p['version']}",
            ],
            $this->all('SELECT id,version FROM public_images ORDER BY rowid'),
        );
        $settings['instructorPhotoUrl'] = $settings['instructorPhotos'][0]['url'] ?? '';
        if ($publishedOnly) {
            $settings['partners'] = array_values(array_filter($settings['partners'] ?? [], fn($s) => !empty($s['published'])));
            $settings['solutions'] = array_values(array_filter($settings['solutions'] ?? [], fn($s) => !empty($s['published'])));
        }
        $where = $publishedOnly ? ' WHERE published=1' : '';
        $courses = array_map(fn($c) => $this->courseRow($c), $this->all("SELECT * FROM courses$where ORDER BY sort_order,id"));
        $faqs = array_map(fn($f) => ['published' => (bool) $f['published']] + $f, $this->all("SELECT * FROM faqs$where ORDER BY sort_order,id"));
        return ['settings' => $settings, 'courses' => $courses, 'faqs' => $faqs];
    }
    private function courseRow(array $r): array
    {
        return array_merge(json_decode($r['data'], true), [
            'id' => $r['id'],
            'published' => (bool) $r['published'],
            'sort_order' => $r['sort_order'],
        ]);
    }

    // ---------- public registration ----------
    private function register(): never
    {
        $key = $this->clientIp();
        $now = ms();
        $window = (int) $this->cfg['rate_window_ms'];
        $this->run('DELETE FROM rate_limits WHERE reset_at<=?', [$now]);
        $row = $this->one('SELECT count,reset_at FROM rate_limits WHERE key=?', ['reg:' . $key]);
        if (!$row) {
            $row = ['count' => 0, 'reset_at' => $now + $window];
            $this->run('INSERT INTO rate_limits VALUES (?,?,?)', ['reg:' . $key, 0, $row['reset_at']]);
        }
        $row['count']++;
        $this->run('UPDATE rate_limits SET count=? WHERE key=?', [$row['count'], 'reg:' . $key]);
        if ($row['count'] > (int) $this->cfg['rate_limit']) {
            $this->outHeaders[] = 'Retry-After: ' . (int) ceil(($row['reset_at'] - $now) / 1000);
            $this->json(['error' => 'Qısa müddətdə çox müraciət göndərildi. Bir neçə dəqiqə sonra yenidən cəhd edin.'], 429);
        }
        if (!$this->contentTypeIs('application/json')) $this->json(['error' => 'Sorğu JSON formatında olmalıdır.'], 415);
        $b = $this->body;
        if (!self::isObject($b))
            $this->json(['error' => 'Müraciət məlumatları düzgün deyil.'], 400);
        $clean = fn($f) => is_string($b[$f] ?? null) ? js_trim($b[$f]) : '';
        if ($clean('website') !== '') $this->json(['error' => 'Müraciəti yenidən yoxlayın.'], 400);
        $name = preg_replace('/\s+/u', ' ', $clean('name'));
        $email = mb_strtolower($clean('email'));
        $phone = $clean('phone');
        $digits = preg_replace('/\D/', '', $phone);
        $course = $clean('course');
        $experience = $clean('experience') ?: 'beginner';
        $format = $clean('format') ?: 'online';
        $message = $clean('message');
        $error = '';
        if (js_len($name) < 2 || js_len($name) > 100 || preg_match('/[\x00-\x1f]/', $name))
            $error = 'Ad və soyadınızı 2–100 simvol aralığında daxil edin.';
        elseif (js_len($email) > 254 || !preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/u', $email))
            $error = 'Düzgün e-poçt ünvanı daxil edin.';
        elseif (js_len($phone) > 25 || !preg_match('/^[+\d() .-]+$/', $phone) || strlen($digits) < 7 || strlen($digits) > 15)
            $error = 'Düzgün telefon nömrəsi daxil edin.';
        elseif ($course !== 'undecided' && !$this->one('SELECT 1 FROM courses WHERE id=? AND published=1', [$course]))
            $error = 'Maraqlandığınız kursu seçin.';
        elseif (!in_array($experience, ['beginner', 'basic', 'working'], true) || !in_array($format, ['online', 'in-person', 'either'], true))
            $error = 'Səviyyə və dərs formatını yoxlayın.';
        elseif (js_len($message) > 1500) $error = 'Qeydiniz 1500 simvoldan uzun olmamalıdır.';
        elseif (($b['consent'] ?? null) !== true) $error = 'Müraciətin göndərilməsi üçün məxfilik şərtlərinə razılıq verin.';
        if ($error) $this->json(['error' => $error], 400);
        try {
            if ($this->one('SELECT 1 FROM registrations WHERE email = ? AND course = ?', [$email, $course])) {
                $phoneDisplay = $this->readContent(true)['settings']['phoneDisplay'] ?? '';
                $this->json(['error' => "Bu e-poçt ilə seçdiyiniz kursa artıq müraciət edilib. Dəyişiklik üçün $phoneDisplay nömrəsi ilə əlaqə saxlayın."], 409);
            }
            $id = 'JT-' . strtoupper(substr(Auth::uuid(), 0, 8));
            $ts = now_iso();
            $this->run(
                'INSERT INTO registrations (id,name,email,phone,course,experience,format,message,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                [$id, $name, $email, $phone, $course, $experience, $format, $message, $ts, $ts],
            );
            $this->json(['reference' => $id], 201);
        } catch (PDOException $e) {
            error_log('Registration storage failed: ' . $e->getCode());
            $this->json(['error' => 'Müraciət saxlanılmadı. Bir az sonra yenidən cəhd edin.'], 500);
        }
    }

    // ---------- admin ----------
    private function cookie(string $token, int $maxAge): void
    {
        $this->outHeaders[] = 'Set-Cookie: ' . Auth::COOKIE . "=$token; Path=/api; HttpOnly; SameSite=Strict; Max-Age=$maxAge" . ($this->cfg['secure_cookies'] ? '; Secure' : '');
    }
    private function getSession(): ?array
    {
        $token = null;
        foreach (explode(';', $this->header('cookie') ?? '') as $part) {
            $part = trim($part);
            if (str_starts_with($part, Auth::COOKIE . '=')) {
                $token = substr($part, strlen(Auth::COOKIE) + 1);
                break;
            }
        }
        if (!$token || !preg_match('/^[a-f0-9]{64}$/', $token)) return null;
        return $this->one(
            'SELECT s.*,u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?',
            [hash('sha256', $token), ms()],
        );
    }

    private function admin(string $m, string $p): void
    {
        if (!in_array($m, ['GET', 'HEAD'], true)) {
            $origin = $this->header('origin');
            if ($origin !== null) {
                $parts = parse_url($origin);
                if ($parts === false || empty($parts['scheme']) || empty($parts['host']))
                    $this->json(['error' => 'Sorğunun mənbəyi düzgün deyil.'], 403);
                $host = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
                $defaultPort = ['http' => 80, 'https' => 443][strtolower($parts['scheme'])] ?? null;
                if (isset($parts['port']) && $parts['port'] === $defaultPort) $host = strtolower($parts['host']);
                if ($host !== strtolower($this->header('host') ?? ''))
                    $this->json(['error' => 'Sorğunun mənbəyi qəbul edilmir.'], 403);
            }
        }
        if ($m === 'POST' && $p === '/api/admin/login') $this->login();

        $session = $this->getSession();
        if (!$session) $this->json(['error' => 'Admin hesabına daxil olun.'], 401);
        if ($m !== 'GET' && !hash_equals($session['csrf_token'], $this->header('x-csrf-token') ?? ''))
            $this->json(['error' => 'Sessiya yoxlaması uğursuzdur. Səhifəni yeniləyin.'], 403);
        $this->session = $session;

        $r = substr($p, strlen('/api/admin'));
        if ($m === 'GET' && $r === '/session')
            $this->json(['username' => $session['username'], 'csrfToken' => $session['csrf_token']]);
        if ($m === 'POST' && $r === '/logout') {
            $this->run('DELETE FROM admin_sessions WHERE token_hash=?', [$session['token_hash']]);
            $this->cookie('', 0);
            $this->json(['ok' => true]);
        }
        if ($m === 'GET' && $r === '/dashboard') $this->dashboard();
        if ($m === 'GET' && $r === '/options') $this->options();
        if ($r === '/logo') {
            if ($m === 'PUT') {
                $image = Images::prepare($this->rawFile(5 * 1024 * 1024, 'Loqo faylı tələb olunur.'));
                $v = Auth::uuid();
                $this->run('INSERT INTO site_logo VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version', [new Blob($image), $v]);
                $this->json(['logoUrl' => "/api/public/logo?v=$v"]);
            }
            if ($m === 'DELETE') {
                $this->run('DELETE FROM site_logo WHERE id=1');
                $this->json(['logoUrl' => '']);
            }
        }
        if ($r === '/instructor-photo') {
            if ($m === 'PUT') {
                $image = Images::prepare($this->rawFile(5 * 1024 * 1024, 'Şəkil faylı tələb olunur.'));
                if (!$this->one("SELECT 1 FROM public_images WHERE id='instructor'") && $this->count('SELECT COUNT(*) n FROM public_images') >= 8)
                    fail('Ən çox 8 şəkil əlavə edə bilərsiniz.');
                $v = Auth::uuid();
                $this->run("INSERT INTO public_images VALUES ('instructor',?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version", [new Blob($image), $v]);
                $this->json(['instructorPhotoUrl' => "/api/public/instructor-photo?v=$v"]);
            }
            if ($m === 'DELETE') {
                $this->run("DELETE FROM public_images WHERE id='instructor'");
                $this->json(['instructorPhotoUrl' => '']);
            }
        }
        if ($m === 'POST' && $r === '/instructor-photos') {
            $raw = $this->rawFile(5 * 1024 * 1024, 'Şəkil faylı tələb olunur.');
            if ($this->count('SELECT COUNT(*) n FROM public_images') >= 8) fail('Ən çox 8 şəkil əlavə edə bilərsiniz.');
            $image = Images::prepare($raw);
            if ($this->count('SELECT COUNT(*) n FROM public_images') >= 8) fail('Ən çox 8 şəkil əlavə edə bilərsiniz.');
            $this->run('INSERT INTO public_images VALUES (?,?,?)', [Auth::uuid(), new Blob($image), Auth::uuid()]);
            $s = $this->readContent(false)['settings'];
            $this->json(['instructorPhotos' => $s['instructorPhotos'], 'instructorPhotoUrl' => $s['instructorPhotoUrl']], 201);
        }
        if ($m === 'DELETE' && preg_match('#^/instructor-photos/([^/]+)$#', $r, $mm)) {
            if (!$this->run('DELETE FROM public_images WHERE id=?', [$mm[1]])) fail('Şəkil tapılmadı.', 404);
            $s = $this->readContent(false)['settings'];
            $this->json(['instructorPhotos' => $s['instructorPhotos'], 'instructorPhotoUrl' => $s['instructorPhotoUrl']]);
        }
        if ($r === '/settings') {
            if ($m === 'GET') $this->json($this->readContent(false)['settings']);
            if ($m === 'PUT') $this->saveSettings();
        }
        if ($m === 'GET' && $r === '/registrations.csv') $this->csv();

        if (preg_match('#^/groups/([^/]+)/members(?:/([^/]+))?$#', $r, $mm)) $this->members($m, $mm[1], $mm[2] ?? null);
        if (preg_match('#^/materials/([^/]+)/file$#', $r, $mm)) $this->materialFile($m, $mm[1]);

        if (preg_match('#^/(courses|faqs|registrations|groups|materials|exams|results)(?:/([^/]+))?$#', $r, $mm)) {
            [$name, $id] = [$mm[1], $mm[2] ?? null];
            if ($m === 'GET' && $id === null) $this->listItems($name);
            if ($m === 'POST' && $id === null) $this->json(['id' => $this->saveItem($name, $this->requireBody(), null)], 201);
            if ($m === 'PUT' && $id !== null) $this->json(['id' => $this->saveItem($name, $this->requireBody(), $id)]);
            if ($m === 'DELETE' && $id !== null) {
                $table = self::TABLES[$name];
                $this->exists($table, $id, 'Məlumat');
                if ($name === 'courses' && $this->one('SELECT 1 FROM registrations WHERE course=?', [$id]))
                    fail('Müraciətləri olan kurs silinə bilməz. Kursu yayımdan çıxara bilərsiniz.', 409);
                $this->run("DELETE FROM $table WHERE id=?", [$id]);
                $this->json(['ok' => true]);
            }
        }
        $this->json(['error' => 'Bu ünvan mövcud deyil.'], 404);
    }

    private function login(): never
    {
        if (!$this->contentTypeIs('application/json')) $this->json(['error' => 'JSON formatı tələb olunur.'], 415);
        $key = 'login:' . $this->clientIp();
        $now = ms();
        $this->run('DELETE FROM rate_limits WHERE reset_at<?', [$now]);
        $this->run('DELETE FROM admin_sessions WHERE expires_at < ?', [$now]);
        $rate = $this->one('SELECT count,reset_at FROM rate_limits WHERE key=?', [$key]);
        if ($rate && $rate['reset_at'] > $now && $rate['count'] >= 10) {
            $this->outHeaders[] = 'Retry-After: ' . (int) ceil(($rate['reset_at'] - $now) / 1000);
            $this->json(['error' => 'Çox sayda giriş cəhdi edildi. 15 dəqiqə sonra yenidən yoxlayın.'], 429);
        }
        $b = is_array($this->body) ? $this->body : [];
        $username = is_string($b['username'] ?? null) ? mb_strtolower(js_trim($b['username'])) : '';
        $password = is_string($b['password'] ?? null) ? $b['password'] : '';
        $user = $this->one('SELECT * FROM admin_users WHERE username=?', [mb_substr($username, 0, 80)]);
        $valid = js_len($password) <= 256 && Auth::verify($password, $user['password_hash'] ?? null);
        if (!$user || !$valid) {
            if ($rate) $this->run('UPDATE rate_limits SET count=count+1 WHERE key=?', [$key]);
            else $this->run('INSERT INTO rate_limits VALUES (?,?,?)', [$key, 1, $now + 900000]);
            $this->json(['error' => 'İstifadəçi adı və ya parol düzgün deyil.'], 401);
        }
        $this->run('DELETE FROM rate_limits WHERE key=?', [$key]);
        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        // A new login replaces the current browser session, not another device's session.
        if ($previous = $this->getSession()) $this->run('DELETE FROM admin_sessions WHERE token_hash=?', [$previous['token_hash']]);
        $this->run('INSERT INTO admin_sessions VALUES (?,?,?,?)', [hash('sha256', $token), $user['id'], $csrf, $now + 43200000]);
        $this->cookie($token, 43200);
        $this->json(['username' => $user['username'], 'csrfToken' => $csrf]);
    }

    private function dashboard(): never
    {
        $this->json([
            'registrations' => $this->count('SELECT COUNT(*) n FROM registrations'),
            'newRegistrations' => $this->count("SELECT COUNT(*) n FROM registrations WHERE status='new'"),
            'groups' => $this->count("SELECT COUNT(*) n FROM lesson_groups WHERE status='active'"),
            'courses' => $this->count('SELECT COUNT(*) n FROM courses WHERE published=1'),
            'materials' => $this->count('SELECT COUNT(*) n FROM materials'),
            'results' => $this->count('SELECT COUNT(*) n FROM results'),
            'recent' => $this->all('SELECT id,name,email,course,status,created_at FROM registrations ORDER BY created_at DESC LIMIT 6'),
            'upcoming' => $this->all("SELECT e.*,g.name group_name FROM exams e JOIN lesson_groups g ON g.id=e.group_id WHERE e.status='scheduled' AND e.scheduled_at>=? ORDER BY e.scheduled_at LIMIT 5", [now_iso()]),
        ]);
    }
    private function options(): never
    {
        $this->json([
            'courses' => $this->readContent(false)['courses'],
            'groups' => $this->all('SELECT g.*,(SELECT COUNT(*) FROM group_members m WHERE m.group_id=g.id) member_count FROM lesson_groups g ORDER BY g.name'),
            'students' => $this->all('SELECT id,name,email,course FROM registrations ORDER BY name'),
            'exams' => $this->all('SELECT e.*,g.name group_name FROM exams e JOIN lesson_groups g ON g.id=e.group_id ORDER BY scheduled_at DESC'),
        ]);
    }

    // ---------- validation ----------
    private static function text(array $b, string $key, int $max = 2000, bool $required = false): string
    {
        $v = $b[$key] ?? '';
        if (!is_string($v) || js_len($v) > $max || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $v))
            fail("$key: mətnin formatını və uzunluğunu yoxlayın.");
        if ($required && js_trim($v) === '') fail("$key: bu sahə mütləqdir.");
        return js_trim($v);
    }
    private static function number(array $b, string $key, float $min, float $max, bool $integer = false): int|float
    {
        $v = $b[$key] ?? null;
        if (!is_num($v) || !is_finite((float) $v) || $v < $min || $v > $max || ($integer && floor((float) $v) != $v))
            fail("$key: " . self::fmt($min) . '–' . self::fmt($max) . ' aralığında ' . ($integer ? 'tam ' : '') . 'ədəd daxil edin.');
        return $integer ? (int) $v : $v;
    }
    private static function fmt(float $n): string
    {
        return floor($n) == $n ? (string) (int) $n : (string) $n;
    }
    private static function choice(array $b, string $key, array $values): string
    {
        $v = self::text($b, $key, 100, true);
        if (!in_array($v, $values, true)) fail("$key: seçim düzgün deyil.");
        return $v;
    }
    private static function date(array $b, string $key): string
    {
        $v = self::text($b, $key, 10);
        if ($v !== '' && (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])))
            fail('Tarix düzgün deyil.');
        return $v;
    }
    private static function bool(array $b, string $key): int
    {
        if (!is_bool($b[$key] ?? null)) fail("$key: seçim düzgün deyil.");
        return $b[$key] ? 1 : 0;
    }
    private static function stringArray(mixed $value, int $max = 30): array
    {
        if (!is_array($value) || !array_is_list($value) || count($value) > $max) fail('Siyahı məlumatları düzgün deyil.');
        foreach ($value as $s) if (!is_string($s) || js_len($s) > 1000) fail('Siyahı məlumatları düzgün deyil.');
        return array_values(array_filter(array_map('js_trim', $value), fn($s) => $s !== ''));
    }
    private static function isObject(mixed $v): bool
    {
        return is_array($v) && !isset($v['__list__']) && ($v === [] || !array_is_list($v));
    }

    private function exists(string $table, string $id, string $label): array
    {
        $row = $this->one("SELECT * FROM $table WHERE id=?", [$id]);
        if (!$row) fail("$label tapılmadı.", 404);
        return $row;
    }
    private function groupId(array $b): ?string
    {
        $id = self::text($b, 'group_id', 100);
        if ($id !== '') $this->exists('lesson_groups', $id, 'Qrup');
        return $id !== '' ? $id : null;
    }
    private function save(string $table, ?string $id, array $data): string
    {
        $keys = array_keys($data);
        if ($id !== null) {
            $this->exists($table, $id, 'Məlumat');
            $this->run("UPDATE $table SET " . implode(',', array_map(fn($k) => "$k=?", $keys)) . ' WHERE id=?', [...array_values($data), $id]);
            return $id;
        }
        $newId = Auth::uuid();
        $this->run("INSERT INTO $table (id," . implode(',', $keys) . ') VALUES (' . implode(',', array_fill(0, count($keys) + 1, '?')) . ')', [$newId, ...array_values($data)]);
        return $newId;
    }

    private function saveSettings(): never
    {
        $b = $this->requireBody();
        $current = $this->readContent(false)['settings'];
        foreach ($b as $key => $value) {
            $key = (string) $key;
            if (in_array($key, ['logoUrl', 'instructorPhotoUrl', 'instructorPhotos'], true)) continue; // Derived from uploaded images.
            if ($key === 'partners') {
                if (!is_array($value) || !array_is_list($value) || count($value) > 100) fail('Ən çox 100 şirkət əlavə edin.');
                $ids = [];
                $current['partners'] = array_map(function ($item) use (&$ids) {
                    if (!self::isObject($item)) fail('Şirkət düzgün deyil.');
                    $id = self::text($item, 'id', 100, true);
                    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id) || isset($ids[$id])) fail('Şirkətin kodu unikal olmalıdır.');
                    $ids[$id] = true;
                    return ['id' => $id, 'name' => self::text($item, 'name', 160, true), 'published' => (bool) self::bool($item, 'published')];
                }, $value);
                continue;
            }
            if ($key === 'solutions') {
                if (!is_array($value) || !array_is_list($value) || count($value) > 12) fail('Ən çox 12 IT həlli əlavə edin.');
                $ids = [];
                $current['solutions'] = array_map(function ($item) use (&$ids) {
                    if (!self::isObject($item)) fail('IT həlli düzgün deyil.');
                    $id = self::text($item, 'id', 100, true);
                    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id) || isset($ids[$id])) fail('IT həllinin kodu unikal olmalıdır.');
                    $ids[$id] = true;
                    return [
                        'id' => $id,
                        'visual' => !empty($item['visual'])
                            ? self::choice($item, 'visual', ['support', 'systems', 'networks', 'cloud', 'security', 'surveillance', 'pos', 'custom'])
                            : (['support' => 'support', 'systems' => 'systems', 'networks' => 'networks'][$id] ?? 'support'),
                        'title' => self::text($item, 'title', 120, true),
                        'description' => self::text($item, 'description', 1500, true),
                        'published' => (bool) self::bool($item, 'published'),
                    ];
                }, $value);
                continue;
            }
            if (!array_key_exists($key, $this->defaults['settings'])) fail('Naməlum məzmun sahəsi.');
            $current[$key] = is_bool($this->defaults['settings'][$key]) ? (bool) self::bool($b, $key) : self::text($b, $key, 6000);
        }
        if (empty($current['brandName']) || empty($current['instructorName'])) fail('Brend və müəllim adı boş ola bilməz.');
        if (!preg_match('/^\+[1-9]\d{6,14}$/', (string) ($current['phone'] ?? ''))) fail('Telefonu beynəlxalq formatda daxil edin: +994...');
        foreach (['whatsappUrl', 'linkedinUrl', 'instagramUrl'] as $key) {
            if (empty($current[$key])) continue;
            $current[$key] = self::httpsUrl((string) $current[$key], $key);
        }
        unset($current['logoUrl'], $current['instructorPhotoUrl'], $current['instructorPhotos']);
        $this->run('UPDATE site_settings SET data=? WHERE id=1', [json_encode($current, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        $this->json($this->readContent(false)['settings']);
    }
    private static function httpsUrl(string $value, string $key): string
    {
        $u = parse_url($value);
        if (
            js_len($value) > 2048 || $u === false || strtolower($u['scheme'] ?? '') !== 'https' || empty($u['host'])
            || isset($u['user']) || isset($u['pass']) || preg_match('/\s/', $value)
        )
            fail("$key: düzgün HTTPS linki daxil edin.");
        return 'https://' . strtolower($u['host']) . (isset($u['port']) && $u['port'] !== 443 ? ':' . $u['port'] : '')
            . ($u['path'] ?? '/') . (isset($u['query']) ? '?' . $u['query'] : '') . (isset($u['fragment']) ? '#' . $u['fragment'] : '');
    }

    private const TABLES = [
        'courses' => 'courses', 'faqs' => 'faqs', 'registrations' => 'registrations', 'groups' => 'lesson_groups',
        'materials' => 'materials', 'exams' => 'exams', 'results' => 'results',
    ];
    private const LISTS = [
        'courses' => ['SELECT r.* FROM courses r', "json_extract(r.data,'$.name')", 'r.sort_order,r.id', false],
        'faqs' => ['SELECT r.* FROM faqs r', 'r.question', 'r.sort_order,r.id', false],
        'registrations' => ["SELECT r.*,json_extract(c.data,'$.name') course_name FROM registrations r LEFT JOIN courses c ON c.id=r.course", "r.name||' '||r.email||' '||r.phone", 'r.created_at DESC', true],
        'groups' => ["SELECT r.*,json_extract(c.data,'$.name') course_name,(SELECT COUNT(*) FROM group_members m WHERE m.group_id=r.id) member_count FROM lesson_groups r JOIN courses c ON c.id=r.course_id", 'r.name', 'r.created_at DESC', true],
        'materials' => ['SELECT r.id,r.title,r.group_id,r.type,r.url,r.content,r.file_name,r.file_size,r.created_at,g.name group_name FROM materials r LEFT JOIN lesson_groups g ON g.id=r.group_id', 'r.title', 'r.created_at DESC', false],
        'exams' => ['SELECT r.*,g.name group_name FROM exams r JOIN lesson_groups g ON g.id=r.group_id', "r.title||' '||g.name", 'r.scheduled_at DESC', true],
        'results' => ["SELECT r.*,s.name student_name,e.title exam_title,e.max_score,e.pass_score,e.group_id,g.name group_name,CASE WHEN r.status='absent' THEN 'absent' WHEN r.score>=e.pass_score THEN 'passed' ELSE 'failed' END outcome FROM results r JOIN registrations s ON s.id=r.registration_id JOIN exams e ON e.id=r.exam_id JOIN lesson_groups g ON g.id=e.group_id", "s.name||' '||e.title||' '||g.name", 'r.created_at DESC', false],
    ];
    private function listItems(string $name): never
    {
        [$sql, $search, $order, $status] = self::LISTS[$name];
        $q = mb_substr($this->query('q'), 0, 200);
        $pageRaw = $this->query('page');
        $page = is_numeric($pageRaw) ? (int) floor((float) $pageRaw) : 0;
        $page = max(1, min(100000, $page ?: 1));
        $pageSize = 20;
        $clause = " WHERE ($search) LIKE ?";
        $params = ["%$q%"];
        if ($status && $this->query('status') !== '') {
            $clause .= ' AND r.status=?';
            $params[] = $this->query('status');
        }
        if ($this->query('group_id') !== '' && in_array($name, ['materials', 'exams'], true)) {
            $clause .= ' AND r.group_id=?';
            $params[] = $this->query('group_id');
        }
        $total = (int) $this->one("SELECT COUNT(*) total FROM ($sql$clause)", $params)['total'];
        $items = $this->all("$sql$clause ORDER BY $order LIMIT ? OFFSET ?", [...$params, $pageSize, ($page - 1) * $pageSize]);
        if ($name === 'courses') $items = array_map(fn($r) => $this->courseRow($r), $items);
        if ($name === 'faqs') foreach ($items as &$it) $it['published'] = (bool) $it['published'];
        $this->json(['items' => $items, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize]);
    }
    private function csv(): never
    {
        $cols = ['id', 'name', 'email', 'phone', 'course', 'status', 'admin_note', 'source', 'created_at'];
        $val = function ($v) {
            $s = (string) ($v ?? '');
            return '"' . (preg_match('/^\s*[=+\-@]/u', $s) || preg_match('/^[\t\r\n]/', $s) ? "'" : '') . str_replace('"', '""', $s) . '"';
        };
        $rows = $this->all('SELECT * FROM registrations ORDER BY created_at DESC');
        $out = "\u{FEFF}" . implode(',', $cols) . "\n" . implode("\n", array_map(fn($r) => implode(',', array_map(fn($c) => $val($r[$c] ?? ''), $cols)), $rows));
        $this->outHeaders[] = 'Content-Disposition: attachment; filename="jayhun-registrations.csv"';
        $this->send(200, $out, 'text/csv; charset=utf-8');
    }

    private function saveItem(string $name, array $b, ?string $id): string
    {
        switch ($name) {
            case 'courses':
                $courseId = $id ?? self::text($b, 'id', 80, true);
                if (!preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/', $courseId) || $courseId === 'undecided')
                    fail('Kurs kodu yalnız kiçik latın hərfləri, rəqəmlər və tire ilə yazılmalıdır.');
                if ($id === null && $this->one('SELECT 1 FROM courses WHERE id=?', [$courseId])) fail('Bu kurs kodu artıq mövcuddur.', 409);
                $data = ['id' => $courseId];
                foreach (['name', 'shortName', 'category', 'description', 'duration', 'level', 'prerequisites', 'outcome', 'number'] as $k)
                    $data[$k] = self::text($b, $k, in_array($k, ['description', 'prerequisites', 'outcome'], true) ? 4000 : 200, in_array($k, ['name', 'duration', 'level'], true));
                $data['shortName'] = $data['shortName'] !== '' ? $data['shortName'] : $data['name'];
                $data['tags'] = self::stringArray($b['tags'] ?? null, 15);
                $data['icon'] = self::choice($b, 'icon', ['help-desk', 'system-admin', 'network-admin']);
                $modules = $b['modules'] ?? null;
                if (!is_array($modules) || !array_is_list($modules) || count($modules) > 40) fail('Ən çox 40 sillabus modulu əlavə edə bilərsiniz.');
                $data['modules'] = array_map(function ($mod) {
                    if (!is_array($mod)) fail('Modul düzgün deyil.');
                    return [
                        'title' => self::text($mod, 'title', 200, true),
                        'duration' => self::text($mod, 'duration', 100),
                        'topics' => self::stringArray($mod['topics'] ?? null),
                        'lab' => self::text($mod, 'lab', 3000),
                    ];
                }, $modules);
                $published = self::bool($b, 'published');
                $sort = self::number($b, 'sort_order', 0, 9999, true);
                $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($id !== null) {
                    $this->exists('courses', $id, 'Kurs');
                    $this->run('UPDATE courses SET data=?,published=?,sort_order=?,updated_at=? WHERE id=?', [$json, $published, $sort, now_iso(), $id]);
                } else $this->run('INSERT INTO courses VALUES (?,?,?,?,?)', [$courseId, $json, $published, $sort, now_iso()]);
                return $courseId;
            case 'faqs':
                return $this->save('faqs', $id, [
                    'question' => self::text($b, 'question', 500, true),
                    'answer' => self::text($b, 'answer', 6000, true),
                    'published' => self::bool($b, 'published'),
                    'sort_order' => self::number($b, 'sort_order', 0, 9999, true),
                ]);
            case 'registrations':
                $email = mb_strtolower(self::text($b, 'email', 254, true));
                $phone = self::text($b, 'phone', 25, true);
                $course = self::text($b, 'course', 80, true);
                if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/u', $email)) fail('E-poçt düzgün deyil.');
                $digits = strlen(preg_replace('/\D/', '', $phone));
                if (!preg_match('/^[+\d() .-]+$/', $phone) || $digits < 7 || $digits > 15) fail('Telefon düzgün deyil.');
                if ($course !== 'undecided') $this->exists('courses', $course, 'Kurs');
                $existing = $id !== null ? $this->exists('registrations', $id, 'Tələbə') : null;
                if ($existing && $existing['course'] !== $course && $this->one('SELECT 1 FROM group_members WHERE registration_id=?', [$id]))
                    fail('Qrupa daxil edilmiş tələbənin kursunu dəyişməzdən əvvəl qrup üzvlüyünü yoxlayın.', 409);
                return $this->save('registrations', $id, [
                    'name' => self::text($b, 'name', 100, true),
                    'email' => $email,
                    'phone' => $phone,
                    'course' => $course,
                    'experience' => self::choice($b, 'experience', ['beginner', 'basic', 'working']),
                    'format' => self::choice($b, 'format', ['online', 'in-person', 'either']),
                    'message' => self::text($b, 'message', 1500),
                    'status' => self::choice($b, 'status', ['new', 'contacted', 'enrolled', 'completed', 'cancelled']),
                    'admin_note' => self::text($b, 'admin_note', 4000),
                    'updated_at' => now_iso(),
                ] + ($id === null ? ['consent_at' => '', 'created_at' => now_iso(), 'source' => 'manual'] : []));
            case 'groups':
                $courseId = self::text($b, 'course_id', 80, true);
                $this->exists('courses', $courseId, 'Kurs');
                $capacity = self::number($b, 'capacity', 1, 500, true);
                $start = self::date($b, 'start_date');
                $end = self::date($b, 'end_date');
                if ($start && $end && $end < $start) fail('Bitmə tarixi başlama tarixindən əvvəl ola bilməz.');
                if ($id !== null) {
                    $g = $this->exists('lesson_groups', $id, 'Qrup');
                    $count = $this->count('SELECT COUNT(*) n FROM group_members WHERE group_id=?', [$id]);
                    if ($capacity < $count) fail('Tutum mövcud tələbə sayından az ola bilməz.', 409);
                    if ($count && $g['course_id'] !== $courseId) fail('Tələbəsi olan qrupun kursu dəyişdirilə bilməz.', 409);
                }
                return $this->save('lesson_groups', $id, [
                    'name' => self::text($b, 'name', 150, true),
                    'course_id' => $courseId,
                    'start_date' => $start,
                    'end_date' => $end,
                    'schedule' => self::text($b, 'schedule', 500),
                    'format' => self::choice($b, 'format', ['online', 'in-person', 'hybrid']),
                    'capacity' => $capacity,
                    'status' => self::choice($b, 'status', ['planned', 'active', 'completed', 'archived']),
                    'notes' => self::text($b, 'notes', 4000),
                ] + ($id === null ? ['created_at' => now_iso()] : []));
            case 'materials':
                $url = self::text($b, 'url', 2000);
                if ($url !== '') {
                    $u = parse_url($url);
                    if ($u === false || empty($u['scheme']) || preg_match('/\s/', $url)) fail('Link düzgün deyil.');
                    if (!in_array(strtolower($u['scheme']), ['https', 'http'], true) || empty($u['host']) || isset($u['user']) || isset($u['pass']))
                        fail('Link http və ya https ünvanı olmalıdır.');
                }
                return $this->save('materials', $id, [
                    'title' => self::text($b, 'title', 200, true),
                    'group_id' => $this->groupId($b),
                    'type' => self::choice($b, 'type', ['document', 'link', 'video', 'note']),
                    'url' => $url,
                    'content' => self::text($b, 'content', 20000),
                ] + ($id === null ? ['created_at' => now_iso()] : []));
            case 'exams':
                $groupId = $this->groupId($b);
                if (!$groupId) fail('İmtahan üçün qrup seçin.');
                $scheduled = self::text($b, 'scheduled_at', 40, true);
                $dt = null;
                if (preg_match('/^\d{4}-\d{2}-\d{2}T/', $scheduled) && preg_match('/(Z|[+-]\d{2}:\d{2})$/', $scheduled)) {
                    try {
                        $dt = new DateTimeImmutable($scheduled);
                    } catch (Exception) {
                        $dt = null;
                    }
                }
                if (!$dt) fail('İmtahan tarixi düzgün deyil.');
                $max = self::number($b, 'max_score', 1, 10000);
                $pass = self::number($b, 'pass_score', 0, (float) $max);
                if ($id !== null) {
                    $old = $this->exists('exams', $id, 'İmtahan');
                    $stats = $this->one('SELECT COUNT(*) n,MAX(score) highest FROM results WHERE exam_id=?', [$id]);
                    if ($stats['n'] && $old['group_id'] !== $groupId) fail('Nəticəsi olan imtahanın qrupu dəyişdirilə bilməz.', 409);
                    if ($stats['highest'] !== null && $stats['highest'] > $max) fail('Maksimum bal mövcud nəticədən aşağı ola bilməz.', 409);
                }
                return $this->save('exams', $id, [
                    'group_id' => $groupId,
                    'title' => self::text($b, 'title', 200, true),
                    'scheduled_at' => $dt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z'),
                    'duration' => self::number($b, 'duration', 1, 1440, true),
                    'max_score' => $max,
                    'pass_score' => $pass,
                    'location' => self::text($b, 'location', 500),
                    'notes' => self::text($b, 'notes', 4000),
                    'status' => self::choice($b, 'status', ['scheduled', 'completed', 'cancelled']),
                ] + ($id === null ? ['created_at' => now_iso()] : []));
            case 'results':
                $examId = self::text($b, 'exam_id', 100, true);
                $regId = self::text($b, 'registration_id', 100, true);
                $exam = $this->exists('exams', $examId, 'İmtahan');
                $this->exists('registrations', $regId, 'Tələbə');
                if (!$this->one('SELECT 1 FROM group_members WHERE group_id=? AND registration_id=?', [$exam['group_id'], $regId]))
                    fail('Tələbə imtahanın keçirildiyi qrupa daxil deyil.');
                $status = self::choice($b, 'status', ['graded', 'absent']);
                $score = $status === 'absent' ? null : self::number($b, 'score', 0, (float) $exam['max_score']);
                return $this->save('results', $id, [
                    'exam_id' => $examId,
                    'registration_id' => $regId,
                    'score' => $score,
                    'status' => $status,
                    'feedback' => self::text($b, 'feedback', 4000),
                ] + ($id === null ? ['created_at' => now_iso()] : []));
        }
        fail('Bu ünvan mövcud deyil.', 404);
    }

    private function members(string $m, string $groupId, ?string $student): never
    {
        if ($student === null && $m === 'GET') {
            $this->exists('lesson_groups', $groupId, 'Qrup');
            $this->json($this->all('SELECT r.id,r.name,r.email,r.phone,r.status,m.joined_at FROM group_members m JOIN registrations r ON r.id=m.registration_id WHERE m.group_id=? ORDER BY r.name', [$groupId]));
        }
        if ($student === null && $m === 'POST') {
            $g = $this->exists('lesson_groups', $groupId, 'Qrup');
            $b = $this->requireBody();
            $s = $this->exists('registrations', self::text($b, 'registration_id', 100, true), 'Tələbə');
            if ($s['course'] !== $g['course_id'] && $s['course'] !== 'undecided') fail('Tələbənin kursu bu qrupa uyğun deyil.');
            if (in_array($g['status'], ['archived', 'completed'], true)) fail('Bağlanmış qrupa tələbə əlavə edilə bilməz.');
            if ($this->count('SELECT COUNT(*) n FROM group_members WHERE group_id=?', [$g['id']]) >= $g['capacity']) fail('Qrupda boş yer yoxdur.', 409);
            $this->tx(function () use ($g, $s) {
                $this->run('INSERT INTO group_members VALUES (?,?,?)', [$g['id'], $s['id'], now_iso()]);
                $this->run("UPDATE registrations SET status='enrolled',updated_at=? WHERE id=?", [now_iso(), $s['id']]);
            });
            $this->json(['ok' => true], 201);
        }
        if ($student !== null && $m === 'DELETE') {
            if ($this->one('SELECT 1 FROM results r JOIN exams e ON e.id=r.exam_id WHERE e.group_id=? AND r.registration_id=?', [$groupId, $student]))
                fail('Bu qrupda imtahan nəticələri olan tələbəni çıxarmaq mümkün deyil.', 409);
            if (!$this->run('DELETE FROM group_members WHERE group_id=? AND registration_id=?', [$groupId, $student])) fail('Qrup üzvlüyü tapılmadı.', 404);
            $this->json(['ok' => true]);
        }
        $this->json(['error' => 'Bu ünvan mövcud deyil.'], 404);
    }

    private function materialFile(string $m, string $id): never
    {
        if ($m === 'POST') {
            $this->exists('materials', $id, 'Vəsait');
            $data = $this->rawFile(10 * 1024 * 1024, 'Fayl seçilməyib.');
            $rawName = $this->header('x-filename') ?? '';
            if (preg_match('/%(?![0-9a-fA-F]{2})/', $rawName)) fail('Fayl adı düzgün deyil.');
            $name = rawurldecode($rawName);
            if (!mb_check_encoding($name, 'UTF-8')) fail('Fayl adı düzgün deyil.');
            if (js_len($name) > 200 || preg_match('/[\x00-\x1f\/\\\\]/', $name) || !preg_match('/^.+\.(pdf|docx?|pptx?|xlsx?|txt|zip|png|jpe?g|mp4)$/i', $name))
                fail('Dəstəklənən fayllar: PDF, Office, TXT, ZIP, PNG, JPG və MP4 (maksimum 10 MB).');
            $this->run('UPDATE materials SET file_name=?,file_size=?,file_blob=? WHERE id=?', [$name, strlen($data), new Blob($data), $id]);
            $this->json(['ok' => true]);
        }
        if ($m === 'GET') {
            $row = $this->exists('materials', $id, 'Vəsait');
            if ($row['file_blob'] === null || $row['file_blob'] === '') fail('Fayl tapılmadı.', 404);
            $this->outHeaders[] = "Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($row['file_name']);
            $this->send(200, (string) $row['file_blob'], 'application/octet-stream');
        }
        if ($m === 'DELETE') {
            $this->exists('materials', $id, 'Vəsait');
            $this->run('UPDATE materials SET file_name=NULL,file_size=NULL,file_blob=NULL WHERE id=?', [$id]);
            $this->json(['ok' => true]);
        }
        $this->json(['error' => 'Bu ünvan mövcud deyil.'], 404);
    }
}

final class Blob
{
    public function __construct(public string $data) {}
}

final class Auth
{
    public const COOKIE = 'jayhun_admin';
    public static function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
        $b[8] = chr(ord($b[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
    public static function verify(string $password, ?string $hash): bool
    {
        static $dummy = null;
        $dummy ??= password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT, ['cost' => 12]);
        // bcrypt only uses the first 72 bytes; pre-hash so long passwords stay distinct.
        $input = strlen($password) > 72 ? base64_encode(hash('sha256', $password, true)) : $password;
        return password_verify($input, $hash && str_starts_with($hash, '$2y$') ? $hash : $dummy) && $hash !== null && str_starts_with($hash, '$2y$');
    }
    public static function createAdmin(PDO $db, string $username, string $password, bool $replace = false): void
    {
        $username = mb_strtolower(js_trim($username));
        if (!preg_match('/^[a-z0-9_.@-]{3,80}$/', $username))
            throw new RuntimeException('İstifadəçi adı 3–80 latın hərfi, rəqəm və ya _.@- simvolundan ibarət olmalıdır.');
        if (js_len($password) < 12 || js_len($password) > 256) throw new RuntimeException('Parol 12–256 simvol olmalıdır.');
        $input = strlen($password) > 72 ? base64_encode(hash('sha256', $password, true)) : $password;
        $st = $db->prepare('SELECT id FROM admin_users WHERE username=?');
        $st->execute([$username]);
        $existing = $st->fetch();
        if ($existing && !$replace) throw new RuntimeException('Bu admin artıq mövcuddur.');
        if ($existing) {
            $db->beginTransaction();
            $db->prepare('UPDATE admin_users SET password_hash=? WHERE id=?')->execute([self::hash($input), $existing['id']]);
            $db->prepare('DELETE FROM admin_sessions WHERE admin_id=?')->execute([$existing['id']]);
            $db->commit();
        } else {
            $db->prepare('INSERT INTO admin_users VALUES (?,?,?,?)')->execute([self::uuid(), $username, self::hash($input), now_iso()]);
        }
    }
}

final class Images
{
    public static function prepare(string $buffer): string
    {
        $info = @getimagesizefromstring($buffer);
        $formats = [IMAGETYPE_JPEG => 'jpeg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
        if (!$info) fail('Şəkil oxunmadı. Etibarlı JPG, PNG və ya WebP seçin (maksimum 25 meqapiksel).');
        if (!isset($formats[$info[2]]) || self::animated($buffer, $formats[$info[2]]))
            fail('Yalnız statik JPG, PNG və WebP şəkilləri qəbul olunur.');
        if ($info[0] * $info[1] > 25000000 || $info[0] < 1 || $info[1] < 1)
            fail('Şəkil oxunmadı. Etibarlı JPG, PNG və ya WebP seçin (maksimum 25 meqapiksel).');
        try {
            if (class_exists('Imagick')) return self::imagick($buffer);
            return self::gd($buffer, $formats[$info[2]]);
        } catch (InputError $e) {
            throw $e;
        } catch (Throwable) {
            fail('Şəkil oxunmadı. Etibarlı JPG, PNG və ya WebP seçin (maksimum 25 meqapiksel).');
        }
    }
    private static function animated(string $b, string $format): bool
    {
        if ($format === 'png') {
            $idat = strpos($b, 'IDAT');
            $actl = strpos($b, 'acTL');
            return $actl !== false && ($idat === false || $actl < $idat);
        }
        if ($format === 'webp') return substr($b, 12, 4) === 'VP8X' && (ord($b[20] ?? "\0") & 0x02) !== 0;
        return false;
    }
    private static function imagick(string $buffer): string
    {
        $im = new Imagick();
        $im->readImageBlob($buffer);
        if ($im->getNumberImages() > 1) fail('Yalnız statik JPG, PNG və WebP şəkilləri qəbul olunur.');
        $im->autoOrient();
        $w = $im->getImageWidth();
        $h = $im->getImageHeight();
        if ($w > 1200 || $h > 1200) $im->thumbnailImage(1200, 1200, true);
        $im->stripImage();
        $im->setImageFormat('webp');
        $im->setImageCompressionQuality(85);
        $out = $im->getImageBlob();
        $im->clear();
        return $out;
    }
    private static function gd(string $buffer, string $format): string
    {
        $img = @imagecreatefromstring($buffer);
        if (!$img) throw new RuntimeException('decode');
        if ($format === 'jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data('data://image/jpeg;base64,' . base64_encode($buffer));
            $rot = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 1] ?? 0;
            if ($rot) $img = imagerotate($img, $rot, 0);
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min(1, 1200 / max($w, $h));
        if ($scale < 1) {
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $dst = imagecreatetruecolor($nw, $nh);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            $img = $dst;
        } else {
            imagepalettetotruecolor($img);
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }
        ob_start();
        imagewebp($img, null, 85);
        return (string) ob_get_clean();
    }
}

final class Database
{
    public static function open(string $path, array $defaults, string $legacyPath): PDO
    {
        if ($path !== ':memory:' && !is_dir(dirname($path))) mkdir(dirname($path), 0700, true);
        $db = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        if ($path !== ':memory:') @chmod($path, 0600);
        $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
        $db->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS registrations (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
              course TEXT NOT NULL, experience TEXT NOT NULL, format TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
              consent_at TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(email, course)
            );
            CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE, csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS site_logo (id INTEGER PRIMARY KEY CHECK(id=1), data BLOB NOT NULL, version TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS public_images (id TEXT PRIMARY KEY, data BLOB NOT NULL, version TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS site_settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS faqs (id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS lesson_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, course_id TEXT NOT NULL REFERENCES courses(id), start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', schedule TEXT NOT NULL DEFAULT '', format TEXT NOT NULL, capacity INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL REFERENCES lesson_groups(id) ON DELETE CASCADE, registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE, joined_at TEXT NOT NULL, PRIMARY KEY(group_id,registration_id));
            CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, title TEXT NOT NULL, group_id TEXT REFERENCES lesson_groups(id), type TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', file_name TEXT, file_size INTEGER, file_blob BLOB, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES lesson_groups(id), title TEXT NOT NULL, scheduled_at TEXT NOT NULL, duration INTEGER NOT NULL, max_score REAL NOT NULL, pass_score REAL NOT NULL, location TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL REFERENCES exams(id), registration_id TEXT NOT NULL REFERENCES registrations(id), score REAL, status TEXT NOT NULL, feedback TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(exam_id,registration_id));
            CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS registrations_created ON registrations(created_at);
            CREATE INDEX IF NOT EXISTS group_members_student ON group_members(registration_id);
            CREATE INDEX IF NOT EXISTS exams_scheduled ON exams(scheduled_at);
            SQL);
        $columns = array_column($db->query('PRAGMA table_info(registrations)')->fetchAll(), 'name');
        foreach ([
            'status' => "TEXT NOT NULL DEFAULT 'new'",
            'admin_note' => "TEXT NOT NULL DEFAULT ''",
            'source' => "TEXT NOT NULL DEFAULT 'website'",
            'updated_at' => "TEXT NOT NULL DEFAULT ''",
        ] as $name => $def) {
            if (!in_array($name, $columns, true)) $db->exec("ALTER TABLE registrations ADD COLUMN $name $def");
        }
        // Seed once, never resurrect content the administrator intentionally deleted.
        if (!$db->query('SELECT 1 FROM site_settings WHERE id=1')->fetch()) {
            $db->exec('BEGIN IMMEDIATE');
            try {
                if (!$db->query('SELECT 1 FROM site_settings WHERE id=1')->fetch()) {
                    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
                    $db->prepare('INSERT INTO site_settings VALUES (1,?)')->execute([json_encode($defaults['settings'], $flags)]);
                    $c = $db->prepare('INSERT INTO courses VALUES (?,?,?,?,?)');
                    foreach ($defaults['courses'] as $course) $c->execute([$course['id'], json_encode($course, $flags), 1, $course['sort_order'], now_iso()]);
                    $f = $db->prepare('INSERT INTO faqs VALUES (?,?,?,?,?)');
                    foreach ($defaults['faqs'] as $faq) $f->execute([$faq['id'], $faq['question'], $faq['answer'], 1, $faq['sort_order']]);
                }
                $db->exec('COMMIT');
            } catch (Throwable $e) {
                $db->exec('ROLLBACK');
                throw $e;
            }
        }
        // Upgrade only the untouched original template; preserve all administrator edits/deletions.
        $legacy = json_decode(file_get_contents($legacyPath), true);
        $stored = json_decode($db->query('SELECT data FROM site_settings WHERE id=1')->fetch()['data'], true);
        if (is_array($stored['solutions'] ?? null) && count($stored['solutions']) === count($legacy)) {
            $same = true;
            foreach ($legacy as $i => $item) foreach ($item as $k => $v) {
                $cur = $stored['solutions'][$i][$k] ?? null;
                if ($cur !== $v && !($k === 'visual' && $cur === null)) $same = false;
            }
            if ($same) {
                $stored['solutions'] = $defaults['settings']['solutions'];
                $db->prepare('UPDATE site_settings SET data=? WHERE id=1')->execute([json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            }
        }
        return $db;
    }
}
