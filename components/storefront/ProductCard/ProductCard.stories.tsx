import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { products } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";
const meta = {
  title: "Features/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  args: { p: products[0], index: 0, lang: "de", quantity: 0, onAdd: fn() },
} satisfies Meta<typeof ProductCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
