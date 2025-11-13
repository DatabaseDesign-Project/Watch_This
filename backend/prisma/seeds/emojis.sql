-- 이모지 시드 (중복 실행 안전)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Love') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Love', '😍');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Laugh') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Laugh', '🤣');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Starstruck') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Starstruck', '🤩');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Sad') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Sad', '😢');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Shock') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Shock', '😱');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Tired') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Tired', '😫');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Angry') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Angry', '😡');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Yawn') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Yawn', '🥱');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'MindBlown') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('MindBlown', '🤯');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "emojis" WHERE name = 'Skeptical') THEN
        INSERT INTO "emojis"(name, emoji_image) VALUES ('Skeptical', '🤨');
    END IF;
END$$;
