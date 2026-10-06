const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readText = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n');
const readBase64 = relativePath => fs.readFileSync(path.join(root, relativePath)).toString('base64');

function inlineScript(relativePath) {
  return `<script>\n${readText(relativePath)}\n<\/script>`;
}

function inlineStyle(relativePath) {
  return `<style>\n${readText(relativePath)}\n<\/style>`;
}

let html = readText('index.modular.html');

const scripts = {
  '<script src="./sync-core.js"></script>': inlineScript('sync-core.js'),
  '<script src="./vendor/xlsx/xlsx.full.min.js"></script>': inlineScript('vendor/xlsx/xlsx.full.min.js'),
  '<script src="./vendor/jspdf/jspdf.umd.min.js"></script>': inlineScript('vendor/jspdf/jspdf.umd.min.js'),
  '<script src="./vendor/firebase/firebase-app-compat.js"></script>': inlineScript('vendor/firebase/firebase-app-compat.js'),
  '<script src="./vendor/firebase/firebase-auth-compat.js"></script>': inlineScript('vendor/firebase/firebase-auth-compat.js'),
  '<script src="./vendor/firebase/firebase-firestore-compat.js"></script>': inlineScript('vendor/firebase/firebase-firestore-compat.js'),
  '<script src="./planeacion_tecnicas_2026.js"></script>': inlineScript('planeacion_tecnicas_2026.js')
};

for (const [source, replacement] of Object.entries(scripts)) {
  if (!html.includes(source)) throw new Error(`No se encontró la dependencia esperada: ${source}`);
  html = html.replace(source, () => replacement);
}

html = html.replace('<link rel="stylesheet" href="./assets/tailwind.css">', () => inlineStyle('assets/tailwind.css'));

let fontCss = readText('vendor/fontawesome/css/all.min.css');
// Conservamos el catálogo de iconos, pero solo incrustamos las dos fuentes que usa la interfaz.
// Evita repetir la misma fuente muchas veces y reduce el tamaño del HTML portátil.
fontCss = fontCss.replace(/@font-face\{[^}]+\}/g, '');
const solidFont = readBase64('vendor/fontawesome/webfonts/fa-solid-900.woff2');
const regularFont = readBase64('vendor/fontawesome/webfonts/fa-regular-400.woff2');
fontCss = `@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:900;font-display:block;src:url(data:font/woff2;base64,${solidFont}) format("woff2")}@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${regularFont}) format("woff2")}\n${fontCss}`;
html = html.replace('<link rel="stylesheet" href="./vendor/fontawesome/css/all.min.css">', () => `<style>\n${fontCss}\n<\/style>`);

const logoDataUri = `data:image/jpeg;base64,${readBase64('logo-dunamis.jpeg')}`;
html = html.replaceAll('./logo-dunamis.jpeg', logoDataUri);

const docsDirectory = path.join(root, 'docs');
fs.mkdirSync(docsDirectory, { recursive: true });

// Se generan dos copias identicas. La carpeta docs evita publicar por error
// index.modular.html sin sus dependencias locales.
fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(docsDirectory, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(docsDirectory, '.nojekyll'), '', 'utf8');
console.log(`index.html portátil generado (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
console.log('Paquete listo para GitHub Pages: docs/index.html');
