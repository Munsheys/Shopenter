#!/usr/bin/env python3
"""
Simple desktop macro recorder / player.

Record a sequence of mouse clicks + keystrokes (with the delays between
them), then replay that sequence for N loops. Intended for automating
repetitive local data-entry tasks on your own desktop.

Install dependencies:
    pip install pyautogui pynput

Usage:
    python macro_recorder.py

Controls:
    - Recording starts immediately when the script runs.
    - Press F10 to stop recording and move to playback.
    - During playback, press Shift+Esc at any time to abort immediately.
    - Moving the mouse to any corner of the screen also aborts playback
      (PyAutoGUI's built-in fail-safe).
"""

import sys
import time
import threading

import pyautogui
from pynput import mouse, keyboard

# ---------------------------------------------------------------------------
# Safety configuration
# ---------------------------------------------------------------------------

# Moving the mouse into a screen corner raises pyautogui.FailSafeException,
# which aborts playback (caught below).
pyautogui.FAILSAFE = True

# Small pause pyautogui inserts after every call it makes (separate from our
# own recorded/padding delays) so the OS has time to keep up.
pyautogui.PAUSE = 0.05

# Extra padding added between every replayed action, on top of the
# originally recorded delay, to keep playback stable on slower machines.
PADDING_DELAY = 0.2

STOP_RECORDING_KEY = keyboard.Key.f10

# Emergency stop combo checked during playback: Shift+Esc.
EMERGENCY_KEYS = {keyboard.Key.shift, keyboard.Key.esc}


class EmergencyStop(Exception):
    """Raised to unwind the playback loop immediately."""


# ---------------------------------------------------------------------------
# Recording
# ---------------------------------------------------------------------------

def record_events():
    """Listen for mouse clicks and keystrokes until F10 is pressed.

    Returns a list of event dicts, each with a "delay" (seconds since the
    previous event) so playback can reproduce the original pacing.
    """
    events = []
    last_time = time.monotonic()
    stop_flag = threading.Event()

    def elapsed():
        nonlocal last_time
        now = time.monotonic()
        delay = now - last_time
        last_time = now
        return delay

    def on_click(x, y, button, pressed):
        if pressed:
            events.append({
                "type": "click",
                "x": x,
                "y": y,
                "button": button.name,
                "delay": elapsed(),
            })

    def on_press(key):
        if key == STOP_RECORDING_KEY:
            stop_flag.set()
            return False  # stop the keyboard listener
        events.append({
            "type": "key",
            "key": _key_to_str(key),
            "delay": elapsed(),
        })

    print("Recording... perform your clicks/keystrokes now.")
    print(f"Press {STOP_RECORDING_KEY} to stop recording.")

    mouse_listener = mouse.Listener(on_click=on_click)
    keyboard_listener = keyboard.Listener(on_press=on_press)
    mouse_listener.start()
    keyboard_listener.start()

    keyboard_listener.join()  # blocks until F10 stops it
    mouse_listener.stop()

    print(f"Recording stopped. Captured {len(events)} events.")
    return events


def _key_to_str(key):
    """Normalize a pynput key into a string we can replay later."""
    if isinstance(key, keyboard.KeyCode):
        return key.char
    return key.name  # e.g. "space", "enter", "shift"


# ---------------------------------------------------------------------------
# Playback
# ---------------------------------------------------------------------------

def watch_for_emergency_stop(stop_event):
    """Background listener: sets stop_event if Shift+Esc is pressed."""
    pressed = set()

    def on_press(key):
        if key in EMERGENCY_KEYS:
            pressed.add(key)
            if EMERGENCY_KEYS.issubset(pressed):
                stop_event.set()
                return False

    def on_release(key):
        pressed.discard(key)

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()
    return listener


def play_events(events, loops):
    stop_event = threading.Event()
    stop_listener = watch_for_emergency_stop(stop_event)

    try:
        for loop_num in range(1, loops + 1):
            print(f"Playing loop {loop_num}/{loops}...")
            for event in events:
                if stop_event.is_set():
                    raise EmergencyStop("Shift+Esc pressed during playback.")

                time.sleep(event["delay"] + PADDING_DELAY)

                if event["type"] == "click":
                    pyautogui.click(x=event["x"], y=event["y"], button=event["button"])
                elif event["type"] == "key":
                    _replay_key(event["key"])
    except pyautogui.FailSafeException:
        print("\nAborted: mouse moved to a screen corner (fail-safe).")
    except EmergencyStop as exc:
        print(f"\nAborted: {exc}")
    else:
        print("Playback complete.")
    finally:
        stop_listener.stop()


def _replay_key(key_str):
    """Press a single recorded key (special key name or literal character)."""
    if key_str is None:
        return
    try:
        pyautogui.press(key_str)
    except Exception:
        # Not a name pyautogui recognizes (e.g. a raw character it still
        # accepts via typewrite) - fall back to typing it directly.
        pyautogui.typewrite(key_str)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    events = record_events()
    if not events:
        print("Nothing was recorded, exiting.")
        return

    while True:
        raw = input("How many times should the macro loop? ")
        try:
            loops = int(raw)
            if loops > 0:
                break
        except ValueError:
            pass
        print("Please enter a positive integer.")

    print("Starting playback in 3 seconds... move mouse to a corner or press "
          "Shift+Esc to abort.")
    time.sleep(3)
    play_events(events, loops)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user (Ctrl+C). Exiting.")
        sys.exit(0)
