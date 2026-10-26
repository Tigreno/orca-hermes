import { useMemo } from 'react'
import { useAppStore } from '@/store'
import {
  isCustomAgentProfileEnabled,
  normalizeCustomAgentProfiles
} from '../../../../shared/custom-agent-profile'
import { launchCustomAgentInNewTab } from '@/lib/launch-custom-agent-in-new-tab'
import type { TabCreateMenuCustomAgentEntry } from './tab-create-menu-options'

/**
 * Enabled custom-agent profiles for the tab bar's create menu.
 *
 * Extracted from the create-menu controller to keep that file under its max-lines budget.
 */
export function useTabBarCustomAgentEntries(
  terminalOnly: boolean
): TabCreateMenuCustomAgentEntry[] {
  const customAgentProfiles = useAppStore((state) => state.settings?.customAgentProfiles)
  return useMemo(() => {
    if (terminalOnly) {
      return []
    }
    return normalizeCustomAgentProfiles(customAgentProfiles)
      .filter(isCustomAgentProfileEnabled)
      .map((profile) => ({ id: profile.id, name: profile.name }))
  }, [terminalOnly, customAgentProfiles])
}

/** Launch the profile a `new-custom-agent` menu option names. */
export function launchTabBarCustomAgent(args: {
  profileId: string
  worktreeId: string
  groupId: string
}): void {
  launchCustomAgentInNewTab(args)
}
