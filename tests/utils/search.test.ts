import { ilikeAny, sanitizeSearchTerm } from '../../src/utils/search';

describe('sanitizeSearchTerm', () => {
  it('keeps ordinary punctuation that quoting makes safe', () => {
    expect(sanitizeSearchTerm('Sta. Rosa (Laguna), PH')).toBe('Sta. Rosa (Laguna), PH');
  });

  it('drops quotes, backslashes and wildcards', () => {
    expect(sanitizeSearchTerm('a"b\\c*d%e')).toBe('a b c d e');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeSearchTerm('   rice   IR64 ')).toBe('rice IR64');
  });
});

describe('ilikeAny', () => {
  it('builds a quoted ilike clause per column', () => {
    expect(ilikeAny(['result', 'city'], 'Sta. Rosa')).toBe('result.ilike."*Sta. Rosa*",city.ilike."*Sta. Rosa*"');
  });
});
