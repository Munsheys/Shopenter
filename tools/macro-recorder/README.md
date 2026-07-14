# Macro Recorder

A small standalone Python script for recording and replaying mouse clicks and
keystrokes on your own desktop — useful for repetitive, high-volume data
entry. This tool is independent of the Shopenter app itself.

## Install

```bash
pip install pyautogui pynput
```

## Run

```bash
python macro_recorder.py
```

1. The script starts recording immediately. Perform the clicks/keystrokes you
   want to automate.
2. Press `F10` to stop recording.
3. Enter the number of loops to run when prompted.
4. Playback starts after a 3-second countdown.

## Safety controls

- **Fail-safe**: moving the mouse to any corner of the screen aborts
  playback immediately (built into PyAutoGUI).
- **Emergency stop**: press `Shift+Esc` at any time during playback to stop
  the loop.
- **Padding delay**: an extra 0.2s (`PADDING_DELAY` in the script) is added
  between every replayed action for stability; adjust as needed.
