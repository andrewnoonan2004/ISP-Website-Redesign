"""Generate the static prototype from shared layout and page fragments."""
from pathlib import Path
import shutil
import subprocess
import sys
import html
import hashlib
from render_people import render
import snapshot_content
ROOT = Path(__file__).resolve().parents[1]
PAGES = {
 'index': ('Home', ''),
 'about': ('About ISP', 'A multidisciplinary graduate community in the School of Computing and Information.'),
 'academics': ('Academics', 'Master of Science and Doctor of Philosophy in Intelligent Systems.'),
 'admissions': ('Admissions', 'Explore graduate study and connect with SCI admissions.'),
 'people': ('People', 'Connect with ISP faculty, graduate students, staff, and alumni.'),
 'research': ('Research', 'Explore the applied AI research areas represented in the ISP community.'),
 'events': ('Events', 'Research talks, forums, and opportunities to connect.'),
 'news': ('News', 'Research and community updates from the Intelligent Systems Program.'),
 'resources': ('Student resources', 'Advising, registration, and practical guidance for MS and PhD students.'),
 'ms': ('Master of Science', 'Build your foundation in intelligent systems and applied AI.'),
 'phd': ('Doctor of Philosophy', 'Pursue research and doctoral study in intelligent systems.')
}
PAGES.update(snapshot_content.pages())
IMPORTED_BODIES=snapshot_content.bodies()
IMPORTED_PARENTS=snapshot_content.parents()
NAV = ['about','academics','admissions','people','research','events','news','resources']
for slug,(title,description) in PAGES.items():
 active='academics' if slug in ('ms','phd') else IMPORTED_PARENTS.get(slug,slug)
 nav=''.join(f'<a href="{s}.html"'+(' aria-current="page"' if s==active else '')+f'>{"Resources" if s=="resources" else PAGES[s][0].replace(" ISP", "")}</a>' for s in NAV)
 parent='academics' if slug in ('ms','phd') else IMPORTED_PARENTS.get(slug)
 parent_link=f' / <a href="{parent}.html">{html.escape(PAGES[parent][0])}</a>' if parent else ''
 heading='' if slug=='index' else f'<section class="page-heading"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a>{parent_link} / <span aria-current="page">{html.escape(title)}</span></nav><h1>{html.escape(title)}</h1><p>{html.escape(description)}</p></div></section>'
 body=IMPORTED_BODIES[slug] if slug in IMPORTED_BODIES else render() if slug=='people' else (ROOT/'src/pages'/f'{slug}.html').read_text()
 if slug in ('research','news','events','resources'):body+=snapshot_content.section(slug)
 template=(ROOT/'src/layout.html').read_text()
 for key,value in {'title':html.escape(title),'description':html.escape(description or 'Graduate education and research in applied artificial intelligence at the University of Pittsburgh.'),'nav':nav,'heading':heading,'body':body,'page_assets':'<link rel="stylesheet" href="assets/people.css"><script src="assets/people.js" defer></script>' if slug=='people' else ''}.items(): template=template.replace('{{'+key+'}}',value)
 # Keep returning visitors on matching markup, behavior and styles after a build.
 for asset in ('styles.css','main.js','people.css','people.js'):
  version=hashlib.sha256((ROOT/'assets'/asset).read_bytes()).hexdigest()[:12]
  template=template.replace(f'"assets/{asset}"',f'"assets/{asset}?v={version}"')
 (ROOT/f'{slug}.html').write_text(snapshot_content.rewrite_body(template))
subprocess.run([sys.executable,str(ROOT/'scripts/test_navigation.py')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/test_people.py')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/check.py')],check=True)
dist=ROOT/'dist'
dist.mkdir(exist_ok=True)
for name in [*(s+'.html' for s in PAGES),'README.md']:
 shutil.copy2(ROOT/name,dist/name)
shutil.copytree(ROOT/'assets',dist/'assets',dirs_exist_ok=True)
import json
(ROOT/'src/content-manifest.json').write_text(json.dumps(snapshot_content.manifest(),indent=2)+'\n')
print(f'Build passed: {len(PAGES)} pages written to {dist}')
