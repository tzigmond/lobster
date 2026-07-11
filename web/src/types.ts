export interface Level {
  price: number;
  qty:   number;
}

export interface BookSnapshot {
  bids:   Level[];
  asks:   Level[];
  spread: number;
  mid:    number;
}

export type ConnState = 'connecting' | 'live' | 'disconnected';
