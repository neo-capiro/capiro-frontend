"""Compare a candidate archive with producer metadata without extracting files."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
import zipfile


def digest(stream, count=None):
    result = hashlib.sha256()
    while count is None or count:
        data = stream.read(1024 * 1024 if count is None else min(count, 1024 * 1024))
        if not data:
            if count:
                raise ValueError("Truncated compressed entry")
            break
        result.update(data)
        if count is not None:
            count -= len(data)
    return result.hexdigest()


def entry_metadata(info, archive, raw):
    raw.seek(info.header_offset)
    fixed = raw.read(30)
    fields = struct.unpack("<4s5H3I2H", fixed)
    if fields[0] != b"PK\x03\x04":
        raise ValueError("Invalid local header")
    header = fixed + raw.read(fields[9] + fields[10])
    compressed = digest(raw, info.compress_size)
    with archive.open(info) as stream:
        uncompressed = digest(stream)
    return {
        "dateTime": list(info.date_time), "createSystem": info.create_system,
        "createVersion": info.create_version, "extractVersion": info.extract_version,
        "flags": info.flag_bits, "compression": info.compress_type,
        "CRC32": format(info.CRC, "08x"), "compressedBytes": info.compress_size,
        "uncompressedBytes": info.file_size, "externalAttributes": info.external_attr,
        "internalAttributes": info.internal_attr, "extraHex": info.extra.hex(),
        "commentHex": info.comment.hex(), "localOffset": info.header_offset,
        "localHeaderBytes": len(header),
        "localHeaderSha256": hashlib.sha256(header).hexdigest(),
        "compressedSHA256": compressed, "uncompressedSHA256": uncompressed,
    }


def compare(candidate, manifest):
    expected = json.loads(manifest.read_text())
    differences, counts = [], {}
    with candidate.open("rb") as stream:
        actual_sha = digest(stream)
    with candidate.open("rb") as raw, zipfile.ZipFile(candidate) as archive:
        infos = archive.infolist()
        if [i.filename for i in infos] != [r["name"] for r in expected["records"]]:
            raise ValueError("Archive entry names/order differ from the producer")
        for info, record in zip(infos, expected["records"]):
            actual = entry_metadata(info, archive, raw)
            changed = {key: {"producer": record[key], "candidate": value}
                       for key, value in actual.items() if value != record[key]}
            for key in changed:
                counts[key] = counts.get(key, 0) + 1
            if changed and len(differences) < 40:
                differences.append({"name": info.filename, "changes": changed})
        raw.seek(archive.start_dir)
        central_sha = digest(raw)
        result = {
            "source": expected["source"], "candidate": str(candidate),
            "candidateBytes": candidate.stat().st_size, "candidateSHA256": actual_sha,
            "producerSHA256": expected["archiveSHA256"], "entries": len(infos),
            "centralOffset": archive.start_dir, "centralAndEndSHA256": central_sha,
            "archiveCommentHex": archive.comment.hex(), "differentEntryFields": counts,
            "firstDifferences": differences,
            "exactArchiveMatch": actual_sha == expected["archiveSHA256"],
        }
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__,
        epilog="Exit0: exact archive match/help; exit1: mismatch/read failure; exit2: invalid arguments.")
    parser.add_argument("candidate", type=Path)
    parser.add_argument("producer_manifest", type=Path)
    args = parser.parse_args()
    try:
        result = compare(args.candidate, args.producer_manifest)
        print(json.dumps(result, indent=2))
        return 0 if result["exactArchiveMatch"] else 1
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
