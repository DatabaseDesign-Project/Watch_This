"""Pydantic schema package for the backend.

This module intentionally left minimal; individual schema modules live here
(`posts.py`, `users.py`, `comments.py`, `medias.py`, `questions.py`, `auth.py`).
"""

__all__ = [
    "posts",
    "users",
    "comments",
    "medias",
    "questions",
    "auth",
]
