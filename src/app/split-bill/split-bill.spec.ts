import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplitBill } from './split-bill';

describe('SplitBill', () => {
  let fixture: ComponentFixture<SplitBill>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SplitBill] }).compileComponents();
    fixture = TestBed.createComponent(SplitBill);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function inputLabelled(text: string): HTMLInputElement {
    const label = Array.from(el.querySelectorAll('label')).find(
      (l) => l.textContent?.trim() === text,
    );
    const id = label?.getAttribute('for');
    const input = id ? el.querySelector<HTMLInputElement>(`#${id}`) : null;
    if (!input) {
      throw new Error(`No input labelled "${text}"`);
    }
    return input;
  }

  async function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function addPerson(name: string) {
    await type(inputLabelled('Name'), name);
    button('Add person').click();
    await fixture.whenStable();
  }

  async function enterTotal(value: string) {
    await type(inputLabelled('Bill total'), value);
  }

  function button(text: string): HTMLButtonElement {
    const found = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === text,
    );
    if (!found) {
      throw new Error(`No button "${text}"`);
    }
    return found;
  }

  const names = () =>
    Array.from(el.querySelectorAll('.person-name')).map((n) => n.textContent?.trim());
  const amounts = () =>
    Array.from(el.querySelectorAll('.person-amount')).map((a) => a.textContent?.trim());
  const alerts = () =>
    Array.from(el.querySelectorAll('[role="alert"]')).map((a) => a.textContent?.trim());
  const text = () => el.textContent ?? '';

  it('labels the name and bill total inputs', () => {
    expect(inputLabelled('Name')).toBeTruthy();
    expect(inputLabelled('Bill total')).toBeTruthy();
  });

  it('adds people in order and clears the name field', async () => {
    await addPerson('Alex');
    await addPerson('Sam');

    expect(names()).toEqual(['Alex', 'Sam']);
    expect(inputLabelled('Name').value).toBe('');
  });

  it('clears the name field even when submitted before the page re-renders', async () => {
    const nameField = inputLabelled('Name');
    nameField.value = 'Alex';
    nameField.dispatchEvent(new Event('input'));
    nameField.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(names()).toEqual(['Alex']);
    expect(nameField.value).toBe('');
  });

  it('adds a person when the name form is submitted (Enter)', async () => {
    await type(inputLabelled('Name'), 'Priya');
    inputLabelled('Name').form!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(names()).toEqual(['Priya']);
  });

  it('trims names', async () => {
    await addPerson('  Alex ');

    expect(names()).toEqual(['Alex']);
  });

  it('rejects a blank name and clears the message once a valid name is added', async () => {
    await addPerson('   ');

    expect(names()).toEqual([]);
    expect(alerts()).toContain('Enter a name to add this person.');

    await addPerson('Alex');

    expect(alerts()).not.toContain('Enter a name to add this person.');
  });

  it('splits 90.00 between 3 people as 30.00 each', async () => {
    await enterTotal('90');
    await addPerson('Alex');
    await addPerson('Sam');
    await addPerson('Priya');

    expect(amounts()).toEqual(['30.00', '30.00', '30.00']);
  });

  it('rounds each share to 2 decimal places', async () => {
    await enterTotal('100');
    await addPerson('Alex');
    await addPerson('Sam');
    await addPerson('Priya');

    expect(amounts()).toEqual(['33.33', '33.33', '33.33']);
  });

  it('recalculates when a person is removed', async () => {
    await enterTotal('90');
    await addPerson('Alex');
    await addPerson('Sam');
    await addPerson('Priya');

    button('Remove').click();
    await fixture.whenStable();

    expect(names()).toEqual(['Sam', 'Priya']);
    expect(amounts()).toEqual(['45.00', '45.00']);
  });

  it('removes only the chosen person when two share a name', async () => {
    await addPerson('Sam');
    await addPerson('Sam');
    await addPerson('Alex');

    const removeButtons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('button[aria-label="Remove Sam"]'),
    );
    removeButtons[1].click();
    await fixture.whenStable();

    expect(names()).toEqual(['Sam', 'Alex']);
  });

  describe('keyboard focus after removing someone', () => {
    const focusedLabel = () =>
      document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.id;

    beforeEach(async () => {
      await addPerson('Alex');
      await addPerson('Sam');
      await addPerson('Priya');
    });

    /** Focus then activate, as a keyboard user would. */
    async function remove(name: string) {
      const removeButton = el.querySelector<HTMLButtonElement>(
        `button[aria-label="Remove ${name}"]`,
      )!;
      removeButton.focus();
      removeButton.click();
      await fixture.whenStable();
    }

    it('moves to the next remove button', async () => {
      await remove('Sam');

      expect(focusedLabel()).toBe('Remove Priya');
    });

    it('moves to the previous remove button when the last person is removed', async () => {
      await remove('Priya');

      expect(focusedLabel()).toBe('Remove Sam');
    });

    it('moves to the name field when nobody is left', async () => {
      await remove('Alex');
      await remove('Sam');
      await remove('Priya');

      expect(focusedLabel()).toBe('person-name');
    });
  });

  it('labels each remove button with the person it removes', async () => {
    await addPerson('Alex');

    expect(el.querySelector('button[aria-label="Remove Alex"]')).toBeTruthy();
  });

  it.each(['0', '-5', 'abc'])('rejects a bill total of %j and shows no amounts', async (value) => {
    await addPerson('Alex');
    await enterTotal(value);

    expect(alerts()).toContain(
      'Enter a bill total greater than 0 using numbers only, for example 84.50.',
    );
    expect(amounts()).toEqual([]);
  });

  it('prompts for people when nobody has been added', async () => {
    await enterTotal('90');

    expect(text()).toContain('Add the people sharing this bill.');
    expect(text()).not.toMatch(/NaN|Infinity/);
  });

  it('prompts for the bill total when it is missing', async () => {
    await addPerson('Alex');

    expect(text()).toContain('Enter the bill total to see what each person pays.');
    expect(amounts()).toEqual([]);
    expect(text()).not.toMatch(/NaN|Infinity/);
  });

  it('formats large shares with grouping and no exponent', async () => {
    await enterTotal('1000000');
    await addPerson('Alex');
    await addPerson('Sam');
    await addPerson('Priya');

    expect(amounts()).toEqual(['333,333.33', '333,333.33', '333,333.33']);
  });
});
