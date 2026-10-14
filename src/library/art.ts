/**
 * Sprite-library drawings. The SVG bodies are large (about 2.8 MB, 240 kB gzipped), so they are
 * loaded on demand in their own chunk rather than with the game.
 */

export type LibArtKind = 'block' | 'item' | 'effect' | 'particle' | 'creature';

let art: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

/** Load the library drawings (once). */
export function loadLibraryArt(): Promise<Record<string, string>> {
  loading ??= import('../generated/libraryArt').then((m) => (art = m.LIBRARY_ART));
  return loading;
}

/** A library drawing's SVG body, or undefined if it isn't loaded or doesn't exist. */
export function libArt(kind: LibArtKind, id: string): string | undefined {
  return art?.[`${kind}:${id}`];
}

/** Wrap a drawing body as a full SVG document in the shared icon box. */
export function libSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="112" height="112">${body}</svg>`;
}
