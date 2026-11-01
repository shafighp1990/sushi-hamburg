import type { Meta, StoryObj } from "@storybook/react-vite";
import { NewsletterPreference } from "./newsletter";

const meta = {
  title: "Features/NewsletterPreference",
  component: NewsletterPreference,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof NewsletterPreference>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
