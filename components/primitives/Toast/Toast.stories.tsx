import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./Toast";
const meta = {
  title: "Primitives/Toast",
  component: Toast,
  tags: ["autodocs"],
  args: { tone: "success", children: "Your changes were saved." },
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Success: Story = {
  args: { tone: "success", children: "Saved successfully." },
};
export const Error: Story = {
  args: { tone: "error", children: "Saving failed. Please try again." },
};
