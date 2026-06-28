/**
 * Shared modal behaviour for the bottom-sheet dialogs: Escape-to-close,
 * background scroll lock while open, focus moved into the sheet on open and
 * restored to the trigger on close, and a Tab focus-trap.
 *
 * Pass a reactive `isOpen` source and an `onClose` callback. Optionally pass a
 * template ref to the sheet element to enable the focus trap / autofocus.
 */
import { watch, nextTick, onBeforeUnmount, type Ref } from 'vue'

interface UseModalOptions {
  isOpen: () => boolean
  onClose: () => void
  /** The sheet element, used for focus trapping and autofocus. */
  container?: Ref<HTMLElement | null>
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

export function useModal({ isOpen, onClose, container }: UseModalOptions): void {
  let lastFocused: HTMLElement | null = null

  function onKey(e: KeyboardEvent) {
    if (!isOpen()) return
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Tab' && container?.value) {
      const items = focusables(container.value)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !container.value.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  watch(isOpen, (open, was) => {
    if (open && !was) {
      lastFocused = document.activeElement as HTMLElement | null
      document.body.classList.add('modal-open')
      nextTick(() => {
        if (container?.value) focusables(container.value)[0]?.focus()
      })
    } else if (!open && was) {
      document.body.classList.remove('modal-open')
      lastFocused?.focus?.()
      lastFocused = null
    }
  })

  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    document.body.classList.remove('modal-open')
  })
}
