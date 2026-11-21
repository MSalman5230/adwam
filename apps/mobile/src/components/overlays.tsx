import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../language/messages';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export function Snackbar({ message, onUndo }: { message: string; onUndo?: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.snackbar, { backgroundColor: palette.inverse }]} role="status">
      <Text accessibilityLiveRegion="polite" style={[typography.caption, styles.message, { color: palette.onInverse }]}>{message}</Text>
      {onUndo && (
        <Pressable accessibilityRole="button" onPress={onUndo} style={styles.undo}>
          <Text style={[typography.button, { color: palette.inverseAccent }]}>{t('common.undo')}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Sheet({ open, title, lead, onClose, children }: {
  open: boolean; title: string; lead?: string; onClose: () => void; children?: ReactNode;
}) {
  const { palette } = useTheme();
  const { height } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable onPress={onClose} aria-hidden style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} />
        <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" style={styles.positionSheet}>
          <View accessibilityViewIsModal role="dialog" accessibilityLabel={title}
            style={[styles.sheet, { maxHeight: height * 0.88, backgroundColor: palette.paper }]}>
            <View aria-hidden style={[styles.handleBar, { backgroundColor: palette.ink3 }]} />
            <ScrollView style={styles.sheetScroll} contentContainerStyle={[styles.sheetContent, { paddingBottom: 28 + bottom }]}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text accessibilityRole="header" style={[typography.sheetTitle, { color: palette.ink }]}>{title}</Text>
              {lead && <Text style={[styles.lead, typography.sheetLead, { color: palette.ink2 }]}>{lead}</Text>}
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    minHeight: 48, paddingVertical: 6, paddingLeft: 16, paddingRight: 6, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 6,
  },
  message: { flex: 1 },
  undo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  modal: { flex: 1 },
  positionSheet: { flex: 1, justifyContent: 'flex-end' },
  sheet: { flexShrink: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 14 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetContent: { paddingHorizontal: 20 },
  handleBar: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, opacity: 0.45, marginBottom: 16 },
  lead: { marginTop: 6 },
});
