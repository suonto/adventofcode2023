import { open } from 'node:fs/promises';
import path from 'node:path';

const cards = [
  'J',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'Q',
  'K',
  'A',
] as const;

type Card = (typeof cards)[number];

const handTypes = [
  'High card',
  'One pair',
  'Two pair',
  'Three of a kind',
  'Full house',
  'Four of a kind',
  'Five of a kind',
] as const;

type HandType = (typeof handTypes)[number];
type Cards = [Card, Card, Card, Card, Card];

class Hand {
  cards: Cards;
  handType: HandType;
  constructor(cards: Cards) {
    this.cards = cards;
    this.handType = this.getHandType();
  }

  private getHandType(): HandType {
    const { counts, jokers } = this.cards.reduce(
      (acc, card) => {
        if (card === 'J') {
          acc.jokers++;
          return acc;
        }
        acc.counts[card] = (acc.counts[card] ?? 0) + 1;
        return acc;
      },
      { jokers: 0, counts: {} } as {
        jokers: number;
        counts: Record<Card, number>;
      },
    );
    const countsArray = Object.values(counts).length
      ? Object.values(counts)
      : [0];
    const maxCount = Math.max(...countsArray) + jokers;
    const minCount = Math.min(...countsArray);
    if (maxCount === 5) {
      return 'Five of a kind';
    } else if (maxCount === 4) {
      return 'Four of a kind';
    } else if (maxCount === 3 && minCount === 2) {
      return 'Full house';
    } else if (maxCount === 3) {
      return 'Three of a kind';
    } else if (maxCount === 2 && countsArray.length === 3) {
      return 'Two pair';
    } else if (maxCount === 2) {
      return 'One pair';
    } else {
      return 'High card';
    }
  }

  compare(other: Hand): number {
    if (this.handType === other.handType) {
      return this.compareCards(other);
    }
    return this.compareHandType(other);
  }

  compareHandType(other: Hand): number {
    return handTypes.indexOf(this.handType) - handTypes.indexOf(other.handType);
  }

  compareCards(other: Hand): number {
    for (let i = 0; i < 5; i++) {
      if (this.cards[i] === other.cards[i]) {
        continue;
      }
      return cards.indexOf(this.cards[i]) - cards.indexOf(other.cards[i]);
    }
    return 0;
  }

  toString(): string {
    return `${this.cards.join('')}: ${this.handType}`;
  }
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  // console.log(new Hand(['J', '8', '4', '4', '8']).toString());
  const bets: { hand: Hand; bid: number }[] = [];
  for await (const line of file.readLines()) {
    const [cardsInput, bid] = line.split(' ', 2);

    bets.push({
      hand: new Hand(cardsInput.trim().split('') as Cards),
      bid: Number.parseInt(bid.trim()),
    });
  }

  bets
    .sort((a, b) => a.hand.compare(b.hand))
    .reduce((acc, bet, i) => {
      const { hand, bid } = bet;
      const rank = i + 1;
      const winnings = rank * bid;
      acc += winnings;
      console.log(hand.toString(), rank, bid, winnings, acc);
      return acc;
    }, 0);
})();
