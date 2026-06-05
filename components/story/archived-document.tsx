import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import {
  NULL_HOUSE_HOLDINGS,
  type LedgerRecord,
  type LedgerRecordSection,
} from '@/data/story';

type ArchivedDocumentProps = {
  foundSectionIds: string[];
  onSectionPress: (section: LedgerRecordSection) => void;
  record: LedgerRecord;
};

export function ArchivedDocument({ foundSectionIds, onSectionPress, record }: ArchivedDocumentProps) {
  return (
    <View
      style={{
        backgroundColor: '#101321',
        borderColor: GameTheme.colors.borderBright,
        borderRadius: GameTheme.radius.md,
        borderWidth: 1,
        boxShadow: `0 18px 40px ${GameTheme.colors.shadow}`,
        gap: GameTheme.spacing.md,
        overflow: 'hidden',
      }}>
      <View
        style={{
          backgroundColor: 'rgba(169, 243, 255, 0.06)',
          borderBottomColor: GameTheme.colors.border,
          borderBottomWidth: 1,
          gap: GameTheme.spacing.md,
          padding: GameTheme.spacing.md,
        }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: GameTheme.spacing.md }}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={NULL_HOUSE_HOLDINGS.asset}
            style={{ height: 76, width: 76 }}
          />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <GameText tone="faint" variant="label">
              Null House Holdings
            </GameText>
            <GameText variant="title">{record.title}</GameText>
            <GameText tone="muted">In Null We Endure</GameText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          {['ARCHIVED', 'INTERNAL', record.classification.toUpperCase(), record.status.toUpperCase()].map((stamp) => (
            <View
              key={stamp}
              style={{
                borderColor: stamp.includes('SEALED') || stamp.includes('RESTRICTED') ? GameTheme.colors.ember : GameTheme.colors.borderBright,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                paddingHorizontal: GameTheme.spacing.sm,
                paddingVertical: 4,
              }}>
              <GameText tone={stamp.includes('SEALED') || stamp.includes('RESTRICTED') ? 'ember' : 'faint'} variant="caption">
                {stamp}
              </GameText>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: GameTheme.spacing.sm, padding: GameTheme.spacing.md }}>
        <View
          style={{
            borderBottomColor: GameTheme.colors.border,
            borderBottomWidth: 1,
            gap: GameTheme.spacing.xs,
            paddingBottom: GameTheme.spacing.md,
          }}>
          <GameText tone="faint" variant="label">
            {record.division}
          </GameText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.md }}>
            <GameText tone="muted">Record ID: {record.recordId}</GameText>
            <GameText tone="muted">Type: {record.recordType}</GameText>
            <GameText tone="muted">Status: {record.status}</GameText>
          </View>
        </View>

        {record.sections.map((section) => {
          const corrected = foundSectionIds.includes(section.id);
          const label = corrected ? section.correctedLabel ?? section.label : section.label;
          const value =
            corrected && section.special !== 'missing-approval-glitch'
              ? section.correctedValue ?? section.value
              : section.value;
          const anomalyFound = corrected && section.isAnomaly;

          return (
            <Pressable
              accessibilityRole="button"
              key={section.id}
              onPress={() => onSectionPress(section)}
              style={({ pressed }) => ({
                backgroundColor: anomalyFound
                  ? 'rgba(131, 243, 181, 0.08)'
                  : pressed
                    ? 'rgba(169, 243, 255, 0.08)'
                    : 'rgba(6, 7, 18, 0.34)',
                borderColor: anomalyFound ? GameTheme.colors.success : GameTheme.colors.border,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                gap: 3,
                minHeight: 58,
                padding: GameTheme.spacing.sm,
              })}>
              <View style={{ flexDirection: 'row', gap: GameTheme.spacing.sm, justifyContent: 'space-between' }}>
                <GameText tone="faint" variant="caption">
                  {label}
                </GameText>
                {anomalyFound ? (
                  <GameText tone="echo" variant="caption">
                    CORRECTED
                  </GameText>
                ) : null}
              </View>
              <GameText tone={anomalyFound ? 'echo' : 'primary'}>{value}</GameText>
              {corrected && section.special === 'missing-approval-glitch' ? (
                <GameText tone="ember" variant="caption">
                  Brief correction observed: {section.correctedValue}. Field reverted to [MISSING].
                </GameText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
