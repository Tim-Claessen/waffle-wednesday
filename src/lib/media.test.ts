import { describe, expect, it } from 'vitest';
import {
  MAX_BYTES,
  MAX_DURATION_SECONDS,
  contentTypeFor,
  extensionFor,
  formatBytes,
  isUniversallyPlayable,
  probeVideo,
  sniffContainer,
  validateVideo,
} from './media.js';

/* -------------------------------------------------------------------------- */
/* Builders: the smallest files that are genuinely the shape of the real ones. */
/* -------------------------------------------------------------------------- */

const encoder = new TextEncoder();

function bytes(...parts: Array<Uint8Array | number[] | string>): Uint8Array {
  const chunks = parts.map((part) =>
    typeof part === 'string'
      ? encoder.encode(part)
      : part instanceof Uint8Array
        ? part
        : new Uint8Array(part),
  );
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

function u64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(value));
  return out;
}

/** An ISO box: length prefix, four-character type, body. */
function box(type: string, body: Uint8Array): Uint8Array {
  return bytes(u32(body.length + 8), type, body);
}

function mvhd(durationSeconds: number, timescale = 1000): Uint8Array {
  return box(
    'mvhd',
    bytes(
      [0, 0, 0, 0], // version 0, flags
      u32(0), // created
      u32(0), // modified
      u32(timescale),
      u32(Math.round(durationSeconds * timescale)),
    ),
  );
}

function mvhdV1(durationSeconds: number, timescale = 90_000): Uint8Array {
  return box(
    'mvhd',
    bytes(
      [1, 0, 0, 0], // version 1, flags
      u64(0), // created
      u64(0), // modified
      u32(timescale),
      u64(Math.round(durationSeconds * timescale)),
    ),
  );
}

function stsd(...formats: string[]): Uint8Array {
  const entries = formats.map((format) => bytes(u32(16), format, [0, 0, 0, 0, 0, 0, 0, 0]));
  return box('stsd', bytes([0, 0, 0, 0], u32(formats.length), ...entries));
}

/** A trak deep enough that the probe has to descend four levels to find the codec. */
function trak(...formats: string[]): Uint8Array {
  return box('trak', box('mdia', box('minf', box('stbl', stsd(...formats)))));
}

interface Mp4Options {
  brand?: string;
  duration?: number;
  formats?: string[];
  /** iPhone files put moov last; browser-written files put it first. */
  moovLast?: boolean;
  version1?: boolean;
}

function mp4({
  brand = 'isom',
  duration = 100,
  formats = ['avc1', 'mp4a'],
  moovLast = false,
  version1 = false,
}: Mp4Options = {}): Uint8Array {
  const ftyp = box('ftyp', bytes(brand, 'isomiso2avc1mp41'));
  const moov = box(
    'moov',
    bytes(version1 ? mvhdV1(duration) : mvhd(duration), ...formats.map((format) => trak(format))),
  );
  // An mdat big enough to prove the walker skips it rather than reading into it.
  const mdat = box('mdat', new Uint8Array(512));
  return moovLast ? bytes(ftyp, mdat, moov) : bytes(ftyp, moov, mdat);
}

/** An EBML variable-length integer, in the shortest encoding that fits. */
function vint(value: number): Uint8Array {
  for (let length = 1; length <= 8; length++) {
    const limit = 2 ** (7 * length) - 1;
    if (value < limit) {
      const out = new Uint8Array(length);
      let remaining = value;
      for (let i = length - 1; i >= 0; i--) {
        out[i] = remaining & 0xff;
        remaining = Math.floor(remaining / 256);
      }
      out[0] = out[0]! | (0x80 >> (length - 1));
      return out;
    }
  }
  throw new Error('value too large for a vint');
}

/** An EBML element: raw id bytes, a length vint, then the body. */
function element(id: number[], body: Uint8Array): Uint8Array {
  return bytes(id, vint(body.length), body);
}

function float64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, value);
  return out;
}

interface WebmOptions {
  duration?: number | null;
  timecodeScale?: number;
  videoCodec?: string;
  audioCodec?: string;
}

function webm({
  duration = 100,
  timecodeScale = 1_000_000,
  videoCodec = 'V_VP9',
  audioCodec = 'A_OPUS',
}: WebmOptions = {}): Uint8Array {
  const header = element([0x1a, 0x45, 0xdf, 0xa3], bytes([0x42, 0x86, 0x81, 0x01]));
  const info = element(
    [0x15, 0x49, 0xa9, 0x66],
    bytes(
      element([0x2a, 0xd7, 0xb1], u32(timecodeScale)),
      duration === null
        ? new Uint8Array(0)
        : element([0x44, 0x89], float64((duration * 1_000_000_000) / timecodeScale)),
    ),
  );
  const tracks = element(
    [0x16, 0x54, 0xae, 0x6b],
    bytes(
      element(
        [0xae],
        bytes(element([0x83], bytes([1])), element([0x86], bytes(videoCodec))),
      ),
      element(
        [0xae],
        bytes(element([0x83], bytes([2])), element([0x86], bytes(audioCodec))),
      ),
    ),
  );
  const segment = element([0x18, 0x53, 0x80, 0x67], bytes(info, tracks));
  return bytes(header, segment);
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('sniffContainer', () => {
  it('reads the container out of the header, never the extension', () => {
    expect(sniffContainer(mp4())).toBe('mp4');
    expect(sniffContainer(mp4({ brand: 'qt  ' }))).toBe('mov');
    expect(sniffContainer(webm())).toBe('webm');
  });

  it('refuses anything that is not a video container', () => {
    expect(sniffContainer(bytes('not a video at all, just some text'))).toBe(null);
    expect(sniffContainer(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(null); // a PNG
    expect(sniffContainer(new Uint8Array(0))).toBe(null);
    // A file whose name would pass but whose bytes would not.
    expect(sniffContainer(bytes('ftypmp42 but not at byte four'))).toBe(null);
  });
});

describe('probeVideo on ISO base media files', () => {
  it('finds the duration and both codecs', () => {
    const result = probeVideo(mp4({ duration: 161, formats: ['avc1', 'mp4a'] }));
    expect(result.container).toBe('mp4');
    expect(result.durationSeconds).toBeCloseTo(161, 3);
    expect(result.videoCodec).toBe('avc1');
    expect(result.audioCodec).toBe('mp4a');
  });

  it('finds a moov that sits after the media data, as it does off an iPhone', () => {
    const result = probeVideo(mp4({ duration: 200, moovLast: true, formats: ['hvc1', 'mp4a'] }));
    expect(result.durationSeconds).toBeCloseTo(200, 3);
    expect(result.videoCodec).toBe('hvc1');
  });

  it('reads a 64-bit version 1 movie header', () => {
    const result = probeVideo(mp4({ duration: 175, version1: true }));
    expect(result.durationSeconds).toBeCloseTo(175, 3);
  });

  it('returns nulls rather than throwing on a truncated file', () => {
    const truncated = mp4().slice(0, 30);
    expect(() => probeVideo(truncated)).not.toThrow();
    expect(probeVideo(truncated).container).toBe('mp4');
  });

  it('survives a box claiming a length longer than the file', () => {
    const lying = bytes(box('ftyp', bytes('isom')), u32(0xffffff), 'moov');
    expect(() => probeVideo(lying)).not.toThrow();
  });
});

describe('probeVideo on WebM files', () => {
  it('finds the duration and the codecs', () => {
    const result = probeVideo(webm({ duration: 161 }));
    expect(result.container).toBe('webm');
    expect(result.durationSeconds).toBeCloseTo(161, 3);
    expect(result.videoCodec).toBe('V_VP9');
    expect(result.audioCodec).toBe('A_OPUS');
  });

  it('honours a non-default timecode scale', () => {
    const result = probeVideo(webm({ duration: 90, timecodeScale: 100_000 }));
    expect(result.durationSeconds).toBeCloseTo(90, 3);
  });

  it('reports no duration when the file carries none, as a live recording does', () => {
    const result = probeVideo(webm({ duration: null }));
    expect(result.durationSeconds).toBe(null);
    expect(result.videoCodec).toBe('V_VP9');
  });
});

describe('validateVideo', () => {
  const ok = (result: ReturnType<typeof validateVideo>) => result.problems.map((p) => p.code);

  it('accepts a compliant in-app recording', () => {
    const result = validateVideo(mp4({ duration: 178 }));
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it('rejects a file over the size cap and points at the recorder', () => {
    const big = bytes(mp4({ duration: 60 }), new Uint8Array(MAX_BYTES));
    const result = validateVideo(big);
    expect(ok(result)).toContain('too-big');
    expect(result.problems[0]!.message).toMatch(/Record it here instead/);
  });

  it('rejects anything that is not a video', () => {
    const result = validateVideo(bytes('this is a text file with a .mp4 name'));
    expect(ok(result)).toEqual(['not-a-video']);
  });

  it('rejects an over-length file on the duration in the container, not the claim', () => {
    // The client says two minutes; the file says five. The file wins.
    const result = validateVideo(mp4({ duration: 300 }), { declaredDurationSeconds: 120 });
    expect(ok(result)).toContain('too-long');
  });

  it('allows a couple of seconds of slack at the cap', () => {
    expect(validateVideo(mp4({ duration: MAX_DURATION_SECONDS + 1 })).ok).toBe(true);
    expect(validateVideo(mp4({ duration: MAX_DURATION_SECONDS + 10 })).ok).toBe(false);
  });

  it('falls back to the declared duration only when the container has none', () => {
    const live = webm({ duration: null });
    expect(validateVideo(live, { declaredDurationSeconds: 100 }).ok).toBe(true);
    expect(ok(validateVideo(live, { declaredDurationSeconds: 600 }))).toContain('too-long');
    // Nothing declared and nothing in the container: the recorder's own hard stop is
    // the only control left, so this passes rather than rejecting a valid waffle.
    expect(validateVideo(live).ok).toBe(true);
  });

  it('tolerates any codec when the provider transcodes', () => {
    expect(validateVideo(mp4({ formats: ['hvc1'] })).ok).toBe(true);
    expect(validateVideo(webm({ videoCodec: 'V_VP8' })).ok).toBe(true);
  });

  it('rejects a codec the group cannot all play when nothing transcodes', () => {
    const passthrough = { codecPolicy: 'passthrough' } as const;
    // HEVC off an iPhone camera roll: Android and Chrome cannot decode it.
    expect(ok(validateVideo(mp4({ formats: ['hvc1'] }), passthrough))).toContain('codec-unplayable');
    expect(ok(validateVideo(webm({ videoCodec: 'V_VP8' }), passthrough))).toContain('codec-unplayable');
    expect(validateVideo(mp4({ formats: ['avc1'] }), passthrough).ok).toBe(true);
    expect(validateVideo(webm({ videoCodec: 'V_MPEG4/ISO/AVC' }), passthrough).ok).toBe(true);
  });

  it('rejects an empty file without pretending to know more', () => {
    const result = validateVideo(new Uint8Array(0));
    expect(ok(result)).toEqual(['empty']);
  });

  it('collects every problem rather than stopping at the first', () => {
    const big = bytes(mp4({ duration: 400 }), new Uint8Array(MAX_BYTES));
    expect(ok(validateVideo(big))).toEqual(['too-big', 'too-long']);
  });
});

describe('codec policy', () => {
  it('knows which tags play everywhere', () => {
    expect(isUniversallyPlayable('avc1')).toBe(true);
    expect(isUniversallyPlayable('avc3')).toBe(true);
    expect(isUniversallyPlayable('V_MPEG4/ISO/AVC')).toBe(true);
    expect(isUniversallyPlayable('hvc1')).toBe(false);
    expect(isUniversallyPlayable('vp09')).toBe(false);
    expect(isUniversallyPlayable(null)).toBe(false);
  });
});

describe('presentation helpers', () => {
  it('writes sizes the way a person reads them', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(20 * 1024)).toBe('20 KB');
    expect(formatBytes(Math.round(19.4 * 1024 * 1024))).toBe('19.4 MB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
  });

  it('maps containers to extensions and content types', () => {
    expect(extensionFor('mp4')).toBe('mp4');
    expect(extensionFor('mov')).toBe('mov');
    expect(extensionFor('webm')).toBe('webm');
    expect(contentTypeFor('mp4')).toBe('video/mp4');
    expect(contentTypeFor('mov')).toBe('video/quicktime');
    expect(contentTypeFor('webm')).toBe('video/webm');
  });
});
