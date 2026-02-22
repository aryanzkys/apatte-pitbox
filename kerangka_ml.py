"""
Compatibility package shim after flattening `kerangka_ml/` into repository root.

This module behaves like a package so imports such as:
- `from kerangka_ml import InferenceEngine`
- `from kerangka_ml.adaptive.context_manager import ContextManager`
- `python -m uvicorn kerangka_ml.api_server:app`
continue to work without a physical `kerangka_ml/` directory.
"""

from __future__ import annotations

from pathlib import Path

# Make this module package-like so `kerangka_ml.<submodule>` imports are supported.
__path__ = [str(Path(__file__).resolve().parent)]

# Re-export commonly used symbols from the flattened modules.
from inference.inference_engine import InferenceEngine, create_inference_engine
from adaptive.context_manager import ContextManager, RaceContext
from adaptive.priority_cascade import apply_priority_cascade

__all__ = [
    "InferenceEngine",
    "create_inference_engine",
    "ContextManager",
    "RaceContext",
    "apply_priority_cascade",
]
