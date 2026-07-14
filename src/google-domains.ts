/**
 * Enumerated Google search domains.
 *
 * Rule (spec §3.4): NEVER use a TLD wildcard — a pattern with a wildcard TLD does not
 * compile. A *subdomain* wildcard is legal and required: Google 301-redirects every bare
 * ccTLD to its www host (google.it -> www.google.it, verified live), so patterns must cover
 * both. `*://*.google.it/...` matches google.it AND any subdomain of it.
 */
export const GOOGLE_DOMAINS: readonly string[] = [
  'google.com',
  'google.ad',
  'google.ae',
  'google.com.ar',
  'google.at',
  'google.com.au',
  'google.be',
  'google.bg',
  'google.com.br',
  'google.ca',
  'google.ch',
  'google.cl',
  'google.com.co',
  'google.co.cr',
  'google.cz',
  'google.de',
  'google.dk',
  'google.com.ec',
  'google.ee',
  'google.es',
  'google.fi',
  'google.fr',
  'google.gr',
  'google.com.hk',
  'google.hr',
  'google.hu',
  'google.co.id',
  'google.ie',
  'google.co.il',
  'google.co.in',
  'google.is',
  'google.it',
  'google.co.jp',
  'google.co.kr',
  'google.lt',
  'google.lu',
  'google.lv',
  'google.com.mx',
  'google.com.my',
  'google.nl',
  'google.no',
  'google.co.nz',
  'google.com.pe',
  'google.com.ph',
  'google.pl',
  'google.pt',
  'google.com.sa',
  'google.se',
  'google.com.sg',
  'google.si',
  'google.sk',
  'google.co.th',
  'google.com.tr',
  'google.com.tw',
  'google.com.ua',
  'google.co.uk',
  'google.com.uy',
  'google.co.ve',
  'google.co.za',
];

/**
 * MV3 match patterns for host_permissions, scoped to /search.
 * `*.d` matches the bare domain and every subdomain (www. included).
 */
export const GOOGLE_MATCH_PATTERNS: readonly string[] = GOOGLE_DOMAINS.map(
  (host) => `*://*.${host}/search*`,
);

/**
 * webNavigation event filter. hostSuffix('.d') covers www.d and any subdomain; hostEquals(d)
 * covers the bare domain (hostSuffix is a plain string suffix — a leading dot is required,
 * or 'evilgoogle.it' would match too).
 */
export const GOOGLE_NAV_FILTER: {
  url: Array<{ hostEquals?: string; hostSuffix?: string; pathPrefix: string }>;
} = {
  url: GOOGLE_DOMAINS.flatMap((d) => [
    { hostEquals: d, pathPrefix: '/search' },
    { hostSuffix: `.${d}`, pathPrefix: '/search' },
  ]),
};

/** Runtime guard: is this URL a Google SERP we manage? (bare domain or any subdomain) */
export function isGoogleSerp(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname;
    return (
      url.pathname.startsWith('/search') &&
      GOOGLE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
    );
  } catch {
    return false;
  }
}
