# Contributing to Sales Data Analysis

Thank you for your interest in contributing to the **Sales Data Analysis** project! We welcome contributions from developers, data scientists, analysts, and designers.

This guide outlines the process for contributing to this repository, setting up your development environment, running tests, and submitting changes.

---

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Local Setup](#local-setup)
3. [Development Workflow](#development-workflow)
   - [Running the Python Pipeline](#running-the-python-pipeline)
   - [Running the Node.js Server](#running-the-nodejs-server)
   - [Running Tests](#running-tests)
4. [Coding Standards](#coding-standards)
   - [Python](#python)
   - [JavaScript & Frontend](#javascript--frontend)
5. [Submitting a Pull Request](#submitting-a-pull-request)
6. [Reporting Bugs & Feature Requests](#reporting-bugs--feature-requests)
7. [Contributors](#contributors)

---

## Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful and constructive in all discussions, pull request reviews, and issue comments.

---

## Getting Started

### Prerequisites
- **Python**: Version 3.10+ (tested through 3.13)
- **Node.js**: Version 18+ (tested through 20+)
- **Git**: Installed and configured on your machine

### Local Setup
1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/maheshkumbhar2005/Sales-Data-Analysis.git
   cd Sales-Data-Analysis
   ```

2. **Create and activate a Python virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - On macOS/Linux:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

---

## Development Workflow

### Running the Python Pipeline
To run data validation, RFM customer segmentation, cohort retention, and report generations:
```bash
python main.py
```
Generated artifacts will be placed in the `output/` directory (including SQLite database `sales.db`, JSON summaries, and Plotly interactive HTML files).

### Running the Node.js Server
Start the local development server:
```bash
node server.js
# or
npm run dev
```
Open [http://localhost:5000](http://localhost:5000) (or [http://localhost:3000](http://localhost:3000)) in your browser.

### Running Tests
All Python pipeline modules have automated pytest coverage:
```bash
python -m pytest
```
Ensure all tests pass before submitting code.

---

## Coding Standards

### Python
- Follow [PEP 8](https://peps.python.org/pep-0008/) style conventions.
- Maintain type hints where applicable (`from __future__ import annotations`).
- Ensure all SQLite connections are cleanly closed in `try...finally` blocks to prevent resource leaks.
- Avoid duplicate quantile edge issues when using pandas `qcut` by breaking ties with `.rank(method="first")`.
- Include unit tests for every newly added analysis function or transformation under `tests/`.

### JavaScript & Frontend
- Maintain vanilla CSS design principles with accessible contrast, smooth transitions, and glassmorphic cards.
- Keep helper utilities modular and self-documenting.
- Validate all incoming API payloads (such as `POST /api/sales` and `POST /api/upload`) on both client and server before processing.

---

## Submitting a Pull Request

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Keep commits focused and atomic.
   - Write clear, descriptive commit messages.

3. **Verify tests and pipeline**:
   ```bash
   python -m pytest
   python main.py
   ```

4. **Push to GitHub**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**:
   - Provide a concise summary of the problem and the changes made.
   - Reference any relevant open issues.
   - Include screenshots or output samples for visual/frontend changes.

---

## Reporting Bugs & Feature Requests
- Check the [Issues](https://github.com/maheshkumbhar2005/Sales-Data-Analysis/issues) tab first to see if the issue or request is already being tracked.
- When opening a new issue:
  - Include clear steps to reproduce the bug.
  - Specify your environment (OS, Python version, Node.js version).
  - Include log output or error stack traces where available.

---

## Contributors
A huge thank you to all contributors who have helped improve the Sales Data Analysis project!

- **Mahesh Kumbhar** ([@maheshkumbhar2005](https://github.com/maheshkumbhar2005)) - Project Author & Maintainer
- Open source contributors helping expand the platform's predictive analytics, visualizations, and architecture.
