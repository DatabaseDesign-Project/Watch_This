#!/usr/bin/env python3
"""
Seed script for emojis table.

Usage:
  # from project root (where backend/ is present)
  python backend/scripts/seed_emojis.py

Run inside the dev container if the DB is only available there:
  docker compose --profile dev exec api-dev /bin/sh -c "python backend/scripts/seed_emojis.py"

This script upserts a small set of emoji records used by the frontend.
"""
import asyncio
from app.db import db

EMOJIS = [
    {"name": "Love", "emoji_image": "😍"},
    {"name": "Laugh", "emoji_image": "🤣"},
    {"name": "Starstruck", "emoji_image": "🤩"},
    {"name": "Sad", "emoji_image": "😢"},
    {"name": "Shock", "emoji_image": "😱"},
    {"name": "Tired", "emoji_image": "😫"},
    {"name": "Angry", "emoji_image": "😡"},
    {"name": "Yawn", "emoji_image": "🥱"},
    {"name": "MindBlown", "emoji_image": "🤯"},
    {"name": "Skeptical", "emoji_image": "🤨"},
]


async def main():
    await db.connect()
    created = 0
    skipped = 0
    for e in EMOJIS:
        # Try to find by unique name first
        existing = await db.emojis.find_first(where={"name": e["name"]})
        if existing:
            skipped += 1
            print(f"skip existing: {e['name']}")
            continue

        await db.emojis.create(
            data={
                "name": e["name"],
                # store the emoji glyph in emoji_image for now; can be URL later
                "emoji_image": e["emoji_image"],
            }
        )
        created += 1
        print(f"created: {e['name']}")

    await db.disconnect()
    print(f"done. created={created} skipped={skipped}")


if __name__ == "__main__":
    asyncio.run(main())
