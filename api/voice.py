"""Local-only speech engines used by the voice API."""
from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path
from functools import lru_cache

from fastapi import HTTPException

LANGUAGES = ("en", "am", "om", "ti", "so", "ar")

_GUIDES = {
    "en": [
        "Ask a question about a lesson or job. The answer uses locally stored content.",
        "Choose Listen to hear an answer when a local voice is installed.",
        "To ask a tutor, choose Talk to a person and consent before sharing your conversation.",
        "Say “check for tutor reply” to check the status of a saved ticket.",
        "Review the prepared tutor request, then say “send it” to confirm. Nothing is sent before that confirmation.",
    ],
    "am": [
        "ስለ ትምህርት ወይም ሥራ ጥያቄ ይጠይቁ። መልሱ ከበአካባቢው ከተቀመጠ ይዘት ይመጣል።",
        "የአካባቢ ድምፅ ከተጫነ መልሱን ለማዳመጥ ያዳምጡን ይምረጡ።",
        "አስተማሪ ለመጠየቅ፣ ከሰው ጋር ይነጋገሩን ይምረጡና ውይይትዎን ለማጋራት ፈቃድ ይስጡ።",
        "የተቀመጠ ጥያቄ ሁኔታን ለመፈተሽ “የአስተማሪ ምላሽን ፈትሽ” ይበሉ።",
        "የተዘጋጀውን ጥያቄ ይመልከቱ፤ ከዚያ ለማረጋገጥ “ላክ” ይበሉ። ከዚያ በፊት ምንም አይላክም።",
    ],
    "om": [
        "Waa’ee barnootaa ykn hojii gaafadhu. Deebiin qabiyyee naannoo irratti kuufame irraa argama.",
        "Sagaleen naannoo yoo jiraate deebii dhaggeeffachuuf Dhaggeeffadhu filadhu.",
        "Barsiisaa gaafachuuf Nama waliin haasa’i filadhu; marii kee qooduu dura hayyama kenni.",
        "Haala gaaffii kuufame ilaaluuf “deebii barsiisaa ilaali” jedhi.",
        "Gaaffii qophaa’e ilaali; ergamuuf “ergi” jedhi. Mirkaneessa dura homtuu hin ergamu.",
    ],
    "ti": [
        "ብዛዕባ ትምህርቲ ወይ ስራሕ ሕተት። መልሲ ካብ ኣብ ከባቢ ዝተዓቀበ ትሕዝቶ ይመጽእ።",
        "ናይ ከባቢ ድምጺ እንተሃልዩ መልሲ ንምስማዕ ስማዕ ምረጽ።",
        "መምህር ንምሕታት፡ ምስ ሰብ ተዛረብ ምረጽ፤ ውይይትኻ ቅድሚ ምክፋል ፍቓድ ሃብ።",
        "ኩነታት ዝተቐመጠ ሕቶ ንምርኣይ “መልሲ መምህር ፈትሽ” በል።",
        "እቲ ዝተዳለወ ሕቶ ርአ፤ ድሕሪኡ ንምርግጋጽ “ስደድ” በል። ቅድሚኡ ዝኾነ ኣይስደድን።",
    ],
    "so": [
        "Weydii su’aal cashar ama shaqo ku saabsan. Jawaabtu waxay ka timaaddaa xogta maxalliga ah.",
        "Dooro Dhageyso si aad jawaabta u maqasho haddii cod maxalli ahi rakiban yahay.",
        "Si aad macallin u weydiiso, dooro La hadal qof oo oggolow wadaagista wada sheekaysiga.",
        "Dheh “hubi jawaabta macallinka” si aad u eegto xaaladda codsi kaydsan.",
        "Dib u eeg codsiga la diyaariyey, dabadeed dheh “dir” si aad u xaqiijiso. Waxba lama diro ka hor xaqiijinta.",
    ],
    "ar": [
        "اسأل عن درس أو وظيفة. تأتي الإجابة من محتوى مخزّن محليًا.",
        "اختر استمع لسماع الإجابة إذا كان الصوت المحلي مثبتًا.",
        "لطلب معلّم، اختر التحدث إلى شخص ووافق قبل مشاركة المحادثة.",
        "قل «تحقق من رد المعلّم» لمعرفة حالة طلب محفوظ.",
        "راجع طلب المعلّم المُعدّ، ثم قل «أرسله» للتأكيد. لن يُرسل شيء قبل التأكيد.",
    ],
}


class LocalVoiceProvider:
    """Replaceable local provider; model and executable paths are operator-provisioned."""

    def _model_path(self, engine: str, language: str) -> Path:
        key = f"VOICE_{engine.upper()}_MODEL_{language.upper()}"
        value = os.getenv(key, "").strip()
        if not value:
            raise HTTPException(
                status_code=503,
                detail=f"Offline {engine} model for language '{language}' is not configured.",
            )
        path = Path(value)
        if not path.exists():
            raise HTTPException(
                status_code=503,
                detail=f"Offline {engine} model for language '{language}' is unavailable.",
            )
        return path

    def transcribe(self, audio: bytes, language: str) -> dict:
        model_path = self._model_path("stt", language)
        ffmpeg = shutil.which(os.getenv("FFMPEG_EXECUTABLE", "ffmpeg"))
        if not ffmpeg:
            raise HTTPException(status_code=503, detail="Local audio decoding is unavailable; install FFmpeg.")
        try:
            import vosk
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="The local Vosk speech engine is unavailable.") from exc
        decoded = subprocess.run(
            [ffmpeg, "-nostdin", "-v", "error", "-i", "pipe:0", "-t", "60", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
            input=audio,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
            check=False,
        )
        if decoded.returncode:
            raise HTTPException(status_code=400, detail="The recorded audio format could not be decoded locally.")
        try:
            recognizer = vosk.KaldiRecognizer(_vosk_model(str(model_path)), 16000)
            recognizer.SetWords(True)
            with wave.open(io.BytesIO(decoded.stdout), "rb") as wav:
                while chunk := wav.readframes(4000):
                    recognizer.AcceptWaveform(chunk)
            result = json.loads(recognizer.FinalResult())
        except (OSError, ValueError, RuntimeError) as exc:
            raise HTTPException(status_code=503, detail="The configured local speech model could not process this audio.") from exc
        words = result.get("result", [])
        confidence = sum(float(word.get("conf", 0)) for word in words) / len(words) if words else 0.0
        return {"transcript": str(result.get("text", "")).strip(), "confidence": confidence}

    def synthesize(self, text: str, language: str) -> bytes:
        model_path = self._model_path("tts", language)
        executable = shutil.which(os.getenv("PIPER_EXECUTABLE", "piper"))
        if not executable:
            raise HTTPException(status_code=503, detail="The local Piper speech engine is unavailable.")
        model_config = Path(f"{model_path}.json")
        if model_path.is_file() and not model_config.is_file():
            raise HTTPException(status_code=503, detail="The configured local speech model has no matching JSON configuration.")
        import tempfile

        with tempfile.TemporaryDirectory(prefix="db-assistant-voice-") as directory:
            output_path = Path(directory) / "speech.wav"
            try:
                result = subprocess.run(
                    [executable, "--model", str(model_path), "--output_file", str(output_path)],
                    input=text.encode("utf-8"),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                    timeout=60,
                    check=False,
                )
            except subprocess.TimeoutExpired as exc:
                raise HTTPException(status_code=503, detail="Local speech synthesis timed out.") from exc
            if result.returncode or not output_path.is_file():
                raise HTTPException(status_code=503, detail="The local speech model could not synthesize this language.")
            return output_path.read_bytes()


def local_provider() -> LocalVoiceProvider:
    if os.getenv("VOICE_PROVIDER", "local").strip().lower() != "local":
        raise HTTPException(status_code=503, detail="Only the local voice provider is permitted.")
    return LocalVoiceProvider()


@lru_cache(maxsize=8)
def _vosk_model(path: str):
    try:
        import vosk
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="The local Vosk speech engine is unavailable.") from exc
    return vosk.Model(path)


def capabilities() -> dict:
    """Report only configured local assets; never probe an online service."""
    provider = os.getenv("VOICE_PROVIDER", "local").strip().lower()
    stt_ready = provider == "local" and shutil.which(os.getenv("FFMPEG_EXECUTABLE", "ffmpeg")) is not None
    tts_ready = provider == "local" and shutil.which(os.getenv("PIPER_EXECUTABLE", "piper")) is not None
    stt_languages = []
    tts_languages = []
    if stt_ready:
        try:
            import vosk  # noqa: F401
            stt_languages = [language for language in LANGUAGES if os.getenv(f"VOICE_STT_MODEL_{language.upper()}") and Path(os.environ[f"VOICE_STT_MODEL_{language.upper()}"]).exists()]
        except ImportError:
            stt_ready = False
    if tts_ready:
        tts_languages = [language for language in LANGUAGES if os.getenv(f"VOICE_TTS_MODEL_{language.upper()}") and Path(os.environ[f"VOICE_TTS_MODEL_{language.upper()}"]).exists()]
    return {
        "mode": "local-only" if provider == "local" else "unavailable",
        "speechToText": {"available": stt_ready and bool(stt_languages), "languages": stt_languages},
        "textToSpeech": {"available": tts_ready and bool(tts_languages), "languages": tts_languages},
        "transcriptInput": True,
        "externalServices": False,
    }


_SEND_PHRASES = {
    "en": ("send it",),
    "am": ("ላክ",),
    "om": ("ergi",),
    "ti": ("ስደድ",),
    "so": ("dir",),
    "ar": ("أرسله", "أرسلها", "أرسل ذلك"),
}
_TUTOR_PHRASES = {
    "en": ("talk to a person", "talk to someone", "ask a tutor", "request a tutor", "human help"),
    "am": ("ከሰው ጋር", "አስተማሪ ጠይቅ", "አስተማሪ እፈልጋለሁ"),
    "om": ("nama waliin haasa", "barsiisaa gaafadhu"),
    "ti": ("ምስ ሰብ", "መምህር ሕተት"),
    "so": ("la hadal qof", "macallin weydiiso"),
    "ar": ("تحدث إلى شخص", "اطلب معلما", "أريد معلما"),
}
_STATUS_PHRASES = {
    "en": ("check for tutor reply", "check tutor reply", "check my tutor request"),
    "am": ("የአስተማሪ ምላሽን ፈትሽ",),
    "om": ("deebii barsiisaa ilaali",),
    "ti": ("መልሲ መምህር ፈትሽ",),
    "so": ("hubi jawaabta macallinka",),
    "ar": ("تحقق من رد المعلّم",),
}
_SCREEN_SHARE_PHRASES = {
    "en": ("share my screen", "start screen sharing"),
    "am": ("ማያዬን አጋራ",),
    "om": ("iskiriinii koo qoodi",),
    "ti": ("ስክሪነይ ኣካፍል",),
    "so": ("wadaag shaashaddayda",),
    "ar": ("شارك شاشتي",),
}
_ACCOMMODATION_PHRASES = {
    "en": ("request an accommodation", "need an accommodation", "accessibility accommodation"),
    "am": ("የሥራ ማስተካከያ እፈልጋለሁ", "ማስተካከያ ጠይቅ"),
    "om": ("haala mijeessaa gaafadhu", "mijeessa barbaada"),
    "ti": ("ምትዕርራይ ሕተት", "ምትዕርራይ የድሊ"),
    "so": ("codso waafajin", "wax ka beddel shaqo"),
    "ar": ("اطلب تيسيرا", "أحتاج إلى تيسير"),
}
_GUIDE_PHRASES = {
    "en": ("how do i use this assistant", "how to use this assistant", "help me use this platform"),
    "am": ("ይህን ረዳት እንዴት እጠቀም", "መድረኩን እንዴት እጠቀም"),
    "om": ("gargaartuu kana akkamittan fayyadama", "marsariitii kana akkamittan fayyadama"),
    "ti": ("ነዚ ሓጋዚ ብኸመይ እጥቀመሉ", "ነዚ መድረኽ ብኸመይ እጥቀመሉ"),
    "so": ("sideen u isticmaalaa kaaliyahan", "sideen madashan u isticmaalaa"),
    "ar": ("كيف أستخدم هذا المساعد", "كيف أستخدم هذه المنصة"),
}


def _strip_final_confirmation(transcript: str, language: str) -> tuple[str, bool]:
    text = transcript.strip().rstrip(".!?،؛።፤፧፨").strip()
    folded = text.casefold()
    for phrase in _SEND_PHRASES.get(language, ()):
        if folded == phrase.casefold():
            return "", True
        suffix = " " + phrase.casefold()
        if folded.endswith(suffix):
            return text[: -len(phrase)].rstrip(" ,.!?،؛።፤፧፨"), True
    return text, False


def classify_command(transcript: str, language: str) -> dict:
    """Small deterministic classifier: unmatched speech is a course/job question."""
    cleaned, confirmed = _strip_final_confirmation(transcript, language)
    folded = cleaned.casefold()
    if any(phrase.casefold() in folded for phrase in _GUIDE_PHRASES.get(language, ())):
        action = "get_guide"
        client_action = None
    elif any(phrase.casefold() in folded for phrase in _SCREEN_SHARE_PHRASES.get(language, ())):
        action = "client_action_required"
        client_action = "screen_share"
    elif any(phrase.casefold() in folded for phrase in _ACCOMMODATION_PHRASES.get(language, ())):
        action = "request_accommodation"
        client_action = None
    elif any(phrase.casefold() in folded for phrase in _STATUS_PHRASES.get(language, ())):
        action = "check_tutor_reply"
        client_action = None
    elif any(phrase.casefold() in folded for phrase in _TUTOR_PHRASES.get(language, ())):
        action = "request_tutor"
        client_action = None
    elif folded.startswith(("alert ", "alert", "job alert", "sms ")):
        action = "external_service_required"
        client_action = None
    else:
        action = "ask"
        client_action = None
    return {
        "action": action,
        "query": cleaned,
        "confirmed": confirmed,
        "clientAction": client_action,
    }


def guide(language: str) -> dict:
    if language not in _GUIDES:
        raise HTTPException(status_code=400, detail="Language must be en, am, om, ti, so, or ar.")
    steps = _GUIDES[language]
    return {
        "version": 1,
        "language": language,
        "steps": steps,
        "text": "\n".join(f"{index + 1}. {step}" for index, step in enumerate(steps)),
        "speakText": " ".join(steps),
        "textAvailable": True,
    }
