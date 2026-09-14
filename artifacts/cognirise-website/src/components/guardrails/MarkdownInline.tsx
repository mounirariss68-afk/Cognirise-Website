import * as React from "react";

export function MarkdownInline({
  text,
  strongClass = "font-bold text-[var(--gf-ink)]",
  emClass = "italic"
}: {
  text: string;
  strongClass?: string;
  emClass?: string;
}) {
  if (!text) return null;
  const parse = (str: string, keyPrefix: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let current = "";
    let i = 0;
    while (i < str.length) {
      if (str[i] === '*' && str[i + 1] === '*') {
        const end = str.indexOf('**', i + 2);
        if (end !== -1) {
          if (current) result.push(current);
          current = "";
          result.push(<strong key={`${keyPrefix}-${i}`} className={strongClass}>{parse(str.slice(i + 2, end), `${keyPrefix}-${i}`)}</strong>);
          i = end + 2;
          continue;
        }
      }
      if (str[i] === '*') {
        let end = -1;
        let j = i + 1;
        while (j < str.length) {
          if (str[j] === '*') {
            if (str[j + 1] === '*') j += 2;
            else { end = j; break; }
          } else {
            j++;
          }
        }
        if (end !== -1) {
          if (current) result.push(current);
          current = "";
          result.push(<em key={`${keyPrefix}-${i}`} className={emClass}>{parse(str.slice(i + 1, end), `${keyPrefix}-${i}`)}</em>);
          i = end + 1;
          continue;
        }
      }
      current += str[i];
      i++;
    }
    if (current) result.push(current);
    return result;
  };
  return <>{parse(text, 'r')}</>;
}
