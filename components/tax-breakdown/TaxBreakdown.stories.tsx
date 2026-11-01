import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaxBreakdown } from "./tax-breakdown";

const meta = {
  title: "Features/TaxBreakdown",
  component: TaxBreakdown,
  tags: ["autodocs"],
  args: { tax: null },
} satisfies Meta<typeof TaxBreakdown>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
