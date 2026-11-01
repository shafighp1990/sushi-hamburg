import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";
const meta = {
  title: "Primitives/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    "aria-label": "Language",
    children: (
      <>
        <option value="en">English</option>
        <option value="fa">فارسی</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Standard: Story = { args: { appearance: "standard" } };
