import type { Meta, StoryObj } from "@storybook/react-vite";
import { Gallery } from "./info-pages";

const meta = {
  title: "Features/Gallery",
  component: Gallery,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof Gallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
