import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "./Heading";
const meta = {
  title: "Primitives/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: { children: "Account settings", as: "h1" },
} satisfies Meta<typeof Heading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Standard: Story = { args: { appearance: "standard" } };
