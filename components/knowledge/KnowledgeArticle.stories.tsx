import type { Meta, StoryObj } from "@storybook/react-vite";
import { KnowledgeArticle } from "./knowledge";

import { articles } from "../../lib/knowledge";

const meta = {
  title: "Features/KnowledgeArticle",
  component: KnowledgeArticle,
  tags: ["autodocs"],
  args: { id: articles[0].id },
} satisfies Meta<typeof KnowledgeArticle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
