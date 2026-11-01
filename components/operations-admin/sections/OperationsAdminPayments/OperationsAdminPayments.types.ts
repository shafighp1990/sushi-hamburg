import type { OperationsAdminViewProps } from '../../OperationsAdminView.types';
export type OperationsAdminPaymentsProps = Pick<
  OperationsAdminViewProps,
  | 'lang'
  | 'draft'
  | 'setDraft'
  | 'connections'
  | 'fields'
  | 'setFields'
  | 'busy'
  | 'run'
  | 'save'
>;
