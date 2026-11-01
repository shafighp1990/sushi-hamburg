import type { Meta, StoryObj } from "@storybook/react-vite";
import { LiveProductDetail } from "./product-detail";
import { products } from "../../lib/catalog";

const meta = {
  title: "Features/LiveProductDetail",
  component: LiveProductDetail,
  tags: ["autodocs"],
  args: { id: products[0].id },
} satisfies Meta<typeof LiveProductDetail>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
