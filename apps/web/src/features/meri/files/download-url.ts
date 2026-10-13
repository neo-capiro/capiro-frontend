/** Owns only a local verified-download resource; it never fetches or admits bytes. */
export class DocumentDownloadUrl {
  #value: string | null = null;
  #create: (blob: Blob) => string;
  #revoke: (url: string) => void;

  constructor(
    create: (blob: Blob) => string = (blob) => URL.createObjectURL(blob),
    revoke: (url: string) => void = (url) => URL.revokeObjectURL(url),
  ) {
    this.#create = create;
    this.#revoke = revoke;
  }

  get current() {
    return this.#value;
  }

  replace(blob: Blob) {
    this.clear();
    this.#value = this.#create(blob);
    return this.#value;
  }

  clear() {
    const value = this.#value;
    this.#value = null;
    if (value !== null) this.#revoke(value);
  }
}
