-- 질문 예시(중복 실행에도 안전하도록 내용 기준으로 체크)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '가장 인상 깊었던 장면은?') THEN
        INSERT INTO "questions"(content) VALUES ('가장 인상 깊었던 장면은?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '이 작품의 몰입도를 1~5로 평가한다면?') THEN
        INSERT INTO "questions"(content) VALUES ('이 작품의 몰입도를 1~5로 평가한다면?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '배우 연기가 어땠나요?') THEN
        INSERT INTO "questions"(content) VALUES ('배우 연기가 어땠나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = 'OST/음향이 기억에 남나요?') THEN
        INSERT INTO "questions"(content) VALUES ('OST/음향이 기억에 남나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '한 줄 평을 남긴다면?') THEN
        INSERT INTO "questions"(content) VALUES ('한 줄 평을 남긴다면?');
    END IF;
END$$;
