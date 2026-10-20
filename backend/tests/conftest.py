import json
import pathlib

import pytest

VECTORS = pathlib.Path(__file__).resolve().parents[2] / "shared" / "test-vectors"


@pytest.fixture
def vectors():
    def load(name):
        return json.loads((VECTORS / name).read_text())
    return load
