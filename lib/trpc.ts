import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/api/root';

export const trpc = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  return 'https://sayarty.store';
}
