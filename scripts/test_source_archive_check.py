import hashlib
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from source_archive_check import validate_source_zip


class SourceArchiveTests(unittest.TestCase):
    def make(self, directory, entries):
        p = Path(directory) / 'source.zip'
        with ZipFile(p, 'w') as z:
            for name, data in entries:
                z.writestr(name, data)
        return p, {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'size': p.stat().st_size}

    def test_text_only_source(self):
        with tempfile.TemporaryDirectory() as d:
            p, e = self.make(d, [('runner.mjs', 'export const a=1;'), ('README.md', '# Source')])
            self.assertEqual(len(validate_source_zip(p, e)), 2)

    def test_digest_mismatch(self):
        with tempfile.TemporaryDirectory() as d:
            p, e = self.make(d, [('runner.mjs', 'test')])
            e['sha256'] = 'invalid'
            with self.assertRaises(ValueError):
                validate_source_zip(p, e)

    def test_path_binary_and_secret_file_extensions(self):
        for name, data in [('../runner.mjs', 'test'), ('app.apk', b'APK'), ('runner.mjs', b'\x00'), ('key.pem', 'key')]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as d:
                p, e = self.make(d, [(name, data)])
                with self.assertRaises(ValueError):
                    validate_source_zip(p, e)


if __name__ == '__main__':
    unittest.main()
