import reference from './intl-reference.json';

export function checkIntl(): string[] {
  const differences: string[] = [];
  for (const { timeZone, instant, expected } of reference.dates) {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      ...(reference.options as Intl.DateTimeFormatOptions),
      timeZone,
    });
    const actual = formatter
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== 'literal');
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      differences.push(`${timeZone} ${instant}: ${JSON.stringify(actual)}`);
    }
  }
  for (const { locale, value, expected } of reference.plurals) {
    const actual = new Intl.PluralRules(locale).select(value);
    if (actual !== expected)
      differences.push(`${locale} ${value}: ${actual} (Node: ${expected})`);
  }
  return differences;
}
