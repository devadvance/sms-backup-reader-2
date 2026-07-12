import { parseVCards } from 'vcard4-ts';
import { normalizePhoneNumber } from './parser';

/**
 * Parses a VCF (vCard) file content and maps normalized phone numbers to contact names.
 *
 * @param vcfContent The raw string content of the VCF file.
 * @param defaultCountryCode The default country code to use for phone number normalization.
 * @returns A record mapping normalized phone numbers to full names (FN) or fallback Structured Names (N).
 */
export function parseVCF(vcfContent: string, defaultCountryCode?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!vcfContent) {
    return result;
  }

  // Normalize all line endings to LF (\n) to avoid trailing \r issues
  const normalizedVcf = vcfContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Unfold lines: join lines starting with space or tab to the previous line
  const unfoldedLines: string[] = [];
  const rawLines = normalizedVcf.split('\n');
  for (const rawLine of rawLines) {
    if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) {
      if (unfoldedLines.length > 0) {
        unfoldedLines[unfoldedLines.length - 1] += rawLine.substring(1);
      } else {
        unfoldedLines.push(rawLine);
      }
    } else {
      unfoldedLines.push(rawLine);
    }
  }

  // 2. Wrap with BEGIN:VCARD / END:VCARD if missing.
  // Replicate the bug where a new BEGIN:VCARD without preceding END:VCARD discards the previous unclosed vCard block.
  const wrappedLines: string[] = [];
  let inVCard = false;
  for (const line of unfoldedLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === 'BEGIN:VCARD') {
      if (inVCard) {
        // Discard everything since the last unclosed BEGIN:VCARD
        const lastBeginIdx = wrappedLines.lastIndexOf('BEGIN:VCARD');
        if (lastBeginIdx !== -1) {
          wrappedLines.splice(lastBeginIdx);
        }
      }
      inVCard = true;
      wrappedLines.push('BEGIN:VCARD');
      continue;
    }
    if (trimmed === 'END:VCARD') {
      if (inVCard) {
        wrappedLines.push('END:VCARD');
        inVCard = false;
      }
      continue;
    }
    // Property line
    if (!inVCard) {
      wrappedLines.push('BEGIN:VCARD');
      inVCard = true;
    }
    wrappedLines.push(line);
  }
  if (inVCard) {
    wrappedLines.push('END:VCARD');
  }

  // 3. Uppercase property names, and filter lines with invalid group prefixes
  const filteredLines: string[] = [];
  for (let line of wrappedLines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VCARD' || trimmed === 'END:VCARD') {
      filteredLines.push(trimmed);
      continue;
    }
    const colonIdx = trimmed.indexOf(':');
    const semiIdx = trimmed.indexOf(';');
    const boundaryIdx = semiIdx === -1 ? colonIdx : colonIdx === -1 ? semiIdx : Math.min(semiIdx, colonIdx);
    if (boundaryIdx !== -1) {
      let propPart = trimmed.substring(0, boundaryIdx);
      const rest = trimmed.substring(boundaryIdx);
      const dotIdx = propPart.indexOf('.');
      if (dotIdx !== -1) {
        const prefix = propPart.substring(0, dotIdx);
        if (!/^[a-zA-Z0-9]+$/.test(prefix)) {
          continue; // skip line
        }
        const propName = propPart.substring(dotIdx + 1);
        propPart = prefix + '.' + propName.toUpperCase();
      } else {
        propPart = propPart.toUpperCase();
      }
      line = propPart + rest;
    }
    filteredLines.push(line.trim());
  }

  const cleanVcfContent = filteredLines.join('\n');

  // 4. Parse with vcard4-ts
  const parsed = parseVCards(cleanVcfContent);
  if (!parsed.vCards) {
    return result;
  }

  for (const card of parsed.vCards) {
    let name = '';

    // Extract FN or fallback to structured name N
    if (card.FN && card.FN.length > 0 && card.FN[0].value) {
      name = card.FN[0].value
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\:/g, ':')
        .replace(/\\\\/g, '\\')
        .trim();
    } else if (card.N && card.N.value) {
      const n = card.N.value;
      const given = (n.givenNames || []).join(' ').trim();
      const additional = (n.additionalNames || []).join(' ').trim();
      const family = (n.familyNames || []).join(' ').trim();

      const nameParts = [];
      if (given) nameParts.push(given);
      if (additional) nameParts.push(additional);
      if (family) nameParts.push(family);

      name = nameParts
        .join(' ')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\:/g, ':')
        .replace(/\\\\/g, '\\')
        .trim();
    }

    if (!name) {
      continue;
    }

    if (card.TEL && card.TEL.length > 0) {
      for (const tel of card.TEL) {
        let telValue = (tel.value || '').trim();
        if (telValue.toLowerCase().startsWith('tel:')) {
          telValue = telValue.substring(4);
        }
        const normalized = normalizePhoneNumber(telValue, defaultCountryCode);
        if (normalized) {
          result[normalized] = name;
        }
      }
    }
  }

  return result;
}
