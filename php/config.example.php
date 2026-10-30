<?php
// Copy to config.php on the server (outside public_html). Never commit config.php.
return [
    'db_path' => __DIR__ . '/data/registrations.sqlite',
    'secure_cookies' => true,
    'production' => true,
    'trust_proxy' => 0,
    'public_origins' => ['https://nurlansafarli.github.io'],
    // Creates the first admin only while no admin exists. Remove the password after the first login.
    'admin_username' => 'admin',
    'admin_password' => '',
];
