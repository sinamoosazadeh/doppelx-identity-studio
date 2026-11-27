"""Validate small, flat, text-source-only downloadable ZIPs; never extract them."""
import hashlib
from pathlib import PurePosixPath
from zipfile import ZipFile


def validate_source_zip(file, entry):
    data = file.read_bytes()
    if not isinstance(entry, dict) or entry.get('sha256') != hashlib.sha256(data).hexdigest() or entry.get('size') != len(data):
        raise ValueError('source archive manifest mismatch')
    with ZipFile(file) as archive:
        members = archive.infolist()
        if not members or len(members) > 100:
            raise ValueError('unexpected archive file count')
        names = [m.filename for m in members]
        if len(set(names)) != len(names):
            raise ValueError('duplicate archive member')
        if sum(m.file_size for m in members) > 10_000_000:
            raise ValueError('oversized source archive')
        sources = []
        for member in members:
            p = PurePosixPath(member.filename)
            if len(p.parts) != 1 or '\\' in member.filename or p.suffix not in {'.mjs', '.md'}:
                raise ValueError('only flat reviewed source filenames allowed')
            if member.is_dir() or ((member.external_attr >> 16) & 0o170000) == 0o120000:
                raise ValueError('directory or symlink in source archive')
            source = archive.read(member).decode('utf-8')
            if '\x00' in source:
                raise ValueError('binary data in source archive')
            sources.append(source)
        return sources
