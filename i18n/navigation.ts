import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link, useRouter, usePathname, redirect — tous locale-aware
export const { Link, useRouter, usePathname, redirect } = createNavigation(routing);
