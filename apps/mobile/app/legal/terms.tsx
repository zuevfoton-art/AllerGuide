import { LegalDocumentScreen } from '@/src/components/LegalDocumentScreen';
import { TERMS_OF_SERVICE } from '@/src/constants/legal';

export default function TermsOfServiceScreen() {
  return <LegalDocumentScreen title="Условия использования" body={TERMS_OF_SERVICE} />;
}
