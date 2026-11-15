"""
GPO shop tracker / auto-buyer (screen-reading only, nothing gets injected).

It works the way you would by hand:
  1. Presses the interact key to open the shop (stand next to the merchant NPC).
  2. Takes a screenshot and looks for your item icons (OpenCV template matching).
  3. When it finds one: clicks the item, then Buy, then Confirm, and pings Discord.
  4. Closes the shop, waits `check_interval_seconds`, and checks again.

Hotkeys (work while Roblox is focused):
  F6  start / pause
  F7  scan once and report what it sees (no clicking)
  F9  quit
"""
import json
import os
import random
import threading
import time
from datetime import datetime

import cv2
import mss
import numpy as np
import pydirectinput
import requests
from pynput import keyboard

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "config.json")
LOG_DIR = os.path.join(HERE, "found")

pydirectinput.PAUSE = 0.05
pydirectinput.FAILSAFE = True  # slam the mouse into the top-left corner to abort

running = threading.Event()
quitting = threading.Event()
scan_once = threading.Event()


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    if not cfg.get("shop_region"):
        raise SystemExit("shop_region isn't set. Run `python calibrate.py` first.")
    return cfg


def load_template(rel_path):
    if not rel_path:
        return None
    path = os.path.join(HERE, rel_path)
    if not os.path.exists(path):
        return None
    return cv2.imread(path, cv2.IMREAD_COLOR)


# ---------------------------------------------------------------- vision ---

def grab(region):
    with mss.mss() as sct:
        img = np.array(sct.grab(region))
    return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)


def full_screen_region():
    with mss.mss() as sct:
        m = sct.monitors[1]
    return {"left": m["left"], "top": m["top"], "width": m["width"], "height": m["height"]}


def find(template, region, threshold):
    """Returns (screen_x, screen_y, score) of the best match centre, or None."""
    if template is None:
        return None
    frame = grab(region)
    th, tw = template.shape[:2]
    if frame.shape[0] < th or frame.shape[1] < tw:
        return None
    res = cv2.matchTemplate(frame, template, cv2.TM_CCOEFF_NORMED)
    _, score, _, loc = cv2.minMaxLoc(res)
    if score < threshold:
        return None
    return region["left"] + loc[0] + tw // 2, region["top"] + loc[1] + th // 2, score


# ----------------------------------------------------------------- input ---

def click(x, y, cfg):
    # Roblox often ignores a click unless the cursor actually moved onto the
    # button first, so nudge it, then click.
    x += random.randint(-2, 2)
    y += random.randint(-2, 2)
    pydirectinput.moveTo(x, y)
    pydirectinput.moveRel(1, 0)
    pydirectinput.moveRel(-1, 0)
    time.sleep(0.05)
    pydirectinput.click()
    time.sleep(cfg["click_delay"])


def press(key):
    if key:
        pydirectinput.press(key)


def anti_afk():
    # tiny camera wiggle so Roblox doesn't kick you for idling (20 min rule)
    pydirectinput.keyDown("left")
    time.sleep(0.05)
    pydirectinput.keyUp("left")
    pydirectinput.keyDown("right")
    time.sleep(0.05)
    pydirectinput.keyUp("right")


# ---------------------------------------------------------------- notify ---

def notify(cfg, text, image=None):
    url = cfg.get("discord_webhook_url")
    if not url:
        return
    try:
        if image is not None:
            ok, buf = cv2.imencode(".png", image)
            requests.post(url, data={"content": text},
                          files={"file": ("shop.png", buf.tobytes(), "image/png")}, timeout=10)
        else:
            requests.post(url, json={"content": text}, timeout=10)
    except requests.RequestException as e:
        log(f"Discord webhook failed: {e}")


# ------------------------------------------------------------ main logic ---

def check_shop(cfg, items, buy_tpl, confirm_tpl, bought, dry_run=False):
    region = cfg["shop_region"]
    thr = cfg["match_threshold"]
    screen = full_screen_region()

    press(cfg["open_shop_key"])
    time.sleep(cfg["shop_open_delay"])

    found_any = False
    for item in items:
        hit = find(item["tpl"], region, thr)
        if not hit:
            continue
        found_any = True
        x, y, score = hit
        log(f"FOUND {item['name']} (match {score:.2f}) at {x},{y}")

        shot = grab(region)
        if cfg.get("screenshot_on_find"):
            os.makedirs(LOG_DIR, exist_ok=True)
            cv2.imwrite(os.path.join(LOG_DIR, f"{datetime.now():%Y%m%d_%H%M%S}_{item['name']}.png"), shot)

        want_buy = item.get("buy", True) and bought[item["name"]] < cfg["max_purchases_per_item"]
        if dry_run or not want_buy:
            notify(cfg, f"🔔 **{item['name']}** is in the shop!", shot)
            continue

        click(x, y, cfg)  # select the item
        b = find(buy_tpl, region, thr) or find(buy_tpl, screen, thr)
        if not b:
            log("  couldn't see the Buy button - check templates/buy_button.png")
            notify(cfg, f"⚠️ Saw **{item['name']}** but couldn't find the Buy button.", shot)
            continue
        click(b[0], b[1], cfg)

        if confirm_tpl is not None:
            time.sleep(0.3)
            c = find(confirm_tpl, screen, thr)
            if c:
                click(c[0], c[1], cfg)
            else:
                log("  no Confirm popup seen (fine if the game doesn't use one)")

        bought[item["name"]] += 1
        log(f"  bought {item['name']} ({bought[item['name']]}/{cfg['max_purchases_per_item']})")
        notify(cfg, f"✅ Bought **{item['name']}**!", grab(region))

    if not found_any:
        log("nothing you want in stock")

    press(cfg["close_shop_key"])
    time.sleep(0.3)


def on_press(key):
    if key == keyboard.Key.f6:
        if running.is_set():
            running.clear()
            log("paused (F6 to resume)")
        else:
            running.set()
            log("running (F6 to pause)")
    elif key == keyboard.Key.f7:
        scan_once.set()
    elif key == keyboard.Key.f9:
        quitting.set()
        running.clear()
        return False


def main():
    cfg = load_config()
    items = []
    for it in cfg["items"]:
        tpl = load_template(it["template"])
        if tpl is None:
            log(f"skipping {it['name']}: {it['template']} not found (run calibrate.py)")
            continue
        items.append({**it, "tpl": tpl})
    if not items:
        raise SystemExit("No item templates found. Run `python calibrate.py` first.")

    buy_tpl = load_template(cfg.get("buy_button_template"))
    confirm_tpl = load_template(cfg.get("confirm_button_template"))
    if buy_tpl is None:
        log("no Buy button template: running in TRACK-ONLY mode (notifications, no buying)")

    bought = {it["name"]: 0 for it in items}
    keyboard.Listener(on_press=on_press).start()

    log(f"tracking: {', '.join(i['name'] for i in items)}")
    log("stand next to the merchant, click into Roblox, then press F6 to start. F9 quits.")

    next_check = 0.0
    while not quitting.is_set():
        if scan_once.is_set():
            scan_once.clear()
            log("test scan (no clicking)...")
            for it in items:
                hit = find(it["tpl"], cfg["shop_region"], 0.0)
                log(f"  {it['name']}: best match {hit[2]:.2f} (needs {cfg['match_threshold']})" if hit
                    else f"  {it['name']}: template bigger than shop region?")

        if running.is_set() and time.time() >= next_check:
            if all(bought[i["name"]] >= cfg["max_purchases_per_item"] for i in items if i.get("buy", True)) \
                    and any(i.get("buy", True) for i in items):
                log("bought everything you asked for, pausing.")
                running.clear()
                continue
            try:
                check_shop(cfg, items, buy_tpl, confirm_tpl, bought, dry_run=buy_tpl is None)
            except pydirectinput.FailSafeException:
                log("failsafe triggered (mouse in corner), pausing.")
                running.clear()
            next_check = time.time() + cfg["check_interval_seconds"]
            log(f"next check in {cfg['check_interval_seconds']}s")

        if running.is_set() and cfg.get("anti_afk") and int(time.time()) % 600 == 0:
            anti_afk()
            time.sleep(1)

        time.sleep(0.2)
    log("bye")


if __name__ == "__main__":
    main()
