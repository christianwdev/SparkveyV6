import type { ReactNode } from 'react';
import styles from './SupportMessageBody.module.scss';

type SupportMessageBodyProps = {
  message: string,
  imageEmbeds: string[],
};

const URL_SPLIT_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION_REGEX = /[)\],.:;!?]+$/;

export default function SupportMessageBody(
  {
    message,
    imageEmbeds,
  }: SupportMessageBodyProps,
) {
  const safeEmbeds = imageEmbeds.filter(isSafeHttpUrl);

  return (
    <div className={styles.root}>
      <p className={styles.messageText}>{renderMessageNodes(message)}</p>

      {safeEmbeds.length > 0 && (
        <div className={styles.imageEmbeds}>
          {safeEmbeds.map((src, index) => (
            <a
              key={`${src}-${index}`}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={src} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMessageNodes(message: string): ReactNode[] {
  const parts = message.split(URL_SPLIT_REGEX);
  const nodes: ReactNode[] = [];

  parts.forEach((part, partIndex) => {
    if (!part) return;

    if (/^https?:\/\//i.test(part) && isSafeHttpUrl(part.replace(TRAILING_PUNCTUATION_REGEX, ''))) {
      const trailing = part.match(TRAILING_PUNCTUATION_REGEX)?.[0] ?? '';
      const href = part.replace(TRAILING_PUNCTUATION_REGEX, '');

      nodes.push(
        <a
          key={`link-${partIndex}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {href}
        </a>,
      );

      if (trailing) {
        nodes.push(...renderPlainText(trailing, `trail-${partIndex}`));
      }

      return;
    }

    nodes.push(...renderPlainText(part, `text-${partIndex}`));
  });

  return nodes;
}

function renderPlainText(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`${keyPrefix}-br-${index}`} />);
    }

    if (line) nodes.push(line);
  });

  return nodes;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
