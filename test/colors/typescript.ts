// 한글 주석
import { join } from 'node:path';

export interface Options {
  name: string;
  retries?: number;
}

/** Doc comment */
export class Runner<T> implements Disposable {
  private static readonly LIMIT = 3;

  constructor(private readonly options: Options) {}

  async run(input: T): Promise<string> {
    const pattern = /a+b/g;
    return `${this.options.name}: ${input}`;
  }
}
