import type { ZcodePlanSite } from './zcode-plan-sites'

/** MiniMax account region used to select the quota endpoint. */
export type MiniMaxEndpoint = 'overseas' | 'cn'

/**
 * Usage-account settings: the credentials and account pickers the status-bar usage window reads.
 *
 * The shape lives in its own file because `global-settings-types.ts` is at the max-lines ceiling.
 */
export type UsageAccountSettings = {
  /** Session cookie for OpenCode Go rate-limit fetching. Stored encrypted. */
  opencodeSessionCookie: string
  /** Optional OpenCode Go workspace ID override; when set, skips the workspaces lookup and fetches usage directly. */
  opencodeWorkspaceId: string
  /** Optional MiniMax group id. When empty, the usage fetcher extracts minimax_group_id_v2 from the cookie. */
  minimaxGroupId: string
  /** Comma-separated MiniMax model names to show in the status bar usage window. */
  minimaxUsageModels: string
  /** MiniMax account region; defaults to overseas for existing users. */
  minimaxEndpoint: MiniMaxEndpoint
  /** GLM Coding Plan site whose API key is saved in AI Provider Accounts; defaults to the international Z.AI console. */
  zcodePlanSite?: ZcodePlanSite
  /** Extract OAuth credentials from the local Gemini CLI for rate-limit fetching. Off by default (explicit opt-in). */
  geminiCliOAuthEnabled: boolean
}
