/**
 * Group slugs, from a name. Pure, so it is unit-tested.
 *
 * The slug is the group's address (`/g/fwsh`), so it has to match the check on
 * `groups.slug`: lowercase letters and digits in runs joined by single hyphens.
 */

export function slugFor(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return slug.length > 0 ? slug : 'group';
}

/** A variant for when the plain slug is taken: a short random tail, still valid. */
export function slugWithSuffix(slug: string): string {
  const tail = Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, '') || 'x';
  return `${slug}-${tail}`;
}
