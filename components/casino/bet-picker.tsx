import { TextInput, View } from 'react-native';

import { CasinoButton } from '@/components/casino/casino-button';
import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { formatMoney } from '@/hooks/use-elsewhere-game';

type BetPickerProps = {
  amount: number;
  disabled?: boolean;
  max?: number;
  min?: number;
  onChange: (amount: number) => void;
  quickBets?: number[];
};

const defaultQuickBets = [500, 1_500, 5_000, 10_000];

function clampBet(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function BetPicker({
  amount,
  disabled,
  max = 250_000,
  min = 500,
  onChange,
  quickBets = defaultQuickBets,
}: BetPickerProps) {
  const updateCustomBet = (value: string) => {
    const parsed = Number(value.replace(/\D/g, ''));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      onChange(min);
      return;
    }

    onChange(clampBet(parsed, min, max));
  };

  return (
    <View style={{ gap: GameTheme.spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GameTheme.spacing.sm }}>
        {quickBets.map((bet) => (
          <CasinoButton disabled={disabled} key={bet} onPress={() => onChange(bet)} tone={amount === bet ? 'echo' : 'plain'}>
            {formatMoney(bet)}
          </CasinoButton>
        ))}
      </View>
      <View
        style={{
          backgroundColor: GameTheme.colors.backgroundSoft,
          borderColor: GameTheme.colors.borderBright,
          borderRadius: GameTheme.radius.sm,
          borderWidth: 1,
          gap: GameTheme.spacing.xs,
          padding: GameTheme.spacing.sm,
        }}>
        <GameText tone="faint" variant="caption">
          Custom Bet
        </GameText>
        <TextInput
          editable={!disabled}
          keyboardType="number-pad"
          onChangeText={updateCustomBet}
          placeholder={`${min}`}
          placeholderTextColor={GameTheme.colors.textFaint}
          style={{
            color: GameTheme.colors.echo,
            fontSize: 22,
            fontWeight: '800',
            padding: 0,
          }}
          value={String(amount)}
        />
        <GameText tone="faint" variant="caption">
          Min {formatMoney(min)} | Max {formatMoney(max)}
        </GameText>
      </View>
    </View>
  );
}
