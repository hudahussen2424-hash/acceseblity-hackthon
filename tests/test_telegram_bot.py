import json

from api import main, telegram_bot


def test_language_detection_and_explicit_language_preference(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "bot.sqlite3")
    telegram_bot.initialize_storage()

    assert telegram_bot.detect_language("ሰላም") == "am"
    assert telegram_bot.detect_language("Hello") == "en"
    telegram_bot.set_chat_language(123, "am")
    assert telegram_bot.chat_language(123, "Hello") == "am"


def test_alert_subscription_is_persisted_and_can_be_removed(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "bot.sqlite3")
    telegram_bot.initialize_storage()

    assert telegram_bot.handle_text(123, "/alerts on") == "Job alerts are on."
    with main.connect() as db:
        assert db.execute(
            "SELECT chat_id FROM telegram_alert_subscribers"
        ).fetchall()[0]["chat_id"] == 123

    assert telegram_bot.handle_text(123, "/alerts off") == "Job alerts are off."
    with main.connect() as db:
        assert db.execute(
            "SELECT COUNT(*) FROM telegram_alert_subscribers"
        ).fetchone()[0] == 0


def test_person_ticket_contains_recent_chat(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "bot.sqlite3")
    telegram_bot.initialize_storage()
    telegram_bot.record_message(123, "user", "How do I organize email?")
    telegram_bot.record_message(123, "assistant", "Start with clear folders.")

    response = telegram_bot.handle_text(123, "/person")
    assert "may take until morning" in response
    with main.connect() as db:
        row = db.execute("SELECT conversation, note FROM escalations").fetchone()
    assert json.loads(row["conversation"]) == [
        {"role": "user", "text": "How do I organize email?"},
        {"role": "assistant", "text": "Start with clear folders."},
    ]
    assert "123" in row["note"]


def test_regular_message_uses_shared_answer_pipeline(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "bot.sqlite3")
    telegram_bot.initialize_storage()
    calls = []

    async def answer_question(question, language, sections):
        calls.append((question, language, sections))
        return {
            "answer": "Use a clear process.",
            "sources": [{"title": "Working well", "url": "lesson.html#work"}],
        }

    monkeypatch.setattr(telegram_bot, "answer_question", answer_question)
    monkeypatch.setattr(telegram_bot, "indexed_sections", lambda: [{"id": "test"}])

    response = telegram_bot.handle_text(123, "How should I work?")

    assert calls == [("How should I work?", "en", [{"id": "test"}])]
    assert "Source:" in response
    assert response.endswith("lesson.html#work")


def test_answers_include_absolute_source_and_not_found_offers_person(monkeypatch):
    result = {
        "answer": "Use a clear process.",
        "sources": [{"title": "Working well", "url": "savanna/lesson.html#work"}],
    }
    response = telegram_bot.format_answer(result, "en")
    assert "Source: Working well — https://github.com/" in response
    assert response.endswith("savanna/lesson.html#work")

    not_found = telegram_bot.format_answer(
        {"answer": "I could not find this in the course.", "sources": []}, "en"
    )
    assert "I couldn't find" in not_found
    assert "/person" in not_found


def test_jobs_command_reads_json_file(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "bot.sqlite3")
    telegram_bot.initialize_storage()
    jobs_file = tmp_path / "jobs.json"
    jobs_file.write_text(
        json.dumps([{
            "title": "Test listing",
            "employer": "Demo team",
            "location": "Remote",
            "remote": True,
            "description": "Practice task.",
            "url": "/savanna/pages/jobs.html#test-listing",
        }]),
        encoding="utf-8",
    )
    monkeypatch.setattr(telegram_bot, "JOBS_FILE", jobs_file)

    response = telegram_bot.handle_text(123, "/jobs")
    assert "Test listing" in response
    assert "Demo team — Remote (remote)" in response
    assert "Practice task." in response
    expected_url = "https://github.com/hudahussen2424-hash/"
    expected_url += "acceseblity-hackthon/blob/main/savanna/pages/jobs.html#test-listing"
    assert expected_url in response
