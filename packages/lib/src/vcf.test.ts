import { describe, it, expect } from 'vitest';
import { parseVCF } from './vcf';

describe('VCF Parsing - Standard & Formatting Cases', () => {
  it('parses cell and home numbers to contact name', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Alec Ludwig
TEL;TYPE=CELL:12482272776
TEL;TYPE=HOME:12488550185
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Ali Nagi
TEL;TYPE=CELL:(516) 859-6058
TEL:(347) 417-5208
END:VCARD`;

    const result = parseVCF(vcf, '1');
    expect(result).toEqual({
      '12482272776': 'Alec Ludwig',
      '12488550185': 'Alec Ludwig',
      '15168596058': 'Ali Nagi',
      '13474175208': 'Ali Nagi'
    });
  });

  it('handles line unfolding correctly', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Zarin Elias Lok
 handwala
TEL;TYPE=CELL:151654
 70172
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '15165470172': 'Zarin Elias Lokhandwala'
    });
  });

  it('unfolds with CRLF and tabs', () => {
    const vcf = `BEGIN:VCARD\r
FN:Unfolded\r
 Line\r
TEL:123\r
 456\r
\t7890\r
END:VCARD`;
    expect(parseVCF(vcf, '1')).toEqual({
      '1234567890': 'UnfoldedLine'
    });
  });

  it('handles alphanumeric item prefixes', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
item1.FN:Andrew Joseph
item1.TEL:2482387706
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '12482387706': 'Andrew Joseph'
    });
  });

  it('handles lowercase property names', () => {
    const vcf = `BEGIN:VCARD
fn:John Lowercase
tel:5551112222
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '15551112222': 'John Lowercase'
    });
  });

  it('handles escaped characters in FN', () => {
    const vcf = `BEGIN:VCARD
FN:LastName\\, FirstName\\;Title\\:Suffix\\\\Escaped
TEL:12482272776
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '12482272776': 'LastName, FirstName;Title:Suffix\\Escaped'
    });
  });
});

describe('VCF Parsing - Fallbacks and Edge Cases', () => {
  it('falls back to N structured name when FN is missing', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
N:Ludwig;Alec;Middle;;
TEL;TYPE=CELL:12482272776
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '12482272776': 'Alec Middle Ludwig'
    });
  });

  it('handles tel: prefix inside the telephone property value', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Alec Ludwig
TEL;TYPE=CELL:tel:+12482272776
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '12482272776': 'Alec Ludwig'
    });
  });

  it('ignores invalid non-alphanumeric item prefixes', () => {
    const vcf = `BEGIN:VCARD
item-1.FN:Group Fail
item-1.TEL:5550002222
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({});
  });

  it('ignores contacts without TEL or FN/N', () => {
    const vcf = `BEGIN:VCARD
ADR:;;123 Main St;Springfield;IL;62701;USA
EMAIL:john@example.com
END:VCARD`;
    expect(parseVCF(vcf, '1')).toEqual({});
  });

  it('re-encloses unclosed BEGIN:VCARD correctly by discarding the preceding unclosed block', () => {
    const vcf = `BEGIN:VCARD
FN:Contact One
TEL:15165470172
BEGIN:VCARD
FN:Contact Two
TEL:12482272776
END:VCARD`;

    expect(parseVCF(vcf, '1')).toEqual({
      '12482272776': 'Contact Two'
    });
  });

  it('handles empty or malformed inputs gracefully', () => {
    expect(parseVCF('', '1')).toEqual({});
    expect(parseVCF('   \n   \n', '1')).toEqual({});
    expect(parseVCF('random garbage text\nwith: colons\nand; semicolons', '1')).toEqual({});
    expect(parseVCF('BEGIN:VCARD\nEND:VCARD', '1')).toEqual({});
  });
});

describe('VCF Parsing - Stress Tests', () => {
  it('parses large number of contacts successfully', () => {
    let vcf = '';
    for (let i = 0; i < 500; i++) {
      vcf += `BEGIN:VCARD\nFN:User ${i}\nTEL;TYPE=CELL:1516547${String(i).padStart(4, '0')}\nEND:VCARD\n`;
    }
    const result = parseVCF(vcf, '1');
    expect(Object.keys(result)).toHaveLength(500);
    expect(result['15165470000']).toBe('User 0');
  });

  it('is robust against ReDoS style inputs', () => {
    const longParamLine = 'TEL' + ';param'.repeat(2000) + 'value';
    const vcf = `BEGIN:VCARD\nFN:ReDoS Tester\n${longParamLine}\nTEL:12482272776\nEND:VCARD`;
    expect(parseVCF(vcf, '1')).toHaveProperty('12482272776', 'ReDoS Tester');
  });
});
