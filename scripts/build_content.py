#!/usr/bin/env python3
"""
scripts/build_content.py

Splits savanna/pages/concept-with-navigation.html into sections by heading anchors
and writes demo/data/content.json.
"""

import sys
import re
import json
from pathlib import Path
from html.parser import HTMLParser

TARGET_ANCHORS = [
    "what-is-shaping-the-future-of-va-work",
    "artificial-intelligence-and-the-future-of-va-work",
    "what-clients-are-likely-to-value-more-and-more",
    "what-this-means-for-aspiring-virtual-assistants",
    "so-is-the-future-of-va-promising",
]


class LessonHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sections = {}
        self.current_anchor = None
        self.in_heading = False
        self.current_heading_text = []
        self.current_body_text = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        element_id = attr_dict.get("id", "")

        # Check if this element matches one of our target anchors
        if element_id in TARGET_ANCHORS:
            self._save_current_section()
            self.current_anchor = element_id
            self.current_heading_text = []
            self.current_body_text = []
            if tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                self.in_heading = True
            return

        if self.current_anchor and tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            # If we encountered a new heading that isn't one of our target anchors,
            # it might still belong to current section or close it
            pass

    def handle_endtag(self, tag):
        if self.in_heading and tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            self.in_heading = False

    def handle_data(self, data):
        cleaned = data.strip()
        if not cleaned:
            return
        if self.in_heading:
            self.current_heading_text.append(cleaned)
        elif self.current_anchor:
            self.current_body_text.append(cleaned)

    def _save_current_section(self):
        if self.current_anchor:
            title = " ".join(self.current_heading_text).strip()
            body = " ".join(self.current_body_text).strip()
            # Normalize whitespace
            body = re.sub(r"\s+", " ", body)
            self.sections[self.current_anchor] = {
                "title": title,
                "text": body,
            }

    def close(self):
        super().close()
        self._save_current_section()


def build_content(html_path: Path, output_path: Path):
    if not html_path.exists():
        raise FileNotFoundError(f"Input HTML file not found: {html_path}")

    raw_html = html_path.read_text(encoding="utf-8")
    parser = LessonHTMLParser()
    parser.feed(raw_html)
    parser.close()

    existing_sections = {}
    if output_path.exists():
        try:
            old_data = json.loads(output_path.read_text(encoding="utf-8"))
            if isinstance(old_data, list):
                for item in old_data:
                    if isinstance(item, dict) and isinstance(item.get("id"), str):
                        existing_sections[item["id"]] = item
        except (OSError, ValueError, TypeError):
            pass

    results = []
    base_url = "savanna/pages/concept-with-navigation.html"

    for anchor in TARGET_ANCHORS:
        sec = parser.sections.get(anchor, {})
        title = sec.get("title", anchor.replace("-", " ").title())
        body_en = sec.get("text", "")
        previous = existing_sections.get(anchor, {})
        previous_text = previous.get("text", {})
        previous_titles = previous.get("titles", {})
        localized_text = {"en": body_en}
        localized_titles = {"en": title}
        if isinstance(previous_text, dict):
            localized_text.update({
                language: value for language, value in previous_text.items()
                if language != "en" and isinstance(value, str) and value.strip()
            })
        if isinstance(previous_titles, dict):
            localized_titles.update({
                language: value for language, value in previous_titles.items()
                if language != "en" and isinstance(value, str) and value.strip()
            })

        results.append({
            "id": anchor,
            "title": title,
            "url": f"{base_url}#{anchor}",
            "titles": localized_titles,
            "text": localized_text
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {output_path} with {len(results)} sections.")
    return results


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    in_file = Path(sys.argv[1]) if len(sys.argv) > 1 else base_dir / "savanna" / "pages" / "concept-with-navigation.html"
    out_file = Path(sys.argv[2]) if len(sys.argv) > 2 else base_dir / "demo" / "data" / "content.json"
    build_content(in_file, out_file)
