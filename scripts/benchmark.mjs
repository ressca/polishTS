import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const { transpile } = await import(pathToFileURL(new URL('dist/index.js', root).pathname));
const rows = Number(process.env.BENCHMARK_ROWS ?? 10000);
const rounds = Number(process.env.BENCHMARK_ROUNDS ?? 5);
const source = Array.from({ length: rows }, (_, i) => `stała wartość${i}: liczba = ${i};`).join('\n');
transpile(source); // warm-up
const samples = [];
for (let i = 0; i < rounds; i++) {
  const start = performance.now();
  transpile(source);
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(`PolishTS benchmark: ${rows} declarations; ${rounds} rounds; median ${samples[Math.floor(samples.length / 2)].toFixed(1)} ms`);
