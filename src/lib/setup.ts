export interface SetupQuestion {
	id: string;
	title: string;
	topic: string;
}

export const DEFAULT_TOPIC = 'General';

export function makeId(prefix = 'q'): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
