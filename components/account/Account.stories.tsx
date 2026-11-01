import type { Meta, StoryObj } from "@storybook/react-vite";
import { Account } from "./account";

const meta = {
  title: "Features/Account",
  component: Account,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Account>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
