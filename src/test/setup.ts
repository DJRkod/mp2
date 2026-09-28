import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearTrail } from '../browse/trail'

afterEach(() => {
  cleanup()
  clearTrail()
  window.localStorage.clear()
  window.sessionStorage.clear()
})
