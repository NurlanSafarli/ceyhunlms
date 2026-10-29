<?php
// Loads config (config.php next to this file, or environment for local tests) and handles one API request.
declare(strict_types=1);
require __DIR__ . '/app.php';

$file = __DIR__ . '/config.php';
$cfg = is_file($file) ? require $file : [
    'db_path' => getenv('DATABASE_PATH') ?: __DIR__ . '/../.local/registrations.sqlite',
    'rate_limit' => (int) (getenv('RATE_LIMIT') ?: 10),
    'rate_window_ms' => (int) (getenv('RATE_WINDOW_MS') ?: 600000),
    'secure_cookies' => getenv('COOKIE_SECURE') === 'true',
    'production' => getenv('APP_PRODUCTION') === 'true',
    'trust_proxy' => (int) (getenv('TRUST_PROXY_HOPS') ?: 0),
    'admin_username' => getenv('ADMIN_USERNAME') ?: null,
    'admin_password' => getenv('ADMIN_PASSWORD') ?: null,
];
$cfg += [
    'defaults_path' => __DIR__ . '/shared/default-content.json',
    'legacy_path' => __DIR__ . '/shared/legacy-solutions.json',
];
if (!is_file($cfg['defaults_path'])) {
    $cfg['defaults_path'] = __DIR__ . '/../shared/default-content.json';
    $cfg['legacy_path'] = __DIR__ . '/../server/legacy-solutions.json';
}
try {
    $app = new App($cfg);
} catch (Throwable $e) {
    error_log('API start failed: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Server xətası. Bir az sonra yenidən cəhd edin.'], JSON_UNESCAPED_UNICODE);
    return;
}
$app->handle();
