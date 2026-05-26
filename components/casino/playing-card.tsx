import { View } from 'react-native';

import { GameText } from '@/components/game/game-text';
import { GameTheme } from '@/constants/theme';
import { CasinoCard } from '@/services/casino-service';

type PlayingCardProps = {
  card?: CasinoCard;
  hidden?: boolean;
};

const suitMarks = {
  Clubs: 'C',
  Diamonds: 'D',
  Hearts: 'H',
  Spades: 'S',
};

const redSuits = new Set(['Diamonds', 'Hearts']);

export function PlayingCard({ card, hidden }: PlayingCardProps) {
  if (hidden || !card) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#151A31',
          borderColor: GameTheme.colors.violet,
          borderRadius: GameTheme.radius.sm,
          borderWidth: 1,
          boxShadow: `0 10px 20px ${GameTheme.colors.shadow}`,
          height: 104,
          justifyContent: 'center',
          overflow: 'hidden',
          width: 74,
        }}>
        <View
          style={{
            backgroundColor: GameTheme.colors.panelRaised,
            borderColor: GameTheme.colors.borderBright,
            borderRadius: GameTheme.radius.sm,
            borderWidth: 1,
            height: 82,
            width: 52,
          }}
        />
        <GameText tone="faint" variant="caption">
          ECHO
        </GameText>
      </View>
    );
  }

  const accent = redSuits.has(card.suit) ? GameTheme.colors.danger : GameTheme.colors.background;
  const suit = suitMarks[card.suit];

  return (
    <View
      style={{
        backgroundColor: GameTheme.colors.text,
        borderColor: GameTheme.colors.echo,
        borderRadius: GameTheme.radius.sm,
        borderWidth: 1,
        boxShadow: `0 10px 20px ${GameTheme.colors.shadow}`,
        height: 104,
        justifyContent: 'space-between',
        padding: GameTheme.spacing.xs,
        width: 74,
      }}>
      <GameText style={{ color: accent, lineHeight: 18 }} variant="label">
        {card.rank}
      </GameText>
      <GameText style={{ color: accent, fontSize: 32, lineHeight: 38, textAlign: 'center' }}>
        {suit}
      </GameText>
      <GameText style={{ color: accent, lineHeight: 18, textAlign: 'right' }} variant="label">
        {card.rank}
      </GameText>
    </View>
  );
}
