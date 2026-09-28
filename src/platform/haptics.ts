/** Kurzes haptisches Feedback (auf Web wirkungslos). */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticResult(correct: boolean): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(
    correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  ).catch(() => {});
}

export function hapticTap(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
