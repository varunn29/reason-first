# Architecture & Educational Concepts

## Goal
Build a diagnostic engine that analyzes student responses to Class 3 multi-digit subtraction problems requiring regrouping (borrowing), identifying specific misconceptions rather than just grading answers as right or wrong.

## Target Subtraction Misconceptions (Class 3)
1. **Smaller-From-Larger (Bug: 0-borrowing)**
   - When subtracting units (e.g. `52 - 37`), the student computes `7 - 2 = 5` instead of regrouping from tens.
2. **Borrow Without Decrement**
   - The student adds 10 to the units column (making `12 - 7 = 5`), but forgets to subtract 1 from the tens column (`5 - 3 = 2` instead of `4 - 3 = 1`).
3. **Double Decrement**
   - The student subtracts from the tens column twice during regrouping.
4. **Regrouping Across Zero**
   - For problems such as `503 - 247`, students struggle when borrowing through a zero in the tens column.

## Phase Overview
- **Phase 0 (Current)**: Environment setup and directory scaffolding.
- **Phase 1 (Planned)**: Problem representation and rule-based misconception model.
- **Future Phases**: Synthetic generation, evaluation, and optional machine-learning diagnostic refinement.
