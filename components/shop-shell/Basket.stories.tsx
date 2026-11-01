import type { Meta, StoryObj } from "@storybook/react-vite";
import { Basket } from "./shop-shell";

const meta = {
  title: "Features/Basket",
  component: Basket,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Basket>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
