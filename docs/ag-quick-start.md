# AG Quick Start Guide

## 1. What This Is

This is the fastest safe path to building anything with AG + Admin Core. It ensures speed without sacrificing operator control or safety. Follow this exactly.

## 2. The 5-Minute Flow

1. **Fill out** `docs/templates/app-kickoff.md`. (Never skip this).
2. **Generate** `AG_TASK.md` based on your kickoff answers.
3. **Paste** the `AG_TASK.md` content into AG.
4. **Wait** for AG to commit changes and report "Done".
5. **Operator Deploy & QA:** You (Dave) deploy and verify manually.

## 3. Which Doc to Use When

| Intent | Use This Document |
| :--- | :--- |
| **"I have an idea"** | `docs/templates/app-kickoff.md` |
| **"I want AG to build"** | `AG_TASK.md` (derived from kickoff) |
| **"I need to message users"** | `docs/operator-playbooks/broadcast-messaging.md` |
| **"Something broke"** | `docs/admincore-capabilities.md` (Issues & Severity) |
| **"I’m unsure"** | `docs/ag-build-pipeline.md` |

## 4. Absolute Rules

* **No build without kickoff.**
* **No code without AG_TASK.**
* **No Functions unless explicit.**
* **No auth simulation.**
* **AG never deploys.**

## 5. Common Mistakes to Avoid

* Letting AG "think" or design for you.
* Mixing documentation updates with code tasks.
* Touching ExamCoach code during Admin Core testing.
* Skipping Operator QA because the logic "looks right".
