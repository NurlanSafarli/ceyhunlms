#!/usr/bin/env python3
"""Deploy the existing PHP package using verified explicit FTPS (never plain FTP)."""
import argparse
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import socket
import ssl
import sys
import urllib.request
import uuid


class VerifiedFTPS(ftplib.FTP_TLS):
    # Pure-FTPd commonly requires the data channel to reuse the control TLS session.
    def ntransfercmd(self, cmd, rest=None):
        # Some of the hosting's passive ports are unreachable. The command is sent
        # only after the data connection opens, so asking for a new port is safe.
        for attempt in range(6):
            try:
                conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
                break
            except (socket.timeout, TimeoutError, ConnectionRefusedError):
                if attempt == 5:
                    raise
                print('Passive data port unreachable; requesting another port.')
        if self._prot_p:
            conn = self.context.wrap_socket(
                conn, server_hostname=self.host, session=self.sock.session
            )
        return conn, size


def allowed(path):
    p = PurePosixPath(path)
    if p.is_absolute() or any(part.startswith('.') for part in p.parts):
        return False
    if path in {
        'jayhuntech/app.php', 'jayhuntech/bootstrap.php',
        'jayhuntech/shared/default-content.json',
        'jayhuntech/shared/legacy-solutions.json',
        'public_html/index.html', 'public_html/api.php', 'public_html/favicon.svg',
    }:
        return True
    return (len(p.parts) >= 3 and p.parts[0] == 'public_html'
            and p.parts[1] in {'assets', 'brands', 'fonts'}
            and p.suffix.lower() in {'.js', '.css', '.svg', '.woff', '.woff2',
                                     '.ttf', '.png', '.jpg', '.webp', '.txt', '.md'})


def manifest(package):
    result = {}
    for path in sorted(package.rglob('*')):
        relative = path.relative_to(package).as_posix()
        if path.is_symlink():
            raise RuntimeError('The deployment package must not contain symbolic links.')
        if path.is_file() and allowed(relative):
            if path.stat().st_size > 10 * 1024 * 1024:
                raise RuntimeError('An application file exceeds the deployment size limit.')
            result[relative] = path.read_bytes()
    for required in ['public_html/index.html', 'public_html/api.php',
                     'jayhuntech/app.php', 'jayhuntech/bootstrap.php',
                     'jayhuntech/shared/default-content.json',
                     'jayhuntech/shared/legacy-solutions.json']:
        if required not in result:
            raise RuntimeError('Incomplete PHP package: ' + required)
    if not any(p.startswith('public_html/assets/') for p in result):
        raise RuntimeError('The compiled frontend is missing.')
    return result


def digest(data):
    return hashlib.sha256(data).digest()


class Deployment:
    def __init__(self, ftp, files, run_id):
        if not re.fullmatch(r'[a-zA-Z0-9_-]+', run_id):
            raise ValueError('Invalid deployment ID.')
        self.ftp = ftp
        self.files = files
        self.root = ftp.pwd().rstrip('/') or '/'
        self.private = self.path('.jayhun-deploy/' + run_id)
        self.previous = {}
        self.promoted = []

    def path(self, relative):
        return posixpath.join(self.root, relative)

    def exists(self, path):
        # SIZE uses only the control channel. Repeated NLST data connections stall
        # on the hosting's Pure-FTPd over TLS, so avoid opening one per file.
        self.ftp.voidcmd('TYPE I')
        try:
            self.ftp.size(path)
            return True
        except ftplib.error_perm as error:
            if str(error).startswith('550'):
                return False
            raise

    def check_layout(self):
        for directory in ['public_html', 'jayhuntech']:
            self.ftp.cwd(self.path(directory))
            if self.ftp.pwd().rstrip('/') != self.path(directory).rstrip('/'):
                raise RuntimeError('Unexpected FTP directory mapping; no files were changed.')
        # This workflow updates an existing installation; it never creates/replaces config.
        for path in ['public_html/index.html', 'public_html/api.php',
                     'public_html/.htaccess', 'jayhuntech/config.php',
                     'jayhuntech/app.php', 'jayhuntech/bootstrap.php']:
            if not self.exists(self.path(path)):
                raise RuntimeError('Existing PHP installation not found: ' + path)
        self.ftp.cwd(self.root)

    def mkdirs(self, path):
        parts = PurePosixPath(path).parts
        current = '/' if path.startswith('/') else ''
        for part in parts:
            if part == '/':
                continue
            current = posixpath.join(current, part)
            try:
                self.ftp.cwd(current)
            except ftplib.error_perm:
                self.ftp.mkd(current)
                self.ftp.cwd(current)
            if self.ftp.pwd().rstrip('/') != current.rstrip('/'):
                raise RuntimeError('Refusing a directory outside the expected deployment layout.')

    def read(self, path):
        out = io.BytesIO()
        def receive(block):
            if out.tell() + len(block) > 10 * 1024 * 1024:
                raise RuntimeError('Unexpectedly large remote application file.')
            out.write(block)
        self.ftp.retrbinary('RETR ' + path, receive)
        return out.getvalue()

    def write_verified(self, path, data):
        self.mkdirs(posixpath.dirname(path))
        self.ftp.storbinary('STOR ' + path, io.BytesIO(data))
        if digest(self.read(path)) != digest(data):
            raise RuntimeError('Uploaded file verification failed; deployment stopped.')

    def stage(self):
        for relative, data in self.files.items():
            target = self.path(relative)
            old = self.read(target) if self.exists(target) else None
            if old == data:
                continue
            self.previous[relative] = old is not None
            if old is not None:
                self.write_verified(self.private + '/backup/' + relative, old)
            self.write_verified(self.private + '/staging/' + relative, data)
        print(f'Prepared {len(self.previous)} changed files. Backups are outside public_html.')

    def promote(self):
        # New assets first; PHP before the HTML entry point. index.html is switched last.
        def order(path):
            if path == 'public_html/index.html':
                return (3, path)
            if path.startswith('jayhuntech/shared/'):
                return (1, path)
            return (2 if path.startswith('jayhuntech/') or path.endswith('/api.php') else 0, path)
        for relative in sorted(self.previous, key=order):
            target = self.path(relative)
            self.mkdirs(posixpath.dirname(target))
            # Never delete an existing target to force replacement. Unsupported rename stops safely.
            self.promoted.append(relative)
            self.ftp.rename(self.private + '/staging/' + relative, target)

    def rollback(self):
        failed = []
        for relative in reversed(self.promoted):
            try:
                target = self.path(relative)
                if self.previous[relative]:
                    backup = self.private + '/backup/' + relative
                    # Keep the backup as well as restoring the old application file.
                    restore = self.private + '/restore/' + relative
                    self.write_verified(restore, self.read(backup))
                    self.ftp.rename(restore, target)
                elif self.exists(target):
                    if digest(self.read(target)) != digest(self.files[relative]):
                        raise RuntimeError('A new target changed outside this deployment.')
                    self.ftp.delete(target)  # Only a file created by this exact deployment.
            except Exception:
                failed.append(relative)
        if failed:
            raise RuntimeError('Rollback needs manual recovery for: ' + ', '.join(failed)
                               + '. Original files remain in ' + self.private + '/backup/')
        print('Previous application files restored. Database and configuration were not changed.')

    def deploy(self, healthcheck):
        self.check_layout()
        self.stage()
        try:
            self.promote()
            healthcheck(self.files['public_html/index.html'])
        except Exception:
            self.rollback()
            raise
        print('Deployment and public health checks succeeded.')
        print('Application backup: ' + self.private + '/backup/')


def verify_site(expected_html):
    # A fixed public site, with no FTP credentials, cookies or synthetic registrations.
    def get(path):
        request = urllib.request.Request('https://jayhuntech.az' + path,
                                         headers={'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read(5 * 1024 * 1024), response.headers
    nonce = uuid.uuid4().hex
    body, _ = get('/api/health?deploy=' + nonce)
    if json.loads(body).get('status') != 'ok':
        raise RuntimeError('PHP health check failed.')
    body, _ = get('/?deploy=' + nonce)
    if digest(body) != digest(expected_html):
        raise RuntimeError('The live homepage does not match the deployed package.')
    body, _ = get('/admin?deploy=' + nonce)
    if digest(body) != digest(expected_html):
        raise RuntimeError('The live admin entry point does not match the deployed package.')
    body, _ = get('/api/public/content?deploy=' + nonce)
    content = json.loads(body)
    if not isinstance(content.get('settings', {}).get('partners'), list):
        raise RuntimeError('Public PHP content check failed.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--package', type=Path, default=Path('dist-php'))
    args = parser.parse_args()
    for name in ['FTP_HOST', 'FTP_USERNAME', 'FTP_PASSWORD']:
        if not os.environ.get(name):
            raise RuntimeError('Missing repository secret: ' + name)
    host = os.environ['FTP_HOST'].strip()
    if not re.fullmatch(r'[a-zA-Z0-9.-]+', host):
        raise RuntimeError('FTP_HOST must contain a hostname only, without a URL or port.')
    files = manifest(args.package)
    run_id = os.environ.get('GITHUB_RUN_ID', 'local') + '-' + os.environ.get('GITHUB_RUN_ATTEMPT', '1') + '-' + uuid.uuid4().hex[:8]
    ftp = VerifiedFTPS(context=ssl.create_default_context(), timeout=30)
    try:
        ftp.connect(host, 21)
        ftp.auth()  # Credentials are never transmitted before TLS verification succeeds.
        ftp.login(os.environ['FTP_USERNAME'], os.environ['FTP_PASSWORD'])
        ftp.prot_p()
        deployment = Deployment(ftp, files, run_id)
        deployment.check_layout()
        print('Verified FTPS login, encrypted data channel and existing PHP folder layout.')
        if args.check_only:
            print('Connection check completed; no remote files were changed.')
        else:
            deployment.deploy(verify_site)
    finally:
        ftp.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        message = f'{type(error).__name__}: {error}'
        for name in ['FTP_HOST', 'FTP_USERNAME', 'FTP_PASSWORD']:
            value = os.environ.get(name)
            if value:
                message = message.replace(value, '[redacted]')
        print('Deployment stopped: ' + message, file=sys.stderr)
        sys.exit(1)
