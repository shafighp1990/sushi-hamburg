import type { Meta, StoryObj } from "@storybook/react-vite";
import { Admin } from "./admin";

const meta = {
  title: "Features/Admin",
  component: Admin,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Admin>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
