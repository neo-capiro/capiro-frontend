#!/usr/bin/env python3
"""Fixed transport-part schema; original context package rules stay canonical."""
from __future__ import annotations

import os
from pathlib import Path

from context_common import (
    PreservationError, assert_no_symlink_ancestors, check_size,
    checked_relative, load_json, package_file, validate_digest,
)

FORMAT = "portfolio-context-delivery-parts-v1"
PART_SIZE = 8 * 1024 * 1024


def directory(value):
    raw = Path(value)
    if ".." in raw.parts:
        raise PreservationError("Traversal is not allowed in a directory argument")
    path = Path(os.path.abspath(raw))
    assert_no_symlink_ancestors(path)
    if not path.is_dir():
        raise PreservationError("Missing/non-directory input: " + str(path))
    return path


def new_target(value, handover):
    raw = Path(value)
    if ".." in raw.parts:
        raise PreservationError("Traversal is not allowed in the target")
    path = Path(os.path.abspath(raw))
    assert_no_symlink_ancestors(path)
    if path.exists():
        raise PreservationError("Target must be a NEW directory: " + str(path))
    directory(path.parent)
    if path == handover or handover in path.parents:
        raise PreservationError("Target must be outside the published handover")
    return path


def validate_delivery(data):
    if not isinstance(data, dict) or set(data) != {"format", "partSize", "packs"}:
        raise PreservationError("Invalid delivery document")
    if data["format"] != FORMAT or data["partSize"] != PART_SIZE:
        raise PreservationError("Unsupported delivery format or part size")
    if not isinstance(data["packs"], list):
        raise PreservationError("Delivery packs must be a list")
    seen = set()
    for pack in data["packs"]:
        if not isinstance(pack, dict) or set(pack) != {"path", "size", "sha256", "parts"}:
            raise PreservationError("Invalid original pack record")
        path = checked_relative(pack["path"])
        if len(path.parts) != 2 or path.parts[0] != "packs" or not path.name.endswith(".tar.gz"):
            raise PreservationError("Original must be a direct packs/*.tar.gz file")
        if pack["path"] in seen:
            raise PreservationError("Duplicate original pack")
        seen.add(pack["path"])
        validate_digest(pack["sha256"])
        check_size(pack["size"])
        if pack["size"] <= PART_SIZE or not isinstance(pack["parts"], list):
            raise PreservationError("Only oversized originals may be split")
        count = (pack["size"] + PART_SIZE - 1) // PART_SIZE
        if len(pack["parts"]) != count:
            raise PreservationError("Wrong part count")
        for index, part in enumerate(pack["parts"], 1):
            if not isinstance(part, dict) or set(part) != {"path", "size", "sha256"}:
                raise PreservationError("Invalid transport part record")
            relative = checked_relative(part["path"])
            if relative.as_posix() != f"{path.name}.part-{index:05d}":
                raise PreservationError("Noncanonical part path or order")
            validate_digest(part["sha256"])
            check_size(part["size"])
            expected = min(PART_SIZE, pack["size"] - (index - 1) * PART_SIZE)
            if part["size"] != expected:
                raise PreservationError("Wrong part size")
    return data


def read_delivery(handover):
    path = package_file(handover, "context-delivery.json")
    return validate_delivery(load_json(path.read_bytes()))
