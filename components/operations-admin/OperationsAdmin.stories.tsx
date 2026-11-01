import type { Meta, StoryObj } from '@storybook/react-vite';
import { OperationsAdmin } from './operations-admin';

const meta = {
  title: 'Features/OperationsAdmin',
  component: OperationsAdmin,
  tags: ['autodocs'],
  args: {},
} satisfies Meta<typeof OperationsAdmin>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
