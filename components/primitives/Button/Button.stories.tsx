import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Continue", type: "button" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Busy: Story = { args: { busy: true } };
export const Standard: Story = { args: { appearance: "standard" } };
