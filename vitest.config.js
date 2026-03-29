import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Each test file gets a clean module registry so vi.mock() side-effects
    // do not bleed between files.
    isolate: true,
    // Vitest outputs a compact reporter during CI; use 'verbose' locally.
    reporter: process.env.CI ? 'dot' : 'verbose',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/api/overlap.js',
        'src/lib/validations/patients.js',
        'src/lib/validations/appointments.js',
        'src/lib/notifications/templates.js',
        'src/lib/notifications/senders.js',
        'src/app/api/notifications/remind/route.js',
        'src/app/api/admin/appointments/route.js',
      ],
    },
  },
  resolve: {
    alias: {
      // Mirror the Next.js "@/" path alias defined in jsconfig / tsconfig.
      '@': path.resolve(__dirname, './src'),
    },
  },
})
