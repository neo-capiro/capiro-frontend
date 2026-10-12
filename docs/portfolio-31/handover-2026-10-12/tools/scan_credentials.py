#!/usr/bin/env python3
"""Value-free credential candidate scanning, including preserved archive members."""
from __future__ import annotations

import base64
import gzip
import hashlib
import io
import json
import math
import re
import tarfile
import zipfile

RULES = [
    ("private-key-material", re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----")),
    ("github-access-token", re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b")),
    ("aws-access-key-id", re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("service-secret-key", re.compile(rb"\b(?:sk_(?:live|test)_[A-Za-z0-9]{20,255}|sk-proj-[A-Za-z0-9_-]{30,255}|xox[baprs]-[A-Za-z0-9-]{20,255})\b")),
    ("google-api-key", re.compile(rb"\bAIza[0-9A-Za-z_-]{35}\b")),
]
JWT_RE = re.compile(rb"\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b")
ASSIGNMENT = re.compile(
    rb"(?i)(?:aws_secret_access_key|github_token|api_secret|client_secret|refresh_token|access_token|password|passwd|authorization)"
    rb"[\"']?\s*[:=]\s*[\"']([^\r\n\"']{16,300})[\"']"
)
KNOWN_EXAMPLES = {
    b"AKIAIOSFODNN7EXAMPLE", b"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
}


def is_obvious_example(value):
    lower = value.lower()
    return (value in KNOWN_EXAMPLES or len(set(value)) < 5 or
            any(marker in lower for marker in (b"placeholder", b"synthetic", b"examplekey", b"your_token", b"your-secret", b"changeme", b"<token>")))


def entropy(value):
    return -sum((value.count(c) / len(value)) * math.log2(value.count(c) / len(value)) for c in set(value))


class CredentialScanner:
    """Scans each distinct payload once; reports locations without secret values."""
    def __init__(self):
        self.findings = []
        self.limits = []
        self.seen = set()
        self.top_level = 0
        self.archive_members = 0
        self.total_bytes = 0
        self.example_matches = 0
        self.max_member_bytes = 256 * 1024 * 1024
        self.max_expanded_bytes = 8 * 1024 * 1024 * 1024

    def record(self, rule, data, match, location, blob, confidence="candidate"):
        value = match.group(1) if rule == "credential-shaped-assignment" else match.group()
        if is_obvious_example(value):
            self.example_matches += 1
            return
        self.findings.append({"rule": rule, "location": location, "containerBlobSha256": blob,
                              "line": data.count(b"\n", 0, match.start()) + 1,
                              "confidence": confidence, "valuePrinted": False})

    def scan(self, data, location, root_blob=None, depth=0):
        digest = hashlib.sha256(data).hexdigest()
        if digest in self.seen:
            return
        self.seen.add(digest)
        self.total_bytes += len(data)
        root_blob = root_blob or digest
        if depth == 0:
            self.top_level += 1
        else:
            self.archive_members += 1
        for name, pattern in RULES:
            for match in pattern.finditer(data):
                self.record(name, data, match, location, root_blob, "high-confidence-format")
        for match in JWT_RE.finditer(data):
            try:
                encoded = match.group().split(b".")[1]
                payload = json.loads(base64.urlsafe_b64decode(encoded + b"=" * (-len(encoded) % 4)))
                if isinstance(payload, dict) and any(key in payload for key in ("exp", "sub", "iss", "aud")):
                    self.record("structured-jwt", data, match, location, root_blob)
            except (ValueError, UnicodeDecodeError):
                pass
        for match in ASSIGNMENT.finditer(data):
            value = match.group(1)
            if entropy(value) >= 3.5 and not any(c in value for c in (b"${", b"process.env", b"import.meta", b"localStorage", b".repeat(")):
                self.record("credential-shaped-assignment", data, match, location, root_blob)
        if depth >= 5:
            if data.startswith((b"PK\x03\x04", b"\x1f\x8b")):
                self.limits.append({"location": location, "reason": "maximum archive nesting depth"})
            return
        if data.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
            self.scan_zip(data, location, root_blob, depth)
        elif data.startswith(b"\x1f\x8b"):
            self.scan_gzip(data, location, root_blob, depth)
        elif len(data) > 262 and data[257:262] == b"ustar":
            self.scan_tar(data, location, root_blob, depth)

    def allowed_member(self, size, location):
        if size > self.max_member_bytes or self.total_bytes + size > self.max_expanded_bytes:
            self.limits.append({"location": location, "reason": "archive scan byte budget", "declaredBytes": size})
            return False
        return True

    def scan_zip(self, data, location, blob, depth):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for member in archive.infolist():
                    if member.is_dir():
                        continue
                    nested = location + "!/" + member.filename
                    if member.flag_bits & 1:
                        self.limits.append({"location": nested, "reason": "encrypted archive member"})
                    elif self.allowed_member(member.file_size, nested):
                        self.scan(archive.read(member), nested, blob, depth + 1)
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError):
            self.limits.append({"location": location, "reason": "unreadable ZIP archive"})

    def scan_gzip(self, data, location, blob, depth):
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as archive:
                expanded = archive.read(self.max_member_bytes + 1)
            if self.allowed_member(len(expanded), location + "!gzip"):
                self.scan(expanded, location + "!gzip", blob, depth + 1)
        except (OSError, EOFError):
            self.limits.append({"location": location, "reason": "unreadable gzip archive"})

    def scan_tar(self, data, location, blob, depth):
        try:
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as archive:
                for member in archive:
                    if member.isfile() and self.allowed_member(member.size, location + "!/" + member.name):
                        stream = archive.extractfile(member)
                        self.scan(stream.read(), location + "!/" + member.name, blob, depth + 1)
        except (OSError, tarfile.TarError):
            self.limits.append({"location": location, "reason": "unreadable tar archive"})

    def report(self):
        return {
            "scan": "format and contextual credential candidate scan; no network validation",
            "disposition": "ROOT_REVIEW_REQUIRED" if self.findings or self.limits else "NO_CANDIDATES_FOUND_WITHIN_RECORDED_SCAN",
            "findings": self.findings, "coverageLimits": self.limits,
            "uniqueTopLevelPayloadsScanned": self.top_level,
            "uniqueArchiveMemberPayloadsScanned": self.archive_members,
            "uniqueBytesScanned": self.total_bytes, "knownExampleMatchesNotFlagged": self.example_matches,
            "matchedValuesIncluded": False, "noCredentialsGuaranteed": False,
            "notes": ["Each distinct payload is scanned once; manifest maps duplicate bytes to all original paths.",
                      "False positives in source, fixtures, schemas or documentation require root review.",
                      "Exact local bytes are preserved; this scanner neither redacts nor publishes them.",
                      "Excluded runtime credential stores are not collected or scanned."],
        }
