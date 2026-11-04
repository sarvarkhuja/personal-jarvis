import { describe, expect, it } from 'vitest';
import { looksLikeMarkdown } from '../note-markdown';

describe('looksLikeMarkdown', () => {
  it.each([
    ['## Heading\n\ntext'],
    ['- one\n- two'],
    ['1. first\n2. second'],
    ['```go\nx := 1\n```'],
    ['| k | v |\n| --- | --- |\n| a | b |'],
    ['Use **buffered** channels'],
    ['Call `close(ch)` once'],
    ['> quoted'],
  ])('detects block or inline markdown in %j', (text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it.each([
    ['Redpanda is Kafka without ZooKeeper'],
    ['two lines\nof plain prose'],
    ['a * b = c'],
    ['price - 5 dollars'],
    [''],
  ])('leaves plain prose alone: %j', (text) => {
    expect(looksLikeMarkdown(text)).toBe(false);
  });
});
