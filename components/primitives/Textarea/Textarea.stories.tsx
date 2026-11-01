import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea";
const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { "aria-label": "Message", rows: 4, placeholder: "Write a message" },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Standard: Story = { args: { appearance: "standard" } };
