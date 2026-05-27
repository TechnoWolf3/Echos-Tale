import { View } from 'react-native';

import { GameCard } from '@/components/game/game-card';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney } from '@/hooks/use-elsewhere-game';

type ResultTone = 'bad' | 'good' | 'neutral';

type ResultCardProps = {
  details?: { label: string; value: string }[];
  payout?: number;
  profit?: number;
  stake?: number;
  summary: string;
  title: string;
  tone?: ResultTone;
  xp?: number;
};

const toneStyles = {
  bad: {
    backgroundColor: 'rgba(255, 107, 138, 0.07)',
    borderColor: 'rgba(255, 107, 138, 0.42)',
    textTone: 'ember' as const,
  },
  good: {
    backgroundColor: 'rgba(131, 243, 181, 0.06)',
    borderColor: 'rgba(131, 243, 181, 0.38)',
    textTone: 'echo' as const,
  },
  neutral: {
    backgroundColor: GameTheme.colors.backgroundSoft,
    borderColor: GameTheme.colors.borderBright,
    textTone: 'muted' as const,
  },
};

export function ResultCard({
  details = [],
  payout,
  profit,
  stake,
  summary,
  title,
  tone = 'neutral',
  xp,
}: ResultCardProps) {
  const style = toneStyles[tone];
  const statRows = [
    stake !== undefined ? { label: 'Stake', value: formatMoney(stake) } : null,
    payout !== undefined ? { label: 'Payout', value: formatMoney(payout) } : null,
    profit !== undefined ? { label: 'Profit', value: `${profit >= 0 ? '+' : '-'}${formatMoney(Math.abs(profit))}` } : null,
    xp !== undefined ? { label: 'XP', value: `+${xp}` } : null,
    ...details,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <GameCard style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor, padding: GameTheme.spacing.md }}>
      <View style={{ gap: GameTheme.spacing.xs }}>
        <GameText tone={style.textTone} variant="label">
          Result
        </GameText>
        <GameText variant="title">{title}</GameText>
        <GameText tone="muted">{summary}</GameText>
      </View>
      {statRows.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
          {statRows.map((row) => (
            <View
              key={`${row.label}-${row.value}`}
              style={{
                backgroundColor: GameTheme.colors.backgroundSoft,
                borderColor: GameTheme.colors.border,
                borderRadius: GameTheme.radius.sm,
                borderWidth: 1,
                minWidth: 116,
                padding: GameTheme.spacing.sm,
              }}>
              <GameText tone="faint" variant="caption">
                {row.label}
              </GameText>
              <GameText tone={style.textTone} variant="label">
                {row.value}
              </GameText>
            </View>
          ))}
        </View>
      ) : null}
    </GameCard>
  );
}
