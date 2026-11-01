import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeliveryNotice } from "./delivery-notice";

const meta = {
  title: "Features/DeliveryNotice",
  component: DeliveryNotice,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof DeliveryNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
