import {
  cancellationLabels,
  collectionStatusLabels,
  conditionLabels,
  CURRENCIES,
  gumStatusLabels,
  valuationSourceLabels,
} from '../lib/labels'
import type { SpecimenDraft } from '../lib/specimens'
import { Field, FieldGroup } from './form'

interface Props {
  value: SpecimenDraft
  onChange: (patch: Partial<SpecimenDraft>) => void
  albums: string[]
}

function Options({ labels }: { labels: Record<string, string> }) {
  return (
    <>
      <option value="">—</option>
      {Object.entries(labels).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </>
  )
}

// Sekcja D: pola konkretnego egzemplarza — wspólne dla formularza znaczka i egzemplarza.
export function SpecimenFields({ value: d, onChange, albums }: Props) {
  const text = (key: keyof SpecimenDraft) => ({
    value: d[key],
    onChange: (e: { target: { value: string } }) => onChange({ [key]: e.target.value }),
  })

  return (
    <div className="space-y-6">
      <FieldGroup title="Stan">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Numer własny egzemplarza" hint="Zostaw puste — numer nada się sam.">
            <input className="input font-mono" placeholder="np. PL-000001" {...text('inventory_number')} />
          </Field>
          <Field label="Status">
            <select className="input" {...text('collection_status')}>
              {Object.entries(collectionStatusLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Rodzaj kasowania">
            <select className="input" {...text('cancellation_type')}>
              <Options labels={cancellationLabels} />
            </select>
          </Field>
          <Field label="Stan zachowania">
            <select className="input" {...text('condition')}>
              <Options labels={conditionLabels} />
            </select>
          </Field>
          <Field label="Stan gumy">
            <select className="input" {...text('gum_status')}>
              <Options labels={gumStatusLabels} />
            </select>
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Zakup i wycena">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data pozyskania">
            <input className="input" type="date" {...text('purchase_date')} />
          </Field>
          <Field label="Źródło pozyskania">
            <input className="input" placeholder="np. giełda, aukcja, wymiana" {...text('purchase_source')} />
          </Field>
          <Field label="Cena zakupu">
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
              <input className="input font-mono" inputMode="decimal" placeholder="0,00" {...text('purchase_price')} />
              <select className="input" aria-label="Waluta zakupu" {...text('purchase_currency')}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Szacowana wartość" hint="Każda zmiana wartości trafia do historii wycen.">
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
              <input className="input font-mono" inputMode="decimal" placeholder="0,00" {...text('estimated_value')} />
              <select className="input" aria-label="Waluta wyceny" {...text('estimated_value_currency')}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Źródło wyceny">
            <select className="input" {...text('valuation_source')}>
              <Options labels={valuationSourceLabels} />
            </select>
          </Field>
          <Field label="Data wyceny">
            <input className="input" type="date" {...text('valuation_date')} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Miejsce w klaserze">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_112px_112px]">
          <Field label="Klaser / album">
            <input className="input" list="albums-list" placeholder="np. Klaser Polska 1945–1989" {...text('album_name')} />
            <datalist id="albums-list">
              {albums.map((a) => <option key={a} value={a} />)}
            </datalist>
          </Field>
          <Field label="Strona">
            <input className="input font-mono" inputMode="numeric" {...text('page_number')} />
          </Field>
          <Field label="Kieszonka">
            <input className="input font-mono" inputMode="numeric" {...text('pocket_number')} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Notatki">
        <textarea className="input min-h-24" aria-label="Notatki o egzemplarzu" placeholder="Wady, odmiany, pochodzenie…" {...text('notes')} />
      </FieldGroup>
    </div>
  )
}
