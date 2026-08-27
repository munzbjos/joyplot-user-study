import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })
Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true })
Object.defineProperty(window, 'crypto', { value: { randomUUID: () => 'test-idempotency-key' } })
