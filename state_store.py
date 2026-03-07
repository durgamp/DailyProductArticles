from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Set


DEFAULT_STATE: Dict[str, Any] = {
    "processed_ids": [],
    "last_digest_run_at": "",
    "last_digest_run_date": "",
}


def load_state(path: str) -> Dict[str, Any]:
    state_file = Path(path)
    if not state_file.exists():
        return DEFAULT_STATE.copy()

    try:
        data = json.loads(state_file.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return DEFAULT_STATE.copy()
    except (json.JSONDecodeError, OSError):
        return DEFAULT_STATE.copy()

    state = DEFAULT_STATE.copy()
    state.update(data)

    processed = state.get("processed_ids", [])
    if not isinstance(processed, list):
        state["processed_ids"] = []

    if not isinstance(state.get("last_digest_run_date", ""), str):
        state["last_digest_run_date"] = ""
    if not isinstance(state.get("last_digest_run_at", ""), str):
        state["last_digest_run_at"] = ""

    return state


def save_state(path: str, state: Dict[str, Any]) -> None:
    state_file = Path(path)
    state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")


def get_processed_ids(state: Dict[str, Any]) -> Set[str]:
    return set(state.get("processed_ids", []))


def add_processed_ids(state: Dict[str, Any], ids: Set[str], max_size: int = 10000) -> None:
    merged = list(set(state.get("processed_ids", [])) | ids)
    # keep the file bounded in size
    merged = merged[-max_size:]
    state["processed_ids"] = merged
