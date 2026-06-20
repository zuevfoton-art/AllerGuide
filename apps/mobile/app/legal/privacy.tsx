import { LegalDocumentScreen } from '@/src/components/LegalDocumentScreen';
import { PRIVACY_POLICY } from '@/src/constants/legal';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen title="Политика конфиденциальности" body={PRIVACY_POLICY} />;
}
