import type {
  CancellationType,
  CollectionStatus,
  Condition,
  GumStatus,
  ImageType,
  StampType,
  ValuationSource,
} from './types'

// Polskie etykiety dla wartości przechowywanych w bazie jako kody bez znaków diakrytycznych.

export const stampTypeLabels: Record<StampType, string> = {
  obiegowy: 'Obiegowy',
  okolicznosciowy: 'Okolicznościowy',
  lotniczy: 'Lotniczy',
  dobroczynny: 'Dobroczynny',
  doplata: 'Dopłata',
  sluzbowy: 'Służbowy',
  blok: 'Blok',
  arkusik: 'Arkusik',
  calostka: 'Całostka',
  inny: 'Inny',
}

export const conditionLabels: Record<Condition, string> = {
  bardzo_dobry: 'Bardzo dobry',
  dobry: 'Dobry',
  sredni: 'Średni',
  uszkodzony: 'Uszkodzony',
}

export const gumStatusLabels: Record<GumStatus, string> = {
  oryginalna: 'Oryginalna guma',
  bez_gumy: 'Bez gumy',
  podlepka: 'Ślad podlepki / podlepka',
  nie_dotyczy: 'Nie dotyczy',
  nieznany: 'Nie wiadomo',
}

export const cancellationLabels: Record<CancellationType, string> = {
  czysty: 'Czysty',
  stemplowany: 'Stemplowany',
  kasownik_specjalny: 'Kasownik specjalny',
}

export const collectionStatusLabels: Record<CollectionStatus, string> = {
  w_kolekcji: 'W kolekcji',
  na_wymiane: 'Na wymianę',
  na_sprzedaz: 'Na sprzedaż',
}

export const imageTypeLabels: Record<ImageType, string> = {
  awers: 'Awers',
  rewers: 'Rewers',
  detal: 'Detal',
}

export const valuationSourceLabels: Record<ValuationSource, string> = {
  katalog: 'Katalog',
  aukcja: 'Aukcja',
  ekspert: 'Ekspert',
  wlasna: 'Własna ocena',
}

export const CATALOG_SYSTEMS = ['Fischer', 'Michel', 'Scott', 'Yvert', 'Stanley Gibbons']
export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF']
