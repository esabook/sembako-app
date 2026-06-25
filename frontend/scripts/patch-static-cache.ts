// Patches svelte-adapter-bun's generated handler.js to add Cache-Control headers
// for static assets that lack content hashes (logo.webp, favicon, etc.).
// svelte-adapter-bun already sets max-age=31536000,immutable for _app/immutable/**
// but returns no Cache-Control for other files in the client/ dir.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const handlerPath = resolve(import.meta.dir, '../build/handler.js');

let content: string;
try {
  content = readFileSync(handlerPath, 'utf-8');
} catch {
  console.error('patch-static-cache: build/handler.js not found, skipping');
  process.exit(0);
}

const from = `          headers.set("cache-control", "public,max-age=31536000,immutable");
        }
        return headers;`;

const to = `          headers.set("cache-control", "public,max-age=31536000,immutable");
        } else {
          headers.set("cache-control", "public,max-age=604800");
        }
        return headers;`;

if (!content.includes(from)) {
  console.log('patch-static-cache: pattern not found (already patched or adapter changed), skipping');
  process.exit(0);
}

writeFileSync(handlerPath, content.replace(from, to));
console.log('patch-static-cache: Cache-Control: public,max-age=604800 added for non-hashed static assets');
