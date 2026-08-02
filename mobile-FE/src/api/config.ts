import { Platform } from 'react-native';

/**
 * Where the API lives, as seen *from the device*.
 *
 * An Android emulator has its own loopback, so `localhost` there is the emulator itself, not the
 * machine running the API. `10.0.2.2` is the alias Android maps to the host's loopback — this is
 * the single most common reason a mobile client "cannot reach the server" while curl on the laptop
 * works fine.
 *
 * On a physical phone neither works: set EXPO_PUBLIC_API_URL to the machine's LAN address.
 */
const DEFAULT_HOST = Platform.select({
  android: 'http://10.0.2.2:5258',
  ios: 'http://localhost:5258',
  default: 'http://localhost:5258',
});

export const API_BASE_URL = `${process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_HOST}/api`;
