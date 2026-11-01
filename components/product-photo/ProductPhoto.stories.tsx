import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProductPhoto } from "./product-photo";
import { products } from "../../lib/catalog";

const meta = {
  title: "Features/ProductPhoto",
  component: ProductPhoto,
  tags: ["autodocs"],
  args: { product: products[0] },
} satisfies Meta<typeof ProductPhoto>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
