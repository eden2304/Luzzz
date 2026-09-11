export interface ChipItem {
  value: string;
  line1: string;
  line2: string;
  marker?: string;
}

export interface ChipScroller {
  el: HTMLElement;
  setItems: (items: ChipItem[], selectedValue: string) => void;
  setSelected: (value: string, smooth?: boolean) => void;
  getSelected: () => string;
}

export function createChipScroller(
  container: HTMLElement,
  onSelect: (value: string) => void
): ChipScroller {
  container.classList.add('chip-scroller');
  let selected = '';

  function setSelected(value: string, smooth = true): void {
    selected = value;
    container.querySelectorAll<HTMLElement>('.chip').forEach((chip) => {
      const isSel = chip.dataset.value === value;
      chip.classList.toggle('chip-selected', isSel);
      if (isSel) {
        chip.scrollIntoView({
          behavior: smooth ? 'smooth' : 'instant',
          inline: 'center',
          block: 'nearest',
        });
      }
    });
  }

  function setItems(items: ChipItem[], selectedValue: string): void {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const item of items) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.value = item.value;
      if (item.marker) {
        const marker = document.createElement('span');
        marker.className = 'chip-marker';
        marker.textContent = item.marker;
        chip.appendChild(marker);
      }
      const l1 = document.createElement('span');
      l1.className = 'chip-line1';
      l1.textContent = item.line1;
      const l2 = document.createElement('span');
      l2.className = 'chip-line2';
      l2.textContent = item.line2;
      chip.appendChild(l1);
      chip.appendChild(l2);
      chip.addEventListener('click', () => {
        setSelected(item.value);
        onSelect(item.value);
      });
      frag.appendChild(chip);
    }
    container.appendChild(frag);
    setSelected(selectedValue, false);
  }

  return {
    el: container,
    setItems,
    setSelected,
    getSelected: () => selected,
  };
}
