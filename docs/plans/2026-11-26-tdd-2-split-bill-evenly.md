# TDD-2 Split a bill evenly between named people — Implementation Plan

> Executed inline (native) under the Cadence build workflow: no commits until the human testing gate is approved.

**Goal:** Replace the empty app shell with a split-bill screen: add/remove named people, enter a bill total, see each person's even share.

**Architecture:** One standalone, signal-based `SplitBill` component rendered by `App`. Parsing and arithmetic live in a small pure module (`bill.ts`) so they are unit-tested without the DOM. No services, no router changes, no new dependencies.

**Tech stack:** Angular 21 (standalone, zoneless, signals), SCSS, Vitest via `ng test`.

**Spec:** Cadence ticket TDD-2 (`362b8ee8-6cb6-4837-9a18-2cc367218360`).

## Global constraints

- Name can't be blank (empty or whitespace only); names are trimmed.
- Bill total must be a number greater than 0; invalid input shows a message instead of totals.
- Amounts shown to 2 decimal places.
- No people or no valid total: show a short prompt, never `NaN`, `Infinity` or empty figures.
- Every input has a visible label; usable with keyboard alone.
- Out of scope: percentage shares (TDD-3), currency selection, tips/tax, persistence.
- Component style budget: 4 kB warning / 8 kB error (`angular.json`) — shared tokens go in `src/styles.scss`.

## Review focus

1. Duplicate names ("Sam" twice): both listed; removing one removes only that row (rows tracked by id, not name).
2. Large totals (`1000000`, 3 people): shows `333,333.33`, no exponent notation.
3. Locale-style input (`1,000`, `84,50`) and junk (`12.3.4`, `1e3`, `Infinity`): rejected with the bill-total message.
4. Names with surrounding spaces (`"  Alex "`): stored and shown as `Alex`.
5. Long names: wrap inside the row without pushing the amount off-screen at 320 px width (manual check).

## Files

- Create `src/app/split-bill/bill.ts` — `parseBillTotal`, `evenShare`.
- Create `src/app/split-bill/bill.spec.ts`.
- Create `src/app/split-bill/split-bill.ts|.html|.scss` — the screen.
- Create `src/app/split-bill/split-bill.spec.ts` — DOM behaviour tests.
- Modify `src/app/app.ts`, `src/app/app.html` — render `<app-split-bill />` above the existing `<router-outlet />`.
- Modify `src/app/app.spec.ts` — replace the stale "Hello, todo_demo" assertion (already failing on `origin/development`, which removed the placeholder) with a check that the split-bill screen renders.
- Modify `src/styles.scss` — colour/type tokens and base styles.

### Task 1: Bill maths (`bill.ts`)

**Produces:**
- `parseBillTotal(raw: string): number | null` — trims; accepts only plain decimals matching `^(\d+\.?\d*|\.\d+)$`; returns `null` unless the number is finite and `> 0`.
- `evenShare(total: number, peopleCount: number): number` — `total / peopleCount`.

- [ ] Write `bill.spec.ts`:
  - `parseBillTotal('90') === 90`, `(' 84.50 ') === 84.5`, `('.5') === 0.5`
  - `null` for `''`, `'   '`, `'0'`, `'0.00'`, `'-5'`, `'abc'`, `'1,000'`, `'84,50'`, `'12.3.4'`, `'1e3'`, `'Infinity'`
  - `evenShare(90, 3) === 30`; `evenShare(100, 3)` ≈ `33.333` (`toBeCloseTo(33.333, 3)`)
- [ ] `npx ng test --watch=false` → FAIL (module missing).
- [ ] Implement `bill.ts`.
- [ ] Run tests → PASS.

### Task 2: Split-bill screen (`SplitBill`)

**Consumes:** Task 1.
**Produces:** `SplitBill` (`selector: 'app-split-bill'`) with `interface Person { id: number; name: string }`; state as signals (`billInput`, `nameInput`, `people`, `nameError`) and computeds (`billTotal`, `billError`, `rows`).

Behaviour:
- Name field + "Add person" button inside a `<form>` (Enter submits). Blank → "Enter a name to add this person." (linked via `aria-describedby`, announced with `role="alert"`). Valid → trimmed, appended, field cleared, error cleared, focus stays in field.
- Each person row: colour swatch, name, amount (when available), "Remove" button with `aria-label="Remove {name}"`.
- Bill total: `type="text" inputmode="decimal"`. Non-empty + invalid → "Enter a bill total greater than 0 using numbers only, for example 84.50."
- Prompt: no people → "Add the people sharing this bill."; people but no valid total → "Enter the bill total to see what each person pays."
- Amounts via `DecimalPipe` `'1.2-2'`.
- Share bar: one segment per person, equal widths, decorative (`aria-hidden`), shown only when amounts are.

- [ ] Write `split-bill.spec.ts` (TestBed, real DOM events, `await fixture.whenStable()`):
  - adds people in order and clears the name field
  - rejects a blank/whitespace name with the message; adding a valid name clears it
  - trims names
  - Enter in the name field adds the person
  - bill 90 + 3 people → each row shows `30.00`
  - bill 100 + 3 people → each row shows `33.33`
  - remove one of 3 (bill 90) → remaining rows show `45.00`
  - duplicate names: removing one "Sam" leaves the other
  - `0`, `-5`, `abc` → bill-total message, no amounts
  - no people → "Add the people…" prompt; people + empty total → "Enter the bill total…" prompt; page text never contains `NaN`/`Infinity`
  - bill `1000000` + 3 people → `333,333.33`
  - name and bill inputs are reachable by their visible labels (`label[for]` → input id)
- [ ] Run → FAIL (component missing).
- [ ] Implement component, template, styles.
- [ ] Run → PASS.

### Task 3: Wire into `App`, update stale test, global styles

- [ ] Update `app.spec.ts`: "should render the split-bill screen" asserts `h1` text `Split the bill`.
- [ ] Run → FAIL (App doesn't render it yet).
- [ ] Import `SplitBill` in `App`, render `<app-split-bill />`; drop the unused `title` signal; add tokens/base styles to `styles.scss`.
- [ ] Run full suite → PASS; `npx ng build` → success, no budget warnings.

### Task 4 (added during browser verification): keep keyboard focus after removing someone

Found in the browser: activating "Remove" deleted the focused button, dropping focus to `<body>`, which breaks the keyboard-only criterion.

- [x] Tests (focus, then click, as a keyboard user does): removing a middle person focuses the next row's Remove; removing the last row focuses the previous Remove; removing everyone focuses the Name field. Watched all three fail (focus on nothing).
- [x] `removePerson` remembers the row index and, in `afterNextRender`, focuses `removeButtons()[min(index, length - 1)]`, else `nameField`. `addPerson` now takes the name field from `viewChild` instead of a template argument.

### Task 5 (found while verifying TDD-3): name field didn't always clear after adding

The name field was mirrored in a `nameInput` signal bound back with `[value]`. If no render happened between typing and submitting (fast submit, a slow device, autofill, or a throttled background tab), the binding went from `''` to `''`, so Angular never wrote to the field and the typed name stayed there.

- [x] Test: set the field value, dispatch `input` and `submit` with no render in between → the person is added and the field is empty. Watched it fail (`'Alex'`).
- [x] `addPerson` reads and clears `nameField().nativeElement.value` directly; the `nameInput` signal and its template bindings are removed.

### Verification

- `npx ng test --watch=false`, `npx ng build`, `npx prettier --check` on changed files.
- Browser (dev server on :4200): full journey, validation messages, remove, keyboard-only pass, 375 px width, console clean.
