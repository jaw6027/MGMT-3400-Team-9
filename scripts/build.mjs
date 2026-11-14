import { readFile, writeFile } from 'node:fs/promises';

// Keep the preview independent of relative asset URLs and module support.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [template, css, model, app] = await Promise.all([
  read('./index.template.html'), read('../style.css'), read('../energy.js'), read('../app.js'),
]);
const script = model.replace(/^export /gm, '') + '\n' +
  app.replace(/^import \{ defaults, estimate \} from '\.\/energy\.js';\n/, '');
const html = template
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>\n(() => {\n${script}\n})();\n</script>`);
await writeFile(new URL('../index.html', import.meta.url), html);
console.log('Built self-contained index.html');
