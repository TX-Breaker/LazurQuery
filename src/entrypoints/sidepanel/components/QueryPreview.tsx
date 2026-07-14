import { useMemo, useState } from 'react';
import { serializeUrl } from '../../../core/builder';
import { t } from '../../../i18n';

/**
 * Strip session/tracking params (sxsrf, ved, uact…) for display and copy: the cleaned link
 * is fully functional (q/tbs/udm carry the whole search) and far less intimidating for a lay
 * user. Apply still uses the full mutate-not-replace URL — this cleanup is presentation only.
 */
const KEEP = new Set(['q', 'tbs', 'udm', 'hl', 'gl']);
function cleanUrl(raw: string): string {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) {
    if (!KEEP.has(key)) url.searchParams.delete(key);
  }
  return serializeUrl(url);
}

/** Readable preview of the query + shareable link, with a Copy button (spec §3.6). */
export function QueryPreview({ url, query }: { url: string; query: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => cleanUrl(url), [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      <p className="lq-section-title" style={{ marginBottom: 6 }}>
        {t('preview_title')}
      </p>

      <span className="lq-desc">{t('preview_query_label')}</span>
      {query ? (
        <div className="lq-code" style={{ marginTop: 3 }}>
          {query}
        </div>
      ) : (
        <p className="lq-desc" style={{ marginTop: 3 }}>
          {t('preview_none')}
        </p>
      )}

      <div className="lq-row" style={{ justifyContent: 'space-between', marginTop: 8, marginBottom: 3 }}>
        <span className="lq-desc">{t('preview_url_label')}</span>
        <button type="button" className="lq-btn lq-btn-sm" onClick={copy}>
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <div className="lq-code lq-muted" style={{ fontSize: 11 }}>
        {shareUrl}
      </div>
    </div>
  );
}
