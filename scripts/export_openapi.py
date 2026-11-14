#!/usr/bin/env python3
"""
scripts/export_openapi.py

Exports the FastAPI OpenAPI schema to openapi.yaml in the repository root.
"""

import json
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from ruamel.yaml import YAML
    HAS_RUAMEL = True
except ImportError:
    HAS_RUAMEL = False

try:
    import yaml
    HAS_PYYAML = True
except ImportError:
    HAS_PYYAML = False


def dump_yaml_fallback(data, indent=0):
    """Simple pure-Python YAML dumper fallback for basic JSON-serializable dicts/lists."""
    lines = []
    prefix = "  " * indent
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                lines.append(f"{prefix}{k}:")
                lines.append(dump_yaml_fallback(v, indent + 1))
            elif isinstance(v, str):
                if "\n" in v:
                    lines.append(f"{prefix}{k}: |")
                    for line in v.splitlines():
                        lines.append(f"{prefix}  {line}")
                elif any(c in v for c in ":#{}[]&*!|>%'\""):
                    escaped = v.replace('"', '\\"')
                    lines.append(f'{prefix}{k}: "{escaped}"')
                else:
                    lines.append(f"{prefix}{k}: {v}")
            elif isinstance(v, bool):
                lines.append(f"{prefix}{k}: {'true' if v else 'false'}")
            elif v is None:
                lines.append(f"{prefix}{k}: null")
            else:
                lines.append(f"{prefix}{k}: {v}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                sub = dump_yaml_fallback(item, indent + 1).lstrip()
                lines.append(f"{prefix}- {sub}")
            elif isinstance(item, str):
                if any(c in item for c in ":#{}[]&*!|>%'\""):
                    escaped = item.replace('"', '\\"')
                    lines.append(f'{prefix}- "{escaped}"')
                else:
                    lines.append(f"{prefix}- {item}")
            elif isinstance(item, bool):
                lines.append(f"{prefix}- {'true' if item else 'false'}")
            elif item is None:
                lines.append(f"{prefix}- null")
            else:
                lines.append(f"{prefix}- {item}")
    return "\n".join(lines)


def export_openapi():
    from api.main import app

    schema = app.openapi()
    output_path = PROJECT_ROOT / "openapi.yaml"

    if HAS_RUAMEL:
        yaml_parser = YAML()
        yaml_parser.default_flow_style = False
        with open(output_path, "w", encoding="utf-8") as f:
            yaml_parser.dump(schema, f)
    elif HAS_PYYAML:
        with open(output_path, "w", encoding="utf-8") as f:
            yaml.dump(schema, f, sort_keys=False, allow_unicode=True)
    else:
        text = dump_yaml_fallback(schema)
        output_path.write_text(text, encoding="utf-8")

    print(f"Successfully exported OpenAPI schema to {output_path}")


if __name__ == "__main__":
    export_openapi()
