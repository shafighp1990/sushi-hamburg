import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text";
const meta = {
  title: "Primitives/Text",
  component: Text,
  tags: ["autodocs"],
  args: { children: "Readable text in English — نوشتهٔ فارسی" },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Standard: Story = { args: { appearance: "standard" } };
