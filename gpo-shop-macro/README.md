# GPO Shop Macro (tracker + auto-buyer)

Watches a shop/merchant in Grand Piece Online and buys an item (Mythical Chest by default)
when it shows up in stock. It only **looks at your screen and sends normal key presses and
clicks**. Nothing gets injected into Roblox and no game memory is read.

> ⚠️ Macros can still break Roblox's or GPO's rules. Use at your own risk, ideally on an alt.

## Setup (Windows)

1. Install Python 3.10+ from python.org (tick **"Add Python to PATH"**).
2. In this folder, run:
   ```
   pip install -r requirements.txt
   ```
3. Run Roblox **windowed or borderless**, with Windows display scaling at **100%** if you can.

## Calibrate (one time)

1. In GPO, walk up to the merchant and open the shop so the item list is showing.
2. Run `python calibrate.py` and follow the prompts. Hover the mouse and press **F8** to mark:
   - the whole shop window (where items are listed)
   - the item icon/name you want (it has to be in stock for this step; box it tightly)
   - the **Buy** button, and the **Confirm** button if there is one

   You can also drop your own cropped screenshots into `templates/` with the same file names.

## Run

```
python macro.py
```
Stand next to the merchant, click into Roblox, then:

| Key | Action |
|-----|--------|
| F6  | Start / pause |
| F7  | Test scan: prints how closely each item matches, with no clicking |
| F9  | Quit |

Move the mouse into the top-left corner of the screen to stop it in an emergency.

## Config (`config.json`)

| Setting | What it does |
|---|---|
| `items` | List of items to watch. Add more like `{"name": "Rare Chest", "template": "templates/rare.png", "buy": true}`. Set `"buy": false` to only get notified. |
| `match_threshold` | How close a match has to be (0–1). Lower it (e.g. 0.75) if the macro misses items; raise it if it clicks the wrong thing. Press F7 to see the actual scores. |
| `open_shop_key` / `close_shop_key` | Key that opens/closes the shop (default `e`). Use `""` if you open it some other way. |
| `check_interval_seconds` | How often to re-check stock. |
| `max_purchases_per_item` | Stop buying after this many of each item. |
| `discord_webhook_url` | Paste a Discord webhook to get a ping and a screenshot when the item shows up or gets bought. |
| `anti_afk` | Small camera nudge every 10 min so you don't get the idle kick. |

If the Buy button template is missing, the macro runs in **track-only** mode and just notifies you.
Screenshots of every find are saved in `found/`.
