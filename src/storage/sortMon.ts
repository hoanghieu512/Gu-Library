import type { Mon } from './types';
import { UNFILED } from '../import/prefix';

export function sortMons(mons: Mon[]): Mon[] {
  return [...mons].sort((a, b) => {
    if (a.name === UNFILED) return 1;   // luôn cuối
    if (b.name === UNFILED) return -1;
    const ao = a.meta.order, bo = b.meta.order;
    if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
    if (ao !== undefined && bo === undefined) return -1;
    if (ao === undefined && bo !== undefined) return 1;
    return a.name.localeCompare(b.name, 'vi');
  });
}
