import type { Meta, StoryObj } from "@storybook/react-vite";
import { Storefront } from "./storefront";

const meta = {
  title: "Features/Storefront",
  component: Storefront,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Storefront>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
