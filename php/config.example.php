<?php
// Copy to config.php on the server (outside public_html). Never commit config.php.
return [
    'db_path' => __DIR__ . '/data/registrations.sqlite',
    'secure_cookies' => true,
    'production' => true,
    'trust_proxy' => 0,
    // Creates the first admin only while no admin exists. Remove the password after the first login.
    'admin_username' => 'admin',
    'admin_password' => '',
];
