"""
GPO merchant tracker / auto-buyer (screen-reading only, nothing gets injected).

The merchant spawns every 30 minutes (:00 and :30) and stays for 10 minutes.
During each visit the macro:
  1. Equips the shop item from your hotbar (equip_key) and clicks the screen,
     which opens the merchant's shop list.
  2. Screenshots the list and looks for your items (OpenCV template matching).
  3. If one is there: clicks it, then Buy, then Confirm, and pings Discord.
  4. Closes the list and unequips. If nothing was found it tries again every
     `retry_every_seconds` until the merchant leaves.
Between visits it idles (with an anti-AFK nudge) and counts down.

Hotkeys (work while Roblox is focused):
  F6  start / pause
  F7  open the shop now and report match scores (no buying)
  F8  force a real check right now (buys if found), ignores the schedule
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
test_scan = threading.Event()
force_check = threading.Event()


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


# -------------------------------------------------------------- schedule ---

def merchant_status(cfg):
    """
    Returns (spawn_id, seconds_since_spawn) while the merchant is up,
    or (None, seconds_until_next_spawn) while he's gone.
    spawn_id is a unique number per visit, so purchases are counted per visit.
    """
    now = time.time() + cfg.get("clock_offset_seconds", 0)
    lt = time.localtime(now)
    into_hour = lt.tm_min * 60 + lt.tm_sec + (now % 1)
    stay = cfg["stay_minutes"] * 60
    until_next = 3600
    for m in cfg["spawn_minutes"]:
        since = (into_hour - m * 60) % 3600
        if since < stay:
            return int((now - since) // 60), since
        until_next = min(until_next, 3600 - since)
    return None, until_next


def fmt(secs):
    secs = int(secs)
    return f"{secs // 60}m {secs % 60:02d}s"


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
    # spot first, so nudge it, then click.
    x += random.randint(-2, 2)
    y += random.randint(-2, 2)
    pydirectinput.moveTo(x, y)
    pydirectinput.moveRel(1, 0)
    pydirectinput.moveRel(-1, 0)
    time.sleep(0.05)
    pydirectinput.click()
    time.sleep(cfg["click_delay"])


def anti_afk():
    # tiny camera wiggle so Roblox doesn't kick you for idling (20 min rule)
    for k in ("left", "right"):
        pydirectinput.keyDown(k)
        time.sleep(0.05)
        pydirectinput.keyUp(k)


def open_shop(cfg):
    pydirectinput.press(cfg["equip_key"])
    time.sleep(0.5)
    pos = cfg.get("open_click_position")
    if not pos:
        s = full_screen_region()
        pos = [s["left"] + s["width"] // 2, s["top"] + s["height"] // 2]
    click(pos[0], pos[1], cfg)
    time.sleep(cfg["shop_open_delay"])


def close_shop(cfg, close_tpl):
    c = find(close_tpl, full_screen_region(), cfg["match_threshold"])
    if c:
        click(c[0], c[1], cfg)
    if cfg.get("unequip_after", True):
        pydirectinput.press(cfg["equip_key"])
    time.sleep(0.3)


# ---------------------------------------------------------------- notify ---

def notify(cfg, text, image=None):
    url = cfg.get("discord_webhook_url")
    if not url:
        return
    try:
        if image is not None:
            _, buf = cv2.imencode(".png", image)
            requests.post(url, data={"content": text},
                          files={"file": ("shop.png", buf.tobytes(), "image/png")}, timeout=10)
        else:
            requests.post(url, json={"content": text}, timeout=10)
    except requests.RequestException as e:
        log(f"Discord webhook failed: {e}")


# ------------------------------------------------------------ main logic ---

def check_shop(cfg, items, tpls, purchases_left, notified):
    """Opens the list, buys what it can. Returns number of items bought."""
    region = cfg["shop_region"]
    thr = cfg["match_threshold"]
    screen = full_screen_region()
    bought = 0

    open_shop(cfg)
    for item in items:
        if purchases_left <= 0:
            break
        hit = find(item["tpl"], region, thr)
        if not hit:
            continue
        x, y, score = hit
        log(f"FOUND {item['name']} (match {score:.2f})")
        shot = grab(region)
        if cfg.get("screenshot_on_find"):
            os.makedirs(LOG_DIR, exist_ok=True)
            cv2.imwrite(os.path.join(LOG_DIR, f"{datetime.now():%Y%m%d_%H%M%S}_{item['name']}.png"), shot)

        if not item.get("buy", True) or tpls["buy"] is None:
            if item["name"] not in notified:
                notify(cfg, f"🔔 **{item['name']}** is in the merchant's stock!", shot)
                notified.add(item["name"])
            continue

        click(x, y, cfg)  # select the item
        b = find(tpls["buy"], region, thr) or find(tpls["buy"], screen, thr)
        if not b:
            log("  couldn't see the Buy button - check templates/buy_button.png")
            notify(cfg, f"⚠️ Saw **{item['name']}** but couldn't find the Buy button.", shot)
            continue
        click(b[0], b[1], cfg)

        if tpls["confirm"] is not None:
            time.sleep(0.3)
            c = find(tpls["confirm"], screen, thr)
            if c:
                click(c[0], c[1], cfg)
            else:
                log("  no Confirm popup seen (fine if the game doesn't use one)")

        bought += 1
        purchases_left -= 1
        log(f"  bought {item['name']}")
        notify(cfg, f"✅ Bought **{item['name']}** from the merchant!", grab(region))

    if bought == 0:
        log("nothing you want in stock")
    close_shop(cfg, tpls["close"])
    return bought


def report_scores(cfg, items, tpls):
    open_shop(cfg)
    for it in items:
        hit = find(it["tpl"], cfg["shop_region"], 0.0)
        log(f"  {it['name']}: match {hit[2]:.2f} (needs {cfg['match_threshold']})" if hit
            else f"  {it['name']}: template is bigger than the shop region")
    b = find(tpls["buy"], full_screen_region(), 0.0)
    if b:
        log(f"  Buy button: match {b[2]:.2f} (it may only show after selecting an item)")
    close_shop(cfg, tpls["close"])


def on_press(key):
    if key == keyboard.Key.f6:
        if running.is_set():
            running.clear()
            log("paused (F6 to resume)")
        else:
            running.set()
            log("running (F6 to pause)")
    elif key == keyboard.Key.f7:
        test_scan.set()
    elif key == keyboard.Key.f8:
        force_check.set()
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

    tpls = {
        "buy": load_template(cfg.get("buy_button_template")),
        "confirm": load_template(cfg.get("confirm_button_template")),
        "close": load_template(cfg.get("close_button_template")),
    }
    if tpls["buy"] is None:
        log("no Buy button template: TRACK-ONLY mode (notifies you, doesn't buy)")

    keyboard.Listener(on_press=on_press).start()
    log(f"tracking: {', '.join(i['name'] for i in items)}")
    log(f"merchant at minutes {cfg['spawn_minutes']} for {cfg['stay_minutes']}m each")
    log("click into Roblox, then press F6 to start. F9 quits.")

    bought_per_spawn = {}   # spawn_id -> count
    notified = set()
    next_try = 0.0
    last_wait_log = 0.0
    last_afk = time.time()
    current_spawn = None

    while not quitting.is_set():
        try:
            if test_scan.is_set():
                test_scan.clear()
                log("test scan (no buying)...")
                report_scores(cfg, items, tpls)

            if force_check.is_set():
                force_check.clear()
                log("forced check...")
                check_shop(cfg, items, tpls, cfg["max_purchases_per_spawn"], set())

            if running.is_set():
                spawn_id, secs = merchant_status(cfg)

                if spawn_id is None:
                    if time.time() - last_wait_log >= 60:
                        log(f"merchant gone, next spawn in {fmt(secs)}")
                        last_wait_log = time.time()
                else:
                    if spawn_id != current_spawn:
                        current_spawn = spawn_id
                        notified = set()
                        next_try = 0.0
                        log(f"merchant should be up now ({fmt(cfg['stay_minutes'] * 60 - secs)} left)")
                    left = cfg["max_purchases_per_spawn"] - bought_per_spawn.get(spawn_id, 0)
                    if left > 0 and secs >= cfg["wait_after_spawn_seconds"] and time.time() >= next_try:
                        got = check_shop(cfg, items, tpls, left, notified)
                        bought_per_spawn[spawn_id] = bought_per_spawn.get(spawn_id, 0) + got
                        if cfg["max_purchases_per_spawn"] - bought_per_spawn[spawn_id] <= 0:
                            log("done for this visit, waiting for the next one")
                        else:
                            next_try = time.time() + cfg["retry_every_seconds"]
                    last_wait_log = 0.0

                if cfg.get("anti_afk") and time.time() - last_afk >= 600:
                    anti_afk()
                    last_afk = time.time()
        except pydirectinput.FailSafeException:
            log("failsafe triggered (mouse in corner), pausing.")
            running.clear()

        time.sleep(0.2)
    log("bye")


if __name__ == "__main__":
    main()
