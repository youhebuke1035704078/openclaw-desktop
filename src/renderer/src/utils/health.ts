import type { HealthChannelSummary } from '@/api/types'

/**
 * Decide whether a channel is actually linked to its upstream.
 *
 * Gateway's HealthChannelSummary has a top-level `linked` field that is only
 * populated for single-account channels. Multi-account channels (e.g. feishu
 * with one or more webhook accounts) put the real per-account state under
 * `accounts[accountId].linked` and leave the top-level `linked` as `undefined`.
 *
 * A naive `!ch.linked` check therefore flags EVERY multi-account channel as
 * "abnormal" because `!undefined === true`. We aggregate here: a channel is
 * considered linked when either
 *   - the top-level `linked` is explicitly `true`, OR
 *   - `accounts` is populated and at least one account has `linked === true`.
 *
 * Returning `false` when `linked` is merely missing (no accounts at all) is
 * intentional — we don't want to assume health just because the server
 * omitted the field.
 */
export function isChannelLinked(ch: HealthChannelSummary): boolean {
  if (ch.linked === true) return true
  const accounts = ch.accounts
  if (accounts && Object.keys(accounts).length > 0) {
    return Object.values(accounts).some((acc) => acc?.linked === true)
  }
  return false
}
