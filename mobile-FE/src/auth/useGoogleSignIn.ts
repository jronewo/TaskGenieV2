import { useEffect, useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from './AuthContext';

/**
 * Google sign-in, through the native Google Play services flow.
 *
 * Not `expo-auth-session`: that opens a browser and asks Google for an id token directly, which
 * Google refuses from an Android OAuth client ("Lỗi 400: invalid_request"), and refuses from a Web
 * client too once a standalone app redirects through a custom scheme ("Custom scheme URIs are not
 * allowed for 'WEB' client type"). Both were tried before landing here.
 *
 * The native flow needs *both* OAuth clients, and uses each for what it is actually for:
 *   • the **Android** client (package name + SHA-1) is how Google verifies the app is genuine;
 *   • the **Web** client id goes in `webClientId`, and it is the audience of the id token that
 *     comes back — which is precisely what the backend validates against.
 */
export function useGoogleSignIn() {
  const { signInWithGoogle } = useAuth();
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!webClientId) return;
    GoogleSignin.configure({
      webClientId,
      // The server acts for nobody offline, so there is no reason to ask for a refresh token the
      // app would then have to store and protect.
      offlineAccess: false,
    });
  }, [webClientId]);

  const signIn = async () => {
    if (!webClientId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      // The payload moved under `data` in v13; accept both so a library bump does not break this.
      const raw = result as any;
      const idToken = raw?.data?.idToken ?? raw?.idToken ?? null;
      if (!idToken) throw new Error('Google không trả về id token.');

      await signInWithGoogle(idToken);
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        // Backing out is not a failure worth reporting.
      } else if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Thiết bị này không có Google Play services.');
      } else {
        setError(err?.message ?? 'Đăng nhập Google thất bại.');
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    ready: !!webClientId && !busy,
    configured: !!webClientId,
    busy,
    error,
    signIn,
  };
}
