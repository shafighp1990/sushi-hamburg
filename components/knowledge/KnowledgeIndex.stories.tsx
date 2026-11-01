import type { Meta, StoryObj } from "@storybook/react-vite";
import { KnowledgeIndex } from "./knowledge";

const meta = {
  title: "Features/KnowledgeIndex",
  component: KnowledgeIndex,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof KnowledgeIndex>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
