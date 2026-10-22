// Typy odpowiadające tabelom z supabase/migrations/0001_schema.sql.

export type StampType =
  | 'obiegowy'
  | 'okolicznosciowy'
  | 'lotniczy'
  | 'dobroczynny'
  | 'doplata'
  | 'sluzbowy'
  | 'blok'
  | 'arkusik'
  | 'calostka'
  | 'inny'

export type Condition = 'bardzo_dobry' | 'dobry' | 'sredni' | 'uszkodzony'
export type GumStatus = 'oryginalna' | 'bez_gumy' | 'podlepka' | 'nie_dotyczy' | 'nieznany'
export type CancellationType = 'czysty' | 'stemplowany' | 'kasownik_specjalny'
export type CollectionStatus = 'w_kolekcji' | 'na_wymiane' | 'na_sprzedaz'

export interface Country {
  id: string
  name: string
  iso_code: string | null
  period: string | null
  sort_order: number
}

export interface Stamp {
  id: string
  name: string
  country_id: string
  issue_date: string | null
  issue_year: number | null
  catalog_number: string | null
  catalog_system: string | null
  series_id: string | null
  theme_id: string | null
  variant_of_id: string | null
  stamp_type: StampType | null
  face_value: number | null
  currency: string | null
  color: string | null
  perforation: string | null
  width_mm: number | null
  height_mm: number | null
  printing_method: string | null
  watermark: string | null
  designer: string | null
  print_run: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface StampOverview extends Stamp {
  country_name: string
  country_iso: string | null
  series_name: string | null
  theme_name: string | null
  owned_count: number
  primary_thumb_path: string | null
}

export interface Specimen {
  id: string
  stamp_id: string
  inventory_number: string | null
  condition: Condition | null
  gum_status: GumStatus | null
  cancellation_type: CancellationType | null
  purchase_date: string | null
  purchase_price: number | null
  purchase_currency: string | null
  purchase_source: string | null
  estimated_value: number | null
  estimated_value_currency: string | null
  storage_location_id: string | null
  collection_status: CollectionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StorageLocation {
  id: string
  album_name: string
  page_number: number | null
  pocket_number: number | null
  notes: string | null
}

export type ImageType = 'awers' | 'rewers' | 'detal'
export type ValuationSource = 'katalog' | 'aukcja' | 'ekspert' | 'wlasna'

export interface StampImage {
  id: string
  stamp_id: string
  specimen_id: string | null
  image_type: ImageType
  storage_path: string
  thumb_path: string | null
  is_primary: boolean
  created_at: string
}

export interface Valuation {
  id: string
  specimen_id: string
  valuation_date: string
  amount: number
  currency: string
  source: ValuationSource | null
  notes: string | null
}

export interface CatalogNumber {
  catalog_system: string
  catalog_number: string
}
