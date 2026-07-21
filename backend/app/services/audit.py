from __future__ import annotations

import re
from typing import Any

# Sensitive word list (MVP level).
# In production, replace with Alibaba Cloud Content Moderation API.
SENSITIVE_WORDS: list[str] = [
    # Chinese sensitive terms — placeholder examples
    # Replace these with your actual sensitive word list.
    "赌博",
    "毒品",
    "色情",
    "暴力",
    "恐怖袭击",
    "枪支弹药",
    "儿童色情",
    "诈骗",
    "非法集资",
    "传销",
    "政治敏感",
    "反动",
]


def audit_text(text: str) -> dict[str, Any]:
    """Check text content against sensitive word list.

    Returns:
        {"passed": True, "reason": None} if clean.
        {"passed": False, "reason": str} if a sensitive word is found.
    """
    for word in SENSITIVE_WORDS:
        if word in text:
            return {
                "passed": False,
                "reason": f"包含违规内容: {word}",
            }
    return {"passed": True, "reason": None}


def audit_image(image_url: str) -> dict[str, Any]:
    """Stub: image audit (MVP returns pass).

    In production, call Alibaba Cloud Content Moderation.
    """
    return {"passed": True, "reason": None}
