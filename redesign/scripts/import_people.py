"""Import published directory facts from the supplied ISP snapshot. No dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json,re,shutil
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'www.isp.pitt.edu'
class Node:
 def __init__(self,tag='',attrs=()):self.tag=tag;self.attrs=dict(attrs);self.children=[]
 def all(self,predicate):
  result=[]
  for c in self.children:
   if isinstance(c,Node):
    if predicate(c):result.append(c)
    result.extend(c.all(predicate))
  return result
 def text(self):return ' '.join(' '.join(c.text() if isinstance(c,Node) else c for c in self.children).split())
 def cls(self,s):return s in self.attrs.get('class','').split()
 def field(self,s):
  found=self.all(lambda n:n.cls(s));return found[0] if found else Node()
class Parser(HTMLParser):
 def __init__(self,text):
  super().__init__();self.root=Node();self.stack=[self.root];self.feed(text)
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in ('img','br','hr','meta','link','input','source','wbr','area','base','embed','param','track','col'):self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
def href(field,prefix):
 return next((n.attrs['href'] for n in field.all(lambda n:n.tag=='a') if n.attrs.get('href','').startswith(prefix)), '')
def picture(src,slug):
 if 'stock image' in unquote(src).lower():return ''
 path=unquote(src.replace('../','').replace('https://www.isp.pitt.edu/','')).lstrip('/')
 candidates=[SOURCE/path,SOURCE/path.replace('?','_')]
 for f in candidates:
  if f.is_file():
   ext=re.search(r'\.(jpg|jpeg|png|webp|gif)',f.name,re.I)
   if not ext:return ''
   dest=ROOT/'assets/people'/f'{slug}.{ext[1].lower()}';dest.parent.mkdir(exist_ok=True)
   shutil.copy2(f,dest);return str(dest.relative_to(ROOT))
 return ''
people={}
for category,number in [('Faculty',1),('Graduate students',3),('Staff',2),('Alumni',4),('Emeriti faculty',28)]:
 root=Parser((SOURCE/f'people_type={number}.html').read_text()).root
 for row in root.all(lambda n:n.cls('views-row')):
  field=row.field('views-field-title'); links=field.all(lambda n:n.tag=='a' and '/people/' in n.attrs.get('href',''))
  if not links:continue
  a=links[0];url=a.attrs['href'];slug=urlsplit(url).path.split('/')[-1].removesuffix('.html')
  if not a.text():continue
  record=people.setdefault(slug,{'slug':slug,'name':a.text(),'categories':[],'role':row.field('views-field-field-title').text(),'source':'https://www.isp.pitt.edu/people/'+slug})
  if category not in record['categories']:record['categories'].append(category)
  imgs=a.all(lambda n:n.tag=='img')
  if imgs and not record.get('image'):record['image']=picture(imgs[0].attrs.get('src',''),slug)
for slug,r in people.items():
 file=SOURCE/'people'/f'{slug}.html'
 if not file.exists():continue
 doc=Parser(file.read_text()).root
 title=doc.field('views-field-field-title').text()
 if title:r['role']=title
 bio=doc.field('field--name-field-bio')
 r['scholar']=href(bio,'https://scholar.google.') or href(bio,'http://scholar.google.')
 interests=doc.field('field--name-field-research-interests').text().removeprefix('Research Interests').strip()
 r['interests']=interests
 paragraphs=bio.all(lambda n:n.tag=='p')
 bio_text=next((n.text() for n in paragraphs if n.text() and 'View Google Scholar' not in n.text()),'')
 r['bio']=bio_text[:350].rsplit(' ',1)[0]+'…' if len(bio_text)>350 else bio_text
 r['email']=href(doc.field('views-field-field-email'),'mailto:')
 r['website']=href(doc.field('views-field-field-website'),'http')
 if not r.get('image'):
  imgs=doc.field('views-field-field-person-img').all(lambda n:n.tag=='img')
  if imgs:r['image']=picture(imgs[0].attrs.get('src',''),slug)
records=sorted(people.values(),key=lambda r:(r['name'].split()[-1].lower(),r['name'].lower()))
(ROOT/'src/people.json').write_text(json.dumps(records,indent=2,ensure_ascii=False)+'\n')
print(f'{len(records)} people, {sum(bool(r.get("image")) for r in records)} local portraits, {sum(bool(r.get("scholar")) for r in records)} Scholar links')
