"""Independent ZIP header-only hash probe; no ZIP extraction or output archive."""
from pathlib import Path
import collections,datetime,hashlib,json,struct,zipfile

OUT=Path(__file__).parent
ARCHIVE=Path('/workspace/capiro-source-archives/source-1585438/source-1585438.zip')
EXPECTED_ORIGINAL='0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1'
EXPECTED_TRANSFORMED='5a21de580abd7e9b19401d9903f598439cda8df6e8a46d415a3bc239c64ae714'
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
before=ARCHIVE.stat()
patches={};records=[]
with zipfile.ZipFile(ARCHIVE) as z,ARCHIVE.open('rb') as source:
    infos=z.infolist();assert len(infos)==11443
    assert z.comment==b'1585438295776604f23a5cb5ab592729f7c468ca'
    central_offset=z.start_dir
    for info in infos:
        assert info.date_time==(2026,10,12,22,7,40),info.filename
        source.seek(info.header_offset)
        local=source.read(30)
        assert local[:4]==b'PK\x03\x04'
        local_time,local_date=struct.unpack_from('<HH',local,10)
        source.seek(central_offset)
        central=source.read(46)
        assert central[:4]==b'PK\x01\x02'
        central_time,central_date=struct.unpack_from('<HH',central,12)
        assert (local_time,local_date)==(central_time,central_date)
        assert local_time>>11==22
        new_time=local_time-(4<<11)
        original=struct.pack('<H',local_time);replacement=struct.pack('<H',new_time)
        assert original[0]==replacement[0] and original[1]!=replacement[1]
        name_len,extra_len,comment_len=struct.unpack_from('<HHH',central,28)
        name=source.read(name_len)
        assert name.decode('utf-8')==info.filename
        offsets=[info.header_offset+11,central_offset+13]
        for offset in offsets:
            assert offset not in patches
            patches[offset]=(original[1],replacement[1])
        records.append({'path':info.filename,'localTimestampHighByteOffset':offsets[0],
                        'centralTimestampHighByteOffset':offsets[1],
                        'originalByte':original[1],'replacementByte':replacement[1]})
        central_offset+=46+name_len+extra_len+comment_len
    source.seek(central_offset)
    assert source.read(4)==b'PK\x05\x06'
assert len(patches)==22886

ordered=iter(sorted(patches.items()));pending=next(ordered,None)
original_hash=hashlib.sha256();transformed_hash=hashlib.sha256();offset=0;changed=0
with ARCHIVE.open('rb') as source:
    while chunk:=source.read(4*1024*1024):
        original_hash.update(chunk)
        mutable=bytearray(chunk)
        while pending is not None and pending[0]<offset+len(chunk):
            position,(old,new)=pending
            assert position>=offset and mutable[position-offset]==old
            mutable[position-offset]=new;changed+=1
            pending=next(ordered,None)
        transformed_hash.update(mutable);offset+=len(chunk)
assert pending is None and changed==22886
assert offset==841126268
assert original_hash.hexdigest()==EXPECTED_ORIGINAL
assert transformed_hash.hexdigest()==EXPECTED_TRANSFORMED
after=ARCHIVE.stat()
assert (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns)
proof={'status':'PASS_EXACT_SHIPPING_HASH_REPRODUCED_BY_DOS_TIMESTAMP_BYTES_ONLY',
       'startedUTC':started,'finishedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
       'archive':str(ARCHIVE),'source':'1585438295776604f23a5cb5ab592729f7c468ca',
       'bytes':offset,'originalSHA256':original_hash.hexdigest(),'transformedSHA256':transformed_hash.hexdigest(),
       'zipEntries':len(records),'localHeaderChanges':len(records),'centralHeaderChanges':len(records),
       'changedBytes':changed,'originalDOSDateTime':'2026-10-12T22:07:40',
       'transformedDOSDateTime':'2026-10-12T18:07:40','shiftHours':-4,
       'method':'Independently enumerate ZIP central records and matching local headers; change exactly one DOS time high byte in each. SHA256 original and transformed stream concurrently in 4MiB chunks. No other byte changed.',
       'allOtherBytesHeldFixed':True,'originalArchiveStatAndHashUnchanged':True,
       'newZIPWritten':False,'extractedFiles':0,'shippingArchiveDirectlyInspected':False,
       'interpretation':'Reported shipping SHA256 is exactly reproducible from the producer ZIP by a uniform minus-four-hour DOS timestamp shift. This identifies the byte-level difference; it does not identify the shipping machine timezone name or replace direct custody verification.'}
(OUT/'PROOF.json').write_text(json.dumps(proof,indent=2)+'\n')
with (OUT/'PATCH-OFFSETS.jsonl').open('w') as f:
    for record in records:f.write(json.dumps(record,separators=(',',':'))+'\n')
print(json.dumps(proof,indent=2))
