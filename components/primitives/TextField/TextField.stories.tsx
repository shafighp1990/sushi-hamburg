import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField";
const meta = {
  title: "Primitives/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: {
    label: "Email",
    type: "email",
    helperText: "We will send your receipt here.",
    placeholder: "name@example.com",
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: "Enter a valid email address." } };
