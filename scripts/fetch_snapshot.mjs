// Regenerates src/data/starter-snapshot.json, the copy of the starter
// collection the app falls back to when the Art Institute API is unreachable.
//
// Usage: node scripts/fetch_snapshot.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PER_DEPARTMENT = 30
const FIELDS =
  'id,title,artist_title,date_start,date_display,medium_display,' +
  'department_title,artwork_type_title,place_of_origin,style_title,image_id'

const source = readFileSync(join(root, 'src/collection/departments.ts'), 'utf8')
const departments = [...source.matchAll(/^ {2}'(.+)',$/gm)].map((m) => m[1])
if (departments.length === 0) throw new Error('No departments found')

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

const works = []
for (const department of departments) {
  const params = new URLSearchParams({
    'query[bool][filter][0][term][is_public_domain]': 'true',
    'query[bool][filter][1][exists][field]': 'image_id',
    'query[bool][filter][2][term][department_title.keyword]': department,
    limit: String(PER_DEPARTMENT),
    fields: FIELDS,
  })
  const response = await fetch(`https://api.artic.edu/api/v1/artworks/search?${params}`, {
    headers: { 'AIC-User-Agent': 'cs409-mp2 (student project)' },
  })
  if (!response.ok) throw new Error(`${department}: HTTP ${response.status}`)
  const { data } = await response.json()
  const mapped = data
    .filter((raw) => text(raw.image_id) && raw.department_title === department)
    .map((raw) => ({
      id: raw.id,
      title: text(raw.title),
      artist: text(raw.artist_title),
      year: typeof raw.date_start === 'number' ? raw.date_start : null,
      dateDisplay: text(raw.date_display),
      medium: text(raw.medium_display),
      department: text(raw.department_title),
      artworkType: text(raw.artwork_type_title),
      placeOfOrigin: text(raw.place_of_origin),
      style: text(raw.style_title),
      imageId: text(raw.image_id),
    }))
  console.log(`${String(mapped.length).padStart(3)}  ${department}`)
  works.push(...mapped)
}

writeFileSync(join(root, 'src/data/starter-snapshot.json'), JSON.stringify(works, null, 1) + '\n')
console.log(`${works.length} works written to src/data/starter-snapshot.json`)
