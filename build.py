import json
import runpy
from pathlib import Path

root=Path(__file__).parent
(root/'dist').mkdir(exist_ok=True)
(root/'.openai').mkdir(exist_ok=True)
runpy.run_path(str(root/'build_content.py'))
runpy.run_path(str(root/'book_content.py'))
runpy.run_path(str(root/'foundation_content.py'))
runpy.run_path(str(root/'complete_content.py'))
runpy.run_path(str(root/'audit_content.py'))
template=(root/'index.template.html').read_text()
data=json.loads((root/'content.json').read_text())
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html=template.replace('/*CONTENT_JSON*/',payload)
assert '/*CONTENT_JSON*/' not in html
(root/'index.html').write_text(html)
(root/'dist'/'index.html').write_text(html)
(root/'.openai'/'hosting.json').write_text(json.dumps({'static':{'directory':'dist'}}))
print(f'Built standalone index.html: {len(html.encode()):,} bytes')
