import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TokenInput } from '@/features/tokenInspector/components/TokenInput'
import * as tokenGenerator from '@/features/tokenInspector/utils/generate-token'
import { AppStateProvider } from '@/lib/state'

afterEach(() => {
  cleanup()
  mock.restore()
})

function setupPendingExample() {
  let resolve!: (token: string) => void
  spyOn(tokenGenerator, 'generateFreshToken').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      })
  )
  const setToken = mock(() => {})
  const onJwksResolved = mock(() => {})
  const onReset = mock(() => {})
  const props = { token: 'existing-token', setToken, onJwksResolved, onReset, onDecode: () => {} }
  const view = render(
    <AppStateProvider>
      <TokenInput {...props} />
    </AppStateProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Load example token' }))
  return {
    ...view,
    props,
    finish: async () => {
      await act(async () => {
        resolve('generated-example')
      })
    },
  }
}

describe('TokenInput example generation ownership', () => {
  test('keeps a token edited while an example was being generated', async () => {
    const { container, props, finish } = setupPendingExample()
    fireEvent.change(container.querySelector('textarea')!, { target: { value: 'pasted-token' } })
    await finish()
    expect(props.setToken).toHaveBeenCalledTimes(1)
    expect(props.setToken).toHaveBeenCalledWith('pasted-token')
    expect(props.onJwksResolved).not.toHaveBeenCalled()
  })

  test('does not repopulate the editor after Clear', async () => {
    const { props, finish } = setupPendingExample()
    fireEvent.click(screen.getByRole('button', { name: 'Clear token' }))
    await finish()
    expect(props.onReset).toHaveBeenCalledTimes(1)
    expect(props.setToken).not.toHaveBeenCalled()
    expect(props.onJwksResolved).not.toHaveBeenCalled()
  })

  test('does not overwrite an incoming token supplied by the parent', async () => {
    const { props, rerender, finish } = setupPendingExample()
    rerender(
      <AppStateProvider>
        <TokenInput {...props} token="incoming-token" />
      </AppStateProvider>
    )
    await finish()
    expect(props.setToken).not.toHaveBeenCalled()
    expect(props.onJwksResolved).not.toHaveBeenCalled()
  })

  test('does not update parent state after unmount', async () => {
    const { props, unmount, finish } = setupPendingExample()
    unmount()
    await finish()
    expect(props.setToken).not.toHaveBeenCalled()
    expect(props.onJwksResolved).not.toHaveBeenCalled()
  })

  test('applies the example and its keys when the editor is unchanged', async () => {
    const { props, finish } = setupPendingExample()
    await finish()
    expect(props.setToken).toHaveBeenCalledWith('generated-example')
    expect(props.onJwksResolved).toHaveBeenCalledTimes(1)
  })
})
