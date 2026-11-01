import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";
const meta = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    "aria-label": "Email",
    type: "email",
    placeholder: "name@example.com",
  },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Standard: Story = { args: { appearance: "standard" } };
