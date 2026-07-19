"""UUID v7 utility — time-ordered UUID for Python < 3.14."""

import uuid
import time


def uuid_v7() -> uuid.UUID:
    """Generate a UUID v7 (Unix Epoch timestamp + random).

    Falls back to uuid.uuid7() on Python 3.14+.
    """
    if hasattr(uuid, "uuid7"):
        return uuid.uuid7()

    # Manual UUID v7 construction
    # Layout: 48-bit unix_ts_ms | 4-bit version(7) | 12-bit rand_a | 2-bit variant(10) | 62-bit rand_b
    unix_ts_ms = int(time.time() * 1000)
    rand_bytes = uuid.uuid4().bytes

    # Clear version and variant bits from rand, then set them
    # bytes: [0:6] = timestamp_high(2) + timestamp_mid(2) + timestamp_low_hi(2)
    #        [6:8] = timestamp_low_lo(2) with version in top 4 bits
    #        [8:10] = sequence with variant in top 2 bits
    #        [10:16] = node (6 bytes random)

    ts_bytes = unix_ts_ms.to_bytes(6, "big")

    b = bytearray(16)
    # First 6 bytes: timestamp
    b[0:6] = ts_bytes
    # Byte 6: top 4 bits = version 7, bottom 4 = random high nibble
    b[6] = 0x70 | (rand_bytes[6] & 0x0F)
    # Byte 7: all random
    b[7] = rand_bytes[7]
    # Byte 8: top 2 bits = variant 10, bottom 6 = random
    b[8] = 0x80 | (rand_bytes[8] & 0x3F)
    # Bytes 9-15: random
    b[9:16] = rand_bytes[9:16]

    return uuid.UUID(bytes=bytes(b))
