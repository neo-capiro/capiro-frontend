const MAX_QUEUED_BYTES = 8 * 1024 * 1024;
const PART_BYTES = 250 * 1024;
const ACK_TIMEOUT_MS = 10_000;

export interface AudioSaved {
  epochId: string;
  sequence: number;
  durableBytes: number;
  durableEndMs: number;
}

/** One bounded queue, ordered durable acknowledgements, immutable retry frames. */
export class HearingRecordingTransport {
  private chain: Promise<void> = Promise.resolve();
  private queuedBytes = 0;
  private pending: {
    sequence: number;
    resolve: () => void;
    reject: (error: Error) => void;
  } | null = null;
  private stopped = false;
  private nextSequence = 0;
  private nextTranscriptionSequence = 0;
  private transcriptionBlobEndMs = 0;
  private lastSaved = -1;
  private lastBlobEndMs = 0;
  private sentWindow: Array<{ at: number; bytes: number }> = [];
  constructor(
    private readonly socket: WebSocket,
    readonly epochId: string,
    private readonly onSaved: (ack: AudioSaved) => void,
    private readonly protocol: 1 | 2 = 1,
  ) {}

  get finalSequence() {
    return this.lastSaved;
  }
  get finalTranscriptionSequence() {
    return this.nextTranscriptionSequence - 1;
  }
  get backlogBytes() {
    return this.queuedBytes;
  }

  acknowledge(ack: AudioSaved) {
    if (ack.epochId !== this.epochId || ack.sequence !== this.pending?.sequence)
      return;
    this.lastSaved = ack.sequence;
    this.onSaved(ack);
    this.pending.resolve();
    this.pending = null;
  }

  enqueue(blob: Blob, endMs: number): Promise<void> {
    return this.enqueueLane(blob, endMs, false);
  }

  enqueueTranscription(blob: Blob, endMs: number): Promise<void> {
    if (this.protocol !== 2)
      return Promise.reject(
        new Error("Separate transcription requires video protocol 2"),
      );
    return this.enqueueLane(blob, endMs, true);
  }

  private enqueueLane(
    blob: Blob,
    endMs: number,
    transcription: boolean,
  ): Promise<void> {
    if (this.stopped)
      return Promise.reject(new Error("Media storage connection has stopped"));
    if (this.queuedBytes + blob.size > MAX_QUEUED_BYTES) {
      this.stop(
        new Error(
          "Media storage backlog exceeded 8 MB. The unsaved tail is incomplete; reconnect and share again.",
        ),
      );
      return Promise.reject(
        new Error(
          "Media storage backlog exceeded 8 MB; capture stopped with an unsaved tail.",
        ),
      );
    }
    this.queuedBytes += blob.size;
    this.chain = this.chain
      .then(async () => {
        for (let offset = 0; offset < blob.size; offset += PART_BYTES) {
          if (this.stopped)
            throw new Error("Media storage connection has stopped");
          const part = await blob
            .slice(offset, offset + PART_BYTES)
            .arrayBuffer();
          const frame = new ArrayBuffer(16 + part.byteLength),
            view = new DataView(frame);
          new Uint8Array(frame).set(
            this.protocol === 1
              ? [76, 87, 65, 52]
              : transcription
                ? [76, 87, 84, 53]
                : [76, 87, 86, 53],
          );
          const sequence = transcription
            ? this.nextTranscriptionSequence++
            : this.nextSequence++;
          view.setUint32(4, sequence);
          // A partial blob does not establish the full blob's saved time range.
          view.setFloat64(
            8,
            offset + PART_BYTES >= blob.size
              ? Math.round(endMs)
              : transcription
                ? this.transcriptionBlobEndMs
                : this.lastBlobEndMs,
          );
          new Uint8Array(frame, 16).set(new Uint8Array(part));
          if (transcription) {
            await this.pace(frame.byteLength);
            if (this.stopped || this.socket.readyState !== WebSocket.OPEN)
              throw new Error("Transcription connection interrupted");
            this.sentWindow.push({
              at: performance.now(),
              bytes: frame.byteLength,
            });
            this.socket.send(frame);
          } else await this.sendAndSave(frame, sequence);
        }
        if (transcription) this.transcriptionBlobEndMs = Math.round(endMs);
        else this.lastBlobEndMs = Math.round(endMs);
      })
      .finally(() => {
        this.queuedBytes -= blob.size;
      });
    return this.chain;
  }

  private async sendAndSave(frame: ArrayBuffer, sequence: number) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.pace(frame.byteLength);
      if (this.stopped || this.socket.readyState !== WebSocket.OPEN)
        throw new Error("Media storage connection interrupted");
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          this.pending = { sequence, resolve, reject };
          timer = setTimeout(
            () => reject(new Error("Media save acknowledgement timed out")),
            ACK_TIMEOUT_MS,
          );
          this.sentWindow.push({
            at: performance.now(),
            bytes: frame.byteLength,
          });
          this.socket.send(frame);
        });
        return;
      } catch (error) {
        if (this.stopped || attempt === 2) throw error;
      } finally {
        if (timer) clearTimeout(timer);
        this.pending = null;
      }
    }
  }

  private async pace(bytes: number) {
    for (;;) {
      const now = performance.now();
      this.sentWindow = this.sentWindow.filter((item) => now - item.at < 1020);
      if (
        this.sentWindow.reduce((sum, item) => sum + item.bytes, bytes) <=
        512 * 1024
      )
        return;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(1, 1020 - (now - this.sentWindow[0]!.at))),
      );
      if (this.stopped) throw new Error("Media storage connection has stopped");
    }
  }

  async drain() {
    await this.chain;
  }

  stop(
    error = new Error(
      "Media capture closed before its final save was confirmed",
    ),
  ) {
    this.stopped = true;
    this.pending?.reject(error);
    this.pending = null;
  }
}
