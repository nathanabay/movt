/**
 * Extracted and adapted from custom movQualityParser.cs
 */

const SourceRegex = new RegExp(
  "\\b(?:" +
  "(?<bluray>M?Blu[-_. ]?Ray|HD[-_. ]?DVD|BD(?!$)|UHD2?BD|BDISO|BDMux|BD25|BD50|BR[-_. ]?DISK)|" +
  "(?<webdl>WEB[-_. ]?DL(?:mux)?|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?5[. ]1)|[. ]WEB$|(?:\\d{3,4}0p)[-. ](?:Hybrid[-_. ]?)?WEB[-. ]|[-. ]WEB[-. ]\\d{3,4}0p|\\b\\s/\\sWEB\\s/\\s\\b|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip))|" +
  "(?<webrip>WebRip|Web-Rip|WEBMux)|" +
  "(?<hdtv>HDTV)|" +
  "(?<bdrip>BDRip|BDLight|HD[-_. ]?DVDRip|UHDBDRip)|" +
  "(?<brrip>BRRip)|" +
  "(?<dvdr>\\d?x?M?DVD-?[R59])|" +
  "(?<dvd>DVD(?!-R)|DVDRip|xvidvd)|" +
  "(?<dsr>WS[-_. ]DSR|DSR)|" +
  "(?<regional>R[0-9]{1}|REGIONAL)|" +
  "(?<scr>SCR|SCREENER|DVDSCR|DVDSCREENER)|" +
  "(?<ts>TS[-_. ]|TELESYNCH?|HD-TS|HDTS|PDVD|TSRip|HDTSRip)|" +
  "(?<tc>TC|TELECINE|HD-TC|HDTC)|" +
  "(?<cam>CAMRIP|(?:NEW)?CAM|HD-?CAM(?:Rip)?|HQCAM)|" +
  "(?<wp>WORKPRINT|WP)|" +
  "(?<pdtv>PDTV)|" +
  "(?<sdtv>SDTV)|" +
  "(?<tvrip>TVRip)" +
  ")(?:\\b|$|[ .])",
  "i"
);

const ResolutionRegex = new RegExp(
  "\\b(?:(?<R360p>360p)|(?<R480p>480p|480i|640x480|848x480)|(?<R540p>540p)|(?<R576p>576p)|(?<R720p>720p|1280x720|960p)|(?<R1080p>1080p|1920x1080|1440p|FHD|1080i|4kto1080p)|(?<R2160p>2160p|3840x2160|4k[-_. ](?:UHD|HEVC|BD|H\\.?265)|(?:UHD|HEVC|BD|H\\.?265)[-_. ]4k))\\b",
  "i"
);

const AlternativeResolutionRegex = new RegExp("\\b(?<R2160p>UHD)\\b|(?<R2160p>\\[4K\\])", "i");

const CodecRegex = new RegExp(
  "\\b(?:(?<av1>av1)|(?<x264>x264)|(?<h264>h264|avc)|(?<x265>x265)|(?<h265>h265)|(?<hevc>hevc)|(?<xvidhd>XvidHD)|(?<xvid>X-?vid)|(?<divx>divx))\\b",
  "i"
);

const RemuxRegex = new RegExp(
  "(?:[_. \\[]|\\d{4}p-|\\bHybrid-)?(?<remux>(?:(BD|UHD)[-_. ]?)?Remux)\\b|(?<remux>(?:(BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)",
  "i"
);

const AudioRegex = new RegExp(
  "\\b(?:(?<ac3>AC3|EAC3|E-AC3)|(?<dts>DTS|DTS-HD)|(?<truehd>TrueHD)|(?<aac>AAC)|(?<flac>FLAC)|(?<atmos>Atmos))\\b",
  "i"
);

export const parseReleaseName = (name) => {
  const normalizedName = name.replace(/_/g, ' ').trim();
  
  const result = {
    resolution: 'Unknown',
    source: 'Unknown',
    codec: 'Unknown',
    audio: 'Unknown',
    isRemux: false,
    isCamOrTs: false // Flag to easily identify "bad" formats
  };

  // 1. Resolution
  const resMatch = ResolutionRegex.exec(normalizedName);
  const altResMatch = AlternativeResolutionRegex.exec(normalizedName);
  
  if (resMatch && resMatch.groups) {
    if (resMatch.groups.R2160p) result.resolution = '4K';
    else if (resMatch.groups.R1080p) result.resolution = '1080p';
    else if (resMatch.groups.R720p) result.resolution = '720p';
    else if (resMatch.groups.R576p) result.resolution = '576p';
    else if (resMatch.groups.R540p) result.resolution = '540p';
    else if (resMatch.groups.R480p) result.resolution = '480p';
    else if (resMatch.groups.R360p) result.resolution = '360p';
  } else if (altResMatch && altResMatch.groups && altResMatch.groups.R2160p) {
    result.resolution = '4K';
  }

  // 2. Source
  const sourceMatch = SourceRegex.exec(normalizedName);
  if (sourceMatch && sourceMatch.groups) {
    if (sourceMatch.groups.bluray) result.source = 'BluRay';
    else if (sourceMatch.groups.webdl) result.source = 'WEB-DL';
    else if (sourceMatch.groups.webrip) result.source = 'WEBRip';
    else if (sourceMatch.groups.hdtv) result.source = 'HDTV';
    else if (sourceMatch.groups.bdrip || sourceMatch.groups.brrip) result.source = 'BDRip';
    else if (sourceMatch.groups.dvd || sourceMatch.groups.dvdr) result.source = 'DVD';
    else if (sourceMatch.groups.sdtv || sourceMatch.groups.pdtv || sourceMatch.groups.dsr || sourceMatch.groups.tvrip) result.source = 'SDTV';
    else if (sourceMatch.groups.scr) { result.source = 'SCR'; result.isCamOrTs = true; }
    else if (sourceMatch.groups.cam) { result.source = 'CAM'; result.isCamOrTs = true; }
    else if (sourceMatch.groups.ts) { result.source = 'TS'; result.isCamOrTs = true; }
    else if (sourceMatch.groups.tc) { result.source = 'TC'; result.isCamOrTs = true; }
    else if (sourceMatch.groups.wp) { result.source = 'WP'; result.isCamOrTs = true; }
    else if (sourceMatch.groups.regional) result.source = 'Regional';
  }

  // 3. Codec
  const codecMatch = CodecRegex.exec(normalizedName);
  if (codecMatch && codecMatch.groups) {
    if (codecMatch.groups.av1) result.codec = 'AV1';
    else if (codecMatch.groups.x265 || codecMatch.groups.h265 || codecMatch.groups.hevc) result.codec = 'x265';
    else if (codecMatch.groups.x264 || codecMatch.groups.h264) result.codec = 'x264';
    else if (codecMatch.groups.xvid || codecMatch.groups.xvidhd || codecMatch.groups.divx) result.codec = 'XviD';
  }

  // 4. Audio
  const audioMatch = AudioRegex.exec(normalizedName);
  if (audioMatch && audioMatch.groups) {
    if (audioMatch.groups.ac3) result.audio = 'AC3';
    else if (audioMatch.groups.dts) result.audio = 'DTS';
    else if (audioMatch.groups.truehd) result.audio = 'TrueHD';
    else if (audioMatch.groups.aac) result.audio = 'AAC';
    else if (audioMatch.groups.flac) result.audio = 'FLAC';
  }

  // 5. Remux
  const remuxMatch = RemuxRegex.exec(normalizedName);
  if (remuxMatch) {
    result.isRemux = true;
    if (result.source === 'Unknown') {
      result.source = 'BluRay';
    }
  }

  return result;
};
