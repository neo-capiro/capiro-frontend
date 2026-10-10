import type { UIEvent } from '@capiro/meri-contracts';

export type { UIEvent, RunBinding } from '@capiro/meri-contracts';
export type RunStatusState = Extract<UIEvent, { type: 'run.status' }>['data']['state'];
/** Injected boundary validation returns the canonical, validated event or throws. */
export type UIEventValidator = (value: unknown) => UIEvent;
