'use client';

import { useOperationsAdmin } from './useOperationsAdmin';
import { OperationsAdminView } from './OperationsAdminView';

export function OperationsAdmin() {
  const model = useOperationsAdmin();
  return <OperationsAdminView {...model} />;
}
