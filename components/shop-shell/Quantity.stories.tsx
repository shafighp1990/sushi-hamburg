import type { Meta, StoryObj } from "@storybook/react-vite";
import { Quantity } from "./shop-shell";
import { products } from "../../lib/catalog";

const meta = {
  title: "Features/Quantity",
  component: Quantity,
  tags: ["autodocs"],
  args: { p: products[0] },
} satisfies Meta<typeof Quantity>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
