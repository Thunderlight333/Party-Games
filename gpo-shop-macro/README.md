# GPO Merchant Macro (tracker + auto-buyer)

The merchant spawns every 30 minutes (**:00 and :30**, so 1:00, 1:30, 2:00...) and stays
**10 minutes**. While he's up, this macro equips your shop item, clicks the screen to open
his list, and buys your item (Mythical Chest by default) if it's in stock. Between visits it
waits and counts down.

It only **looks at your screen and sends normal key presses and clicks**. Nothing gets
injected into Roblox and no game memory is read.

> ⚠️ Macros can still break Roblox's or GPO's rules. Use at your own risk, ideally on an alt.

## Setup (Windows)

1. Install Python 3.10+ from python.org (tick **"Add Python to PATH"**).
2. In this folder, run:
   ```
   pip install -r requirements.txt
   ```
3. Run Roblox **windowed or borderless**, with Windows display scaling at **100%** if you can.

## Calibrate (one time, while the merchant is up)

Run `python calibrate.py` and follow the prompts:
- type the hotbar key for the shop item (e.g. `1`)
- say whether clicking the center of the screen opens the list
- open the list, then hover the mouse and press **F8** to mark:
  - the whole shop list
  - the item you want (it has to be in stock for this step; box it tightly)
  - the **Buy** button, the **Confirm** button (if there is one), and the **Close/X** button (if unequipping doesn't close it)

You can also drop your own cropped screenshots into `templates/` with the same file names.

## Run

```
python macro.py
```
Click into Roblox and press **F6**. Leave it running; it only acts during merchant visits.

| Key | Action |
|-----|--------|
| F6  | Start / pause |
| F7  | Open the list now and print match scores, without buying (good for testing) |
| F8  | Run a real check right now and ignore the schedule |
| F9  | Quit |

Move the mouse into the top-left corner of the screen to stop it in an emergency.

## Config (`config.json`)

| Setting | What it does |
|---|---|
| `items` | Items to watch. Add more like `{"name": "Legendary Chest", "template": "templates/legendary.png", "buy": true}`. Set `"buy": false` to only get notified. |
| `equip_key` | Hotbar key that equips the shop item. |
| `open_click_position` | `null` clicks the screen center, or set `[x, y]`. |
| `unequip_after` | Press `equip_key` again after checking, to put the item away. |
| `spawn_minutes` / `stay_minutes` | Merchant schedule: `[0, 30]` and `10`. |
| `wait_after_spawn_seconds` | How long to wait after :00/:30 before the first check (default 15s, so the stock has time to load). |
| `retry_every_seconds` | If nothing was found (or the list didn't open), check again this often until he leaves. |
| `clock_offset_seconds` | If your PC clock is off from the game, e.g. `-20` checks 20 seconds earlier. |
| `max_purchases_per_spawn` | How many items to buy per visit. |
| `match_threshold` | How close a match has to be (0–1). Lower it (e.g. 0.75) if it misses items; raise it if it clicks the wrong thing. Use F7 to see the real scores. |
| `discord_webhook_url` | Paste a Discord webhook to get a ping and a screenshot when your item shows up or gets bought. |
| `anti_afk` | Small camera nudge every 10 min so you don't get the idle kick. |

If the Buy button template is missing, it runs in **track-only** mode and just notifies you.
Screenshots of every find are saved in `found/`.
