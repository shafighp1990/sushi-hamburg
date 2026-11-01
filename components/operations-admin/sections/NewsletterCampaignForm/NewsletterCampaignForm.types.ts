import type { OperationsAdminViewProps } from '../../OperationsAdminView.types';
export type NewsletterCampaignFormProps = Pick<
  OperationsAdminViewProps,
  | 'lang'
  | 'busy'
  | 'campaign'
  | 'setCampaign'
  | 'language'
  | 'setLanguage'
  | 'run'
  | 'save'
>;
