import { buildMonthGrid, HEBREW_MONTHS, HEBREW_WEEKDAYS_SHORT } from '../dateUtils';

export interface MiniCalendar {
  reset: (initialYear: number, initialMonth: number) => void;
  getSelected: () => string[];
}

export function initMiniCalendar(
  root: HTMLElement,
  onChange: (count: number) => void
): MiniCalendar {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  const selected = new Set<string>();

  root.innerHTML = `
    <div class="mini-cal-header">
      <button type="button" class="mini-cal-nav" data-dir="prev" aria-label="חודש קודם">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span class="mini-cal-label"></span>
      <button type="button" class="mini-cal-nav" data-dir="next" aria-label="חודש הבא">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
    </div>
    <div class="mini-cal-weekdays"></div>
    <div class="mini-cal-grid"></div>
  `;

  const label = root.querySelector('.mini-cal-label') as HTMLElement;
  const weekdaysEl = root.querySelector('.mini-cal-weekdays') as HTMLElement;
  const gridEl = root.querySelector('.mini-cal-grid') as HTMLElement;
  weekdaysEl.innerHTML = HEBREW_WEEKDAYS_SHORT.map((d) => `<span>${d}</span>`).join('');

  function render(): void {
    label.textContent = `${HEBREW_MONTHS[month]} ${year}`;
    const cells = buildMonthGrid(year, month);
    gridEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const cell of cells) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-cal-cell';
      if (!cell.inCurrentMonth) btn.classList.add('muted');
      if (cell.isToday) btn.classList.add('is-today');
      if (selected.has(cell.dateKey)) btn.classList.add('is-picked');
      btn.textContent = String(cell.day);
      btn.addEventListener('click', () => {
        if (selected.has(cell.dateKey)) selected.delete(cell.dateKey);
        else selected.add(cell.dateKey);
        btn.classList.toggle('is-picked');
        onChange(selected.size);
      });
      frag.appendChild(btn);
    }
    gridEl.appendChild(frag);
  }

  root.querySelectorAll<HTMLElement>('.mini-cal-nav').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.dir === 'next' ? 1 : -1;
      month += dir;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      render();
    });
  });

  render();

  return {
    reset: (initialYear: number, initialMonth: number) => {
      year = initialYear;
      month = initialMonth;
      selected.clear();
      render();
    },
    getSelected: () => Array.from(selected).sort(),
  };
}
