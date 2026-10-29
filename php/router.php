<?php
// Local only: php -S 127.0.0.1:8080 php/router.php — serves dist/ and the PHP API like the hosting .htaccess.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api(/|$)#i', $path)) {
    require __DIR__ . '/bootstrap.php';
    return true;
}
$dist = realpath(__DIR__ . '/../dist');
$file = realpath($dist . $path);
if ($file && str_starts_with($file, $dist) && is_file($file)) return false;
if (in_array($path, ['/', '/admin', '/admin/'], true)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($dist . '/index.html');
    return true;
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Səhifə tapılmadı.';
return true;
