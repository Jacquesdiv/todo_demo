import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { evenShare, parseBillTotal } from './bill';

interface Person {
  id: number;
  name: string;
}

/** Number of person colours defined in styles.scss (--person-0 … --person-5). */
const PERSON_COLOURS = 6;

@Component({
  selector: 'app-split-bill',
  imports: [DecimalPipe],
  templateUrl: './split-bill.html',
  styleUrl: './split-bill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitBill {
  private readonly injector = inject(Injector);
  private readonly nameField = viewChild.required<ElementRef<HTMLInputElement>>('nameField');
  private readonly removeButtons = viewChildren<ElementRef<HTMLButtonElement>>('removeButton');
  private nextId = 0;

  protected readonly billInput = signal('');
  protected readonly nameInput = signal('');
  protected readonly nameError = signal(false);
  protected readonly people = signal<Person[]>([]);

  protected readonly billTotal = computed(() => parseBillTotal(this.billInput()));
  protected readonly billError = computed(
    () => this.billInput().trim() !== '' && this.billTotal() === null,
  );

  /** What each person pays, or null while there is nothing to split yet. */
  protected readonly share = computed(() => {
    const total = this.billTotal();
    const count = this.people().length;
    return total === null || count === 0 ? null : evenShare(total, count);
  });

  /** Tells the user what is still missing. Null when amounts are showing or an error already explains. */
  protected readonly prompt = computed(() => {
    if (this.people().length === 0) {
      return 'Add the people sharing this bill.';
    }
    if (this.billTotal() === null && !this.billError()) {
      return 'Enter the bill total to see what each person pays.';
    }
    return null;
  });

  protected addPerson(event: Event): void {
    event.preventDefault();
    const name = this.nameInput().trim();
    if (name) {
      this.people.update((people) => [...people, { id: this.nextId++, name }]);
      this.nameInput.set('');
    }
    this.nameError.set(!name);
    this.nameField().nativeElement.focus();
  }

  /** Removes someone and keeps keyboard focus nearby: the next row's button, else the previous, else the name field. */
  protected removePerson(id: number): void {
    const index = this.people().findIndex((person) => person.id === id);
    this.people.update((people) => people.filter((person) => person.id !== id));
    afterNextRender(
      () => {
        const buttons = this.removeButtons();
        const target = buttons[Math.min(index, buttons.length - 1)] ?? this.nameField();
        target.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  /** A stable colour per person, so colours don't shift when someone is removed. */
  protected colour(person: Person): string {
    return `var(--person-${person.id % PERSON_COLOURS})`;
  }
}
