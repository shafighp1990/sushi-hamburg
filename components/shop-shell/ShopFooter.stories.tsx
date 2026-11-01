import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShopFooter } from "./shop-shell";

const meta = {
  title: "Features/ShopFooter",
  component: ShopFooter,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof ShopFooter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
