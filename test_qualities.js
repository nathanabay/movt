import { parseReleaseName } from './src/utils/qualityParser.js';

const torrents = [
  { name: 'The.Last.of.Us.S01E03.1080p.mkv', seeders: 10, magnet: 'mag1' },
  { name: 'The.Last.of.Us.S01E03.720p.mkv', seeders: 5, magnet: 'mag2' },
  { name: 'The.Last.of.Us.S01E03.2160p.mkv', seeders: 2, magnet: 'mag3' },
];

const parsed = torrents.map(t => {
  const parsedData = parseReleaseName(t.name);
  return { ...t, ...parsedData };
});

const qualities = new Set(parsed.map(t => t.resolution).filter(r => r && r !== 'Unknown'));
const sortedQualities = Array.from(qualities).sort((a, b) => {
  if (a === '4K') return -1;
  if (b === '4K') return 1;
  return parseInt(b) - parseInt(a);
});

console.log("Qualities:", sortedQualities);
