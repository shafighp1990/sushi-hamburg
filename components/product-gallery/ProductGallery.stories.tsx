import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProductGallery } from "./product-gallery";
import { products } from "../../lib/catalog";

const meta = {
  title: "Features/ProductGallery",
  component: ProductGallery,
  tags: ["autodocs"],
  args: { product: products[0] },
} satisfies Meta<typeof ProductGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
