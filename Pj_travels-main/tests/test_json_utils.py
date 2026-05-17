from app.services.json_utils import extract_json_object


def test_extract_json_object_from_fenced_block() -> None:
    payload = extract_json_object(
        """```json
        {"destination": "Goa", "days": 5}
        ```"""
    )
    assert payload == {"destination": "Goa", "days": 5}


def test_extract_json_object_from_wrapped_text() -> None:
    payload = extract_json_object(
        'Result follows: {"destination": "Jaipur", "budget": 15000} End.'
    )
    assert payload["destination"] == "Jaipur"
    assert payload["budget"] == 15000
