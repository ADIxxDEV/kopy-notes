export type LiveCommentKind = 'youtube' | 'url';
export interface LiveCommentSource { kind: LiveCommentKind; url: string; externalUrl: string; label: string; }
export interface SavedCommentConnection { kind: LiveCommentKind; input: string; }
export const LIVE_COMMENTS_STORAGE_KEY = 'kopy-notes.live-comments.connection.v1';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com']);

/** Resolve only explicit video URLs, never arbitrary hosts or channel/live shortcuts. */
export function parseYouTubeVideoId(input: string): string {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url: URL;
  try { url = new URL(/^(?:(?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\//i.test(value) ? `https://${value}` : value); }
  catch { throw new Error('Enter an 11-character YouTube video ID or a YouTube watch, live or youtu.be video URL.'); }
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error('Use a YouTube video URL without credentials or a custom port.');
  let id: string | null = null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
    if (segments.length === 1) id = segments[0];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === '/watch' || url.pathname === '/live_chat' || url.pathname === '/live_chat_replay') id = url.searchParams.get('v');
    else if (segments.length === 2 && ['live','embed','shorts'].includes(segments[0])) id = segments[1];
  }
  if (!id || !VIDEO_ID.test(id)) throw new Error('This URL needs a specific YouTube video ID. Open the live stream and copy its watch or live URL.');
  return id;
}

/** https://support.google.com/youtube/answer/2524549 — embed_domain is the page hostname. */
export function resolveLiveCommentSource(input: string, kind: LiveCommentKind, hostname: string, currentOrigin: string): LiveCommentSource {
  if (kind === 'youtube') {
    const id = parseYouTubeVideoId(input);
    const url = new URL('https://www.youtube.com/live_chat');
    url.searchParams.set('v',id); url.searchParams.set('embed_domain',hostname);
    return {kind,url:url.href,externalUrl:`https://www.youtube.com/watch?v=${id}`,label:`YouTube live chat · ${id}`};
  }
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a complete HTTPS comment URL.'); }
  if (url.protocol !== 'https:') throw new Error('Comment URLs must start with https://.');
  if (url.username || url.password) throw new Error('Use a comment URL without embedded usernames or passwords.');
  if (url.origin === currentOrigin) throw new Error('Use an external comment page, rather than embedding Kopy Notes inside itself.');
  return {kind,url:url.href,externalUrl:url.href,label:url.hostname};
}

export function readSavedCommentConnection(value: string | null): SavedCommentConnection | null {
  if (!value) return null;
  try {
    const saved: unknown = JSON.parse(value);
    if (!saved || typeof saved !== 'object') return null;
    const record = saved as Record<string,unknown>;
    if ((record.kind !== 'youtube' && record.kind !== 'url') || typeof record.input !== 'string' || record.input.length > 4096) return null;
    return {kind:record.kind,input:record.input};
  } catch { return null; }
}
