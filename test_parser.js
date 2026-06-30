import { parseReleaseName } from './src/utils/qualityParser.js';

const testNames = [
  "Inception.2010.1080p.BluRay.x264.DTS-FGT",
  "House.of.the.Dragon.S01.UHD.BluRay.2160p.TrueHD.Atmos.7.1.DV.HEVC.REMUX-FraMeSToR",
  "The.Last.Of.Us.S01E03.1080p.WEB.H264-GHOSTS",
  "Minions.The.Rise.Of.Gru.2022.1080p.WEBRip.x265-RARBG",
  "Avatar.The.Way.Of.Water.2022.HC.HDRip.XviD.AC3-EVO",
  "Spider-Man.No.Way.Home.2021.NEW.PROPER.CAM.Rip.x264-CAMEON"
];

for (const name of testNames) {
  console.log(`\nParsing: ${name}`);
  console.log(parseReleaseName(name));
}
