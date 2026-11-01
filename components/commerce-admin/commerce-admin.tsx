'use client';
import type { CommerceAdminProps } from './commerce-admin.types';
import { useCommerceAdmin } from './useCommerceAdmin';
import { CommerceAdminView } from './CommerceAdminView';

export function CommerceAdmin({ customers }: CommerceAdminProps) {
  const model = useCommerceAdmin({ customers });
  return <CommerceAdminView {...model} />;
}
export * from './CommerceAdmin.shared';
