"""Dependency-free static lint for links, semantics, and brand colors."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
ROOT=Path(__file__).resolve().parents[1]
errors=[]
class Document(HTMLParser):
 def __init__(self,path):
  super().__init__(convert_charrefs=True);self.path=path;self.ids=set();self.links=[];self.h1=0;self.main=0;self.last_heading=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:
   if a['id'] in self.ids: errors.append(f'{self.path.name}: duplicate id {a["id"]}')
   self.ids.add(a['id'])
  if tag=='img' and 'alt' not in a: errors.append(f'{self.path.name}: missing image alt')
  if tag=='h1': self.h1+=1
  if tag=='main': self.main+=1
  if re.fullmatch('h[1-6]',tag):
   level=int(tag[1])
   if level>self.last_heading+1: errors.append(f'{self.path.name}: skipped heading level {tag}')
   self.last_heading=level
  for key in ('href','src'):
   if key in a:self.links.append(a[key])
docs={}
for path in ROOT.glob('*.html'):
 doc=Document(path);doc.feed(path.read_text());docs[path.name]=doc
 if doc.h1!=1 or doc.main!=1: errors.append(f'{path.name}: expected one h1 and main')
for name,doc in docs.items():
 for link in doc.links:
  u=urlsplit(link)
  if u.scheme or u.netloc:continue
  target=ROOT/unquote(u.path) if u.path else ROOT/name
  if not target.exists(): errors.append(f'{name}: missing local target {link}')
  if u.fragment and target.name in docs and u.fragment not in docs[target.name].ids: errors.append(f'{name}: missing anchor {link}')
css=(ROOT/'assets/styles.css').read_text()
if re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\(',css): errors.append('Component CSS contains raw color values')
# Verify contrast of every foreground/background pairing used in the theme.
colors=dict(re.findall(r'--(pitt-[\w-]+):\s*(#[0-9A-Fa-f]{6})',(ROOT/'assets/tokens.css').read_text()))
def lum(h):
 rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 return sum(v*w for v,w in zip(c,[.2126,.7152,.0722]))
for a,b in [('royal','white'),('medium-blue','white'),('royal','new-sky'),('medium-blue','new-sky'),('medium-blue','gold'),('gold','royal'),('white','medium-blue')]:
 lo,hi=sorted([lum(colors['pitt-'+a]),lum(colors['pitt-'+b])]);ratio=(hi+.05)/(lo+.05)
 if ratio<4.5: errors.append(f'Contrast below AA: {a}/{b} {ratio:.2f}')
if errors: raise SystemExit('\n'.join(errors))
print(f'Lint passed: {len(docs)} pages; local links, anchors, heading order, image alt attributes, color tokens, and text contrast.')
