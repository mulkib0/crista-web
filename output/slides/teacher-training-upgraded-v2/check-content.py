"""원문 본문·표·수식·명령이 승인된 언어 교정 외에는 유지되는지 확인한다."""
from pathlib import Path
import sys,json,hashlib,re
P=Path(__file__).resolve().parent
sys.path.insert(0,str(P/'.deps'))
from bs4 import BeautifulSoup
source=BeautifulSoup((P/'source-reference.html').read_text(),'html.parser')
actual=BeautifulSoup((P/'index.html').read_text(),'html.parser')
copy=json.loads((P/'copy.json').read_text())
patches=json.loads((P/'patch-log.json').read_text())
total=len(source.select('.slide'))
assert len(copy['slides'])==total
assert {x['index'] for x in copy['slides']}==set(range(1,total+1))
assert all(x['applied'] for x in patches),[x for x in patches if not x['applied']]
for patch in patches:
 s=source.select('.slide')[patch['index']-1]
 for t in s.find_all(string=True):
  if str(t).strip()==patch['old']:t.replace_with(patch['new']);break
errors=[];checked=0
def norm(s):return re.sub(r'\s+',' ',s).strip()
for i,(a,b) in enumerate(zip(source.select('.slide'),actual.select('.slide')),1):
 for selector in ['.items','.cmd','.key','.cgrid','.cfoot']:
  aa=a.select(selector);bb=b.select(selector)
  if len(aa)!=len(bb):errors.append({'index':i,'selector':selector,'lengths':[len(aa),len(bb)]})
  for x,y in zip(aa,bb):
   checked+=1
   if norm(x.get_text(' ',strip=True))!=norm(y.get_text(' ',strip=True)):errors.append({'index':i,'selector':selector})
protected=json.loads((P/'protected-before-106.json').read_text())
changed=[]
for f,digest in protected.items():
 p=Path(f) if Path(f).is_absolute() else P.parents[2]/f
 if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()!=digest:changed.append(f)
result={'sourceScreens':len(source.select('.slide')),'newScreens':len(actual.select('.slide')),'preservedContentBlocks':checked,'argonCorrections':len(patches),'errors':errors,'originalHashChanges':changed}
(P/'content-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
assert not errors
