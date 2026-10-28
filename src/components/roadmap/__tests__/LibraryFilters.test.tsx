import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryParams } from '@/lib/domain/roadmap-library';
import { LibraryFilters } from '../LibraryFilters';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  usePathname: () => '/roadmap/library',
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace }),
}));

const topics = [{ slug: 'go-concurrency', count: 5 }, { slug: 'sql', count: 2 }];
const base: LibraryParams = { group: 'topic', sort: 'weakest' };

describe('LibraryFilters', () => {
  beforeEach(() => { search = ''; replace.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('GROUP kind links with group=kind', () => {
    render(<LibraryFilters params={base} topics={topics} />);
    expect(screen.getByRole('link', { name: 'kind' }).getAttribute('href')).toContain('group=kind');
  });

  it('an active topic chip removes topic and keeps other params', () => {
    search = 'topic=sql&conf=1';
    render(<LibraryFilters params={{ ...base, topic: 'sql', conf: 1 }} topics={topics} />);
    const href = screen.getByRole('link', { name: /sql/ }).getAttribute('href')!;
    expect(href).not.toContain('topic=');
    expect(href).toContain('conf=1');
    expect(screen.getByRole('link', { name: /go-concurrency/ }).getAttribute('href')).toContain('topic=go-concurrency');
  });

  it('CLEAR links to the bare pathname', () => {
    search = 'topic=sql';
    render(<LibraryFilters params={{ ...base, topic: 'sql' }} topics={topics} />);
    expect(screen.getByRole('link', { name: 'CLEAR' }).getAttribute('href')).toBe('/roadmap/library');
  });

  it('search debounces 300ms, keeps other params, drops q when empty', () => {
    vi.useFakeTimers();
    search = 'kind=gotcha';
    render(<LibraryFilters params={{ ...base, kind: 'gotcha', q: 'abc' }} topics={topics} />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('abc');
    fireEvent.change(input, { target: { value: 'chan' } });
    act(() => { vi.advanceTimersByTime(299); });
    expect(replace).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(replace).toHaveBeenCalledWith('/roadmap/library?kind=gotcha&q=chan');
    fireEvent.change(input, { target: { value: '' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(replace).toHaveBeenLastCalledWith('/roadmap/library?kind=gotcha');
  });

  it('resyncs the input when params.q is cleared', () => {
    search = 'q=abc';
    const { rerender } = render(<LibraryFilters params={{ ...base, q: 'abc' }} topics={topics} />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('abc');
    search = '';
    rerender(<LibraryFilters params={base} topics={topics} />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  });

  it('a pending debounce does not fire after CLEAR is clicked', () => {
    vi.useFakeTimers();
    render(<LibraryFilters params={base} topics={topics} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    const clear = screen.getByRole('link', { name: 'CLEAR' });
    clear.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(clear);
    act(() => { vi.advanceTimersByTime(500); });
    expect(replace).not.toHaveBeenCalled();
  });
});
