import debug from 'debug';
import { Device, detectDevice } from './Device';
import * as types from './types';
/**
 * Expose all types.
 */
export { types };
/**
 * Expose mediasoup-client version.
 */
export const version = '3.6.54';
/**
 * Expose Device class and detectDevice() helper.
 */
export { Device, detectDevice };
/**
 * Expose parseScalabilityMode() function.
 */
export { parse as parseScalabilityMode } from './scalabilityModes';
/**
 * Expose the debug module.
 */
export { debug };
