"""Create separate standalone class demos and a source ZIP; no deployment."""
from pathlib import Path
import re
import zipfile
import subprocess
import sys
import hashlib

ROOT = Path(__file__).resolve().parent.parent


def standalone(folder, output):
    source = ROOT / folder
    html = (source / 'index.html').read_text()
    html = re.sub(
        r'<link rel="stylesheet" href="([^"]+)">',
        lambda match: '<style>' + (source / match[1].split('?')[0]).read_text() + '</style>',
        html,
    )
    scripts = re.findall(r'<script src="([^"]+)" defer></script>', html)
    html = re.sub(r'<script src="([^"]+)" defer></script>', '', html)
    code = '\n'.join((source / script.split('?')[0]).read_text() for script in scripts)
    html = html.replace('</body>', '<script>' + code + '</script></body>')
    (ROOT / output).write_text(html)


subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build_customer_languages.py')], check=True)
for folder in ['public', 'staff-demo']:
    index = ROOT / folder / 'index.html'
    def version_asset(match):
        asset = ROOT / folder / match[2]
        if not asset.is_file():
            return match[0]
        version = hashlib.sha256(asset.read_bytes()).hexdigest()[:10]
        return match[1] + match[2] + '?v=' + version + match[3]
    index.write_text(re.sub(r'((?:src|href)=")([^"?]+\.(?:js|css))(?:\?[^"\s]*)?(")', version_asset, index.read_text()))
standalone('public', 'Kern Solar Connect.html')
standalone('staff-demo', 'Staff Dashboard Demo.html')
with zipfile.ZipFile(ROOT / 'Kern Solar Connect.zip', 'w', zipfile.ZIP_DEFLATED) as package:
    for folder in ['public', 'staff-demo', 'scripts', 'tests']:
        for file in (ROOT / folder).iterdir():
            if file.is_file():
                package.write(file, file.relative_to(ROOT))
    for name in ['README.md', 'HANDOFF.md', 'Kern Solar Connect.html', 'Staff Dashboard Demo.html']:
        package.write(ROOT / name, name)
print('Packaged customer website and separate staff CRM demo.')
