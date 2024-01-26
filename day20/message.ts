export class Message {
  pulse: boolean;
  from: string;
  to: string;

  constructor(params: { from: string; to: string; pulse: boolean }) {
    this.from = params.from;
    this.to = params.to;
    this.pulse = params.pulse;
  }

  toString(): string {
    return `${this.from} -${this.pulse ? 'high' : 'low'}-> ${this.to}`;
  }
}
