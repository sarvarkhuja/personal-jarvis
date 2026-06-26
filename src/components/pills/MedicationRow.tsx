'use client';

import { DeleteMedicationButton } from './DeleteMedicationButton';
import { PillDayCell } from './PillDayCell';

type Cell = { date: string; checked: boolean };

type Props = {
  medication: { id: string; name: string };
  cells: Cell[];
};

export function MedicationRow({ medication: m, cells }: Props) {
  return (
    <li
      data-testid={`medication-row-${m.id}`}
      className="flex items-center gap-3 border-b border-border py-3 last:border-0"
    >
      <span className="min-w-0 flex-1 truncate font-sans text-[14px] text-text-primary">
        {m.name}
      </span>
      <div className="flex items-center gap-1">
        {cells.map((c) => (
          <PillDayCell
            key={c.date}
            medicationId={m.id}
            date={c.date}
            checked={c.checked}
          />
        ))}
      </div>
      <DeleteMedicationButton medicationId={m.id} medicationName={m.name} />
    </li>
  );
}
