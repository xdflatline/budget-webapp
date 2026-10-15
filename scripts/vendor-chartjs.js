import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
const targetDir = path.resolve(__dirname, '..', 'public', 'vendor', 'chartjs');
const target = path.join(targetDir, 'chart.umd.js');

await mkdir(targetDir, { recursive: true });
await copyFile(source, target);
console.log(`Vendored Chart.js UMD build to ${target}`);
