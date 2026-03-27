import { Label } from '@/components/ui/label';
import { formatNumber } from '@/hooks/use-currency';
import type { VersementDetail } from '@/types/student';

const selectCls = "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// ── State shape ──────────────────────────────────────────

export type ScholarshipConfig = {
  /** Main scholarship type */
  type: '' | 'complete' | 'tuition';
  /** Which versements to cancel: none, all, or pick specific ones */
  versementCancel: 'none' | 'all' | 'pick';
  /** IDs of individually picked versements */
  pickedVersementIds: string[];
  /** Whether to waive the book fee */
  waiveBooks: boolean;
};

export const EMPTY_CONFIG: ScholarshipConfig = {
  type: '',
  versementCancel: 'none',
  pickedVersementIds: [],
  waiveBooks: false,
};

/** Returns true when the config has at least one action */
export function isConfigActive(c: ScholarshipConfig): boolean {
  return c.type !== '' || c.versementCancel !== 'none' || c.waiveBooks;
}

// ── Component ────────────────────────────────────────────

interface Props {
  value: ScholarshipConfig;
  onChange: (v: ScholarshipConfig) => void;
  /** Available versements – pass when editing an existing student */
  versements?: VersementDetail[];
}

export default function ScholarshipForm({ value, onChange, versements }: Props) {
  const hasVersements = versements && versements.length > 0;

  function set(patch: Partial<ScholarshipConfig>) {
    onChange({ ...value, ...patch });
  }

  function toggleVersement(id: string) {
    const next = value.pickedVersementIds.includes(id)
      ? value.pickedVersementIds.filter((v) => v !== id)
      : [...value.pickedVersementIds, id];
    set({ pickedVersementIds: next });
  }

  return (
    <div className="space-y-5">
      {/* ── Type de bourse ─────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Type de bourse</Label>
        <select
          className={selectCls}
          value={value.type}
          onChange={(e) => {
            const t = e.target.value as ScholarshipConfig['type'];
            // "complete" already covers books, so auto-uncheck waiveBooks
            set({ type: t, waiveBooks: t === 'complete' ? false : value.waiveBooks });
          }}
        >
          <option value="">Aucune</option>
          <option value="complete">Bourse complète (100%)</option>
          <option value="tuition">Bourse scolarité</option>
        </select>
        {value.type === 'complete' && (
          <p className="text-xs text-muted-foreground">Couvre toute la scolarité et les livres.</p>
        )}
        {value.type === 'tuition' && (
          <p className="text-xs text-muted-foreground">Couvre la scolarité uniquement.</p>
        )}
      </div>

      {/* ── Annulation de versements ───────────────── */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">Annulation de versements</legend>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio" name="v-cancel" className="h-4 w-4"
            checked={value.versementCancel === 'none'}
            onChange={() => set({ versementCancel: 'none', pickedVersementIds: [] })}
          />
          <span className="text-sm">Aucune annulation</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio" name="v-cancel" className="h-4 w-4"
            checked={value.versementCancel === 'all'}
            onChange={() => set({ versementCancel: 'all', pickedVersementIds: [] })}
          />
          <span className="text-sm">Annuler tous les versements</span>
        </label>

        {hasVersements && (
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="v-cancel" className="h-4 w-4"
                checked={value.versementCancel === 'pick'}
                onChange={() => set({ versementCancel: 'pick', pickedVersementIds: [] })}
              />
              <span className="text-sm">Annuler un ou plusieurs versements</span>
            </label>

            {value.versementCancel === 'pick' && (
              <div className="ml-6 space-y-1 rounded-lg border p-2.5 bg-muted/30">
                {versements.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox" className="h-3.5 w-3.5 rounded border-input"
                      checked={value.pickedVersementIds.includes(v.id)}
                      onChange={() => toggleVersement(v.id)}
                    />
                    <span className="text-sm">
                      {v.name} — {formatNumber(v.amount)} HTG
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {!hasVersements && value.versementCancel === 'all' && (
          <p className="ml-6 text-xs text-muted-foreground">
            Les versements seront annulés une fois l'inscription confirmée.
          </p>
        )}
      </fieldset>

      {/* ── Supprimer paiement livres ──────────────── */}
      {/* Hidden when "complete" already covers books */}
      {value.type !== 'complete' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" className="h-4 w-4 rounded border-input"
            checked={value.waiveBooks}
            onChange={(e) => set({ waiveBooks: e.target.checked })}
          />
          <span className="text-sm">Supprimer le paiement des livres</span>
        </label>
      )}
    </div>
  );
}
