import { EVENT_COLORS } from '../colors';

const pickerEl = document.getElementById('color-picker') as HTMLElement;
let selected = EVENT_COLORS[0].hex;
let built = false;

function build(onChange: (hex: string) => void): void {
  pickerEl.innerHTML = '';
  for (const c of EVENT_COLORS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch';
    swatch.style.background = c.hex;
    swatch.setAttribute('aria-label', c.label);
    swatch.dataset.hex = c.hex;
    swatch.addEventListener('click', () => {
      selected = c.hex;
      updateSelection();
      onChange(selected);
    });
    pickerEl.appendChild(swatch);
  }
  built = true;
}

function updateSelection(): void {
  pickerEl.querySelectorAll<HTMLElement>('.color-swatch').forEach((el) => {
    el.classList.toggle('selected', el.dataset.hex === selected);
  });
}

export function initColorPicker(onChange: (hex: string) => void): void {
  if (!built) build(onChange);
}

export function setSelectedColor(hex: string): void {
  selected = hex;
  updateSelection();
}

export function getSelectedColor(): string {
  return selected;
}
