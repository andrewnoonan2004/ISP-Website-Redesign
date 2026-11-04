# ISP website redesign

Local static prototype for the University of Pittsburgh Intelligent Systems Program. The implementation lives in `redesign/`; the supplied website snapshot remains in `www.isp.pitt.edu/`.[Website Here](https://andrewnoonan2004.github.io/ISP-Website-Redesign/index.html), Figma [here](https://www.figma.com/design/d5L8WzQhJIxe9maP7lPc2H/Untitled?node-id=0-1&t=mp9robhabRIZVE8I-1).

## Run locally

Requires Python 3. There is no npm install step, framework server, or third-party Python dependency.

From a terminal:

```bash
cd "ISP Website Redesign"
python3 redesign/scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory redesign
```

Open:

- Home: http://127.0.0.1:8000/index.html
- People directory: http://127.0.0.1:8000/people.html

Keep the terminal running while viewing the site. Press Ctrl+C to stop the server. If port 8000 is already serving this redesign, use that existing server. Google Fonts require network access; the site otherwise serves its local assets.

To preview the build output instead, stop the preview server and run:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory redesign/dist
```

## Edit and rebuild

| File or folder | Purpose |
| --- | --- |
| `redesign/src/layout.html` | Shared page layout, header, and footer |
| `redesign/src/pages/*.html` | Page content fragments |
| `redesign/src/people.json` | Editable directory records and source links |
| `redesign/assets/styles.css` | Shared layout and styling |
| `redesign/assets/tokens.css` | Brand design tokens |
| `redesign/assets/people.css`, `people.js` | Directory styling and filtering |
| `redesign/scripts/render_people.py` | Generates directory cards |
| `redesign/scripts/build.py` | Generates all preview pages, runs checks, and copies output into dist |

Edit source files rather than generated HTML or `dist/`. Then run from the project root:

```bash
python3 redesign/scripts/check.py
python3 redesign/scripts/build.py
```
