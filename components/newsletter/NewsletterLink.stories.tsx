import type { Meta, StoryObj } from "@storybook/react-vite";
import { NewsletterLink } from "./newsletter";

const meta = {
  title: "Features/NewsletterLink",
  component: NewsletterLink,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof NewsletterLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
