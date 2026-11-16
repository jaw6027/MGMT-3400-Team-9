import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

// Keep the preview independent of relative asset URLs and module support.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [template, css, ...sources] = await Promise.all([
  read('./index.template.html'), read('../style.css'), read('../energy.js'), read('../review.js'),
  read('../bill-parser.js'), read('../bill-ocr.js'), read('../bill-ui.js'), read('../app.js'),
]);
const script = sources.map(source => source.replace(/^export /gm, '')
  .replace(/^import .* from '\.\/[\w-]+\.js';\n/gm, '')).join('\n');
const html = template
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>\n(() => {\n${script}\n})();\n</script>`);
await writeFile(new URL('../index.html', import.meta.url), html);
const vendor = new URL('../vendor/ocr/', import.meta.url);
await mkdir(vendor, { recursive: true });
const assets = [
  ['tesseract.js/dist/tesseract.esm.min.js', 'tesseract.esm.min.js'],
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ['@tesseract.js-data/eng/package.json', 'LANGUAGE-PACKAGE.json'],
  ['tesseract.js/LICENSE.md', 'TESSERACT-LICENSE.md'],
  ['tesseract.js-core/LICENSE', 'CORE-LICENSE'],
  ['tesseract.js/dist/tesseract.min.js.LICENSE.txt', 'tesseract.min.js.LICENSE.txt'],
  ['tesseract.js/dist/worker.min.js.LICENSE.txt', 'worker.min.js.LICENSE.txt'],
];
await Promise.all(assets.map(([source, target]) => copyFile(new URL(`../node_modules/${source}`, import.meta.url), new URL(target, vendor))));
await writeFile(new URL('LANGUAGE-NOTICE.txt', vendor), 'English trained data: @tesseract.js-data/eng 1.0.0 (MIT), https://github.com/naptha/tessdata. Installed using npm package integrity verification.\n');
console.log('Built standalone calculator and local, on-demand OCR assets.');
