import { useChatSettingsOwnPermissions } from '@/runtime/structured-agent-session-host-capability'
import { toast } from 'sonner'
import { getAgentLabel, getAgentCatalog, type AgentCatalogEntry } from '@/lib/agent-catalog'
import type { TuiAgent } from '../../../../../../shared/agent-launch/catalog/tui-agent'
import { wholeAgentEnvironmentUpdates } from '../../../../../../shared/agent-launch/choices/agent-launch-permission-updates'
import { useRef } from 'react'
import { useAppStore } from '@/store/index'
import {
  agentLaunchSettingsMutationUpdates,
  projectAgentLaunchSettings,
  type AgentLaunchSettingsMutation
} from '../../../../../../shared/agent-launch/choices/agent-launch-settings'
import {
  CUSTOM_AGENT_PROFILES_MAX,
  getDefaultCustomAgentProfile,
  normalizeCustomAgentProfiles,
  setDefaultCustomAgentProfile
} from '../../../../../../shared/custom-agent-profile'
import { resolveTuiAgentLaunchArgs } from '../../../../../../shared/agent-launch/choices/tui-agent-launch-defaults'
import type { GlobalSettings } from '../../../../../../shared/global-settings-types'
import {
  AgentLaunchSettingsCatalog,
  type AgentPermissionsRenderer
} from './AgentLaunchSettingsCatalog'
import { AgentLaunchSettingsLoading } from './AgentLaunchSettingsLoading'
import {
  CustomAgentProfilesSection,
  type CustomAgentProfilesSectionHandle
} from '../../CustomAgentProfilesSection'
import { duplicateBuiltInAgentAsCustom } from '../../custom-agent-profile-draft'
import { CLIENT_PLATFORM } from '@/lib/new-workspace'
import { resolveLocalWindowsAgentStartupShell } from '../../../../../../shared/windows-terminal-shell'
import { resolveStartupShell } from '../../../../../../shared/agent-launch/startup/tui-agent-startup-shell'
import { HostAgentLaunchSettings } from './HostAgentLaunchSettings'
import { SettingsHostScopeUnavailableNotice } from '../../host-scope/SettingsHostScopePicker'
import type { SettingsHostScope } from '../../host-scope/settings-host-scope'
import { runtimeTargetEnvironmentId } from '@/runtime/runtime-client-target'
import { translate } from '@/i18n/i18n'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import {
  useAgentPermissionOverrideNotice,
  type SelectPermissionOverrides
} from '../permissions/agent-permission-override-notice'

export function AgentLaunchSettingsSection({
  settings,
  updateSettings,
  hostScope,
  renderPermissions
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  /** Host chosen in the Settings host menu; launch settings are edited in that host's store. */
  hostScope: SettingsHostScope
  renderPermissions: AgentPermissionsRenderer
}): React.JSX.Element {
  const environmentId = runtimeTargetEnvironmentId(hostScope.target)
  const environment = useAppStore((state) =>
    environmentId ? state.runtimeEnvironments.find((entry) => entry.id === environmentId) : null
  )
  return (
    <section className="space-y-8">
      {!environmentId ? (
        <LocalAgentLaunchSettings
          settings={settings}
          updateSettings={updateSettings}
          renderPermissions={renderPermissions}
        />
      ) : environment ? (
        <HostAgentLaunchSettings
          key={`${environmentId}:${environment.pairingRevision ?? environment.createdAt}`}
          environmentId={environmentId}
          pairingRevision={environment.pairingRevision ?? environment.createdAt}
          hostName={environment.name}
          renderPermissions={renderPermissions}
        />
      ) : !hostScope.available ? (
        <SettingsHostScopeUnavailableNotice />
      ) : (
        <AgentLaunchSettingsLoading />
      )}
    </section>
  )
}

function LocalAgentLaunchSettings({
  settings,
  updateSettings,
  renderPermissions
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  renderPermissions: AgentPermissionsRenderer
}): React.JSX.Element {
  const notify = useAgentPermissionOverrideNotice()
  const chatOwnSupported = useChatSettingsOwnPermissions()
  const tail = useRef<Promise<void> | null>(null)
  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const write = (tail.current ?? Promise.resolve()).catch(() => {}).then(operation)
    tail.current = write
    return write
  }
  const current = () => useAppStore.getState().settings ?? settings
  const permissions = (latest = current()) => {
    return latest.agentPermissionDefault
      ? { default: latest.agentPermissionDefault, overrides: latest.agentPermissionOverrides ?? {} }
      : undefined
  }
  const failed = (agent: TuiAgent | undefined) => (error: unknown) => {
    toast.error(
      agent
        ? translate(
            'settings.agents.localSaveFailedAgent',
            '{{agent}} settings could not be saved. Try again.',
            { agent: getAgentLabel(agent) }
          )
        : translate(
            'settings.agents.localSaveFailed',
            'Agent settings could not be saved. Try again.'
          )
    )
    throw error
  }
  const write = (
    agent: TuiAgent | undefined,
    compute: (current: GlobalSettings, platform: NodeJS.Platform) => Partial<GlobalSettings>
  ): Promise<GlobalSettings> => {
    return Promise.resolve()
      .then(async () => {
        const latest = current()
        const updates = compute(latest, window.api.platform.get().platform)
        let acknowledged = latest
        if (Object.keys(updates).length) {
          await useAppStore.getState().updateSettingsOrThrow(updates, (settings) => {
            acknowledged = settings
          })
        }
        return acknowledged
      })
      .catch(failed(agent))
  }
  const apply = (agent: TuiAgent | undefined, compute: Parameters<typeof write>[1]) =>
    enqueue(async () => {
      await write(agent, compute)
    })
  const follow = (select: SelectPermissionOverrides) =>
    enqueue(async () => {
      let agent: TuiAgent | undefined
      let attempted = false
      try {
        for (agent of select(permissions(await window.api.settings.get()))) {
          if (select(permissions(await window.api.settings.get())).includes(agent)) {
            attempted = true
            await callRuntimeRpc(LOCAL_DETECTION_TARGET, 'settings.mutateAgentLaunch', {
              type: 'permission',
              agent,
              choice: 'default'
            })
          }
        }
      } catch (error) {
        failed(agent)(error)
      } finally {
        if (attempted) {
          await useAppStore.getState().fetchSettings({ deferOwnerWorktreeVisibilityDefaults: true })
        }
      }
    })
  const mutate = (mutation: AgentLaunchSettingsMutation): Promise<void> =>
    enqueue(async () => {
      const before = permissions()
      if (mutation.type === 'launch-choices') {
        try {
          await callRuntimeRpc(LOCAL_DETECTION_TARGET, 'settings.mutateAgentLaunch', mutation)
          await useAppStore.getState().fetchSettings({ deferOwnerWorktreeVisibilityDefaults: true })
        } catch (error) {
          failed(mutation.agent)(error)
        }
        return
      }
      const after = await write(
        mutation.type !== 'default' && 'agent' in mutation ? mutation.agent : undefined,
        (latest, platform) => agentLaunchSettingsMutationUpdates(latest, mutation, platform)
      )
      notify(before, permissions(after), mutation, follow)
    })
  const saveEnvironment = (agent: TuiAgent, requested: Record<string, string>): Promise<void> =>
    apply(agent, (current, platform) =>
      wholeAgentEnvironmentUpdates(current, agent, requested, platform)
    )
  const customProfilesRef = useRef<CustomAgentProfilesSectionHandle | null>(null)
  const updateSettingsOrThrow = useAppStore((state) => state.updateSettingsOrThrow)
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const catalog = getAgentCatalog()
  const customAgentProfiles = normalizeCustomAgentProfiles(settings.customAgentProfiles)
  const defaultCustomAgent = getDefaultCustomAgentProfile(customAgentProfiles)
  const cmdOverrides = settings.agentCmdOverrides ?? {}
  const setBuiltInDefault = (agent: TuiAgent | 'blank' | null): void => {
    void updateSettings({
      defaultTuiAgent: agent,
      ...(defaultCustomAgent
        ? { customAgentProfiles: setDefaultCustomAgentProfile(customAgentProfiles, null) }
        : {})
    })
  }
  const duplicateAsCustom = (agent: AgentCatalogEntry): void => {
    if (customAgentProfiles.length >= CUSTOM_AGENT_PROFILES_MAX) {
      toast.error(
        translate(
          'auto.components.settings.CustomAgentProfilesSection.limit',
          'Custom agents are limited to {{value0}} profiles.',
          { value0: String(CUSTOM_AGENT_PROFILES_MAX) }
        )
      )
      return
    }
    const duplicateShell = resolveStartupShell(
      CLIENT_PLATFORM,
      resolveLocalWindowsAgentStartupShell({
        platform: CLIENT_PLATFORM,
        isRemote: false,
        terminalWindowsShell: settings.terminalWindowsShell
      })
    )
    const draft = duplicateBuiltInAgentAsCustom({
      agent,
      command: cmdOverrides[agent.id] ?? agent.cmd,
      launchArgs: resolveTuiAgentLaunchArgs(agent.id, settings),
      shell: duplicateShell,
      reservedNames: [
        ...catalog.map((entry) => entry.label),
        ...customAgentProfiles.map((profile) => profile.name)
      ]
    })
    if (!draft) {
      toast.error(
        translate(
          'auto.components.settings.AgentsPane.duplicateCommandError',
          'This command override contains shell syntax. Create the custom agent manually.'
        )
      )
      return
    }
    customProfilesRef.current?.openProfile(draft)
  }

  return (
    <AgentLaunchSettingsCatalog
      settings={projectAgentLaunchSettings(settings, window.api.platform.get().platform)}
      mutate={mutate}
      detectionTarget={LOCAL_DETECTION_TARGET}
      hostName={null}
      renderPermissions={renderPermissions}
      nativeChatPermissionsSupported
      chatOwnSupported={chatOwnSupported}
      local={{
        settings,
        updateSettings,
        saveEnvironment,
        customAgents: {
          profiles: customAgentProfiles,
          defaultProfile: defaultCustomAgent,
          onSetBuiltInDefault: setBuiltInDefault,
          onSetDefaultProfile: (profileId) =>
            void updateSettings({
              customAgentProfiles: setDefaultCustomAgentProfile(customAgentProfiles, profileId)
            }),
          onProfilesChange: (profiles) => updateSettingsOrThrow({ customAgentProfiles: profiles }),
          onDuplicateAsCustom: duplicateAsCustom,
          duplicateDisabled: customAgentProfiles.length >= CUSTOM_AGENT_PROFILES_MAX,
          afterDetectedAgents: (
            <CustomAgentProfilesSection
              ref={customProfilesRef}
              profiles={customAgentProfiles}
              catalog={catalog}
              launchWorktreeId={activeWorktreeId}
              onProfilesChange={(profiles) =>
                updateSettingsOrThrow({ customAgentProfiles: profiles })
              }
            />
          )
        }
      }}
    />
  )
}

const LOCAL_DETECTION_TARGET = { kind: 'local' } as const
