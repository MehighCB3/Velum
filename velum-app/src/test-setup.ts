import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement scrollIntoView
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
}
