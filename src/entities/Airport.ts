import { STARTING_BALANCE } from '../config';

export class Airport {
  name = 'Airport';
  bankBalance = STARTING_BALANCE;

  earn(amount: number): void {
    this.bankBalance += amount;
  }

  deduct(amount: number): void {
    this.bankBalance -= amount;
  }

  reset(): void {
    this.bankBalance = STARTING_BALANCE;
  }
}
