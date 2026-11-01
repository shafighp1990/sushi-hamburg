import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrderMessagesView } from "./OrderMessagesView";
import { orderCopy } from "./OrderMessages.copy";
const meta = {
  title: "Features/OrderMessages",
  component: OrderMessagesView,
  tags: ["autodocs"],
  args: {
    lang: "de", staff: false, copy: orderCopy("de"), cursor: null, draft: "", loading: false,
    sending: false, error: "", notice: "", setDraft: () => {}, load: async () => {}, submit: async (event) => { event.preventDefault(); },
    messages: [
      { id: "customer-message", sender: "customer", text: "Bitte kurz klingeln, wenn Sie da sind.", createdAt: 1793610000000 },
      { id: "team-message", sender: "team", text: "Sehr gern. Ihre Bestellung ist in Vorbereitung.", createdAt: 1793610060000 },
    ],
  },
} satisfies Meta<typeof OrderMessagesView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Customer: Story = {};
export const Owner: Story = { args: { staff: true } };
export const Persian: Story = { args: { lang: "fa", copy: orderCopy("fa"), messages: [] } };
export const Pending: Story = { args: { sending: true, draft: "Vielen Dank!" } };
