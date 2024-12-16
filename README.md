# VS Code Usage Tracker

## Overview

The **VS Code Usage Tracker** extension helps you monitor and log your time spent in Visual Studio Code. It records session start and end times, tracks the duration of your sessions, and logs this data to a MongoDB database for further analysis.

---

## Features

- **Session Tracking**: Automatically records when you open and close VS Code.
- **File Activity Logging**: Logs the files you open during your coding sessions.
- **MongoDB Integration**: Stores session data in a MongoDB database for easy retrieval and analysis.

---

## How It Works

1. **Extension Activation**: The timer starts when you open VS Code.
2. **File Activity**: Logs details of the files you open during your session.
3. **Session Logging**: Upon closing VS Code, the session details are logged to a MongoDB collection, including:
   - Start time
   - End time
   - Session duration (in seconds)
   - Date

---

## Requirements

- A MongoDB database (local or Atlas) with the appropriate connection URI.
- The extension uses a `.env` file for storing sensitive credentials (e.g., MongoDB URI).

---

## Installation

1. Clone the repository or download the packaged `.vsix` file.
2. Install the extension in VS Code:
   - Open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
   - Click the `...` menu and select **Install from VSIX...**.
   - Select the `.vsix` file.
3. Configure your MongoDB connection in a `.env` file:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
