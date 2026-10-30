import ftplib
import importlib.util
import io
from pathlib import Path
import posixpath
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('deploy_php', Path(__file__).parents[1] / 'scripts/deploy-php.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FakeFTP:
    def __init__(self, root='/'):
        self.current = root
        self.directories = {'/', root}
        self.files = {}
        self.operations = []
        self.fail_rename = None
        self.corrupt = False

    def seed(self, path, data=b'old'):
        self.files[path] = data
        parent = posixpath.dirname(path)
        while parent:
            self.directories.add(parent)
            if parent == '/':
                break
            parent = posixpath.dirname(parent)

    def pwd(self):
        return self.current

    def cwd(self, path):
        if path not in self.directories:
            raise ftplib.error_perm('550 Missing directory')
        self.current = path

    def nlst(self):
        return [path for path in list(self.files) + list(self.directories)
                if path != self.current and posixpath.dirname(path) == self.current]

    def mkd(self, path):
        self.directories.add(path)
        self.operations.append(('mkdir', path))

    def retrbinary(self, command, callback):
        callback(self.files[command.removeprefix('RETR ')])

    def storbinary(self, command, data):
        path = command.removeprefix('STOR ')
        self.files[path] = data.read() + (b'corrupt' if self.corrupt else b'')
        self.operations.append(('write', path))

    def rename(self, source, target):
        if self.fail_rename == target:
            self.fail_rename = None
            raise ftplib.error_perm('550 Simulated promotion failure')
        self.files[target] = self.files.pop(source)
        self.operations.append(('rename', target))

    def delete(self, path):
        del self.files[path]
        self.operations.append(('delete', path))


class DeploymentTests(unittest.TestCase):
    def setup_deployment(self, root='/'):
        ftp = FakeFTP(root)
        paths = ['public_html/index.html', 'public_html/api.php', 'public_html/.htaccess',
                 'public_html/.user.ini', 'jayhuntech/config.php',
                 'jayhuntech/app.php', 'jayhuntech/bootstrap.php',
                 'jayhuntech/data/registrations.sqlite', 'public_html/assets/keep.js']
        for relative in paths:
            ftp.seed(posixpath.join(root, relative))
        files = {'public_html/index.html': b'new index', 'public_html/api.php': b'new entry',
                 'public_html/assets/new.js': b'new asset', 'jayhuntech/app.php': b'new PHP'}
        return ftp, module.Deployment(ftp, files, 'test-run')

    def test_only_allowlisted_application_files_can_be_packaged(self):
        for relative in ['public_html/.htaccess', 'public_html/.user.ini', 'public_html/.env',
                         'jayhuntech/config.php', 'jayhuntech/data/registrations.sqlite',
                         'public_html/uploads/photo.png', '../config.php', '/public_html/index.html',
                         'public_html/assets/../../config.php', 'public_html/assets/backup.sqlite']:
            self.assertFalse(module.allowed(relative), relative)
        self.assertTrue(module.allowed('public_html/assets/index-abc.js'))
        self.assertTrue(module.allowed('jayhuntech/shared/default-content.json'))

    def test_layout_check_is_read_only_and_requires_existing_config(self):
        ftp, deployment = self.setup_deployment()
        deployment.check_layout()
        self.assertEqual(ftp.operations, [])
        del ftp.files['/jayhuntech/config.php']
        with self.assertRaisesRegex(RuntimeError, 'config.php'):
            deployment.check_layout()
        self.assertEqual(ftp.operations, [])

    def test_restricted_public_html_login_does_not_deploy(self):
        ftp, _ = self.setup_deployment()
        ftp.current = '/public_html'
        deployment = module.Deployment(ftp, {}, 'test')
        with self.assertRaises(ftplib.error_perm):
            deployment.check_layout()
        self.assertEqual(ftp.operations, [])

    def test_full_deploy_backs_up_code_preserves_private_data_and_promotes_index_last(self):
        ftp, deployment = self.setup_deployment('/home/account')
        before = dict(ftp.files)
        checked = []
        deployment.deploy(lambda html: checked.append(html))
        self.assertEqual(checked, [b'new index'])
        for path, data in before.items():
            if path.removeprefix('/home/account/') not in deployment.files:
                self.assertEqual(ftp.files[path], data)
        self.assertEqual(ftp.files[deployment.private + '/backup/jayhuntech/app.php'], b'old')
        renames = [path for operation, path in ftp.operations if operation == 'rename']
        self.assertEqual(renames[-1], '/home/account/public_html/index.html')
        self.assertFalse(any('/config.php' in p or '/registrations.sqlite' in p or '/.htaccess' in p
                             for _, p in ftp.operations))

    def test_health_failure_restores_old_files_and_removes_only_our_new_assets(self):
        ftp, deployment = self.setup_deployment()
        before = dict(ftp.files)
        def fail(_):
            raise RuntimeError('health failed')
        with self.assertRaisesRegex(RuntimeError, 'health failed'):
            deployment.deploy(fail)
        for path, data in before.items():
            self.assertEqual(ftp.files[path], data)
        self.assertNotIn('/public_html/assets/new.js', ftp.files)
        self.assertIn(deployment.private + '/backup/public_html/index.html', ftp.files)

    def test_promotion_failure_restores_prior_promotions(self):
        ftp, deployment = self.setup_deployment()
        before = dict(ftp.files)
        ftp.fail_rename = '/public_html/index.html'
        with self.assertRaises(ftplib.error_perm):
            deployment.deploy(lambda _: None)
        for path, data in before.items():
            self.assertEqual(ftp.files[path], data)
        self.assertNotIn('/public_html/assets/new.js', ftp.files)

    def test_corrupted_staging_never_changes_live_files(self):
        ftp, deployment = self.setup_deployment()
        before = dict(ftp.files)
        ftp.corrupt = True
        with self.assertRaisesRegex(RuntimeError, 'verification failed'):
            deployment.deploy(lambda _: None)
        for path, data in before.items():
            self.assertEqual(ftp.files[path], data)
        self.assertFalse(any(op in ('rename', 'delete') for op, _ in ftp.operations))

    def test_incomplete_package_and_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory)
            (package / 'config.php').write_text('secret')
            with self.assertRaisesRegex(RuntimeError, 'Incomplete'):
                module.manifest(package)
            (package / 'link').symlink_to(package / 'config.php')
            with self.assertRaisesRegex(RuntimeError, 'symbolic links'):
                module.manifest(package)


if __name__ == '__main__':
    unittest.main()
