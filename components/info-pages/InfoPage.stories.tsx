import type { Meta, StoryObj } from "@storybook/react-vite";
import { InfoPage } from "./info-pages";

const meta = {
  title: "Features/InfoPage",
  component: InfoPage,
  tags: ["autodocs"],
  args: { kind: "privacy" },
} satisfies Meta<typeof InfoPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
