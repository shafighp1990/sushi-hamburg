import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommerceAdmin } from './commerce-admin';

const meta = {
  title: 'Features/CommerceAdmin',
  component: CommerceAdmin,
  tags: ['autodocs'],
  args: { customers: [] },
} satisfies Meta<typeof CommerceAdmin>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
