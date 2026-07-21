from __future__ import annotations

from PIL import Image
import io
from typing import Optional


def compute_blurhash(image_data: bytes) -> Optional[str]:
    """Compute blurhash from raw image bytes.

    Returns None if the computation fails (e.g., invalid image data).
    """
    try:
        import blurhash as bh
        img = Image.open(io.BytesIO(image_data))
        img = img.convert("RGB")
        # Resize to reasonable size for computation
        img.thumbnail((100, 100))
        return bh.encode(img, x_components=4, y_components=3)
    except Exception:
        return None
