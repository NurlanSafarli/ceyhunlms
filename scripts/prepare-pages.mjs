import { copyFile, mkdir, writeFile } from 'node:fs/promises';

// GitHub Pages serves real files; it does not provide SPA route fallback.
const output = new URL('../dist-pages/', import.meta.url);
await mkdir(new URL('admin/', output), { recursive: true });
await copyFile(new URL('index.html', output), new URL('admin/index.html', output));
await writeFile(new URL('.nojekyll', output), '');
console.log('GitHub Pages admin entry created: /ceyhunlms/admin/');
