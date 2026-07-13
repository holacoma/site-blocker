// Ambient type definitions for JSDoc annotations across the codebase.
// Not compiled/emitted — consumed only by `tsc --checkJs` for typechecking.

export interface RawBlockedSite {
  domain: string;
  days?: number[];
  timerMinutes?: number;
  exceptions?: string[];
}

/** domain -> expiry timestamp (ms since epoch) */
export type ActiveTimers = { [domain: string]: number };
/** domain -> remaining ms left when paused */
export type PausedTimers = { [domain: string]: number };
/** domain -> "YYYY-MM-DD" of the day the timer last auto-started */
export type UsedTimerDates = { [domain: string]: string };
/** tabId (string) -> hostname currently loaded in that tab */
export type TabHostnames = { [tabId: string]: string };
/** windowId (string) -> tabId of the active tab in that window */
export type ActiveTabPerWindow = { [windowId: string]: number };

export interface BlockSiteMessage {
  type: "BLOCK_SITE";
  domain: string;
  timerMinutes?: number;
  days?: number[];
}
export interface RedirectToBlockedMessage {
  type: "REDIRECT_TO_BLOCKED";
  site: string;
}
export interface StartTimerMessage {
  type: "START_TIMER";
  domain: string;
  minutes: number;
}
export interface StopTimerMessage {
  type: "STOP_TIMER";
  domain: string;
}
export interface GetTimerStateMessage {
  type: "GET_TIMER_STATE";
  domain: string;
}
export interface GetSiteConfigMessage {
  type: "GET_SITE_CONFIG";
  domain: string;
}

export type RuntimeMessage =
  | BlockSiteMessage
  | RedirectToBlockedMessage
  | StartTimerMessage
  | StopTimerMessage
  | GetTimerStateMessage
  | GetSiteConfigMessage;

export interface GetTimerStateResponse {
  expiry: number | null;
  pausedRemaining?: number;
}

export interface GetSiteConfigResponse {
  entry: RawBlockedSite | null;
}

export interface FeatureContext {
  activeTimers: ActiveTimers;
  pausedTimers: PausedTimers;
  usedTimerDates: UsedTimerDates;
  today: string;
  onUpdate: (updatedSite: import('./BlockedSite.js').BlockedSite) => void;
  refresh: () => void;
}

export interface Feature {
  id: string;
  readonly label: string;
  readonly description: string;
  render: (site: import('./BlockedSite.js').BlockedSite, ctx: FeatureContext) => HTMLElement;
}
