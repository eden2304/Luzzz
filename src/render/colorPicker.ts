import { EVENT_COLORS } from '../colors';

const pickerEl = document.getElementById('color-picker') as HTMLElement;
let selected = EVENT_COLORS[0].hex;
let built = false;
let customSwatch: HTMLLabelElement;

function isPaletteColor(hex: string): boolean {
  return EVENT_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

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

  // Custom color: opens the browser's native color picker (full spectrum) via a hidden
  // <input type="color"> wrapped in a <label> — clicking anywhere on the styled circle
  // activates it natively, no JS click-forwarding needed. Whatever gets picked here is
  // used only for this one event; it's never added to EVENT_COLORS above.
  customSwatch = document.createElement('label');
  customSwatch.className = 'color-swatch color-swatch-custom';
  customSwatch.setAttribute('aria-label', 'צבע מותאם אישית');

  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.className = 'color-swatch-custom-input';
  customInput.addEventListener('input', () => {
    selected = customInput.value;
    updateSelection();
    onChange(selected);
  });

  customSwatch.appendChild(customInput);
  pickerEl.appendChild(customSwatch);

  built = true;
}

function updateSelection(): void {
  pickerEl.querySelectorAll<HTMLElement>('.color-swatch:not(.color-swatch-custom)').forEach((el) => {
    el.classList.toggle('selected', el.dataset.hex === selected);
  });

  const isCustom = !isPaletteColor(selected);
  if (isCustom) {
    customSwatch.style.background = selected;
    customSwatch.classList.add('has-value');
  }
  customSwatch.classList.toggle('selected', isCustom);
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
