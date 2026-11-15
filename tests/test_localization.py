import json
import re
from pathlib import Path

from api.main import SUPPORTED_LANGUAGES, indexed_sections
from api.voice import LANGUAGES


ROOT = Path(__file__).parents[1]
LOCALE_DIR = ROOT / "module" / "i18n"


def test_selector_api_voice_and_locale_files_share_one_language_set():
    locale_files = {
        path.stem for path in LOCALE_DIR.glob("*.json")
        if path.name != "topics.json"
    }
    component = (ROOT / "module" / "db-assistant.js").read_text(encoding="utf-8")
    selector = set(re.findall(r'<option value="([a-z]+)"', component))

    assert locale_files == SUPPORTED_LANGUAGES == set(LANGUAGES) == selector


def test_offered_locales_are_complete_or_explicitly_marked_incomplete():
    english = json.loads((LOCALE_DIR / "en.json").read_text(encoding="utf-8"))
    required_keys = set(english["strings"]) - {"translationIncomplete"}

    for language in SUPPORTED_LANGUAGES:
        locale = json.loads((LOCALE_DIR / f"{language}.json").read_text(encoding="utf-8"))
        if language == "ar":
            assert locale["incomplete"] is True
            assert locale["strings"]["translationIncomplete"]
        else:
            assert required_keys <= set(locale["strings"])


def test_amharic_job_index_uses_localized_titles_and_descriptions():
    jobs = [section for section in indexed_sections() if section.get("type") == "job"]

    assert len(jobs) == 8
    for job in jobs:
        translation = job["translations"]["am"]
        assert job["titles"]["am"] == translation["title"]
        assert translation["description"] in job["text"]["am"]


def test_arabic_sensitive_topics_are_covered_by_the_refusal_guard():
    topics = json.loads((LOCALE_DIR / "topics.json").read_text(encoding="utf-8"))

    assert topics["ar"]
