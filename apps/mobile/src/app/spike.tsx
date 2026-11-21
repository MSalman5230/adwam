import { useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import messages from '@adwam/content/messages/en.json';

import { checkIntl } from '../spike/intl-check';
import {
  getLog,
  inspectNotifications,
  scheduleActions,
  scheduleSamples,
  startBackgroundTask,
} from '../spike/tasks';

export default function SpikeScreen() {
  const [log, setLog] = useState(getLog);
  const [busy, setBusy] = useState(false);
  const text = messages.spike;
  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
      setLog(getLog());
    } catch (error) {
      setLog([String(error), ...getLog()]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24 }}>
          {text.title}
        </Text>
        <Button
          disabled={busy}
          title={text.actions}
          onPress={() => void run(scheduleActions)}
        />
        <Button
          disabled={busy}
          title={text.overnight}
          onPress={() => void run(() => scheduleSamples('overnight'))}
        />
        <Button
          disabled={busy}
          title={text.capacity}
          onPress={() => void run(() => scheduleSamples('capacity'))}
        />
        <Button
          disabled={busy}
          title={text.background}
          onPress={() => void run(startBackgroundTask)}
        />
        <Button
          disabled={busy}
          title={text.inspect}
          onPress={() => void run(inspectNotifications)}
        />
        <Button
          disabled={busy}
          title={text.intl}
          onPress={() => {
            try {
              const differences = checkIntl();
              setLog(
                differences.length
                  ? differences
                  : [text.intlPassed, ...getLog()],
              );
            } catch (error) {
              setLog([String(error), ...getLog()]);
            }
          }}
        />
        <View accessible accessibilityLiveRegion="polite">
          <Text selectable>{log.join('\n')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
