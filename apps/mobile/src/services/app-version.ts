import { nativeApplicationVersion } from 'expo-application';
import Constants from 'expo-constants';

export const appVersion = nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
