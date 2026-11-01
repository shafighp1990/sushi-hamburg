import type { OperationsAdminViewProps } from '../../OperationsAdminView.types';
export type DocumentSettingsFormProps = Pick<
  OperationsAdminViewProps,
  'lang' | 'busy' | 'email' | 'setEmail' | 'emailState' | 'run' | 'save'
>;
