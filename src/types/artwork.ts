export interface Artwork {
  id: number
  title: string | null
  artist: string | null
  /** Start year. Years before the common era are negative. */
  year: number | null
  dateDisplay: string | null
  medium: string | null
  department: string | null
  artworkType: string | null
  placeOfOrigin: string | null
  style: string | null
  imageId: string
}
