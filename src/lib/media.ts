/**
 * The barriers on an upload, and the probe that enforces them.
 *
 * Every check here runs twice: in the browser so the failure is instant and legible,
 * and again on the server because a client-side check is a courtesy, not a control.
 * This module is the single definition of both, so the two can't drift apart.
 *
 * The probe reads duration and codec out of the file itself rather than believing what
 * the browser said about it. It is deliberately small: enough of ISO base media format
 * (MP4/MOV) and EBML (WebM) to find a duration and a codec tag, and nothing more.
 */

/** Three minutes, hard. The recorder stops itself; a picked file is rejected. */
export const MAX_DURATION_SECONDS = 180;

/** Where the recorder starts warning. Fifteen seconds is enough to land a sentence. */
export const WARN_FROM_SECONDS = 165;

/**
 * A little slack on the duration check, because container timestamps and the wall
 * clock disagree by a frame or two and nobody should be rejected for that.
 */
export const DURATION_TOLERANCE_SECONDS = 2;

/** The hard cap. A compliant in-app recording lands at roughly 40% of it. */
export const MAX_BYTES = 50 * 1024 * 1024;

/** What a three-minute in-app recording should actually weigh. */
export const TARGET_BYTES = 20 * 1024 * 1024;

/**
 * The encode, set at the source. Nothing downstream can undo a bloated source, so
 * these two numbers are the most load-bearing constants in the app.
 */
export const VIDEO_BITS_PER_SECOND = 800_000;
export const AUDIO_BITS_PER_SECOND = 64_000;

/** 720p, portrait. Asked of the camera as an ideal, not demanded of it. */
export const CAPTURE_HEIGHT = 1280;
export const CAPTURE_WIDTH = 720;

/**
 * What we ask `MediaRecorder` for, best first.
 *
 * H.264 in MP4 is the only combination that plays everywhere without transcoding, so
 * it is asked for first and in a couple of spellings. Safari and Chrome both give it.
 * WebM is the fallback for a browser that can't (Firefox), and on R2 the upload barrier
 * turns that file away with a message rather than storing something an iPhone can't play.
 */
export const RECORDER_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

/** Containers we accept at all. Checked by header bytes, never by extension. */
export type Container = 'mp4' | 'mov' | 'webm';

export const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;

/** Codecs that play on every phone in a group without being transcoded first. */
export const UNIVERSAL_VIDEO_CODECS = ['avc1', 'avc3'] as const;

export interface ProbeResult {
  container: Container | null;
  /** Seconds, or null when the container doesn't record one (a live-written WebM). */
  durationSeconds: number | null;
  /** A short tag: `avc1`, `hvc1`, `vp09`, `V_VP8`. Null when it can't be read. */
  videoCodec: string | null;
  audioCodec: string | null;
}

export type ProblemCode =
  | 'empty'
  | 'too-big'
  | 'not-a-video'
  | 'too-long'
  | 'codec-unplayable';

export interface Problem {
  code: ProblemCode;
  /** Shown to the member as-is. Plain, never scolding, and always says what to do. */
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  problems: Problem[];
  probe: ProbeResult;
}

/* -------------------------------------------------------------------------- */
/* Container sniffing                                                         */
/* -------------------------------------------------------------------------- */

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = '';
  for (let i = offset; i < offset + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}

/**
 * Identifies the container from its header bytes.
 *
 * ISO base media files carry `ftyp` at byte 4; the brand after it separates a QuickTime
 * `.mov` from an MP4. Matroska and WebM open with the EBML magic number.
 */
export function sniffContainer(head: Uint8Array): Container | null {
  if (head.length >= 12 && ascii(head, 4, 4) === 'ftyp') {
    return ascii(head, 8, 4) === 'qt  ' ? 'mov' : 'mp4';
  }
  if (
    head.length >= 4 &&
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  ) {
    return 'webm';
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* ISO base media format (MP4, MOV)                                           */
/* -------------------------------------------------------------------------- */

/** Boxes we walk into. Everything else is skipped whole. */
const ISO_CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);

const KNOWN_AUDIO_FORMATS = new Set([
  'mp4a',
  'Opus',
  'opus',
  'ac-3',
  'ec-3',
  'alac',
  'sowt',
  'twos',
  'lpcm',
]);

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

function readU64(bytes: Uint8Array, offset: number): number {
  // Loses precision above 2^53, which no duration a three-minute video carries.
  return readU32(bytes, offset) * 2 ** 32 + readU32(bytes, offset + 4);
}

/**
 * Walks an ISO base media file for its duration and its codec tags.
 *
 * `moov` sits at the end of a file straight off an iPhone and near the front of one
 * written by a browser, so this walks the top-level boxes in order rather than
 * assuming either layout.
 */
export function probeIso(bytes: Uint8Array): Omit<ProbeResult, 'container'> {
  let durationSeconds: number | null = null;
  let videoCodec: string | null = null;
  let audioCodec: string | null = null;

  const walk = (start: number, end: number, depth: number): void => {
    let offset = start;
    // Eight bytes is the smallest a box can be, and twelve levels is far deeper than
    // any real file goes: a guard against a malformed file walking us in circles.
    while (offset + 8 <= end && depth < 12) {
      let size = readU32(bytes, offset);
      const type = ascii(bytes, offset + 4, 4);
      let headerSize = 8;

      if (size === 1) {
        if (offset + 16 > end) return;
        size = readU64(bytes, offset + 8);
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }

      if (size < headerSize || offset + size > end) return;

      const bodyStart = offset + headerSize;
      const bodyEnd = offset + size;

      if (ISO_CONTAINER_BOXES.has(type)) {
        walk(bodyStart, bodyEnd, depth + 1);
      } else if (type === 'mvhd' && durationSeconds === null) {
        // A zero is not a length. A fragmented MP4, which is what `MediaRecorder` writes
        // in both Safari and Chrome, declares zero here and indexes its samples in the
        // fragments instead. Reading it as null lets the caller fall back to the
        // recorder's own measurement rather than storing a waffle as 0:00.
        const version = bytes[bodyStart]!;
        if (version === 1 && bodyStart + 32 <= bodyEnd) {
          const timescale = readU32(bytes, bodyStart + 20);
          const duration = readU64(bytes, bodyStart + 24);
          if (timescale > 0 && duration > 0) durationSeconds = duration / timescale;
        } else if (version === 0 && bodyStart + 20 <= bodyEnd) {
          const timescale = readU32(bytes, bodyStart + 12);
          const duration = readU32(bytes, bodyStart + 16);
          if (timescale > 0 && duration > 0) durationSeconds = duration / timescale;
        }
      } else if (type === 'stsd' && bodyStart + 8 <= bodyEnd) {
        // version and flags, then the entry count, then entries of size + format.
        const entryCount = readU32(bytes, bodyStart + 4);
        let entry = bodyStart + 8;
        for (let i = 0; i < entryCount && entry + 8 <= bodyEnd; i++) {
          const entrySize = readU32(bytes, entry);
          const format = ascii(bytes, entry + 4, 4);
          if (KNOWN_AUDIO_FORMATS.has(format)) audioCodec ??= format;
          else videoCodec ??= format;
          if (entrySize < 8) break;
          entry += entrySize;
        }
      }

      offset = bodyEnd;
    }
  };

  walk(0, bytes.length, 0);
  return { durationSeconds, videoCodec, audioCodec };
}

/* -------------------------------------------------------------------------- */
/* EBML (WebM, Matroska)                                                      */
/* -------------------------------------------------------------------------- */

const EBML_SEGMENT = 0x18538067;
const EBML_INFO = 0x1549a966;
const EBML_TRACKS = 0x1654ae6b;
const EBML_TRACK_ENTRY = 0xae;
const EBML_TIMECODE_SCALE = 0x2ad7b1;
const EBML_DURATION = 0x4489;
const EBML_CODEC_ID = 0x86;
const EBML_TRACK_TYPE = 0x83;

const EBML_MASTERS = new Set([EBML_SEGMENT, EBML_INFO, EBML_TRACKS, EBML_TRACK_ENTRY]);

interface Vint {
  value: number;
  length: number;
  /** An all-ones size means "unknown length", which live-written WebM uses. */
  unknown: boolean;
}

function readVint(bytes: Uint8Array, offset: number, keepMarker: boolean): Vint | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset]!;
  if (first === 0) return null;

  let length = 1;
  while (length <= 8 && (first & (0x80 >> (length - 1))) === 0) length++;
  if (length > 8 || offset + length > bytes.length) return null;

  const mask = 0xff >> length;
  let value = keepMarker ? first : first & mask;
  let allOnes = (first & mask) === mask;
  for (let i = 1; i < length; i++) {
    const byte = bytes[offset + i]!;
    value = value * 256 + byte;
    if (byte !== 0xff) allOnes = false;
  }
  return { value, length, unknown: allOnes };
}

/** Reads duration and codec out of a WebM or Matroska file. */
export function probeEbml(bytes: Uint8Array): Omit<ProbeResult, 'container'> {
  let timecodeScale = 1_000_000; // nanoseconds, the spec default
  let rawDuration: number | null = null;
  let videoCodec: string | null = null;
  let audioCodec: string | null = null;

  const readTrackEntry = (start: number, end: number): void => {
    let codec: string | null = null;
    let trackType: number | null = null;
    let offset = start;
    while (offset < end) {
      const id = readVint(bytes, offset, true);
      if (!id) break;
      const size = readVint(bytes, offset + id.length, false);
      if (!size) break;
      const valueStart = offset + id.length + size.length;
      const valueEnd = Math.min(valueStart + size.value, end);
      if (id.value === EBML_CODEC_ID) {
        codec = ascii(bytes, valueStart, valueEnd - valueStart).replace(/\0+$/, '');
      } else if (id.value === EBML_TRACK_TYPE && valueEnd > valueStart) {
        trackType = bytes[valueStart]!;
      }
      if (valueEnd <= offset) break;
      offset = valueEnd;
    }
    // Track type 1 is video and 2 is audio, per the Matroska spec.
    if (codec) {
      if (trackType === 2) audioCodec ??= codec;
      else videoCodec ??= codec;
    }
  };

  const walk = (start: number, end: number, depth: number): void => {
    let offset = start;
    while (offset < end && depth < 8) {
      const id = readVint(bytes, offset, true);
      if (!id) return;
      const size = readVint(bytes, offset + id.length, false);
      if (!size) return;

      const bodyStart = offset + id.length + size.length;
      // An unknown-length element runs to the end of what we were given.
      const bodyEnd = size.unknown ? end : Math.min(bodyStart + size.value, end);
      if (bodyEnd < bodyStart) return;

      if (id.value === EBML_TRACK_ENTRY) {
        readTrackEntry(bodyStart, bodyEnd);
      } else if (EBML_MASTERS.has(id.value)) {
        walk(bodyStart, bodyEnd, depth + 1);
      } else if (id.value === EBML_TIMECODE_SCALE) {
        let scale = 0;
        for (let i = bodyStart; i < bodyEnd; i++) scale = scale * 256 + bytes[i]!;
        if (scale > 0) timecodeScale = scale;
      } else if (id.value === EBML_DURATION) {
        const length = bodyEnd - bodyStart;
        const view = new DataView(bytes.buffer, bytes.byteOffset + bodyStart, length);
        if (length === 4) rawDuration = view.getFloat32(0);
        else if (length === 8) rawDuration = view.getFloat64(0);
      }

      if (bodyEnd <= offset) return;
      offset = bodyEnd;
    }
  };

  walk(0, bytes.length, 0);

  return {
    // A WebM written live by `MediaRecorder` usually carries no duration at all.
    durationSeconds: rawDuration === null ? null : (rawDuration * timecodeScale) / 1_000_000_000,
    videoCodec,
    audioCodec,
  };
}

/* -------------------------------------------------------------------------- */
/* The whole check                                                            */
/* -------------------------------------------------------------------------- */

/** Container, plus whatever duration and codec the file admits to. */
export function probeVideo(bytes: Uint8Array): ProbeResult {
  const container = sniffContainer(bytes);
  if (container === null) {
    return { container: null, durationSeconds: null, videoCodec: null, audioCodec: null };
  }
  return { container, ...(container === 'webm' ? probeEbml(bytes) : probeIso(bytes)) };
}

/** True if this codec tag plays on any phone without being transcoded first. */
export function isUniversallyPlayable(videoCodec: string | null): boolean {
  if (!videoCodec) return false;
  if ((UNIVERSAL_VIDEO_CODECS as readonly string[]).includes(videoCodec)) return true;
  // Matroska spells H.264 differently.
  return videoCodec === 'V_MPEG4/ISO/AVC';
}

export interface ValidateOptions {
  /**
   * How much the provider will normalise for us. `transcoding` accepts anything it can
   * read and re-encodes it; `passthrough` (plain R2) has to serve the bytes as they
   * arrived, so a codec half the group can't decode becomes a real rejection.
   */
  codecPolicy?: 'transcoding' | 'passthrough';
  /**
   * What the client said the duration was. Used only when the container carries no
   * duration of its own, which is the normal case for a live-written WebM.
   */
  declaredDurationSeconds?: number | null;
}

/**
 * The whole barrier, in one place.
 *
 * Every message is written to be read by someone who has just recorded three minutes
 * about their week and would rather not do it again. It says what happened and what to
 * do next, and it never implies they have done something wrong.
 */
export function validateVideo(bytes: Uint8Array, options: ValidateOptions = {}): ValidationResult {
  const { codecPolicy = 'transcoding', declaredDurationSeconds = null } = options;
  const problems: Problem[] = [];
  const probe = probeVideo(bytes);

  if (bytes.length === 0) {
    return {
      ok: false,
      problems: [{ code: 'empty', message: 'That file was empty. Have another go.' }],
      probe,
    };
  }

  if (bytes.length > MAX_BYTES) {
    problems.push({
      code: 'too-big',
      message: `That's ${formatBytes(bytes.length)}, and the limit is ${formatBytes(MAX_BYTES)}. Record it here instead — it'll be quicker, and it comes out around ${formatBytes(TARGET_BYTES)}.`,
    });
  }

  if (probe.container === null) {
    problems.push({
      code: 'not-a-video',
      message: "That doesn't look like a video file. It needs to be an .mp4, .mov or .webm.",
    });
    return { ok: false, problems, probe };
  }

  const duration = probe.durationSeconds ?? declaredDurationSeconds;
  if (duration !== null && duration > MAX_DURATION_SECONDS + DURATION_TOLERANCE_SECONDS) {
    problems.push({
      code: 'too-long',
      message: `That runs ${Math.round(duration)} seconds, and three minutes is the cap. Trim it, or record it here and the timer will stop you at 3:00.`,
    });
  }

  if (codecPolicy === 'passthrough' && !isUniversallyPlayable(probe.videoCodec)) {
    problems.push({
      code: 'codec-unplayable',
      message:
        "That video is in a format some of the group's phones can't play. Record it here instead and it'll work everywhere.",
    });
  }

  return { ok: problems.length === 0, problems, probe };
}

/** `19.4 MB` — a size as a person reads it. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  // One decimal place, because the interesting comparison is 19.4 MB against a 50 MB
  // cap and rounding that to "19 MB" throws away the only digit anyone cares about.
  const megabytes = bytes / (1024 * 1024);
  const rounded = Math.round(megabytes * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} MB`;
}

/** The file extension to store a container under. */
export function extensionFor(container: Container): string {
  if (container === 'mov') return 'mov';
  if (container === 'webm') return 'webm';
  return 'mp4';
}

/** The content type to serve a container as. */
export function contentTypeFor(container: Container): string {
  if (container === 'mov') return 'video/quicktime';
  if (container === 'webm') return 'video/webm';
  return 'video/mp4';
}
