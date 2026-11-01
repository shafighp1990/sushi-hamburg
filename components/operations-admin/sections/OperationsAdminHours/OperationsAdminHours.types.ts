import type { OperationsAdminViewProps } from '../../OperationsAdminView.types';
export type OperationsAdminHoursProps = Pick<
  OperationsAdminViewProps,
  | 'lang'
  | 'draft'
  | 'setDraft'
  | 'date'
  | 'setDate'
  | 'busy'
  | 'save'
  | 'updateDay'
>;
