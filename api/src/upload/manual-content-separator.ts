import { BadRequestException } from '@nestjs/common';

export const DEFAULT_MANUAL_CONTENT_SEPARATOR = '---';

/** A separator only counts when it occupies a line by itself. */
export function splitManualContents(text: string, separator: string): string[] {
  if (
    !separator ||
    separator.trim() !== separator ||
    separator.length > 20 ||
    /[\r\n]/.test(separator)
  ) {
    throw new BadRequestException('Invalid content separator');
  }

  const contents: string[] = [];
  let current: string[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === separator) {
      const content = current.join('\n').trim();
      if (!content) {
        throw new BadRequestException(
          'Content separator cannot follow an empty content',
        );
      }
      contents.push(content);
      current = [];
    } else {
      current.push(line);
    }
  }
  const last = current.join('\n').trim();
  if (!last) {
    throw new BadRequestException('Content separator cannot end the input');
  }
  contents.push(last);
  return contents;
}
