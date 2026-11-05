from pathlib import Path
import json,html
ROOT=Path(__file__).resolve().parents[1]
def render():
 people=json.loads((ROOT/'src/people.json').read_text());e=html.escape
 cards=[]
 for r in people:
  tags=' · '.join(r['categories'])
  image=f'<img src="{e(r["image"])}" alt="{e(r["name"])}" width="680" height="600" loading="lazy">' if r.get('image') else '<div class="portrait-missing">Portrait unavailable</div>'
  links=[f'<a href="{e(r["source"])}">ISP profile<span class="directory-sr"> for {e(r["name"])}</span> ↗</a>']
  for key,label in [('scholar','Google Scholar'),('website','Personal website'),('email','Email')]:
   if r.get(key):links.append(f'<a href="{e(r[key])}">{label}<span class="directory-sr"> for {e(r["name"])}</span> ↗</a>')
  details=''
  if r.get('interests') or r.get('bio'):
   content=(f'<p><strong>Research interests</strong><br>{e(r["interests"])}</p>' if r.get('interests') else '')+(f'<p><strong>From the ISP profile</strong><br>{e(r["bio"])}</p>' if r.get('bio') else '')
   details=f'<details><summary>About {e(r["name"])}</summary>{content}</details>'
  search=' '.join(str(r.get(k,'')) for k in ['name','role','interests','bio'])
  cards.append(f'<article class="person-card" data-categories="{e("|".join(r["categories"]))}" data-search="{e(search)}">{image}<div class="person-content"><p class="person-category">{e(tags)}</p><h3>{e(r["name"])}</h3><p class="person-role">{e(r.get("role", ""))}</p><div class="person-links">{"".join(links)}</div>{details}</div></article>')
 options=''.join(f'<option value="{e(c)}">{e(c)}</option>' for c in ['All people','Faculty','Graduate students','Staff','Alumni','Emeriti faculty'])
 return f'''<section class="section wrap people-directory"><div class="section-title"><div><p class="eyebrow">The ISP community</p><h2>Find your people.</h2></div><p>Explore faculty research, meet graduate students, and connect with staff and alumni.</p></div><p>Directory information may be out of date. Open a person’s official ISP profile to check their role, research, and contact details.</p><div class="directory-controls" hidden><div><label for="people-search">Search names, roles, or research interests</label><input type="search" id="people-search" placeholder="Try a name or machine learning" autocomplete="off"></div><div><label for="people-category">Directory</label><select id="people-category">{options}</select></div><button type="button" id="people-reset">Reset filters</button></div><p id="people-count" role="status" aria-live="polite" aria-atomic="true">{len(people)} people in the directory</p><noscript><p>All profiles are listed below. Use your browser’s Find command to search for a name.</p></noscript><p id="people-empty" hidden>No people match your search. Try another name, research topic, or directory.</p><div class="people-grid">{''.join(cards)}</div><p>Google Scholar and personal website links are included only where present in the source profile.</p></section>'''
