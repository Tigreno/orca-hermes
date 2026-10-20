// Stub: platform-resolution helpers for custom-agent launches were extracted
// upstream but did not land in this build. Always echo back the fallback so
// the launchers can keep using `Platform` (NodeJS.Platform) without having
// to special-case an undefined result.
export function getAgentLaunchPlatformForRepo(_repo: unknown, fallback: NodeJS.Platform | undefined): NodeJS.Platform {
  return fallback ?? (process.platform as NodeJS.Platform)
}
