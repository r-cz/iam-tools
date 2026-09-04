import React from 'react'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { FormFieldInput, FormFieldTextarea } from '@/components/common/FormField'

afterEach(cleanup)

for (const [name, Field] of [
  ['input', FormFieldInput],
  ['textarea', FormFieldTextarea],
] as const) {
  describe(`FormField ${name}`, () => {
    test('preserves caller descriptions alongside its help and validation errors', () => {
      render(
        <>
          <p id="external-help">External help</p>
          <Field
            id="subject"
            label="Subject"
            description="Field help"
            error="Invalid subject"
            aria-describedby="external-help"
            aria-invalid={false}
          />
        </>
      )
      const control = screen.getByRole('textbox', { name: 'Subject' })
      expect(control.getAttribute('aria-describedby')).toBe(
        'external-help subject-description subject-error'
      )
      expect(control.getAttribute('aria-invalid')).toBe('true')
      expect(document.getElementById('subject-error')?.textContent).toBe('Invalid subject')
    })

    test('keeps a validation state supplied by the caller when there is no local error', () => {
      render(<Field label="Subject" aria-invalid="grammar" />)
      const control = screen.getByRole('textbox', { name: 'Subject' })
      expect(control.getAttribute('aria-invalid')).toBe('grammar')
      expect(control.getAttribute('aria-describedby')).toBeNull()
    })
  })
}
