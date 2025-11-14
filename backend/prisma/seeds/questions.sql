DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '내가 이 영화 속 캐릭터였다면 어떻게 행동했을까요?') THEN
        INSERT INTO "questions"(content) VALUES ('내가 이 영화 속 캐릭터였다면 어떻게 행동했을까요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '엔딩에 대해 어떻게 생각하시나요?') THEN
        INSERT INTO "questions"(content) VALUES ('엔딩에 대해 어떻게 생각하시나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '인상깊은 장면이 있었나요?') THEN
        INSERT INTO "questions"(content) VALUES ('인상깊은 장면이 있었나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '기억에 남는 대사가 있나요?') THEN
        INSERT INTO "questions"(content) VALUES ('기억에 남는 대사가 있나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '가장 인상 깊었던 캐릭터는 누구이며, 어떤 역할인가요?') THEN
        INSERT INTO "questions"(content) VALUES ('가장 인상 깊었던 캐릭터는 누구이며, 어떤 역할인가요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '주인공에게 해주고 싶은 말이 있나요?') THEN
        INSERT INTO "questions"(content) VALUES ('주인공에게 해주고 싶은 말이 있나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '등장인물 중 한 명과 대화할 수 있다면, 누구와 어떤 대화를 나눌 건가요?') THEN
        INSERT INTO "questions"(content) VALUES ('등장인물 중 한 명과 대화할 수 있다면, 누구와 어떤 대화를 나눌 건가요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '"이 영화는 이런 사람한테 딱, 이런 사람한테는 비추"라고 한다면 각자 누구??') THEN
        INSERT INTO "questions"(content) VALUES ('"이 영화는 이런 사람한테 딱, 이런 사람한테는 비추"라고 한다면 각자 누구??');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '이 영화를 어떤 사람들에게 추천하고 싶나요?') THEN
        INSERT INTO "questions"(content) VALUES ('이 영화를 어떤 사람들에게 추천하고 싶나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '이 영화를 보려고 한 이유는 무엇인가요?') THEN
        INSERT INTO "questions"(content) VALUES ('이 영화를 보려고 한 이유는 무엇인가요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '캐릭터 / 스토리 / 영상미/ 음악 중에 뭐가 제일 내 스타일이었고, 뭐가 제일 안맞았나요?') THEN
        INSERT INTO "questions"(content) VALUES ('캐릭터 / 스토리 / 영상미/ 음악 중에 뭐가 제일 내 스타일이었고, 뭐가 제일 안맞았나요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '"이 부분만 이렇게 바뀌면 명작인데.."싶은 부분이 있었나요? 구체적으로 어디?') THEN
        INSERT INTO "questions"(content) VALUES ('"이 부분만 이렇게 바뀌면 명작인데.."싶은 부분이 있었나요? 구체적으로 어디?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '영화가 전달하고 싶었던 핵심 메시지나 감정은 무엇인가요?') THEN
        INSERT INTO "questions"(content) VALUES ('영화가 전달하고 싶었던 핵심 메시지나 감정은 무엇인가요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '이 영화만의 독특한 연출은 무엇가요?') THEN
        INSERT INTO "questions"(content) VALUES ('이 영화만의 독특한 연출은 무엇가요?');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "questions" WHERE content = '영화에 나오는 장면 중 가보고 싶은 장소가 있었나요?') THEN
        INSERT INTO "questions"(content) VALUES ('영화에 나오는 장면 중 가보고 싶은 장소가 있었나요?');
    END IF;
END$$;
