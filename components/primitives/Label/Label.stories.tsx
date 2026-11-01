import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./Label";
const meta = {
  title: "Primitives/Label",
  component: Label,
  tags: ["autodocs"],
  args: { children: "Email", htmlFor: "example-email" },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Standard: Story = { args: { appearance: "standard" } };
