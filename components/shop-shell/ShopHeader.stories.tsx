import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShopHeader } from "./shop-shell";

const meta = {
  title: "Features/ShopHeader",
  component: ShopHeader,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof ShopHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
