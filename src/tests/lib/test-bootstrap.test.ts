import { describe, expect, it } from 'bun:test'

describe('test DOM bootstrap contract', () => {
  it('provides native browser constructors and selector behavior', () => {
    document.body.innerHTML = '<main><button data-state="open"><span>Run</span></button></main>'
    const button = document.querySelector('main > button[data-state="open"]')

    expect(button).toBeInstanceOf(HTMLElement)
    expect(button?.matches('button[data-state="open"]')).toBe(true)
    expect(button?.querySelector(':scope > span')?.textContent).toBe('Run')
    expect(
      new DOMParser().parseFromString('<root />', 'application/xml').documentElement.localName
    ).toBe('root')
  })

  it('provides functional storage and DOM events', () => {
    localStorage.setItem('key', 'value')
    const button = document.createElement('button')
    let clicked = false
    button.addEventListener('click', () => {
      clicked = true
    })
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(localStorage.getItem('key')).toBe('value')
    expect(clicked).toBe(true)
  })
})
