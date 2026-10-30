/** Temporary frontend seam; this does not define a Core or wire contract. */
export interface WorkbenchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type WorkbenchCommand = Readonly<{ type: string } & Record<string, unknown>>;

export interface WorkbenchRuntime {
  readonly mode: 'mock';
  load(): unknown;
  save(snapshot: unknown): boolean;
  createInitialState(): unknown;
  reduce(snapshot: unknown, command: WorkbenchCommand): unknown;
  readonly services: Readonly<Record<string, unknown>>;
}

/** UI-shell capability for explicit file exports; not a Core data API. */
export interface WorkbenchFileExport {
  save(file: { name: string; content: string; mimeType?: string }): Promise<string>;
}
