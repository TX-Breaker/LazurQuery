/**
 * UI control descriptors, keyed by filter id. Kept in the UI layer (not in core/registry,
 * which owns URL logic only) so the two concerns stay decoupled. The form is still
 * registry-driven: App iterates REGISTRY for presence/section/label/kill-switch and looks the
 * control up here. Adding a filter of an existing control kind is registry + one line here.
 */
import type { FilterState } from '../../core/types';

export type Control =
  | { kind: 'list'; placeholderKey: string; addKey: string; sites?: boolean }
  | { kind: 'select'; anyKey: string; options: { value: string; labelKey: string }[] }
  | { kind: 'date' }
  | { kind: 'toggle'; descKey: string };

export const CONTROLS: Partial<Record<keyof FilterState, Control>> = {
  exactPhrases: { kind: 'list', placeholderKey: 'exact_placeholder', addKey: 'add_phrase' },
  includeDomains: { kind: 'list', placeholderKey: 'domain_placeholder', addKey: 'add_domain', sites: true },
  excludeDomains: {
    kind: 'list',
    placeholderKey: 'exclude_domain_placeholder',
    addKey: 'add_domain',
    sites: true,
  },
  excludeTerms: { kind: 'list', placeholderKey: 'term_placeholder', addKey: 'add_term' },
  fileTypes: {
    kind: 'select',
    anyKey: 'filetype_any',
    options: [
      { value: 'pdf', labelKey: 'filetype_pdf' },
      { value: 'doc', labelKey: 'filetype_doc' },
      { value: 'docx', labelKey: 'filetype_docx' },
      { value: 'xls', labelKey: 'filetype_xls' },
      { value: 'xlsx', labelKey: 'filetype_xlsx' },
      { value: 'ppt', labelKey: 'filetype_ppt' },
      { value: 'pptx', labelKey: 'filetype_pptx' },
      { value: 'csv', labelKey: 'filetype_csv' },
      { value: 'txt', labelKey: 'filetype_txt' },
    ],
  },
  date: { kind: 'date' },
  pureMode: { kind: 'toggle', descKey: 'puremode_desc' },
};

/** Common sites for the quick-add chips on domain fields. Brand names kept verbatim. */
export const COMMON_SITES: { label: string; domain: string }[] = [
  { label: 'YouTube', domain: 'youtube.com' },
  { label: 'Reddit', domain: 'reddit.com' },
  { label: 'Pinterest', domain: 'pinterest.com' },
  { label: 'Facebook', domain: 'facebook.com' },
  { label: 'Instagram', domain: 'instagram.com' },
  { label: 'TikTok', domain: 'tiktok.com' },
  { label: 'X', domain: 'twitter.com' },
  { label: 'Quora', domain: 'quora.com' },
  { label: 'Amazon', domain: 'amazon.com' },
  { label: 'Stack Overflow', domain: 'stackoverflow.com' },
];
