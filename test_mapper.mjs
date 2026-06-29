import { parseEpisodeFile } from './src/services/mapper.js';

const testCases = [
  "The.Last.of.Us.S01E03.1080p.mkv",         // Standard S01E03
  "American.Dad.S16.E04.720p.mp4",           // With dots
  "Breaking Bad 02x04.avi",                  // x format
  "Game of Thrones Season 3 Episode 9.webm", // Full words
  "The.Office.S04-E05.mkv",                  // With dash
  "Stranger.Things.S04 E07.mkv",             // With space
  "Show.S1E1.mkv",                           // Single digits
  "sample.S01E01.mp4",                       // Should return null (sample)
  "The.Sopranos.S01E01.txt",                 // Should return null (not video)
  "House.S08E12.PROPER.720p.HDTV.x264.mkv"   // Complex suffix
];

console.log("--- Regex & Parsing Audit ---");
let passed = 0;

for (const filename of testCases) {
  const result = parseEpisodeFile(filename);
  console.log(`\nFilename: ${filename}`);
  if (result) {
    console.log(`Result:   Season ${result.season}, Episode ${result.episode}`);
    if (filename.includes('sample') || filename.endsWith('.txt')) {
      console.log('❌ FAILED (Should have been ignored)');
    } else {
      console.log('✅ PASSED');
      passed++;
    }
  } else {
    console.log(`Result:   null`);
    if (filename.includes('sample') || filename.endsWith('.txt')) {
      console.log('✅ PASSED (Correctly ignored)');
      passed++;
    } else {
      console.log('❌ FAILED (Should have parsed)');
    }
  }
}

console.log(`\nTotal Passed: ${passed}/${testCases.length}`);
