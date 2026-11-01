import { fn } from "storybook/test";
const router = {
  push: fn(),
  replace: fn(),
  refresh: fn(),
  back: fn(),
  forward: fn(),
  prefetch: fn(),
};
export const useRouter = () => router;
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
