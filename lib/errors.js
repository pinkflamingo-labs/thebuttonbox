// Plain-language messages for database and network errors, so makers never see codes.
export const READ_ONLY_MESSAGE = 'Your studio is read-only at the moment. Choose a plan on the pricing page to keep adding.'

export function isReadOnlyError(error) {
  if (!error) return false
  const msg = String(error.message || error)
  return error.code === '42501' || /row-level security|permission denied/i.test(msg)
}

export function friendlyError(error, fallback = 'That did not save. Please try again.') {
  if (!error) return fallback
  const msg = String(error.message || error)
  const code = error.code || ''
  if (isReadOnlyError(error)) return READ_ONLY_MESSAGE
  if (code === '23505' || /duplicate key/i.test(msg)) return 'That is already in your studio.'
  if (code === '23514' || /check constraint/i.test(msg)) return 'One of the values is outside what the studio accepts. Check the numbers and try again.'
  if (code === '23503' || /foreign key/i.test(msg)) return 'Something this links to has been removed. Refresh the page and try again.'
  if (/failed to fetch|network|load failed/i.test(msg)) return 'The connection dropped. Check your internet and try again.'
  if (/jwt|session|not authenticated|auth session missing/i.test(msg)) return 'Your sign-in has expired. Please sign in again.'
  if (/aal2|assurance/i.test(msg)) return 'Please finish the second sign-in step, then try again.'
  return fallback
}
