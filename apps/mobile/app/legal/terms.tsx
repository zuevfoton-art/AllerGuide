import { LegalDocumentScreen } from '@/src/components/LegalDocumentScreen';
import { getLegalDocuments } from '@/src/i18n/legal-content';
import { useTranslation } from '@/src/store/locale-store';

export default function TermsOfServiceScreen() {
  const { locale } = useTranslation();
  const doc = getLegalDocuments(locale);

  return <LegalDocumentScreen title={doc.termsTitle} body={doc.termsBody} />;
}
