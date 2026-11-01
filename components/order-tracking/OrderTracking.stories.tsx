import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrderTracking } from "./order-tracking";

const meta = {
  title: "Features/OrderTracking",
  component: OrderTracking,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof OrderTracking>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
