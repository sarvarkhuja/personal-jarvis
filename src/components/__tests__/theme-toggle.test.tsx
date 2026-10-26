import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTheme } from 'next-themes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setTheme as persistTheme } from '@/lib/actions/account'
import { ThemeToggle } from '../theme-toggle'

vi.mock('next-themes', () => ({ useTheme: vi.fn() }))
vi.mock('@/lib/actions/account', () => ({ setTheme: vi.fn() }))

const setTheme = vi.fn()

describe('ThemeToggle', () => {
  beforeEach(() => {
    setTheme.mockReset()
    vi.mocked(persistTheme).mockReset()
    vi.mocked(persistTheme).mockResolvedValue(undefined)
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      themes: ['light', 'dark'],
      setTheme,
    })
  })
  afterEach(cleanup)

  it('hydrates the empty server placeholder without a theme mismatch', async () => {
    const serverMarkup = renderToString(<ThemeToggle />)
    expect(serverMarkup).toBe('')
    const container = document.createElement('div')
    container.innerHTML = serverMarkup
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: Root | undefined

    try {
      await act(async () => {
        root = hydrateRoot(container, <ThemeToggle />, { onRecoverableError })
      })

      expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveTextContent('Light mode')
      expect(onRecoverableError).not.toHaveBeenCalled()
    } finally {
      await act(async () => root?.unmount())
      container.remove()
    }
  })

  it.each([
    ['dark', 'light'],
    ['light', 'dark'],
  ])('switches %s to %s and persists the choice', async (current, next) => {
    vi.mocked(useTheme).mockReturnValue({
      theme: current,
      themes: ['light', 'dark'],
      setTheme,
    })
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }))

    expect(setTheme).toHaveBeenCalledWith(next)
    expect(persistTheme).toHaveBeenCalledWith({ theme: next })
  })
})
