import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminLogin } from "./admin-login";

const meta = {
  title: "Features/AdminLogin",
  component: AdminLogin,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof AdminLogin>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
