/**
 * Turns what `MediaRecorder` writes into an ordinary MP4. Browser only.
 *
 * Both Safari and Chrome record *fragmented* MP4: the header comes first but declares a
 * duration of zero, and the samples are indexed fragment by fragment as they were written.
 * Served as-is, a player has to download much of the file before it knows how long it is
 * or can seek, and anything outside a browser may never show a length at all.
 *
 * This rewrites the same H.264 and AAC packets into a regular MP4 with one index at the
 * front and a real duration. No decoding and no encoding: `copy: 'forced'` either copies a
 * track untouched or drops it, and a dropped track makes this give up and hand back the
 * original. The worst case is therefore the file we would have uploaded anyway.
 *
 * Mediabunny is imported on demand, so the recorder page doesn't load it until there is a
 * recording to tidy up.
 */
export async function remuxToPlainMp4(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith('video/mp4')) return blob;

  try {
    const { BlobSource, BufferTarget, Conversion, Input, MP4, Mp4OutputFormat, Output, QTFF } =
      await import('mediabunny');

    const input = new Input({ source: new BlobSource(blob), formats: [MP4, QTFF] });
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
      // Any shift keeps audio and video in sync with each other; it only gives up matching
      // the recorder's absolute timestamps, which nothing here reads.
      copy: { mode: 'forced', shiftTolerance: Infinity },
      showWarnings: false,
    });
    if (!conversion.isValid || conversion.discardedTracks.length > 0) return blob;

    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) return blob;
    return new Blob([buffer], { type: 'video/mp4' });
  } catch {
    return blob;
  }
}
