import { evenShare, parseBillTotal } from './bill';

describe('parseBillTotal', () => {
  it.each([
    ['90', 90],
    [' 84.50 ', 84.5],
    ['.5', 0.5],
    ['12.', 12],
  ])('reads %j as %d', (raw, expected) => {
    expect(parseBillTotal(raw)).toBe(expected);
  });

  it.each(['', '   ', '0', '0.00', '-5', 'abc', '1,000', '84,50', '12.3.4', '1e3', 'Infinity'])(
    'rejects %j',
    (raw) => {
      expect(parseBillTotal(raw)).toBeNull();
    },
  );
});

describe('evenShare', () => {
  it('divides the total equally', () => {
    expect(evenShare(90, 3)).toBe(30);
  });

  it('keeps the unrounded value so display decides the rounding', () => {
    expect(evenShare(100, 3)).toBeCloseTo(33.333, 3);
  });
});
