/**
 * Preset Configurations
 *
 * Built-in configuration presets
 */

export { recommended } from './recommended';
export { security } from './security';
export { all } from './all';

import { Config } from '../types';
import { recommended } from './recommended';
import { security } from './security';
import { all } from './all';

/**
 * Map of preset names to configurations
 */
export const presets: Record<string, Config> = {
  recommended,
  security,
  all,
};

/**
 * Get preset by name
 */
export function getPreset(name: string): Config | undefined {
  return presets[name];
}
