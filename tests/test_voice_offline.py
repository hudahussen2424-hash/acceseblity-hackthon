import io
import json
import sys
import types
import wave
import base64
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from api import main, qa, voice


def _run(coro):
    # Drive no-await safety branches without opening a socket-backed Windows event loop.
    try:
        coro.send(None)
    except StopIteration as result:
        return result.value
    raise AssertionError("This focused branch unexpectedly requires a running event loop")


@pytest.fixture
def isolated_voice_db(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "voice.sqlite3")
    monkeypatch.setenv("VOICE_ACTION_SECRET", "test-only-secret-value-which-is-long-enough")
    monkeypatch.setenv("OFFLINE_MODE", "true")
    main.initialize()


def test_localized_guides_and_supported_command_classification():
    for language in voice.LANGUAGES:
        result = voice.guide(language)
        assert result["language"] == language
        assert len(result["steps"]) == 5
        assert result["speakText"] == " ".join(result["steps"])
        assert result["text"].startswith("1. ")
    assert voice.classify_command("Please ask a tutor", "en")["action"] == "request_tutor"
    assert voice.classify_command("check for tutor reply", "en")["action"] == "check_tutor_reply"
    assert voice.classify_command("share my screen", "en")["clientAction"] == "screen_share"
    assert voice.classify_command("how do I use this assistant", "en")["action"] == "get_guide"
    assert voice.classify_command("What is this lesson about?", "en")["action"] == "ask"


def test_low_confidence_speech_never_dispatches():
    result = _run(main._voice_command({"transcript": "ask a tutor", "language": "en", "confidence": 0.2}))
    assert result["status"] == "clarification_required"


def test_explicit_send_creates_one_ticket_and_idempotent_retry(isolated_voice_db):
    draft_result = _run(main._voice_command({
        "transcript": "Please ask a tutor about lesson access", "language": "en",
        "shareConsent": True, "page": "/lesson", "conversation": [],
    }))
    assert draft_result["status"] == "draft"
    confirm = {"transcript": "send it", "language": "en", "shareConsent": True,
               "draftToken": draft_result["draftToken"]}
    sent = _run(main._voice_command(confirm, "voice-action-key-0001"))
    retried = _run(main._voice_command(confirm, "voice-action-key-0001"))
    assert sent["status"] == "sent"
    assert retried["ticket"]["ticketId"] == sent["ticket"]["ticketId"]
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 1
        assert db.execute("SELECT COUNT(*) FROM voice_action_idempotency").fetchone()[0] == 1


def test_voice_send_rejects_missing_consent_and_changed_draft(isolated_voice_db):
    draft = _run(main._voice_command({"transcript": "ask a tutor", "language": "en", "shareConsent": True}))
    missing_consent = _run(main._voice_command({"transcript": "send it", "language": "en", "draftToken": draft["draftToken"]}, "voice-action-key-0002"))
    assert missing_consent["status"] == "consent_required"
    changed = _run(main._voice_command({"transcript": "send it", "language": "en", "shareConsent": True,
                                                "draftToken": draft["draftToken"], "conversation": [{"role": "user", "text": "changed"}]}, "voice-action-key-0003"))
    assert changed["status"] == "draft_changed"


def test_voice_request_cannot_confirm_without_prepared_signed_draft(isolated_voice_db):
    result = _run(main._voice_command({"transcript": "ask a tutor send it", "language": "en", "shareConsent": True}, "voice-action-key-0005"))
    assert result["status"] == "clarification_required"
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 0


def test_offline_voice_submission_has_no_outbound_webhook(isolated_voice_db, monkeypatch):
    monkeypatch.setenv("WEBHOOK_URL", "https://example.invalid")
    def forbidden(*args, **kwargs):
        raise AssertionError("network egress attempted in offline mode")
    monkeypatch.setattr(main.urllib.request, "urlopen", forbidden)
    main.notify_webhook("fake-ticket")
    assert main.send_sms_job_alerts("test") == {"sent": 0, "failed": 0, "skipped": 1}


def test_offline_mode_is_the_backend_default(monkeypatch):
    monkeypatch.delenv("OFFLINE_MODE", raising=False)
    assert main.offline_mode() is True
    monkeypatch.setenv("OFFLINE_MODE", "unexpected")
    assert main.offline_mode() is True
    monkeypatch.setenv("OFFLINE_MODE", "false")
    assert main.offline_mode() is False


def test_offline_qa_forces_local_provider_even_if_cloud_is_configured(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "cloud")
    section = {"id": "s1", "title": "Lesson", "url": "/lesson", "text": "This lesson teaches local study."}
    monkeypatch.setattr(qa, "retrieve", lambda *args: [(0.9, section)])
    selected = []

    class Provider:
        async def answer(self, question, sections, language):
            return {"text": section["text"], "source_ids": ["s1"]}

    def import_provider(name, package=None):
        selected.append(name)
        assert name.endswith("providers.none")
        return Provider()

    async def direct_wait(awaitable, timeout):
        return await awaitable

    monkeypatch.setattr(qa.importlib, "import_module", import_provider)
    monkeypatch.setattr(qa.asyncio, "wait_for", direct_wait)
    result = _run(qa.answer_question("lesson", "en", [section], allow_cloud=True, offline_only=True))
    assert result["answer"] == section["text"]
    assert selected == [".providers.none"]


def test_offline_sync_keeps_unconfirmed_recording_as_draft(isolated_voice_db):
    result = _run(main.sync_voice_actions({"actions": [{
        "id": "offline-1", "expiresAt": 9999999999, "idempotencyKey": "voice-action-key-0004",
        "transcript": "please ask a tutor", "language": "en", "shareConsent": True,
    }]}))
    assert result["results"][0]["status"] == "draft"
    assert result["results"][0].get("confirmed") is not True
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 0


def test_offline_sync_executes_only_valid_explicit_confirmation(isolated_voice_db):
    draft = _run(main._voice_command({"transcript": "ask a tutor about lesson access", "language": "en", "shareConsent": True}))
    action = {"id": "offline-send-1", "expiresAt": 9999999999, "idempotencyKey": "voice-action-key-0008",
              "draftToken": draft["draftToken"], "transcript": "send it", "language": "en", "shareConsent": True}
    first = _run(main.sync_voice_actions({"actions": [action]}))["results"][0]
    second = _run(main.sync_voice_actions({"actions": [action]}))["results"][0]
    assert first["status"] == second["status"] == "sent"
    assert first["ticket"]["ticketId"] == second["ticket"]["ticketId"]
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 1


def test_expired_or_invalid_draft_cannot_be_sent(isolated_voice_db):
    with pytest.raises(HTTPException):
        main._read_voice_draft("invalid.token")


def test_voice_ticket_status_keeps_learner_token_authorization(isolated_voice_db):
    draft = _run(main._voice_command({"transcript": "ask a tutor", "language": "en", "shareConsent": True}))
    sent = _run(main._voice_command({"transcript": "send it", "language": "en", "shareConsent": True,
                                     "draftToken": draft["draftToken"]}, "voice-action-key-0006"))
    ticket = sent["ticket"]
    assert main.get_escalation(ticket["ticketId"], ticket["accessToken"])["status"] == "waiting"
    with pytest.raises(HTTPException) as error:
        main.get_escalation(ticket["ticketId"], "wrong-token")
    assert error.value.status_code == 404


def test_voice_accommodation_request_requires_job_and_explicit_consent(isolated_voice_db):
    missing_job = _run(main._voice_command({"transcript": "request an accommodation", "language": "en", "shareConsent": True}))
    assert missing_job["status"] == "clarification_required"
    assert "job" in missing_job["answerText"].lower()
    draft = _run(main._voice_command({"transcript": "request an accommodation", "language": "en", "shareConsent": True,
                                      "jobId": "job-7", "accommodation": "screen reader compatible interview"}))
    assert draft["status"] == "draft"
    assert draft["draft"]["jobId"] == "job-7"
    sent = _run(main._voice_command({"transcript": "send it", "language": "en", "shareConsent": True,
                                     "draftToken": draft["draftToken"]}, "voice-action-key-0007"))
    with main.connect() as db:
        row = db.execute("SELECT type, job_id, accommodation FROM escalations WHERE id=?", (sent["ticket"]["ticketId"],)).fetchone()
    assert tuple(row) == ("accommodation", "job-7", "screen reader compatible interview")


def test_expired_confirmation_retry_returns_existing_ticket_without_resending(isolated_voice_db):
    draft = {"conversation": [{"role": "user", "text": "ask a tutor"}], "language": "en", "page": "/",
             "consent": True, "expiresAt": 1, "type": "person", "jobId": None, "accommodation": None}
    token = main._voice_draft_token(draft)
    first = main._submit_voice_tutor_request(draft, "voice-action-key-0009")
    retry = _run(main._voice_command({"transcript": "send it", "language": "en", "shareConsent": True,
                                      "draftToken": token}, "voice-action-key-0009"))
    assert retry["status"] == "sent"
    assert retry["ticket"]["ticketId"] == first["ticketId"]
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 1


def test_local_audio_data_url_is_decoded_and_rejects_mismatch():
    encoded = "data:audio/webm;base64," + base64.b64encode(b"sample").decode("ascii")
    assert main._decode_voice_audio(encoded, "audio/webm") == b"sample"
    with pytest.raises(HTTPException):
        main._decode_voice_audio(encoded, "audio/wav")


def test_offline_sync_transcribes_local_audio_and_keeps_request_as_draft(isolated_voice_db, monkeypatch):
    class Provider:
        def transcribe(self, audio, language):
            assert audio == b"local-recording"
            assert language == "en"
            return {"transcript": "ask a tutor", "confidence": 0.9}

    async def local_thread_call(function, audio, language):
        return function(audio, language)

    monkeypatch.setattr(main, "local_provider", Provider)
    monkeypatch.setattr(main, "run_in_threadpool", local_thread_call)
    data_url = "data:audio/webm;base64," + base64.b64encode(b"local-recording").decode("ascii")
    result = _run(main.sync_voice_actions({"actions": [{
        "id": "offline-audio-1", "expiresAt": 9999999999, "idempotencyKey": "voice-action-key-0010",
        "audioDataUrl": data_url, "audioMimeType": "audio/webm", "language": "en", "shareConsent": False
    }]}))
    assert result["results"][0]["status"] == "consent_required"
    assert result["results"][0]["transcript"] == "ask a tutor"
    with main.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 0


def test_local_audio_transcription_uses_pipes_and_persists_no_audio(tmp_path, monkeypatch):
    model = tmp_path / "vosk-model"
    model.mkdir()
    monkeypatch.setenv("VOICE_STT_MODEL_EN", str(model))
    monkeypatch.setattr(voice.shutil, "which", lambda _: "ffmpeg")
    audio_wave = io.BytesIO()
    with wave.open(audio_wave, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(b"\0\0" * 100)

    class Recognizer:
        def __init__(self, *args):
            pass
        def SetWords(self, enabled):
            pass
        def AcceptWaveform(self, chunk):
            return True
        def FinalResult(self):
            return json.dumps({"text": "local speech", "result": [{"conf": 0.9}]})

    fake_vosk = types.SimpleNamespace(Model=lambda _: object(), KaldiRecognizer=Recognizer)
    monkeypatch.setitem(sys.modules, "vosk", fake_vosk)
    voice._vosk_model.cache_clear()
    seen = {}
    def fake_run(command, **kwargs):
        seen.update(kwargs)
        return SimpleNamespace(returncode=0, stdout=audio_wave.getvalue(), stderr=b"")
    monkeypatch.setattr(voice.subprocess, "run", fake_run)
    result = voice.local_provider().transcribe(b"raw-audio-bytes", "en")
    assert result["transcript"] == "local speech"
    assert seen["input"] == b"raw-audio-bytes"
    assert list(tmp_path.iterdir()) == [model]
