import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearTrail } from '../browse/trail'
import { forgetPreloadedImages } from '../components/artworkTransition'

afterEach(() => {
  cleanup()
  clearTrail()
  forgetPreloadedImages()
  window.localStorage.clear()
  window.sessionStorage.clear()
})
