"""Validate a single indexed ZIP layout without extracting its members."""
import struct


def verify_extra(data):
    """Allow only well-formed extended timestamps, never path/mode overrides."""
    seen = set()
    while data:
        if len(data) < 4:
            raise ValueError("Truncated ZIP extra field")
        kind, size = struct.unpack("<2H", data[:4])
        payload, data = data[4:4 + size], data[4 + size:]
        if len(payload) != size or kind in seen:
            raise ValueError("Truncated or duplicate ZIP extra field")
        seen.add(kind)
        if (kind != 0x5455 or not payload or payload[0] & ~7
                or len(payload) != 1 + 4 * payload[0].bit_count()):
            raise ValueError("Unsupported ZIP extra field; only extended timestamps are allowed")


def central_directory(stream, archive, length):
    tail_length = min(length, 65557)
    stream.seek(length - tail_length)
    tail = stream.read(tail_length)
    offset = tail.rfind(b"PK\x05\x06")
    if offset < 0 or len(tail) - offset < 22:
        raise ValueError("ZIP end record is missing")
    end = struct.unpack("<4s4H2IH", tail[offset:offset + 22])
    _, disk, central_disk, disk_count, count, size, start, comment_length = end
    actual_end = length - tail_length + offset
    if (disk or central_disk or disk_count != count
            or count != len(archive.infolist()) or count == 65535
            or size == 0xffffffff or start == 0xffffffff
            or actual_end + 22 + comment_length != length
            or start + size != actual_end):
        raise ValueError("ZIP has prefix/trailing data, split volumes or unsupported ZIP64 layout")
    return start


def verify_layout(stream, archive, length):
    central_start = central_directory(stream, archive, length)
    entries = sorted(archive.infolist(), key=lambda item: item.header_offset)
    expected_offset = 0
    for index, item in enumerate(entries):
        verify_extra(item.extra)
        if item.header_offset != expected_offset:
            raise ValueError("ZIP has overlapping or unindexed local data")
        stream.seek(item.header_offset)
        raw = stream.read(30)
        if len(raw) != 30:
            raise ValueError("Incomplete ZIP local header")
        fields = struct.unpack("<4s5H3I2H", raw)
        signature, version, flags, method, _, _, crc, compressed, size, name_len, extra_len = fields
        if (signature != b"PK\x03\x04" or version >= 45
                or flags != item.flag_bits or method != item.compress_type
                or flags & 1):
            raise ValueError("ZIP local/central header mismatch or unsupported layout")
        raw_name = stream.read(name_len)
        name = raw_name.decode("utf-8" if flags & 0x800 else "cp437")
        if name != item.orig_filename:
            raise ValueError("ZIP local/central filename mismatch")
        extra = stream.read(extra_len)
        if len(extra) != extra_len:
            raise ValueError("Truncated ZIP local extra field")
        verify_extra(extra)
        expected = (item.CRC, item.compress_size, item.file_size)
        if flags & 8:
            if (crc, compressed, size) not in ((0, 0, 0), expected):
                raise ValueError("ZIP descriptor header conflicts with central record")
        elif (crc, compressed, size) != expected:
            raise ValueError("ZIP local/central size or CRC mismatch")
        data_end = item.header_offset + 30 + name_len + extra_len + item.compress_size
        next_offset = entries[index + 1].header_offset if index + 1 < len(entries) else central_start
        if data_end > next_offset:
            raise ValueError("ZIP member overlaps its next indexed record")
        if flags & 8:
            if next_offset - data_end not in (12, 16):
                raise ValueError("ZIP descriptor has an unsupported length")
            stream.seek(data_end)
            descriptor = stream.read(next_offset - data_end)
            if descriptor.startswith(b"PK\x07\x08"):
                descriptor = descriptor[4:]
            if len(descriptor) != 12 or struct.unpack("<3I", descriptor) != expected:
                raise ValueError("ZIP data descriptor differs")
        elif next_offset != data_end:
            raise ValueError("ZIP has unindexed data between members")
        expected_offset = next_offset
    if expected_offset != central_start:
        raise ValueError("ZIP local member coverage differs from central directory")
