import type { Meta, StoryObj } from "@storybook/react-vite";
import { RestaurantHome } from "./restaurant-home";

const meta = {
  title: "Features/RestaurantHome",
  component: RestaurantHome,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof RestaurantHome>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
