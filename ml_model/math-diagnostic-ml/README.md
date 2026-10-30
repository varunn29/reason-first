# Math Diagnostic ML (Class 3 Subtraction Engine)

An educational diagnostic engine designed to detect and explain common arithmetic misconceptions in Class 3 subtraction with regrouping (e.g. 52 - 37).

Instead of simply marking a student's answer as incorrect, this engine aims to diagnose the exact procedural mistake (such as *smaller-from-larger* or *borrowing without decrementing tens*).

---

## Current Status: Phase 0 (Environment & Scaffolding)
- Project directory structure established.
- Core package scaffolding created under `src/math_diagnostic/`.
- No model has been trained.
- No real student data is used (future phases will use synthetic data only).
- Standard Python library only (no third-party packages required).

---

## Project Structure
```text
math_diagnostic_ml/
├── README.md               # Project documentation and quickstart
├── .gitignore              # Files to ignore in git version control
├── pyproject.toml          # Project configuration
├── src/                    # Source code directory
│   └── math_diagnostic/   # Core diagnostic package
│       ├── __init__.py     # Package initialization and version
│       └── engine.py       # Diagnostic engine health check
├── data/
│   └── synthetic/          # Synthetic subtraction dataset folder
│       └── README.md       # Synthetic data policy
├── docs/                   # Documentation and architectural concepts
│   └── architecture.md     # Error taxonomy and design overview
├── scripts/                # Future pipeline scripts (placeholders)
│   ├── train.py            # Placeholder training script
│   └── evaluate.py         # Placeholder evaluation script
└── tests/                  # Verification tests
    ├── __init__.py         # Test package initialization
    └── test_environment.py # Smoke test for Python and package import
```

---

## How to Run the Basic Check

Open Windows PowerShell or Command Prompt in this folder (`math_diagnostic_ml`) and run:

```powershell
python tests/test_environment.py
```

Or using Python's built-in test runner:
```powershell
python -m unittest discover tests
```

Expected output:
```text
..
----------------------------------------------------------------------
Ran 2 tests in 0.001s

OK
```
