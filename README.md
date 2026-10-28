# ScriptShelf

ScriptShelf is a lightweight portal for organizing links to Python scripts. Create tiles with a name, icon, optional description, a URL or script path, and a custom tile background color. A five-slot Quick Access row sits above the library for frequently used tiles. Add tiles directly to the row, or move them there from a pane; each tile can be edited and moved between Quick Access and the panes. Organize other tiles into one to six resizable panes; edit pane names and background colors in their headers, add or remove panes, and choose a destination when creating or editing a tile. Use a tile's color button to copy its background color from another tile. Removing a pane requires confirmation and moves its items to the next pane, or the previous pane if it was the last one. Use the search box to find a tile, and use the Colors menu to customize the portal background.

Use **Edit banner** in the Python Workspace area to change its small label, heading, width, height, and heading size. The compact banner contains no image or artwork. Banner settings are saved in this browser and included in session backups.

Choose a curated **Global color scheme** from the Colors menu to recolor the portal background, all panes, and existing tiles together. The Sage garden, Coastal blue, Warm earth, and Soft lavender palettes can be applied again at any time; afterward, colors remain individually editable. The last applied scheme is saved in this browser and in session backups. Tiles are kept to a compact, consistent height.

## Run locally

Open `frontend/index.html` in a browser, or serve the frontend with Python:

```powershell
cd frontend
python -m http.server 8000
```

Then visit http://localhost:8000/.

Tiles (including Quick Access assignments), pane layout, banner settings, global color scheme, and colors are stored in the current browser's local storage. They are not shared between users or browsers. Use **Sessions → Save session** to download a JSON backup of the tiles, pane sizes, pane names, colors, global color scheme, and banner customization. **Load session** imports a backup and merges its tiles by ID, preserving unrelated tiles already in your library. This lets you move links and layout between browser addresses or browsers. Drag an item to reorder it or move it to another pane or Quick Access; keyboard users can move items with the Move up/Move down controls or change the destination in the item editor. Drag the dividers between panes to resize them; keyboard users can focus a divider and press the arrow keys.

HTTP/HTTPS URLs and relative links open in the browser. Local Windows drive paths open in VS Code using its URL handler (VS Code must be installed); the portal cannot open local files directly from a browser-served page. This portal links to Python scripts; it does not run them. To execute a script, open it in a Python environment.
