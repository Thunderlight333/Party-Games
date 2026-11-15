"""
Calibration helper for the GPO shop macro.

Run this with Roblox open and the shop/merchant window visible:

    python calibrate.py

You'll be asked to hover your mouse over corners and press F8 to record them.
It saves:
  - the shop region (where the macro looks for items) into config.json
  - template images (item icon, Buy button, Confirm button) into templates/
"""
import json
import os
import threading
import time

import cv2
import mss
import numpy as np
from pynput import keyboard, mouse

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")

_mouse = mouse.Controller()
_pressed = threading.Event()


def _on_press(key):
    if key == keyboard.Key.f8:
        _pressed.set()


def wait_for_point(prompt):
    print(f"  -> {prompt}  (hover the mouse there, then press F8)")
    _pressed.clear()
    _pressed.wait()
    x, y = _mouse.position
    print(f"     recorded ({x}, {y})")
    time.sleep(0.2)
    return int(x), int(y)


def pick_box(label):
    print(f"\n[{label}]")
    x1, y1 = wait_for_point("TOP-LEFT corner")
    x2, y2 = wait_for_point("BOTTOM-RIGHT corner")
    left, top = min(x1, x2), min(y1, y2)
    width, height = abs(x2 - x1), abs(y2 - y1)
    if width < 5 or height < 5:
        raise SystemExit("Box too small, run calibrate.py again.")
    return {"left": left, "top": top, "width": width, "height": height}


def grab(box):
    with mss.mss() as sct:
        img = np.array(sct.grab(box))
    return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)


def save_template(box, rel_path):
    path = os.path.join(HERE, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, grab(box))
    print(f"     saved {rel_path}")


def main():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    listener = keyboard.Listener(on_press=_on_press)
    listener.start()

    print("=== GPO shop macro calibration ===")
    print("Open the shop/merchant in Roblox first. Keep Roblox windowed or borderless")
    print("and DON'T move or resize it after calibrating.\n")

    cfg["shop_region"] = pick_box("Whole shop window (the area that lists items)")

    for item in cfg["items"]:
        ans = input(f"\nCapture icon for '{item['name']}' now? It must be visible in the shop. [y/N] ")
        if ans.strip().lower() == "y":
            save_template(pick_box(f"{item['name']} icon/name - box it tightly"), item["template"])

    ans = input("\nCapture the BUY button? (click the item first if needed so it shows) [y/N] ")
    if ans.strip().lower() == "y":
        save_template(pick_box("Buy button"), cfg["buy_button_template"])

    ans = input("\nCapture the CONFIRM button? (skip if the game buys without confirming) [y/N] ")
    if ans.strip().lower() == "y":
        save_template(pick_box("Confirm button"), cfg["confirm_button_template"])

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    print("\nDone. config.json updated. Now run:  python macro.py")
    listener.stop()


if __name__ == "__main__":
    main()
