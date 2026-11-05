"""Import selected editorial content from the supplied snapshot, without its theme or scripts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
import html,json,re
ROOT=Path(__file__).resolve().parents[1]
SNAPSHOT=ROOT.parent/'www.isp.pitt.edu'
class Node:
 def __init__(self,tag='',attrs=()): self.tag=tag; self.attrs=dict(attrs); self.children=[]
 def text(self): return ''.join(c.text() if isinstance(c,Node) else c for c in self.children)
 def walk(self):
  yield self
  for c in self.children:
   if isinstance(c,Node): yield from c.walk()
class Tree(HTMLParser):
 def __init__(self,s):
  super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root];self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in {'img','br','hr','meta','link','input','source','wbr','area','base','embed','param','col'}:self.stack.append(n)
 def handle_startendtag(self,t,a): self.handle_starttag(t,a);self.handle_endtag(t)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,s):self.stack[-1].children.append(s)
BASE='https://www.isp.pitt.edu/'
def key(url):
 u=urlsplit(url);p=unquote(u.path).strip('/')
 return p[:-5] if p.endswith('.html') else p
CORE={'':'index','index':'index','about':'about','academics':'academics','admissions':'admissions','people':'people','research':'research','resources':'resources','news':'news','past-events':'events','academics/master-science-intelligent-systems':'ms','academics/doctor-philosophy-intelligent-systems':'phd'}
def collect():
 files=[]
 for folder in ['research','news','past-events']:
  files.extend(sorted((SNAPSHOT/folder).glob('*.html')))
 files.extend(SNAPSHOT/'resources'/n for n in ['2017-publications.html','2018-publications.html','2019-publications.html','isp-secondary-faculty-appointment.html','reading-and-research-groups.html'])
 return [p for p in files if p.stem not in {'current-isp-research','computer-vision-and-image-analysis-group'}]
def load():
 records=[]
 for path in collect():
  tree=Tree(path.read_text()).root
  article=next((n for n in tree.walk() if n.tag=='article'),None)
  title=next((n.text().strip() for n in tree.walk() if n.tag=='h1'),path.stem.replace('-',' ').title()).replace('Retreival', 'Retrieval')
  if not article or not article.text().strip():raise ValueError(f'Missing article: {path}')
  rel=path.relative_to(SNAPSHOT).as_posix();slug=rel[:-5].replace('/','--')
  group=rel.split('/')[0];parent={'past-events':'events'}.get(group,group)
  records.append(dict(source=rel,slug=slug,title=title,parent=parent,article=article))
 return records
RECORDS=load()
ROUTES={**CORE,**{key(r['source']):r['slug'] for r in RECORDS}}
def link(value,source):
 absolute=urljoin(BASE+source,value);u=urlsplit(absolute)
 if u.scheme not in {'http','https','mailto','tel'}:return None
 if u.hostname in {'www.isp.pitt.edu','isp.pitt.edu'} and key(absolute) in ROUTES:
  # Source fragment identifiers do not survive semantic content conversion.
  return ROUTES[key(absolute)]+'.html'
 return absolute
def render_node(n,source,state):
 if isinstance(n,str):return html.escape(n)
 if n.tag in {'script','style','iframe','form','input','button','header','svg','noscript'}:return ''
 if n.tag=='img':return '' # Existing directory portraits are retained; no unreviewed images are imported.
 if n.tag=='a':
  dest=link(n.attrs.get('href',''),source)
  if any(s in (dest or '').lower() for s in ['coronavirus','covid','graduate-student-handbook-dietrich']):return ''
  inside=''.join(render_node(c,source,state) for c in n.children)
  return f'<a href="{html.escape(dest,quote=True)}">{inside}</a>' if dest else inside
 inside=''.join(render_node(c,source,state) for c in n.children)
 if re.fullmatch('h[1-6]',n.tag):
  level=min(max(2,int(n.tag[1])),state[0]+1);state[0]=level
  return f'<h{level}>{inside}</h{level}>'
 if n.tag in {'p','ul','ol','li','strong','em','b','i','blockquote','sup','sub','br','hr','dl','dt','dd','caption'}:
  return f'<{n.tag}>'+inside+(f'</{n.tag}>' if n.tag not in {'br','hr'} else '')
 if n.tag=='table':return '<div role="region" aria-label="Source content table" tabindex="0" style="overflow-x:auto">'+ '<table>'+inside+'</table></div>'
 if n.tag in {'thead','tbody','tfoot','tr','td','th'}:
  attrs=''
  for a in ['colspan','rowspan']:
   if n.attrs.get(a,'').isdigit():attrs+=f' {a}="{n.attrs[a]}"'
  if n.tag=='th':attrs+=' scope="col"'
  return f'<{n.tag}{attrs}>'+inside+f'</{n.tag}>'
 return inside
EXPLANATION='This reference copy may be out of date. Check the official ISP page linked below for updated information.'
def pages():return {r['slug']:(r['title'],'Research group information.' if r['parent']=='research' else 'Archived ISP news and events.' if r['parent'] in {'news','events'} else 'ISP reference information.') for r in RECORDS}
def parents():return {r['slug']:r['parent'] for r in RECORDS}
def bodies():
 result={}
 for r in RECORDS:
  note=EXPLANATION
  if r['parent'] in {'events','news'} or 'publications' in r['source']:note='Historical archive. Dates and descriptions refer to the original publication, not upcoming events or current announcements.'
  if r['parent']=='research':note+=' Confirm current group membership and projects with the faculty listed below.'
  if r['source'].startswith('resources/'):note+=' Confirm group schedules and appointment procedures with ISP before acting on them.'
  body='\n'.join(line.rstrip() for line in render_node(r['article'],r['source'],[1]).splitlines())
  result[r['slug']]=f'<section class="section wrap prose" style="overflow-wrap:anywhere"><p><a href="{r["parent"]}.html">Back to {html.escape(r["parent"])}</a></p><div class="notice">{note}</div>{body}<p><a data-source-link href="{BASE+r["source"][:-5]}">View the official ISP page <span aria-hidden="true">↗</span></a></p></section>'
 return result
def rewrite_body(body):
 """Localize browsing links while preserving explicitly marked official sources.

 Run on the completed document so arrow conventions also cover shared navigation,
 directory cards, and imported pages. Source links must never point to their copy.
 """
 def replace(match):
  anchor=Tree(match.group(0)).root.children[0]
  attrs=anchor.attrs
  raw=attrs.get('href', '')
  if 'data-source-link' not in attrs:
   absolute=urlsplit(raw)
   if absolute.hostname in {'www.isp.pitt.edu','isp.pitt.edu'}:
    attrs['href']=link(raw,'index.html') or raw
  destination=attrs.get('href','')
  scheme=urlsplit(destination).scheme
  arrow='↗' if scheme in {'http','https'} or destination.startswith('//') else '' if scheme in {'mailto','tel'} else '→'
  content=match.group(2).replace('↗',arrow).replace('→',arrow)
  attributes=''.join(' '+name+(f'="{html.escape(value,quote=True)}"' if value is not None else '') for name,value in attrs.items())
  return f'<a{attributes}>{content}</a>'
 return re.sub(r'<a\b([^>]*)>(.*?)</a>',replace,body,flags=re.S)
def section(parent):
 if parent=='research':return '' # One curated list already includes groups and centers.
 records=[r for r in RECORDS if r['parent']==parent]
 title={'research':'Research groups and centers','news':'News archive','events':'Past ISP events','resources':'Additional ISP resources'}[parent]
 links=''.join(f'<li><a href="{r["slug"]}.html">{html.escape(r["title"])}</a></li>' for r in records)
 return f'<section class="section wrap prose"><h2>{title}</h2><p>Browse reference pages and historical records. Check dates and confirm guidance before acting on it.</p><ul>{links}</ul></section>'
def manifest():
 return [{k:r[k] for k in ['source','slug','title','parent']} for r in RECORDS]
if __name__=='__main__':print(json.dumps(manifest(),indent=2))
