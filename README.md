# BigQuery Release Notes Hub 🚀

A high-fidelity, interactive web application built with **Python Flask** (backend) and **Vanilla HTML, CSS, and JavaScript** (frontend). It parses the official Google Cloud BigQuery Atom feed into granular updates, displays them in a gorgeous glassmorphic dashboard, and allows sharing specific updates directly to X (formerly Twitter).

![Preview mockup or placeholder](https://img.shields.io/badge/Release--Notes-BigQuery-blue?style=for-the-badge&logo=google-cloud)
![Flask Version](https://img.shields.io/badge/Flask-3.0.3-green?style=for-the-badge&logo=flask)
![Python Version](https://img.shields.io/badge/Python-3.12-yellow?style=for-the-badge&logo=python)

---

## ✨ Features

- **Granular Parsing**: Splitting daily release notes into individual items categorized by type (`Feature`, `Announcement`, `Change`, `Issue`, `Breaking`).
- **Aesthetic Dashboard**: Dark mode design featuring vibrant type-specific glow effects, card layouts, hover micro-animations, and glassmorphic panels.
- **Search & Multi-Filter**: Real-time keyword search across dates, types, and descriptions, paired with interactive category filters and badge counts.
- **Interactive Tweet Drawer**: Select any release card to slide up a tweet editor with a live mockup, an editable text area, and an intelligent character counter that accounts for Twitter's 23-character URL policy.
- **Direct Actions**: A quick-share tweet button directly on each card, and instant links to the official Google Cloud documentation.

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Python 3.12+ installed

### 1. Clone & Navigate
```bash
git clone https://github.com/ksadarsh963/adarsh-event-talks-app.git
cd adarsh-event-talks-app
```

### 2. Set Up Virtual Environment
```bash
python -m venv .venv
```
- **Activate on Windows (Command Prompt)**:
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **Activate on macOS / Linux**:
  ```bash
  source .venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 📂 Project Structure

- `app.py`: Flask backend feed parser and API endpoint.
- `requirements.txt`: Python package requirements.
- `.gitignore`: Standard git ignore configurations.
- `templates/index.html`: Responsive, semantic single-page layout.
- `static/css/style.css`: Modern visual styles, layout systems, and animations.
- `static/js/app.js`: State management, search, filtering, and tweet draft composer.
