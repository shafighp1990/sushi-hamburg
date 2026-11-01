import type { Meta, StoryObj } from "@storybook/react-vite";
import { OfferSection } from "./offer-section";

const meta = {
  title: "Features/OfferSection",
  component: OfferSection,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof OfferSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
