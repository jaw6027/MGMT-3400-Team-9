"""Build bundled customer translation catalogs; fails on incomplete coverage."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / 'scripts'
original = json.loads((SCRIPTS / 'customer-copy.json').read_text())
languages = ['en', 'es', 'pa', 'tl', 'ar', 'vi']
catalog = {language: {} for language in languages}
for line in (SCRIPTS / 'customer-translations.tsv').read_text().splitlines():
    parts = line.split('\t')
    assert len(parts) == 6, parts[0]
    source = original[int(parts[0])]
    catalog['en'][source] = source
    for language, translated in zip(languages[1:], parts[1:]):
        assert translated.strip(), (language, parts[0])
        catalog[language][source] = translated
months = {
    'en': ['January','February','March','April','May','June','July','August','September','October','November','December'],
    'es': ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    'pa': ['ਜਨਵਰੀ','ਫ਼ਰਵਰੀ','ਮਾਰਚ','ਅਪ੍ਰੈਲ','ਮਈ','ਜੂਨ','ਜੁਲਾਈ','ਅਗਸਤ','ਸਤੰਬਰ','ਅਕਤੂਬਰ','ਨਵੰਬਰ','ਦਸੰਬਰ'],
    'tl': ['Enero','Pebrero','Marso','Abril','Mayo','Hunyo','Hulyo','Agosto','Setyembre','Oktubre','Nobyembre','Disyembre'],
    'ar': ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    'vi': ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
}
for language in languages:
    for i, month in enumerate(months['en']):
        localized = months[language][i]
        usage = catalog[language].get('Usage (kWh)', 'Usage (kWh)')
        cost = {'en':'electricity cost (USD)','es':'costo de electricidad (USD)','pa':'ਬਿਜਲੀ ਦੀ ਰਕਮ (USD)','tl':'halaga ng kuryente (USD)','ar':'تكلفة الكهرباء (USD)','vi':'chi phí điện (USD)'}[language]
        catalog[language][month] = localized
        catalog[language][month+' usage (kWh)'] = localized+' — '+usage
        catalog[language][month+' electricity cost (USD)'] = localized+' — '+cost
    # Preserve the original English accessible names.
    if language == 'en':
        for text in original:
            if text not in catalog[language]: continue
            catalog[language][text] = text
for line in (SCRIPTS / 'customer-attributes.tsv').read_text().splitlines():
    parts = line.split('\t'); assert len(parts) == 6, parts[0]
    for language, text in zip(languages, parts): catalog[language][parts[0]] = text
ui = {language: {} for language in languages}
for line in (SCRIPTS / 'customer-ui.tsv').read_text().splitlines():
    parts = line.split('\t'); assert len(parts) == 7, parts[0]
    for language, text in zip(languages, parts[1:]): ui[language][parts[0]] = text
unchanged = {4,5,10,11,19,20,22,27,28,38,41,44,153,210}
for i, text in enumerate(original):
    if i not in unchanged:
        assert all(text in catalog[language] for language in languages), (i,text)
output = {'phrases':catalog,'months':months,'ui':ui}
(ROOT / 'public' / 'translations.js').write_text('const CustomerCopy = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Built {len(languages)} complete customer language catalogs.')
