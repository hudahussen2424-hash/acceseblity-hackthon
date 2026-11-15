import json

from scripts.build_content import TARGET_ANCHORS, build_content


def test_rebuilding_course_content_preserves_existing_non_english_fields(tmp_path):
    source = tmp_path / "lesson.html"
    output = tmp_path / "content.json"
    source.write_text(
        "".join(
            f'<h2 id="{anchor}">Updated {anchor}</h2><p>Updated lesson text.</p>'
            for anchor in TARGET_ANCHORS
        ),
        encoding="utf-8",
    )
    existing = [
        {
            "id": anchor,
            "titles": {"am": f"Amharic title {index}", "ti": f"Tigrinya title {index}"},
            "text": {"am": f"የአማርኛ ጽሑፍ {index}", "ti": f"ትግርኛ ጽሑፍ {index}"},
        }
        for index, anchor in enumerate(TARGET_ANCHORS)
    ]
    output.write_text(json.dumps(existing, ensure_ascii=False), encoding="utf-8")

    rebuilt = build_content(source, output)

    assert rebuilt[0]["text"]["en"] == "Updated lesson text."
    assert rebuilt[0]["text"]["am"] == existing[0]["text"]["am"]
    assert rebuilt[0]["text"]["ti"] == existing[0]["text"]["ti"]
    assert rebuilt[0]["titles"]["am"] == existing[0]["titles"]["am"]
