import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldMessage } from "./FieldMessage";
const meta = {
  title: "Primitives/FieldMessage",
  component: FieldMessage,
  tags: ["autodocs"],
  args: { tone: "error", children: "Please check the entered value." },
} satisfies Meta<typeof FieldMessage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Success: Story = {
  args: { tone: "success", children: "Saved successfully." },
};
export const Error: Story = {
  args: { tone: "error", children: "Saving failed. Please try again." },
};
