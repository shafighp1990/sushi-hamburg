import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkout } from "./checkout";

const meta = {
  title: "Features/Checkout",
  component: Checkout,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Checkout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
